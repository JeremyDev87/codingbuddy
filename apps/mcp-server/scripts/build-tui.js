#!/usr/bin/env node
/**
 * Bundle TUI Agent Monitor as ESM.
 *
 * ink v6+ is ESM-only with top-level await, which cannot be loaded
 * via require() in the CJS NestJS build. This script bundles the TUI
 * rendering code as an ESM module (.mjs) that main.js loads via
 * a real dynamic import().
 */
const esbuild = require('esbuild');

esbuild
  .build({
    entryPoints: ['src/tui/index.tsx'],
    bundle: true,
    format: 'esm',
    outfile: 'dist/src/tui-bundle.mjs',
    platform: 'node',
    jsx: 'transform',
    banner: {
      js: "import { createRequire as __cr } from 'module'; const require = __cr(import.meta.url);",
    },
    plugins: [
      {
        name: 'externalize-node-modules',
        setup(build) {
          build.onResolve({ filter: /^[^./]/ }, args => {
            // Bundle eventemitter2 (CJS named export incompatible with ESM import)
            if (args.path === 'eventemitter2') return;
            return { path: args.path, external: true };
          });
        },
      },
    ],
  })
  .then(() => console.log('TUI ESM bundle built: dist/src/tui-bundle.mjs'))
  .catch(e => {
    console.error('TUI bundle failed:', e.message);
    process.exit(1);
  });
