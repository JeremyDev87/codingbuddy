/**
 * Config Writer
 *
 * Writes CodingBuddy configuration files
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { CodingBuddyConfig } from '../../config';

/**
 * Supported config file names
 */
export const CONFIG_FILE_NAMES = [
  'codingbuddy.config.js',
  'codingbuddy.config.json',
] as const;

/**
 * Config file format
 */
export type ConfigFormat = 'js' | 'json';

/**
 * Write options
 */
export interface WriteConfigOptions {
  /** Output format (default: 'js') */
  format?: ConfigFormat;
}

/**
 * Format config as JavaScript module
 */
export function formatConfigAsJs(config: CodingBuddyConfig): string {
  const jsonContent = JSON.stringify(config, null, 2);

  return `/** @type {import('codingbuddy').CodingBuddyConfig} */
module.exports = ${jsonContent};
`;
}

/**
 * Format config as JSON
 */
export function formatConfigAsJson(config: CodingBuddyConfig): string {
  return JSON.stringify(config, null, 2) + '\n';
}

/**
 * Find existing config file in project root
 *
 * @returns Path to existing config file, or null if none exists
 */
export async function findExistingConfig(
  projectRoot: string,
): Promise<string | null> {
  for (const fileName of CONFIG_FILE_NAMES) {
    const filePath = path.join(projectRoot, fileName);
    try {
      await fs.access(filePath);
      return filePath;
    } catch {
      // File doesn't exist, try next
    }
  }
  return null;
}

/**
 * Write configuration file to project root
 *
 * @param projectRoot - Project root directory
 * @param config - Configuration to write
 * @param options - Write options
 * @returns Path to written file
 */
export async function writeConfig(
  projectRoot: string,
  config: CodingBuddyConfig,
  options: WriteConfigOptions = {},
): Promise<string> {
  const format = options.format ?? 'js';

  const fileName =
    format === 'json' ? 'codingbuddy.config.json' : 'codingbuddy.config.js';

  const content =
    format === 'json' ? formatConfigAsJson(config) : formatConfigAsJs(config);

  const filePath = path.join(projectRoot, fileName);

  await fs.writeFile(filePath, content, 'utf-8');

  return filePath;
}
