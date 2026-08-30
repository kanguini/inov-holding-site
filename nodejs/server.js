// Entry point for Hostinger's LiteSpeed Node runtime (lsnode.js), which loads
// <app root>/nodejs/server.js and nothing else. The application itself lives in
// server/ and is ESM, so this CommonJS shim hands off with a dynamic import.
// The sibling package.json pins this folder to CommonJS; the rest of the
// project stays "type": "module".
process.chdir(__dirname + '/..');

import('../server/index.js').catch((err) => {
  console.error('[inov] failed to load application:', err);
  process.exit(1);
});
