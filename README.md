# Maimon Diamonds — 3D ring hero

## Run
```bash
npm install
node scripts/build-ring.mjs   # writes models/ring.glb, src/three/ringModel.js and src/ringMeta.json
npx vite                      # dev server
npx vite build                # static build in dist/
```

## Structure
- `scripts/build-ring.mjs`: the original ring model (band, cathedral shoulders, 6 prongs, center stone, pavé) built in code and exported to GLB. No third-party assets.
- `src/state.js`: shared animation state, metal presets, and the bridge between the DOM and 3D.
- `src/dom/`: plain JS modules: intro (GSAP), scroll (Lenis + ScrollTrigger), metal picker, drag to rotate, anatomy labels.
- `src/three/`: React Three Fiber. `Experience.jsx` holds the Canvas, quality tiers and PerformanceMonitor. `Ring.jsx` handles the model, materials, motion and shadow. `studio.js` builds the studio environment.

## Note
three is pinned to 0.170 because drei's MeshRefractionMaterial needs a shader chunk that was removed in later versions.
