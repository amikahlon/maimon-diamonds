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
  inspect: 0,    // cinematic inspection pass through the anatomy section
  cam: 0,        // subtle camera rig blend
  velocity: 0,   // normalized scroll velocity for physical camera response
  yaw: 0, yawVel: 0,     // user drag (radians, inertia)
  spinBoost: 0,  // extra rotation from the 360° button
};

export const isMobile = matchMedia('(max-width: 760px)').matches || matchMedia('(pointer: coarse)').matches;
export const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const narrow = () => innerWidth <= 900;

/* metal presets — sRGB F0 reflectance for a metalness:1 physical material */
export const METALS = {
  yellow: { name: 'זהב צהוב 18K', color: '#f2d08f', roughness: 0.1 },
  white:  { name: 'זהב לבן 18K',  color: '#e4e3df', roughness: 0.09 },
  rose:   { name: 'זהב אדום 18K', color: '#f0b9a0', roughness: 0.11 },
};
export const metal = {
  current: 'yellow',
  listeners: new Set(),
  set(key) { if (!METALS[key] || key === this.current) return; this.current = key; this.listeners.forEach(f => f(key)); },
  on(f) { this.listeners.add(f); return () => this.listeners.delete(f); },
};

/* 3D → DOM bridge (filled by the scene once it is mounted) */
export const bridge = { projectAnchor: null, ready: null };
