import gsap from 'gsap';
import { st } from '../state.js';

/** Horizontal drag = 360° turntable. Vertical movement is left to the page (touch-action: pan-y). */
export function initDragZone(el = document.getElementById('dragZone')) {
  let down = false, lastX = 0, lastT = 0;
  el.addEventListener('pointerdown', e => { down = true; lastX = e.clientX; lastT = performance.now(); el.setPointerCapture(e.pointerId); });
  el.addEventListener('pointermove', e => {
    if (!down) return;
    const now = performance.now(), dx = e.clientX - lastX, dt = Math.max(now - lastT, 8);
    const sensitivity = matchMedia('(pointer: coarse)').matches ? .0065 : .008;
    st.yaw += dx * sensitivity;
    st.yawVel = Math.max(-.12, Math.min(.12, (dx * sensitivity) / dt * 16));
    lastX = e.clientX; lastT = now;
  });
  const up = () => { down = false; };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  // keyboard access to the turntable via the 360° button
  document.getElementById('spin360')?.addEventListener('click', () => {
    gsap.to(st, { spinBoost: st.spinBoost + Math.PI * 2, duration: 2.6, ease: 'power3.inOut' });
  });
}
