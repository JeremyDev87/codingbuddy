'use strict';

const fs = require('node:fs');
const path = require('node:path');

/**
 * Mapping from tool name to adapter source file and output target path.
 */
const ADAPTER_MAP = {
  cursor: {
    adapterFile: 'cursor.md',
    outputPath: path.join('.cursor', 'rules', 'codingbuddy.mdc'),
  },
  'claude-code': {
    adapterFile: 'claude-code.md',
    outputPath: path.join('.claude', 'CLAUDE.md'),
  },
  codex: {
    adapterFile: 'codex.md',
    outputPath: path.join('.codex', 'instructions.md'),
  },
  antigravity: {
    adapterFile: 'antigravity.md',
    outputPath: path.join('.antigravity', 'instructions.md'),
  },
};

/**
 * Resolve the path to .ai-rules/adapters/ within this package.
 * @returns {string}
 */
function getAdaptersDir() {
  return path.resolve(__dirname, '../../.ai-rules/adapters');
}

/**
 * Generate adapter-specific config files for each detected AI tool.
 * @param {string} cwd - Target directory
 * @param {string[]} detectedTools - Array of tool names (e.g. ['cursor', 'claude-code'])
 * @param {{ dryRun?: boolean, force?: boolean }} options
 * @returns {{ generated: Array<{tool: string, path: string, action: string}>, backedUp: Array<{tool: string, from: string, to: string}>, skipped: Array<{tool: string, reason: string}> }}
 */
function generateAdapterConfigs(cwd, detectedTools, options = {}) {
  const { dryRun = false, force = false } = options;
  const adaptersDir = getAdaptersDir();

  const result = {
    generated: [],
    backedUp: [],
    skipped: [],
  };

  for (const tool of detectedTools) {
    const mapping = ADAPTER_MAP[tool];
    if (!mapping) {
      result.skipped.push({ tool, reason: 'unknown-tool' });
      continue;
    }

    const adapterPath = path.join(adaptersDir, mapping.adapterFile);
    if (!fs.existsSync(adapterPath)) {
      result.skipped.push({ tool, reason: 'adapter-not-found' });
      continue;
    }

    const content = fs.readFileSync(adapterPath, 'utf-8');
    const outputPath = path.join(cwd, mapping.outputPath);

    if (dryRun) {
      const action = fs.existsSync(outputPath) ? 'overwrite' : 'create';
      result.generated.push({ tool, path: outputPath, action });
      continue;
    }

    const exists = fs.existsSync(outputPath);

    if (exists && !force) {
      const backupDir = path.join(cwd, '.codingbuddy-backup');
      const backupPath = path.join(backupDir, mapping.outputPath);
      fs.mkdirSync(path.dirname(backupPath), { recursive: true });
      fs.copyFileSync(outputPath, backupPath);
      result.backedUp.push({ tool, from: outputPath, to: backupPath });
    }

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, content, 'utf-8');
    result.generated.push({
      tool,
      path: outputPath,
      action: exists ? 'overwritten' : 'created',
    });
  }

  return result;
}

module.exports = { generateAdapterConfigs, ADAPTER_MAP };
