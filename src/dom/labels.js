/**
 * Anatomy labels: five real points on the centre stone, projected to the
 * screen every frame by the 3D scene (bridge.projectAnchor) and joined to a
 * label column with hairline leaders.
 */
import { st, narrow } from '../state.js';

export const ANCHORS = [
  { he: 'שולחן', en: 'Table', v: '53–58%', key: 'table' },
  { he: 'כתר', en: 'Crown', v: '34.5°', key: 'crown' },
  { he: 'חגורה', en: 'Girdle', v: 'thin–medium', key: 'girdle' },
  { he: 'תחתית', en: 'Pavilion', v: '40.8°', key: 'pavilion' },
  { he: 'קולט', en: 'Culet', v: 'none', key: 'culet' },
];

export function initLabels() {
  const root = document.getElementById('labels'), svg = document.getElementById('leaders');
  const NS = 'http://www.w3.org/2000/svg';
  const items = ANCHORS.map(a => {
    const el = document.createElement('div'); el.className = 'lab';
    el.innerHTML = `<b>${a.he}</b><i>${a.en}</i><span>${a.v}</span>`;
    root.appendChild(el);
    const line = document.createElementNS(NS, 'line'); svg.appendChild(line);
    const dot = document.createElementNS(NS, 'circle'); dot.setAttribute('r', 3.5); svg.appendChild(dot);
    return { ...a, el, line, dot };
  });

  /** called by the scene after each render; project(key) → {x, y} in CSS px */
  return function update(project) {
    root.style.opacity = st.anat;
    if (st.anat < .01 || narrow() || !project) return;
    const colX = innerWidth * .46;
    let lastY = -1e9;
    items.forEach((a, i) => {
      const { x, y } = project(a.key);
      const ly = Math.max(y, lastY + 46); lastY = ly;
      a.el.style.left = colX + 'px'; a.el.style.top = ly + 'px';
      const prog = Math.min(1, Math.max(0, st.anat * 1.6 - i * .12));
      a.line.setAttribute('x1', x); a.line.setAttribute('y1', y);
      a.line.setAttribute('x2', x + (colX - 14 - x) * prog); a.line.setAttribute('y2', y + (ly - y) * prog);
      a.dot.setAttribute('cx', x); a.dot.setAttribute('cy', y);
      a.el.style.opacity = prog;
    });
  };
}
