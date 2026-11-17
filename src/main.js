/**
 * Boot order is deliberate:
 *  1. DOM, fonts, scroll and the logo intro start immediately (tiny bundle).
 *  2. The 3D chunk (three + R3F + drei) and ring.glb load in parallel.
 *  3. Act II of the intro waits for the first rendered frame of the ring.
 */
import './styles.css';
import { bridge, isMobile } from './state.js';
import { initScroll } from './dom/scroll.js';
import { initIntro } from './dom/intro.js';
import { initLabels } from './dom/labels.js';
import { initMetalPicker } from './dom/metalPicker.js';
import { initDragZone } from './dom/dragZone.js';

if (/Chrome\//.test(navigator.userAgent) && !isMobile) document.documentElement.classList.add('refract');

let resolveReady;
const ready = new Promise(r => { resolveReady = r; });
ready.then(() => { ready.settled = true; });
bridge.ready = () => resolveReady();

const lenis = initScroll();
const updateLabels = initLabels();
initMetalPicker();
initDragZone();
initIntro({ lenis, ready });

const supportsWebGL2 = (() => { try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; } })();
if (supportsWebGL2) {
  import('./three/mount.jsx')
    .then(m => m.mount(document.getElementById('gl-root'), { updateLabels }))
    .catch(err => { console.error(err); resolveReady(); });
} else {
  resolveReady();   // the typographic hero still stands on its own
}
