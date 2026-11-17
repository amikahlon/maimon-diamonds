import * as THREE from 'three';
import { useMemo, useRef, useEffect, useLayoutEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { MeshRefractionMaterial } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { suspend } from 'suspend-react';
import ringUrl from '../../models/ring.glb?url';
import { st, metal, METALS, narrow, reduceMotion } from '../state.js';
import { createStudio } from './studio.js';
import meta from '../ringMeta.json';

/* ring.glb is bundled as base64 and parsed in memory → works on any static host */
function loadRing() {
  return suspend(async () => {
    const gltf = await new GLTFLoader().loadAsync(ringUrl);
    const nodes = {};
    gltf.scene.traverse(o => { if (o.name) nodes[o.name] = o; });
    return { nodes };
  }, ['maimon-ring', ringUrl]);
}

/* meshopt-quantized attributes → float, so the BVH ray tracer reads real units */
function floatGeometry(src) {
  const g = new THREE.BufferGeometry();
  for (const key of ['position', 'normal']) {
    const a = src.getAttribute(key), arr = new Float32Array(a.count * 3);
    for (let i = 0; i < a.count; i++) { arr[i * 3] = a.getX(i); arr[i * 3 + 1] = a.getY(i); arr[i * 3 + 2] = a.getZ(i); }
    g.setAttribute(key, new THREE.BufferAttribute(arr, 3));
  }
  if (src.index) {
    g.setIndex(src.index.clone());
    return g.toNonIndexed();
  }
  return g;
}

/* star glints — tiny additive sprites that flash on the crown facets */
function useStarTexture() {
  return useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'), h = 64;
    const rg = g.createRadialGradient(h, h, 0, h, h, h * .4);
    rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(.3, 'rgba(255,250,240,.5)'); rg.addColorStop(1, 'rgba(255,240,220,0)');
    g.fillStyle = rg; g.fillRect(0, 0, 128, 128);
    g.globalCompositeOperation = 'lighter';
    for (const horiz of [true, false]) {
      const lg = horiz ? g.createLinearGradient(0, h, 128, h) : g.createLinearGradient(h, 0, h, 128);
      lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(.5, 'rgba(255,255,255,.95)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = lg; horiz ? g.fillRect(0, h - 1.5, 128, 3) : g.fillRect(h - 1.5, 0, 3, 128);
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }, []);
}

function useAuraTexture() {
  return useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'), h = 128;
    const rg = g.createRadialGradient(h, h, 0, h, h, h);
    rg.addColorStop(0, 'rgba(255,255,255,.72)');
    rg.addColorStop(.18, 'rgba(255,248,225,.22)');
    rg.addColorStop(.42, 'rgba(193,222,255,.09)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg; g.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }, []);
}

const RING_H = (meta.girdleY + meta.tableY * meta.stoneR) + (meta.innerR + .115);
const easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const lerp = THREE.MathUtils.lerp;

export function Ring({ tier, updateLabels, onFirstFrame }) {
  const { nodes } = loadRing();
  const { gl, scene, camera, size } = useThree();

  /* ---------- studio environment (one cube for the stone, PMREM for metal) ---------- */
  const studio = useMemo(() => createStudio(gl, { size: tier.cube }), [gl, tier.cube]);
  useEffect(() => { scene.environment = studio.pmrem; return () => studio.dispose(); }, [studio, scene]);

  /* ---------- materials ---------- */
  // True metal: metalness 1 and a measured-ish F0 colour. The look comes from
  // the studio reflections, not from a dull base colour + clearcoat (which read
  // as cream plastic). No transmission anywhere: it costs a full extra pass.
  const metalMat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: METALS[metal.current].color, metalness: 1, roughness: METALS[metal.current].roughness,
    envMapIntensity: 1.45, specularIntensity: 1, transparent: true,
  }), []);
  const paveMat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#f3f5fa', metalness: 0, roughness: 0, ior: 2.42, specularIntensity: 1, envMapIntensity: 1.7,
    iridescence: .35, iridescenceIOR: 1.8, iridescenceThicknessRange: [220, 520],
    flatShading: true, transparent: true,
  }), []);
  // drei's refraction shader multiplies env × colour, so a colour above 1 is a
  // stone-only exposure gain: white diamond without blowing out the gold.
  const stoneGain = useMemo(() => new THREE.Color(1.82, 1.86, 1.96), []);
  const metalTarget = useRef(new THREE.Color(METALS[metal.current].color));
  const roughTarget = useRef(METALS[metal.current].roughness);
  useEffect(() => metal.on(k => {
    metalTarget.current.set(METALS[k].color);
    roughTarget.current = METALS[k].roughness;
  }), []);

  const stoneGeo = useMemo(() => floatGeometry(nodes.CenterStone.geometry), [nodes]);
  const stoneBox = useMemo(() => { stoneGeo.computeBoundingBox(); return stoneGeo.boundingBox; }, [stoneGeo]);
  const pave = useMemo(() => { const p = nodes.Pave; p.material = paveMat; p.frustumCulled = false; return p; }, [nodes, paveMat]);

  /* ---------- glints on the stone ---------- */
  const star = useStarTexture();
  const aura = useAuraTexture();
  const glints = useMemo(() => {
    const top = stoneBox.max.y, gr = stoneBox.max.x;
    return Array.from({ length: 6 }, (_, i) => {
      const a = i / 6 * Math.PI * 2 + .3, r = gr * (i % 2 ? .72 : .42);
      return { p: [Math.cos(a) * r, top * (i % 2 ? .52 : .94), Math.sin(a) * r], ph: i * 2.73, sp: .62 + (i % 3) * .22, s: gr * (.3 + (i % 2) * .12) };
    });
  }, [stoneBox]);
  const glintRefs = useRef([]);
  useEffect(() => () => {
    metalMat.dispose(); paveMat.dispose(); stoneGeo.dispose(); star.dispose(); aura.dispose();
  }, [metalMat, paveMat, stoneGeo, star, aura]);

  /* ---------- layout: the ring is framed by the DOM monogram ---------- */
  const L = useRef({});
  useLayoutEffect(() => {
    const measure = () => {
      const visH = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
      const ppu = innerHeight / visH;
      const mono = document.getElementById('mono').getBoundingClientRect();
      const h = mono.height, cx = mono.left + mono.width / 2, cy = mono.top + scrollY + h * .5;
      const ringH = (meta.girdleY + meta.tableY * meta.stoneR) + (meta.innerR + .115);   // top of stone → bottom of band
      L.current = {
        ppu, monoH: h,
        x: (cx - innerWidth / 2) / ppu,
        y: -(cy + h * .06 - innerHeight / 2) / ppu,
        scale: (h * (narrow() ? 1.78 : 1.02)) / ppu / ringH,
        center: (meta.girdleY + meta.tableY * meta.stoneR - (meta.innerR + .115)) / 2, // vertical centre of the ring
      };
    };
    measure();
    addEventListener('resize', measure);
    document.fonts?.ready.then(measure);
    return () => removeEventListener('resize', measure);
  }, [camera, size]);

  /* ---------- refs ---------- */
  const place = useRef(), tilt = useRef(), body = useRef(), stone = useRef(), shadow = useRef(), auraRef = useRef();
  const shadowUniforms = useMemo(() => ({ uA: { value: 0 } }), []);
  const shadowMat = useRef();
  const firstFrame = useRef(false), clock = useRef({ spin: 0 });
  const tmpV = new THREE.Vector3(), tmpE = new THREE.Euler();
  const stoneNodePos = nodes.CenterStone.position.clone(), stoneNodeScale = nodes.CenterStone.scale.clone();

  useFrame((state, dt) => {
    dt = Math.min(dt, .05);
    const t = state.clock.elapsedTime, l = L.current;
    if (!l.ppu) return;

    /* metal colour eases toward the selected alloy */
    metalMat.color.lerp(metalTarget.current, Math.min(1, dt * 4));
    metalMat.roughness += (roughTarget.current - metalMat.roughness) * Math.min(1, dt * 4);

    /* --- poses --- */
    const k = easeInOut(Math.min(1, st.at));                  // hero → anatomy
    const i = st.intro, ie = 1 - Math.pow(1 - i, 3);
    // drag inertia + idle
    st.yaw += st.yawVel * dt * 60;
    st.yawVel *= Math.pow(.94, dt * 60);
    if (!reduceMotion) clock.current.spin += dt * (.1 + k * .2);
    const idle = reduceMotion ? 0 : Math.sin(t * .28) * .085;
    const yaw = -.6 + idle + st.yaw + st.spinBoost + clock.current.spin * k + (1 - ie) * -Math.PI * 1.8;
    const pointer = state.pointer;

    // hero pose (follows the page until the anatomy takes over)
    const heroY = l.y + scrollY / l.ppu;
    const heroScale = l.scale;
    // intro pose: a macro view of the stone, face-up, filling the frame
    // Start close enough to read the facets, without turning the stone into an
    // abstract full-screen texture on narrow or slower devices.
    const macroScale = heroScale * (narrow() ? 2.35 : 3.15);
    const stoneLocalY = (meta.girdleY - l.center);
    // anatomy pose: stone alone, in profile
    const halfW = innerWidth / 2 / l.ppu, halfH = innerHeight / 2 / l.ppu;
    // Size the mobile anatomy stone from the live viewport, so browser chrome
    // and short screens cannot push it into the copy below.
    const anatomyRadiusPx = narrow()
      ? Math.min(innerWidth * .22, innerHeight * .14) * st.as
      : l.monoH * .22 * st.as;
    const anatScale = anatomyRadiusPx / l.ppu / meta.stoneR;

    const inspectArc = Math.sin(st.inspect * Math.PI);
    const tiltX = lerp(lerp(1.42, .42, ie) + pointer.y * -.12 * ie, .06, k) + inspectArc * .085;
    tmpE.set(tiltX, 0, 0);
    const stoneOff = tmpV.set(0, stoneLocalY, 0).applyEuler(tmpE);

    // where the stone must be, per pose
    let scale = Math.exp(lerp(Math.log(macroScale), Math.log(heroScale), ie));
    let px = lerp(-stoneOff.x * scale, l.x, ie);
    let py = lerp(-stoneOff.y * scale, heroY, ie);
    scale = Math.exp(lerp(Math.log(scale), Math.log(anatScale), k)) * (1 + inspectArc * .065);
    px = lerp(px, st.ax * halfW - stoneOff.x * scale, k);
    py = lerp(py, st.ay * halfH - stoneOff.y * scale, k) + st.out * 14;

    const pointerScale = narrow() ? .035 : .12;
    place.current.position.set(px + pointer.x * pointerScale * ie * (1 - k), py, 0);
    place.current.scale.setScalar(scale);
    tilt.current.rotation.set(tiltX, 0, pointer.x * -.06 * ie * (1 - k));
    tilt.current.position.y = -l.center;
    body.current.rotation.y = yaw;
    stone.current.rotation.y = yaw + st.inspect * .62;
    place.current.visible = st.out < .98;

    /* metal falls away for the anatomy section */
    const metalA = 1 - Math.min(1, k * 2.2);
    metalMat.opacity = paveMat.opacity = metalA;
    metalMat.depthWrite = paveMat.depthWrite = metalA > .99;
    body.current.visible = metalA > .01;
    if (shadowMat.current) shadowMat.current.uniforms.uA.value = metalA * Math.max(0, (ie - .55) / .45);

    /* light sweep (desktop: live env re-render while it runs) */
    const sweepActive = tier.sweep && st.sweep > 0 && st.sweep < 1;
    const sweepStep = sweepActive ? Math.round(st.sweep * 18) / 18 : null;
    if (studio.setSweep(sweepStep)) {
      studio.render();
      scene.environment = studio.pmrem;
    }

    /* glints */
    glintRefs.current.forEach((g, n) => {
      if (!g) return; const d = glints[n];
      const f = reduceMotion ? 0 : Math.pow(Math.max(0, Math.sin(t * d.sp + d.ph)), 28) * ie * (1 - k * .35);
      g.material.opacity = f; g.scale.setScalar(d.s * (.35 + f)); g.material.rotation = t * .3 + d.ph;
    });
    if (auraRef.current) {
      const breathe = reduceMotion ? .82 : .82 + Math.sin(t * .7) * .18;
      auraRef.current.material.opacity = (.08 + breathe * .055) * ie * (1 - k * .35);
      auraRef.current.scale.setScalar(1.45 + breathe * .16);
    }

    /* labels: anchor points in the stone's un-spun frame */
    if (updateLabels) {
      const gr = stoneBox.max.x, top = stoneBox.max.y, bot = stoneBox.min.y;
      const A = { table: [gr * .28, top, 0], crown: [gr * .78, top * .5, 0], girdle: [gr, 0, 0], pavilion: [gr * .55, bot * .5, 0], culet: [0, bot, 0] };
      updateLabels(key => {
        const a = A[key];
        tmpV.set(a[0], a[1], a[2]);
        stone.current.localToWorld(tmpV).project(state.camera);
        return { x: (tmpV.x * .5 + .5) * innerWidth, y: (-tmpV.y * .5 + .5) * innerHeight };
      });
    }

    if (!firstFrame.current) { firstFrame.current = true; requestAnimationFrame(() => onFirstFrame?.()); }
  });

  return (
    <group ref={place}>
      <group ref={tilt}>
        <group ref={body}>
          {/* soft ground shadow: a wide penumbra plus the thin contact line under the band */}
          <mesh ref={shadow} rotation-x={-Math.PI / 2} position={[0, -(meta.innerR + .117), 0]} renderOrder={-1}>
            <planeGeometry args={[4.2, 2.4]} />
            <shaderMaterial ref={shadowMat} transparent depthWrite={false} uniforms={shadowUniforms}
              vertexShader={`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`}
              fragmentShader={`varying vec2 vUv; uniform float uA;
                void main(){
                  vec2 p = (vUv - .5) * vec2(4.2, 2.4);
                  float pen = exp(-(p.x*p.x/1.9 + p.y*p.y/.16) * 2.2) * .30;
                  float contact = exp(-(p.x*p.x/.012 + p.y*p.y/.03) * 1.5) * .55;
                  float a = (pen + contact) * uA;
                  gl_FragColor = vec4(vec3(.23, .17, .11) * (1. - contact * .5), a);
                }`} />
          </mesh>
          <mesh geometry={nodes.Band.geometry} material={metalMat} position={nodes.Band.position} scale={nodes.Band.scale} />
          <mesh geometry={nodes.Head.geometry} material={metalMat} position={nodes.Head.position} scale={nodes.Head.scale} />
          <mesh geometry={nodes.Beads.geometry} material={metalMat} position={nodes.Beads.position} scale={nodes.Beads.scale} />
          <primitive object={pave} />
        </group>
        <sprite ref={auraRef} position={[stoneNodePos.x, stoneNodePos.y, stoneNodePos.z - .08]} renderOrder={-2}>
          <spriteMaterial map={aura} transparent opacity={0} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} />
        </sprite>
        <mesh ref={stone} geometry={stoneGeo} position={stoneNodePos} scale={stoneNodeScale}>
          <MeshRefractionMaterial envMap={studio.cube} bounces={tier.bounces} ior={2.417} fresnel={.82}
            aberrationStrength={tier.aberration} fastChroma color={stoneGain} />
          {glints.map((d, n) => (
            <sprite key={n} ref={el => (glintRefs.current[n] = el)} position={d.p}>
              <spriteMaterial map={star} transparent opacity={0} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} />
            </sprite>
          ))}
        </mesh>
      </group>
    </group>
  );
}
