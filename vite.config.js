import { defineConfig } from 'vite';
import { resolve } from 'path';

// Static institutional site + admin panel. `base: './'` keeps emitted asset
// URLs relative, so the build works whether served from a domain root
// (Hostinger) or a sub-path. Two HTML entry points are emitted to `dist/`:
//   index.html  -> public site
//   admin.html  -> admin panel
// On Hostinger the Express server (server/index.js) serves `dist/` and the
// /api routes; the build step runs first (`npm run build`).
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
      },
    },
  },
});
