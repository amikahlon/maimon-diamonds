import gsap from 'gsap';
import { st, reduceMotion, isMobile } from '../state.js';

/**
 * Two-act intro.
 *  Act I  — the logo assembles itself (DOM only, plays immediately).
 *  Act II — the ring enters: macro close-up of the stone pulling back to the
 *           full ring, a light sweep across the metal, then the UI arrives.
 * Act II waits for the 3D scene, so a slow connection never shows a blank stage.
 */
const $ = s => document.querySelector(s);

export function initIntro({ lenis, ready }) {
  const band = $('#bandText');
  if (!band.childElementCount) 'MAIMON DIAMONDS'.split('').forEach(ch => {
    const s = document.createElement('span'); if (ch === ' ') s.className = 'sp'; else s.textContent = ch; band.appendChild(s);
  });

  let tl;
  const reset = () => {
    Object.assign(st, { intro: 0, sweep: 0 });
    gsap.set('.mono .m,.mono .d', { clipPath: 'inset(50% 0 50% 0)' });
    gsap.set('.seam', { scaleX: 0, opacity: 1 });
    gsap.set('#bandText span', { opacity: 0, y: '60%' });
    gsap.set('.jewelry,.hero-cap,.hero-cta,.loupe,.metals,#nav', { opacity: 0 });
    gsap.set('#skip', { autoAlpha: 1 });
  };
  const finish = () => {
    gsap.set('#skip', { autoAlpha: 0 });
    document.body.classList.remove('locked'); lenis?.start();
    window.dispatchEvent(new Event('intro:done'));
  };

  function build() {
    reset();
    document.body.classList.add('locked'); lenis?.stop(); scrollTo(0, 0);
    tl = gsap.timeline({ defaults: { ease: 'expo.out' }, onComplete: finish });
    // Act I
    tl.to('.seam', { scaleX: 1, duration: 1.1, ease: 'power3.inOut' }, .25)
      .to('.mono .m,.mono .d', { clipPath: 'inset(0% 0 0% 0)', duration: 1.6, ease: 'expo.inOut' }, 1.0)
      .to('.seam', { opacity: 0, duration: .5 }, 1.7)
      .to('#bandText span', { opacity: 1, y: 0, duration: 1, stagger: .035 }, 1.75)
      .addLabel('ring', 2.1)
      .add(() => { if (!ready.settled) { tl.pause(); ready.then(() => tl.play()); } }, 'ring')
    // Act II
      .to(st, { intro: 1, duration: isMobile ? 2.15 : 3.15, ease: 'expo.inOut' }, 'ring')
      .to(st, { sweep: 1, duration: isMobile ? 1 : 1.55, ease: 'power2.inOut' }, `ring+=${isMobile ? 1.25 : 1.85}`)
      .to('.jewelry', { opacity: 1, duration: .9 }, `ring+=${isMobile ? 1.55 : 2.25}`)
      .to('#nav', { opacity: 1, duration: 1 }, `ring+=${isMobile ? 1.65 : 2.5}`)
      .to('.hero-cap,.hero-cta,.metals,.loupe', { opacity: 1, duration: 1, stagger: .08 }, `ring+=${isMobile ? 1.75 : 2.7}`)
      .to('#skip', { autoAlpha: 0, duration: .35 }, `ring+=${isMobile ? 1.95 : 3}`);
    if (reduceMotion) tl.progress(1);
    return tl;
  }

  build();
  $('#skip').addEventListener('click', () => { if (tl.paused()) tl.play(); tl.progress(1); });
  $('#replay')?.addEventListener('click', () => { tl.kill(); build(); });
  window.__intro = () => tl;
}
