import { defineConfig } from 'vite';

export default defineConfig({
  base: '/img2svg/',
  build: {
    outDir: 'dist',
  },
  optimizeDeps: {
    include: ['imagetracerjs'],
  },
});
