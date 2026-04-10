'use strict';

const fs = require('node:fs');
const path = require('node:path');

/**
 * Supported AI coding tool definitions.
 * Each entry maps a tool name to its config directory and indicator file.
 */
const AI_TOOLS = [
  { name: 'cursor', configDir: '.cursor', indicator: 'rules' },
  { name: 'claude-code', configDir: '.claude', indicator: 'settings.json' },
  { name: 'codex', configDir: '.codex', indicator: 'instructions.md' },
  { name: 'antigravity', configDir: '.antigravity', indicator: 'instructions.md' },
  { name: 'amazon-q', configDir: '.q', indicator: 'settings.json' },
  { name: 'kiro', configDir: '.kiro', indicator: 'settings.json' },
];

/**
 * Detect installed AI coding tools by scanning for their config directories.
 * @param {string} cwd - Directory to scan
 * @returns {Array<{ name: string, configDir: string, indicator: string, exists: boolean, hasConfig: boolean }>}
 */
function detectTools(cwd) {
  return AI_TOOLS.map(tool => {
    const dirPath = path.join(cwd, tool.configDir);
    const exists = fs.existsSync(dirPath);
    const hasConfig =
      exists && fs.existsSync(path.join(dirPath, tool.indicator));
    return {
      name: tool.name,
      configDir: tool.configDir,
      indicator: tool.indicator,
      exists,
      hasConfig,
    };
  });
}

module.exports = { detectTools, AI_TOOLS };
