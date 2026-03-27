#!/usr/bin/env node
'use strict';

// Skip banner in CI environments
if (process.env.CI === 'true' || process.env.CI === '1') {
  process.exit(0);
}

const path = require('path');
const fs = require('fs');

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
