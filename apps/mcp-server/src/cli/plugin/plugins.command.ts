/**
 * Plugin List Command
 *
 * CLI command handler for `codingbuddy plugins`.
 * Reads .codingbuddy/plugins.json and displays installed plugins.
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { createConsoleUtils } from '../utils/console';

// ============================================================================
// Types
// ============================================================================

export interface PluginsCommandOptions {
  projectRoot: string;
}

export interface PluginsCommandResult {
  success: boolean;
  count: number;
  error?: string;
}

interface PluginRecord {
  name: string;
  version: string;
  source: string;
  installedAt: string;
  provides: {
    agents: string[];
    rules: string[];
    skills: string[];
    checklists: string[];
  };
}

interface PluginsRegistry {
  plugins: PluginRecord[];
}

// ============================================================================
// Command
// ============================================================================

/**
 * Format asset counts for display.
 * Only shows categories that have items.
 */
function formatAssetCounts(provides: PluginRecord['provides']): string {
  const parts: string[] = [];

  if (provides.agents.length > 0) {
    parts.push(`${provides.agents.length} agents`);
  }
  if (provides.rules.length > 0) {
    parts.push(`${provides.rules.length} rules`);
  }
  if (provides.skills.length > 0) {
    parts.push(`${provides.skills.length} skills`);
  }
  if (provides.checklists.length > 0) {
    parts.push(`${provides.checklists.length} checklists`);
  }

  return parts.length > 0 ? `(${parts.join(', ')})` : '(no assets)';
}

/**
 * List installed plugins from .codingbuddy/plugins.json.
 */
export function runPlugins(options: PluginsCommandOptions): PluginsCommandResult {
  const console = createConsoleUtils();
  const pluginsJsonPath = join(options.projectRoot, '.codingbuddy', 'plugins.json');

  // Handle missing file
  if (!existsSync(pluginsJsonPath)) {
    console.log.info('No plugins installed.');
    return { success: true, count: 0 };
  }

  // Read and parse registry
  let registry: PluginsRegistry;
  try {
    const raw = readFileSync(pluginsJsonPath, 'utf-8');
    registry = JSON.parse(raw) as PluginsRegistry;
  } catch {
    console.log.error('Failed to read plugins.json. File may be corrupted.');
    return { success: false, count: 0, error: 'Corrupted plugins.json' };
  }

  // Empty registry
  if (!registry.plugins || registry.plugins.length === 0) {
    console.log.info('No plugins installed.');
    return { success: true, count: 0 };
  }

  // Display plugins
  console.log.info('Installed plugins:');

  for (const plugin of registry.plugins) {
    const counts = formatAssetCounts(plugin.provides);
    console.log.step('  ', `${plugin.name} ${plugin.version} ${counts}`);
  }

  console.log.info(
    `\nTotal: ${registry.plugins.length} plugin${registry.plugins.length !== 1 ? 's' : ''}`,
  );

  return { success: true, count: registry.plugins.length };
}
