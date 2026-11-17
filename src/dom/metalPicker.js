import { metal, METALS } from '../state.js';

export function initMetalPicker(root = document.getElementById('metals')) {
  const out = root.querySelector('output');
  root.querySelectorAll('button[data-metal]').forEach(btn => {
    btn.addEventListener('click', () => metal.set(btn.dataset.metal));
  });
  metal.on(key => {
    root.querySelectorAll('button[data-metal]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.metal === key)));
    out.textContent = METALS[key].name;
  });
}
