import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// VITE_DEMO=1 builds the self-contained demo: one JS chunk, so the whole app can
// be inlined into a single HTML file (see scripts/build-demo.mjs).
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  build: process.env.VITE_DEMO === '1'
    ? { outDir: 'dist-demo', rollupOptions: { output: { inlineDynamicImports: true } } }
    : {},
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
      '/ws': { target: 'ws://localhost:3000', ws: true },
    },
  },
}));
