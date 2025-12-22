#!/usr/bin/env node
/**
 * Link workspace package binaries to node_modules/.bin
 *
 * This script creates executable shims for workspace packages,
 * enabling `npx codingbuddy` to work within the monorepo.
 *
 * Cross-platform: Creates symlinks on Unix, .cmd shims on Windows.
 */

const fs = require('fs');
const path = require('path');

const WORKSPACE_BINS = [
  {
    name: 'codingbuddy',
    target: 'apps/mcp-server/dist/src/cli/cli.js',
  },
];

const BIN_DIR = path.join(__dirname, '..', 'node_modules', '.bin');
const isWindows = process.platform === 'win32';

/**
 * Create Unix shell shim
 */
function createUnixShim(binPath, targetPath) {
  const shim = `#!/bin/sh
basedir=$(dirname "$(echo "$0" | sed -e 's,\\\\,/,g')")
exec node "$basedir/${targetPath}" "$@"
`;
  fs.writeFileSync(binPath, shim, { mode: 0o755 });
}

/**
 * Create Windows cmd shim
 */
function createWindowsShim(binPath, targetPath) {
  const cmdShim = `@ECHO off
GOTO start
:find_dp0
SET dp0=%~dp0
EXIT /b
:start
SETLOCAL
CALL :find_dp0
node "%dp0%\\${targetPath.replace(/\//g, '\\')}" %*
`;
  fs.writeFileSync(binPath + '.cmd', cmdShim);

  // Also create PowerShell shim
  const ps1Shim = `#!/usr/bin/env pwsh
$basedir=Split-Path $MyInvocation.MyCommand.Definition -Parent
$exe=""
if ($PSVersionTable.PSVersion -lt "6.0" -or $IsWindows) {
  $exe=".exe"
}
& "$basedir/../node$exe" "$basedir/${targetPath}" $args
`;
  fs.writeFileSync(binPath + '.ps1', ps1Shim);
}

/**
 * Link a single binary
 */
function linkBin({ name, target }) {
  const targetFullPath = path.join(__dirname, '..', target);
  const binPath = path.join(BIN_DIR, name);
  const relativePath = path.relative(BIN_DIR, targetFullPath);

  // Check if target exists
  if (!fs.existsSync(targetFullPath)) {
    console.log(`[skip] ${name}: target not found (run build first)`);
    return false;
  }

  // Ensure bin directory exists
  fs.mkdirSync(BIN_DIR, { recursive: true });

  // Remove existing files
  try {
    fs.unlinkSync(binPath);
  } catch {}
  try {
    fs.unlinkSync(binPath + '.cmd');
  } catch {}
  try {
    fs.unlinkSync(binPath + '.ps1');
  } catch {}

  // Create shims
  if (isWindows) {
    createWindowsShim(binPath, relativePath);
    console.log(`[link] ${name} -> ${target} (.cmd + .ps1)`);
  } else {
    createUnixShim(binPath, relativePath);
    console.log(`[link] ${name} -> ${target}`);
  }

  // Ensure target is executable
  try {
    fs.chmodSync(targetFullPath, 0o755);
  } catch {}

  return true;
}

// Main
console.log('Linking workspace binaries...');
let linked = 0;

for (const bin of WORKSPACE_BINS) {
  if (linkBin(bin)) {
    linked++;
  }
}

console.log(`Done: ${linked}/${WORKSPACE_BINS.length} binaries linked`);
