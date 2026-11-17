import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1500,
    rollupOptions: { output: { manualChunks: id => (id.includes('node_modules/three') || id.includes('@react-three') || id.includes('three-mesh-bvh') || id.includes('three-stdlib')) ? 'three' : undefined } },
  },
});
