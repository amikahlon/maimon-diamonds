import { createRoot } from 'react-dom/client';
import { bridge } from '../state.js';
import { Experience } from './Experience.jsx';

/** Mounts the 3D layer behind the page's DOM. Everything else stays vanilla. */
export function mount(el, { updateLabels }) {
  createRoot(el).render(<Experience updateLabels={updateLabels} onReady={() => bridge.ready?.()} />);
}
