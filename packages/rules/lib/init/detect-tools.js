'use strict';

const fs = require('node:fs');
const path = require('node:path');

const AI_TOOLS = [
  {
    name: 'Cursor',
    configDir: '.cursor',
    indicator: 'AI rules config',
    rulesPatterns: ['rules/', 'rules.md', 'rules.json'],
    altPaths: ['.cursorrules'],
  },
  {
    name: 'Claude Code',
    configDir: '.claude',
    indicator: 'Plugin/settings',
    rulesPatterns: ['rules/'],
    altPaths: [],
  },
  {
    name: 'Codex',
    configDir: '.codex',
    indicator: 'Codex config',
    rulesPatterns: ['instructions.md'],
    altPaths: [],
  },
  {
    name: 'Antigravity',
    configDir: '.antigravity',
    indicator: 'Gemini config',
    rulesPatterns: ['rules/', 'config.json'],
    altPaths: [],
  },
  {
    name: 'Amazon Q',
    configDir: '.q',
    indicator: 'Q config',
    rulesPatterns: ['rules/', 'settings.json'],
    altPaths: [],
  },
  {
    name: 'Kiro',
    configDir: '.kiro',
    indicator: 'Kiro config',
    rulesPatterns: ['rules/', 'config.json'],
    altPaths: [],
  },
];

/**
 * Detect installed AI coding tools in the given directory.
 * @param {string} cwd - Directory to scan
 * @returns {Array<{ name: string, configDir: string, exists: boolean, hasRules: boolean, configFiles: string[], indicator: string }>}
 */
function detectTools(cwd) {
  return AI_TOOLS.map(tool => {
    const dirPath = path.join(cwd, tool.configDir);
    const dirExists = fs.existsSync(dirPath);

    // Check alternative paths (e.g. .cursorrules)
    const altExists = tool.altPaths.some(alt => fs.existsSync(path.join(cwd, alt)));
    const exists = dirExists || altExists;

    let configFiles = [];
    let hasRules = false;

    if (dirExists) {
      configFiles = listConfigFiles(dirPath);
      hasRules = tool.rulesPatterns.some(pattern => {
        const fullPath = path.join(dirPath, pattern);
        return fs.existsSync(fullPath);
      });
    }

    if (altExists) {
      for (const alt of tool.altPaths) {
        if (fs.existsSync(path.join(cwd, alt))) {
          configFiles.push(alt);
          hasRules = true;
        }
      }
    }

    return {
      name: tool.name,
      configDir: tool.configDir,
      exists,
      hasRules,
      configFiles,
      indicator: tool.indicator,
    };
  });
}

/**
 * List files in a config directory (non-recursive, top-level only).
 * @param {string} dirPath - Directory to list
 * @returns {string[]}
 */
function listConfigFiles(dirPath) {
  try {
    return fs.readdirSync(dirPath).filter(entry => {
      const fullPath = path.join(dirPath, entry);
      try {
        return fs.statSync(fullPath).isFile();
      } catch {
        return false;
      }
    });
  } catch {
    return [];
  }
}

module.exports = { detectTools, AI_TOOLS };
