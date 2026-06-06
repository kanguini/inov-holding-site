import { defineConfig } from 'vite';

// Static institutional site. `base: './'` keeps emitted asset URLs relative,
// so the build works whether served from a domain root (Hostinger) or a
// sub-path. Output goes to `dist/`, which Hostinger serves statically.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
