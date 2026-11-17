import { Component, Suspense, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { st, isMobile, reduceMotion } from '../state.js';
import { Ring } from './Ring.jsx';

/* quality tiers — the phone gets fewer bounces, no dispersion, smaller cubes */
const TIERS = {
  high: { dpr: [1.5, 2], bounces: 5, aberration: .016, cube: 512, shadowRes: 512, sweep: true },
  mid:  { dpr: [1.35, 2], bounces: 4, aberration: .01, cube: 384, shadowRes: 384, sweep: true },
  low:  { dpr: [1.25, 1.75], bounces: 4, aberration: .006, cube: 256, shadowRes: 256, sweep: false },
};

/* renders only while the ring is on screen (frameloop="demand") */
function Driver() {
  const invalidate = useThree(s => s.invalidate);
  useEffect(() => {
    const tick = () => { if (st.out < .99 && !document.hidden) invalidate(); };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [invalidate]);
  return null;
}

class SceneBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) {
    console.error('Three.js scene failed:', error);
    this.props.onError?.(error);
  }
  render() { return this.state.failed ? null : this.props.children; }
}

function RendererLifecycle({ onError }) {
  const { gl, invalidate } = useThree();
  useEffect(() => {
    const canvas = gl.domElement;
    const status = document.getElementById('gl-status');
    const lost = event => {
      event.preventDefault();
      document.body.classList.add('gl-context-lost');
      if (status) status.textContent = 'התצוגה התלת־ממדית מתאוששת…';
    };
    const restored = () => {
      document.body.classList.remove('gl-context-lost');
      if (status) status.textContent = '';
      invalidate();
    };
    const failed = () => onError?.(new Error('WebGL context creation failed'));
    canvas.addEventListener('webglcontextlost', lost, false);
    canvas.addEventListener('webglcontextrestored', restored, false);
    canvas.addEventListener('webglcontextcreationerror', failed, false);
    return () => {
      canvas.removeEventListener('webglcontextlost', lost, false);
      canvas.removeEventListener('webglcontextrestored', restored, false);
      canvas.removeEventListener('webglcontextcreationerror', failed, false);
    };
  }, [gl, invalidate, onError]);
  return null;
}

function CameraRig() {
  const camera = useThree(s => s.camera);
  useFrame((_, dt) => {
    const d = Math.min(dt, .05);
    if (reduceMotion) {
      camera.position.x = THREE.MathUtils.damp(camera.position.x, 0, 7, d);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, 0, 7, d);
      camera.rotation.z = THREE.MathUtils.damp(camera.rotation.z, 0, 7, d);
      return;
    }
    const inspectionArc = Math.sin(st.inspect * Math.PI);
    const mobileFactor = isMobile ? .35 : 1;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, (st.cam * .055 + inspectionArc * .035) * mobileFactor, 4.5, d);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, inspectionArc * .025 * mobileFactor, 4.5, d);
    camera.rotation.z = THREE.MathUtils.damp(camera.rotation.z, st.velocity * -.006 * mobileFactor, 6, d);
    st.velocity = THREE.MathUtils.damp(st.velocity, 0, 4, d);
  });
  return null;
}

export function Experience({ updateLabels, onReady, onError }) {
  // Choose once per device; shader warm-up must not permanently blur the canvas.
  const tier = TIERS[isMobile ? 'low' : (navigator.hardwareConcurrency || 8) <= 4 ? 'mid' : 'high'];
  return (
    <Canvas
      frameloop="demand"
      dpr={tier.dpr}
      camera={{ fov: 30, position: [0, 0, 14], near: .1, far: 100 }}
      gl={{ antialias: true, alpha: true, depth: true, stencil: false, precision: 'highp', powerPreference: 'high-performance', toneMapping: THREE.NeutralToneMapping, toneMappingExposure: 1 }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
        gl.outputColorSpace = THREE.SRGBColorSpace;
        gl.domElement.style.imageRendering = 'auto';
        requestAnimationFrame(() => requestAnimationFrame(() => dispatchEvent(new Event('resize'))));
      }}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    >
      <Driver />
      <RendererLifecycle onError={onError} />
      <CameraRig />
      <directionalLight position={[4, 7, 8]} intensity={.9} color="#fff3da" />
      <directionalLight position={[-5, 2, 5]} intensity={.3} color="#dce9ff" />
      <SceneBoundary onError={onError}>
        <Suspense fallback={null}>
          <Ring tier={tier} updateLabels={updateLabels} onFirstFrame={onReady} />
        </Suspense>
      </SceneBoundary>
    </Canvas>
  );
}
