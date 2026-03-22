'use strict';

const fs = require('node:fs');
const path = require('node:path');

/**
 * Generate codingbuddy.config.json in the target directory.
 * @param {string} cwd - Target directory
 * @param {{ language: string, primaryAgent: string, techStack: object }} options
 * @returns {{ created: boolean, skipped: boolean, path: string }}
 */
function generateConfig(cwd, options) {
  const configPath = path.join(cwd, 'codingbuddy.config.json');

  if (fs.existsSync(configPath)) {
    return { created: false, skipped: true, path: configPath };
  }

  const config = {
    version: '1.0.0',
    language: options.language || 'en',
    primaryAgent: options.primaryAgent || 'software-engineer',
    techStack: options.techStack || {},
  };

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');

  return { created: true, skipped: false, path: configPath };
}

module.exports = { generateConfig };
