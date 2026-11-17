import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';
import { st, reduceMotion } from '../state.js';

gsap.registerPlugin(ScrollTrigger, SplitText);

export function initScroll() {
  let lenis = null;
  if (!reduceMotion) {
    lenis = new Lenis({ duration: 1.18, lerp: .095, smoothWheel: true, syncTouch: false });
    const clampVelocity = gsap.utils.clamp(-1, 1);
    lenis.on('scroll', e => {
      st.velocity = clampVelocity((e.velocity || 0) / 24);
      ScrollTrigger.update();
    });
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }

  document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const el = document.querySelector(a.getAttribute('href'));
    if (!el) return;
    e.preventDefault();
    lenis ? lenis.scrollTo(el) : el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  }));

  const mm = gsap.matchMedia();
  mm.add({
    desktop: '(min-width: 901px)',
    mobile: '(max-width: 900px)',
    reduce: '(prefers-reduced-motion: reduce)',
  }, context => {
    const { desktop, reduce } = context.conditions;
    if (reduce) {
      gsap.set('.reveal,.shape', { autoAlpha: 1, y: 0 });
      document.querySelectorAll('.shape').forEach(el => el.classList.add('drawn'));
      return;
    }

    gsap.timeline({
      scrollTrigger: {
        trigger: '#anatomy', start: 'top bottom', end: 'top top',
        scrub: desktop ? 1.1 : .65, invalidateOnRefresh: true, id: 'ring-to-anatomy',
      },
    }).to(st, {
      ax: desktop ? -.5 : 0, ay: desktop ? 0 : .46, as: desktop ? 1.6 : 1,
      at: 1, cam: desktop ? .42 : .18, ease: 'none',
    });

    // the hero UI steps aside so the stone travels through a clean frame
    gsap.fromTo('#heroUi', { autoAlpha: 1, y: 0 }, {
      autoAlpha: 0, y: -40, ease: 'none', immediateRender: false,
      scrollTrigger: { trigger: '#anatomy', start: 'top bottom', end: 'top 55%', scrub: true, id: 'hero-ui-exit' },
    });

    gsap.timeline({
      scrollTrigger: {
        trigger: '#anatomy', start: 'top top', end: 'bottom bottom',
        scrub: desktop ? 1.25 : .75, id: 'diamond-inspection',
      },
    }).to(st, { inspect: 1, cam: desktop ? 1 : .4, ease: 'none' });

    ScrollTrigger.create({
      trigger: '#anatomy', start: 'top 20%', end: 'bottom 70%', id: 'anatomy-labels',
      onToggle: s => gsap.to(st, {
        anat: s.isActive ? 1 : 0, duration: .7, ease: 'power2.out', overwrite: 'auto',
      }),
    });

    gsap.timeline({
      scrollTrigger: {
        trigger: '#shapes', start: 'top bottom', end: 'top 28%',
        scrub: desktop ? 1 : .65, id: 'ring-exit',
      },
    }).to(st, { out: 1, cam: 0, ease: 'none' });

    gsap.utils.toArray('.anatomy h2,.shapes h2,.closing h2').forEach(heading => {
      const split = SplitText.create(heading, {
        type: 'words', wordsClass: 'split-word', aria: 'auto',
      });
      gsap.set(heading, { autoAlpha: 1 });
      gsap.fromTo(split.words,
        { autoAlpha: 0, yPercent: 110, rotationX: -12, transformOrigin: '100% 100%' },
        {
          autoAlpha: 1, yPercent: 0, rotationX: 0, duration: 1.05,
          stagger: .055, ease: 'power4.out',
          scrollTrigger: { trigger: heading, start: 'top 88%', once: true },
        });
    });

    gsap.utils.toArray('.reveal')
      .filter(el => !el.matches('h2') && !el.matches('.shape'))
      .forEach(el => gsap.to(el, {
        autoAlpha: 1, y: 0, duration: 1, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      }));

    ScrollTrigger.batch('.shape', {
      start: 'top 90%', once: true,
      onEnter: batch => {
        gsap.to(batch, { autoAlpha: 1, y: 0, duration: 1, stagger: .1, ease: 'power3.out', overwrite: true });
        // the gold line drawings trace themselves in, one card after another
        batch.forEach((el, n) => gsap.delayedCall(.15 + n * .14, () => el.classList.add('drawn')));
      },
    });
  });

  // nav switches to dark glass while it floats over the viewing room
  ScrollTrigger.create({
    trigger: '#anatomy', start: () => `top+=${innerHeight * .32} 60`,
    endTrigger: '#contact', end: 'top 60', id: 'nav-theme',
    toggleClass: { targets: document.body, className: 'on-dark' },
  });

  const progress = document.querySelector('.progress-rail i');
  const chapter = document.getElementById('chapterNo');
  if (progress) {
    const setProgress = gsap.quickSetter(progress, 'scaleY');
    let current = '01';
    ScrollTrigger.create({
      start: 0, end: 'max', id: 'page-progress',
      onUpdate: self => {
        setProgress(self.progress);
        const next = self.progress < .28 ? '01' : self.progress < .62 ? '02' : self.progress < .86 ? '03' : '04';
        if (next !== current && chapter) {
          current = next;
          chapter.textContent = next;
        }
      },
    });
  }

  addEventListener('intro:done', () => ScrollTrigger.refresh(), { once: true });
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  return lenis;
}
