/**
 * The photographer's studio, as an environment cube.
 * Ported from the original page: softboxes for brilliance, black flags for
 * contrast, and the MD monogram on the walls — so the gold and the stone
 * reflect the brand. A moving strip light produces the intro "light sweep".
 */
import * as THREE from 'three';

export function createStudio(renderer, { size = 256 } = {}) {
  const scene = new THREE.Scene();
  // Jewellery is lit by contrast: a dim warm room, big soft sources and black
  // flags. A bright flat room (the old cream ×.38 background) made the gold read
  // as cream plastic and the stone as grey glass.
  scene.background = new THREE.Color(0xc8c3bb).multiplyScalar(.46);

  const light = k => new THREE.MeshBasicMaterial({ color: new THREE.Color(1, .985, .96).multiplyScalar(k), side: THREE.DoubleSide, toneMapped: false });
  const tinted = (hex, k) => new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k), side: THREE.DoubleSide, toneMapped: false });
  const black = new THREE.MeshBasicMaterial({ color: 0x050403, side: THREE.DoubleSide, toneMapped: false });
  const card = (mat, w, h, pos, look = new THREE.Vector3()) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.copy(pos); m.lookAt(look); scene.add(m); return m;
  };
  card(light(3.2), 9, 9, new THREE.Vector3(0, 6, 0));                  // overhead softbox
  card(tinted(0xfff0d8, 2.6), 1.4, 9, new THREE.Vector3(-6, 1, 1.5));  // warm strip
  card(tinted(0xe4efff, 2.2), 1.4, 9, new THREE.Vector3(6, 1, 1.5));   // cool strip
  card(light(4.5), 2.4, 1, new THREE.Vector3(2.2, 3.4, 5));            // small keys
  card(light(3.6), 2.2, .9, new THREE.Vector3(-2.6, 2.8, 5));
  card(tinted(0xf7efe2, 1.3), 7, 1.2, new THREE.Vector3(0, -2.2, 5.5)); // low fill → bright lip on the shank
  card(tinted(0xa49d92, .85), 30, 30, new THREE.Vector3(0, -6, 0));  // neutral table bounce
  card(black, 9, 2.2, new THREE.Vector3(0, -4.5, -4));             // low black card → defined edges on the metal
  card(black, 2.4, 10, new THREE.Vector3(-4.2, 0, -4.2));           // black flags
  card(black, 2.4, 10, new THREE.Vector3(4.6, 0, -3.6));
  card(black, .8, 8, new THREE.Vector3(4.4, -.5, 3.6));             // front flags → dark bands on the shank
  card(black, .8, 8, new THREE.Vector3(-4.6, -.5, 3.2));
  for (let i = 0; i < 14; i++) {                                    // tiny speculars → scintillation
    const a = i / 14 * Math.PI * 2;
    card(light(7), .3, .3, new THREE.Vector3(Math.cos(a) * 5, 1.6 + Math.sin(i * 1.7) * 1.6, Math.sin(a) * 5));
  }

  // monogram walls
  const c = document.createElement('canvas'); c.width = 1024; c.height = 640;
  const monoTex = new THREE.CanvasTexture(c); monoTex.colorSpace = THREE.SRGBColorSpace;
  const drawMonogram = () => {
    const g = c.getContext('2d');
    g.fillStyle = '#F2EDE3'; g.fillRect(0, 0, 1024, 640);
    g.fillStyle = '#15120F'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '500 600px "Bodoni Moda", Didot, "Times New Roman", serif';
    g.fillText('MD', 512, 350);
    g.fillStyle = '#F2EDE3'; g.fillRect(0, 290, 1024, 90);
    monoTex.needsUpdate = true;
  };
  drawMonogram();
  const monoBack = new THREE.MeshBasicMaterial({ map: monoTex, color: new THREE.Color(.55, .53, .5), side: THREE.DoubleSide, toneMapped: false });
  card(monoBack, 11, 6.9, new THREE.Vector3(0, .4, -6.5));
  // The wall facing the stone is what the table "sees": a bright three-pane
  // window. The diamond reads white with crisp dark mullions, and the polished
  // prong tips catch a clean softbox instead of a distorted monogram.
  const pane = light(1.7);
  for (const x of [-3.7, 0, 3.7]) card(pane, 3.3, 6.9, new THREE.Vector3(x, .6, 7.5), new THREE.Vector3(x, .6, 0));

  // the sweep: a hot strip that travels across the front of the set
  const sweep = card(light(9), 1.1, 12, new THREE.Vector3(-12, 0, 4.5), new THREE.Vector3(-12, 0, 0));
  sweep.visible = false;

  const cubeRT = new THREE.WebGLCubeRenderTarget(size, { type: THREE.HalfFloatType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
  const cubeCam = new THREE.CubeCamera(.1, 60, cubeRT);
  const pmrem = new THREE.PMREMGenerator(renderer);
  let pmremRT = null;
  let lastSweep = Symbol('unset');
  let disposed = false;

  function render() {
    cubeCam.update(renderer, scene);
    pmremRT = pmrem.fromCubemap(cubeRT.texture, pmremRT);
  }
  function setSweep(p) {           // p: 0 → 1, null = off
    if (Object.is(p, lastSweep)) return false;
    lastSweep = p;
    sweep.visible = p != null && p > 0 && p < 1;
    if (sweep.visible) { const x = -9 + p * 18; sweep.position.set(x, 0, 4.5); sweep.lookAt(x, 0, 0); }
    return true;
  }
  render();
  document.fonts?.ready.then(() => { if (!disposed) { drawMonogram(); render(); } });

  return {
    cube: cubeRT.texture,                    // for the refraction shader
    get pmrem() { return pmremRT.texture; }, // for physical materials
    render, setSweep,
    dispose() {
      disposed = true;
      const textures = new Set();
      scene.traverse(o => {
        o.geometry?.dispose();
        const materials = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
        materials.forEach(m => { if (m.map) textures.add(m.map); m.dispose(); });
      });
      textures.forEach(t => t.dispose());
      cubeRT.dispose(); pmremRT?.dispose(); pmrem.dispose();
    },
  };
}
