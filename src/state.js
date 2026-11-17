/**
 * Shared, mutable animation state. DOM modules (GSAP/ScrollTrigger) write it,
 * the R3F scene reads it every frame — no React re-renders on scroll.
 */
export const st = {
  intro: 0,      // 0 → 1 cinematic ring entrance
  sweep: 0,      // light sweep across the studio (0 → 1)
  at: 0,         // hero → anatomy blend
  ax: 0, ay: 0, as: 1,   // anatomy placement (screen-relative) and scale
  out: 0,        // leaving the anatomy section
  anat: 0,       // anatomy labels visibility
  yaw: 0, yawVel: 0,     // user drag (radians, inertia)
  spinBoost: 0,  // extra rotation from the 360° button
};

export const isMobile = matchMedia('(max-width: 760px)').matches || matchMedia('(pointer: coarse)').matches;
export const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const narrow = () => innerWidth <= 900;

/* metal presets — linear-ish base colours for a metalness:1 physical material */
export const METALS = {
  yellow: { name: 'זהב צהוב 18K', color: '#d8aa52', roughness: 0.16 },
  white:  { name: 'זהב לבן 18K',  color: '#dedfdf', roughness: 0.13 },
  rose:   { name: 'זהב אדום 18K', color: '#cf8f77', roughness: 0.17 },
};
export const metal = {
  current: 'yellow',
  listeners: new Set(),
  set(key) { if (!METALS[key] || key === this.current) return; this.current = key; this.listeners.forEach(f => f(key)); },
  on(f) { this.listeners.add(f); return () => this.listeners.delete(f); },
};

/* 3D → DOM bridge (filled by the scene once it is mounted) */
export const bridge = { projectAnchor: null, ready: null };
