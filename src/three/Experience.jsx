import { Suspense, useEffect, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import { st, isMobile } from '../state.js';
import { Ring } from './Ring.jsx';

/* quality tiers — the phone gets fewer bounces, no dispersion, smaller cubes */
const TIERS = {
  high: { dpr: [1, 2], bounces: 5, aberration: .016, cube: 256, shadowRes: 512, sweep: true },
  mid:  { dpr: [1, 1.5], bounces: 4, aberration: .01, cube: 256, shadowRes: 384, sweep: true },
  low:  { dpr: [1, 1.35], bounces: 3, aberration: .004, cube: 128, shadowRes: 256, sweep: false },
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

export function Experience({ updateLabels, onReady }) {
  // The tier is chosen once per device. If the frame rate drops we only lower
  // resolution and ray bounces (uniforms) — the stone shader is never re-created.
  const base = TIERS[isMobile ? 'low' : (navigator.hardwareConcurrency || 8) <= 4 ? 'mid' : 'high'];
  const [degrade, setDegrade] = useState(0);
  const tier = {
    ...base,
    dpr: degrade ? [1, Math.min(base.dpr[1], degrade > 1 ? 1 : 1.25)] : base.dpr,
    bounces: Math.max(2, base.bounces - degrade),
  };
  return (
    <Canvas
      frameloop="demand"
      dpr={tier.dpr}
      camera={{ fov: 30, position: [0, 0, 14], near: .1, far: 100 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.08 }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    >
      <PerformanceMonitor flipflops={2} onDecline={() => setDegrade(d => Math.min(2, d + 1))} />
      <Driver />
      <Suspense fallback={null}>
        <Ring tier={tier} updateLabels={updateLabels} onFirstFrame={onReady} />
      </Suspense>
    </Canvas>
  );
}
