import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { st, reduceMotion, narrow } from '../state.js';

gsap.registerPlugin(ScrollTrigger);

export function initScroll() {
  let lenis = null;
  if (!reduceMotion) {
    lenis = new Lenis({ duration: 1.3 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }
  document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const el = document.querySelector(a.getAttribute('href')); if (!el) return;
    e.preventDefault(); lenis ? lenis.scrollTo(el) : el.scrollIntoView({ behavior: 'smooth' });
  }));

  // hero → anatomy: the metal falls away and the centre stone turns to profile
  gsap.timeline({ scrollTrigger: { trigger: '#anatomy', start: 'top bottom', end: 'top top', scrub: 1 } })
    .to(st, { ax: () => narrow() ? 0 : -.56, ay: () => narrow() ? .5 : 0, as: () => narrow() ? 2.4 : 2.0, at: 1, ease: 'none' });
  ScrollTrigger.create({ trigger: '#anatomy', start: 'top 20%', end: 'bottom 70%',
    onToggle: s => gsap.to(st, { anat: s.isActive ? 1 : 0, duration: .8, ease: 'power2.out' }) });
  gsap.timeline({ scrollTrigger: { trigger: '#shapes', start: 'top bottom', end: 'top 30%', scrub: 1 } })
    .to(st, { out: 1, ease: 'none' });
  gsap.utils.toArray('.reveal').forEach(el => gsap.to(el, { opacity: 1, y: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%' } }));
  addEventListener('intro:done', () => ScrollTrigger.refresh());
  return lenis;
}
