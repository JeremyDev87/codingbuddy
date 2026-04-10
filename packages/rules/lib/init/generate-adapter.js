'use strict';

const fs = require('node:fs');
const path = require('node:path');

/**
 * Maps tool names to their adapter template file and output target path.
 */
const ADAPTER_MAP = {
  cursor: { adapter: 'cursor.md', target: '.cursor/rules/codingbuddy.mdc' },
  'claude-code': { adapter: 'claude-code.md', target: '.claude/CLAUDE.md' },
  codex: { adapter: 'codex.md', target: '.codex/instructions.md' },
  antigravity: { adapter: 'antigravity.md', target: '.antigravity/instructions.md' },
  'amazon-q': { adapter: 'q.md', target: '.q/rules/codingbuddy.md' },
  kiro: { adapter: 'kiro.md', target: '.kiro/rules/codingbuddy.md' },
};

/**
 * Generate adapter-specific configs for detected AI tools from shared .ai-rules.
 * @param {string} cwd - Project root directory
 * @param {Array<{ name: string }>} detectedTools - Tools to generate configs for
 * @param {{ dryRun?: boolean, force?: boolean }} [options]
 * @returns {{ generated: Array, backedUp: Array, skipped: Array }}
 */
function generateAdapterConfigs(cwd, detectedTools, options) {
  const { dryRun = false, force = false } = options || {};
  const result = { generated: [], backedUp: [], skipped: [] };
  const adaptersDir = path.join(cwd, '.ai-rules', 'adapters');

  for (const tool of detectedTools) {
    if (!Object.hasOwn(ADAPTER_MAP, tool.name)) {
      result.skipped.push({ tool: tool.name, reason: 'no adapter mapping' });
      continue;
    }

    const mapping = ADAPTER_MAP[tool.name];
    const adapterPath = path.join(adaptersDir, mapping.adapter);
    if (!fs.existsSync(adapterPath)) {
      result.skipped.push({ tool: tool.name, reason: 'adapter template not found' });
      continue;
    }

    const targetPath = path.join(cwd, mapping.target);

    if (dryRun) {
      result.generated.push({ tool: tool.name, path: mapping.target, action: 'would-create' });
      continue;
    }

    // Read adapter template (only when not dry-run)
    const content = fs.readFileSync(adapterPath, 'utf-8');

    // Backup existing config unless --force; skip symlinks for safety
    if (fs.existsSync(targetPath) && !force) {
      const stat = fs.lstatSync(targetPath);
      if (!stat.isSymbolicLink()) {
        const backupDir = path.join(cwd, '.codingbuddy-backup');
        fs.mkdirSync(backupDir, { recursive: true });
        const timestamp = Date.now();
        const backupName = path.basename(mapping.target) + '.' + timestamp + '.bak';
        const backupPath = path.join(backupDir, tool.name + '-' + backupName);
        fs.copyFileSync(targetPath, backupPath);
        result.backedUp.push({ tool: tool.name, from: mapping.target, to: backupPath });
      }
    }

    // Write adapter config
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, content, 'utf-8');
    result.generated.push({ tool: tool.name, path: mapping.target, action: 'created' });
  }

  return result;
}

module.exports = { generateAdapterConfigs, ADAPTER_MAP };
