import gsap from 'gsap';
import { metal, METALS, st, reduceMotion } from '../state.js';

export function initMetalPicker(root = document.getElementById('metals')) {
  const out = root.querySelector('output');
  root.querySelectorAll('button[data-metal]').forEach(btn => {
    btn.addEventListener('click', () => metal.set(btn.dataset.metal));
  });
  metal.on(key => {
    root.querySelectorAll('button[data-metal]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.metal === key)));
    out.textContent = METALS[key].name;
    if (!reduceMotion) {
      const active = root.querySelector(`[data-metal="${key}"]`);
      gsap.fromTo(active, { scale: .82 }, { scale: 1, duration: .7, ease: 'back.out(2)', clearProps: 'transform' });
      gsap.fromTo(out, { autoAlpha: 0, y: 7 }, { autoAlpha: 1, y: 0, duration: .55, ease: 'power3.out', overwrite: true });
      gsap.fromTo(st, { sweep: 0 }, { sweep: 1, duration: 1.25, ease: 'power2.inOut', overwrite: true });
    }
  });
}
