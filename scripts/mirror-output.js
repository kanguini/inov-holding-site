// Mirrors the Vite build output (`dist/`) into the directories other platform
// presets look for after a build.
//
// Why this exists: Hostinger's Git deployment auto-detects this repo as
// "Next.js" and, with the default build/output settings, looks for the Next.js
// output directory instead of `dist/`. The build itself succeeds; the deploy
// then fails with "No output directory found after build". Mirroring the
// output makes the deploy succeed whatever directory the preset expects.
//
// `dist/` stays the canonical output — server/index.js serves it and nothing
// else reads these copies. Delete this script (and the `postbuild` hook in
// package.json) once the deployment is configured with output directory
// `dist` explicitly.

import { existsSync, rmSync, cpSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = resolve(ROOT, 'dist');
const TARGETS = ['out', 'build', '.next'];

if (!existsSync(SOURCE)) {
  console.error('[mirror-output] dist/ not found — did `vite build` run?');
  process.exit(1);
}

for (const name of TARGETS) {
  const target = resolve(ROOT, name);
  rmSync(target, { recursive: true, force: true });
  cpSync(SOURCE, target, { recursive: true });
  console.log(`[mirror-output] dist/ -> ${name}/`);
}
