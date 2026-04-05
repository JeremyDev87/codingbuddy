#!/usr/bin/env node
'use strict';

const path = require('path');
const fs = require('fs');

// Run legacy hook migration on every install (idempotent, safe for CI).
// See packages/claude-code-plugin/scripts/migrate-legacy-hooks.js and
// issues #1381 / #1384.
try {
  const { migrateLegacyHooks } = require('./migrate-legacy-hooks');
  migrateLegacyHooks();
} catch (err) {
  // Never block `npm install` on a migration failure. Surface the error so
  // users can report it, then continue.
  console.warn(
    '[CodingBuddy Plugin] legacy hook migration skipped:',
    err && err.message ? err.message : err,
  );
}

// Skip banner in CI environments (migration still ran above).
if (process.env.CI === 'true' || process.env.CI === '1') {
  process.exit(0);
}

// Read version from package.json
let version = 'unknown';
try {
  const pkgPath = path.join(__dirname, '..', 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  version = pkg.version || 'unknown';
} catch {
  // silently fall back to 'unknown'
}

const banner = `
\x1b[36m╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
│                                              │
│           ╭━━━╮                              │
│           ┃ ◕‿◕ ┃  Hey! I am CodingBuddy!    │
│           ╰━┳━╯                              │
│          ╭──┻──╮   Your new coding buddy.    │
│          │ CB  │                              │
│          ╰─────╯   v${version.padEnd(27)}│
│                                              │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│                                              │
│   35 specialist agents ready                 │
│   PLAN → ACT → EVAL workflow                 │
│   TDD-first development                     │
│                                              │
│   Start a session and I will introduce       │
│   myself!                                    │
│                                              │
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯\x1b[0m

\x1b[33m[CodingBuddy Plugin]\x1b[0m For full MCP tools support, install codingbuddy globally:
  npm install -g codingbuddy

Documentation: https://github.com/JeremyDev87/codingbuddy
`;

console.log(banner);
