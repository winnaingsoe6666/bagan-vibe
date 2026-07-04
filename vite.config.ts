import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: {
    include: ['three', '@dimforge/rapier3d-compat']
  },
  server: {
    port: 3000,
    open: true
  }
});
