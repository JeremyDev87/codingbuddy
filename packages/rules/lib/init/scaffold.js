'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_SOURCE = path.resolve(__dirname, '../../.ai-rules');

// Directories to always scaffold
const SCAFFOLD_DIRS = ['rules', 'agents'];
// Top-level files to always copy
const SCAFFOLD_FILES = ['README.md'];

/**
 * Scaffold .ai-rules/ structure in the target directory.
 * @param {string} cwd - Target directory
 * @param {{ source?: string }} options
 * @returns {{ skipped: boolean, dirs: string[], targetPath: string }}
 */
function scaffold(cwd, options = {}) {
  const source = options.source || DEFAULT_SOURCE;
  const targetDir = path.join(cwd, '.ai-rules');

  if (fs.existsSync(targetDir)) {
    return { skipped: true, dirs: [], targetPath: targetDir };
  }

  fs.mkdirSync(targetDir, { recursive: true });

  const copiedDirs = [];

  // Copy directories
  for (const dir of SCAFFOLD_DIRS) {
    const srcDir = path.join(source, dir);
    if (fs.existsSync(srcDir)) {
      copyDirRecursive(srcDir, path.join(targetDir, dir));
      copiedDirs.push(dir);
    }
  }

  // Copy top-level files
  for (const file of SCAFFOLD_FILES) {
    const srcFile = path.join(source, file);
    if (fs.existsSync(srcFile)) {
      fs.copyFileSync(srcFile, path.join(targetDir, file));
    }
  }

  return { skipped: false, dirs: copiedDirs, targetPath: targetDir };
}

// Directories to skip during recursive copy (runtime state, not project content)
const SKIP_DIRS = new Set(['.omc']);

function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

module.exports = { scaffold };
