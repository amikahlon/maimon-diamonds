import gsap from 'gsap';
import { st } from '../state.js';

/** Horizontal drag = 360° turntable. Vertical movement is left to the page (touch-action: pan-y). */
export function initDragZone(el = document.getElementById('dragZone')) {
  let down = false, lastX = 0, lastT = 0;
  el.addEventListener('pointerdown', e => { down = true; lastX = e.clientX; lastT = performance.now(); el.setPointerCapture(e.pointerId); });
  el.addEventListener('pointermove', e => {
    if (!down) return;
    const now = performance.now(), dx = e.clientX - lastX, dt = Math.max(now - lastT, 8);
    st.yaw += dx * 0.009;
    st.yawVel = (dx * 0.009) / dt * 16;     // radians per frame, used for inertia
    lastX = e.clientX; lastT = now;
  });
  const up = () => { down = false; };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  // keyboard access to the turntable via the 360° button
  document.getElementById('spin360')?.addEventListener('click', () => {
    gsap.to(st, { spinBoost: st.spinBoost + Math.PI * 2, duration: 2.6, ease: 'power3.inOut' });
  });
}
