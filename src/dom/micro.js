import gsap from 'gsap';
import { isMobile, reduceMotion } from '../state.js';

export function initMicroInteractions() {
  if (isMobile || reduceMotion || matchMedia('(pointer: coarse)').matches) return;

  gsap.utils.toArray('.pill').forEach(el => {
    const xTo = gsap.quickTo(el, 'x', { duration: .42, ease: 'power3.out' });
    const yTo = gsap.quickTo(el, 'y', { duration: .42, ease: 'power3.out' });
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      xTo(gsap.utils.clamp(-7, 7, (e.clientX - r.left - r.width / 2) * .14));
      yTo(gsap.utils.clamp(-5, 5, (e.clientY - r.top - r.height / 2) * .14));
    });
    el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
  });

  gsap.utils.toArray('.shape').forEach(el => {
    const setX = gsap.quickSetter(el, '--mx', 'px');
    const setY = gsap.quickSetter(el, '--my', 'px');
    let rect;
    el.addEventListener('pointerenter', () => { rect = el.getBoundingClientRect(); });
    el.addEventListener('pointermove', e => {
      rect ||= el.getBoundingClientRect();
      setX(e.clientX - rect.left); setY(e.clientY - rect.top);
    });
    el.addEventListener('pointerleave', () => { rect = null; });
  });
}
