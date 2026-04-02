/**
 * Plugin Uninstall Command
 *
 * CLI command handler for `codingbuddy uninstall <name>`.
 * Removes plugin files from .ai-rules/ and updates .codingbuddy/plugins.json.
 */

import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { createConsoleUtils } from '../utils/console';

// ============================================================================
// Types
// ============================================================================

export interface UninstallCommandOptions {
  pluginName: string;
  projectRoot: string;
  yes: boolean;
}

export interface UninstallCommandResult {
  success: boolean;
  error?: string;
  confirmationRequired?: boolean;
  pluginSummary?: string;
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
// File extension mapping per asset type
// ============================================================================

const ASSET_EXTENSIONS: Record<string, string> = {
  agents: '.json',
  rules: '.md',
  skills: '.md',
  checklists: '.md',
};

const ASSET_DIRS = ['agents', 'rules', 'skills', 'checklists'] as const;

// ============================================================================
// Command
// ============================================================================

/**
 * Remove installed files for a plugin from .ai-rules/ directories.
 * Skips files that have already been deleted.
 */
function removePluginFiles(aiRulesDir: string, provides: PluginRecord['provides']): number {
  let removedCount = 0;

  for (const dir of ASSET_DIRS) {
    const names = provides[dir] ?? [];
    const ext = ASSET_EXTENSIONS[dir];

    for (const name of names) {
      const filePath = join(aiRulesDir, dir, `${name}${ext}`);
      if (existsSync(filePath)) {
        unlinkSync(filePath);
        removedCount++;
      }
    }
  }

  return removedCount;
}

/**
 * Build a human-readable summary of what will be removed.
 */
function buildSummary(plugin: PluginRecord): string {
  const parts: string[] = [];
  if (plugin.provides.agents.length > 0) parts.push(`${plugin.provides.agents.length} agents`);
  if (plugin.provides.rules.length > 0) parts.push(`${plugin.provides.rules.length} rules`);
  if (plugin.provides.skills.length > 0) parts.push(`${plugin.provides.skills.length} skills`);
  if (plugin.provides.checklists.length > 0)
    parts.push(`${plugin.provides.checklists.length} checklists`);
  return parts.length > 0 ? `Removing ${parts.join(', ')}` : 'No assets to remove';
}

/**
 * Uninstall a plugin by name.
 */
export function runUninstall(options: UninstallCommandOptions): UninstallCommandResult {
  const console = createConsoleUtils();
  const pluginsJsonPath = join(options.projectRoot, '.codingbuddy', 'plugins.json');

  // 1. Read registry
  if (!existsSync(pluginsJsonPath)) {
    console.log.error(`Plugin "${options.pluginName}" not found. No plugins are installed.`);
    return { success: false, error: 'Plugin not found' };
  }

  let registry: PluginsRegistry;
  try {
    const raw = readFileSync(pluginsJsonPath, 'utf-8');
    registry = JSON.parse(raw) as PluginsRegistry;
  } catch {
    console.log.error('Failed to read plugins.json. File may be corrupted.');
    return { success: false, error: 'Corrupted plugins.json' };
  }

  // 2. Find plugin
  const plugin = registry.plugins.find(p => p.name === options.pluginName);
  if (!plugin) {
    console.log.error(`Plugin "${options.pluginName}" not found in registry.`);
    return { success: false, error: 'Plugin not found' };
  }

  // 3. Show what will be removed
  const summary = buildSummary(plugin);
  console.log.step('📦', `Uninstalling ${plugin.name}@${plugin.version}...`);
  console.log.step('  ', summary);

  // 4. Confirmation check (when --yes is not set)
  if (!options.yes) {
    return {
      success: false,
      confirmationRequired: true,
      pluginSummary: `${plugin.name}@${plugin.version}: ${summary}`,
    };
  }

  // 5. Remove files
  const aiRulesDir = join(options.projectRoot, '.ai-rules');
  removePluginFiles(aiRulesDir, plugin.provides);

  // 6. Update registry
  registry.plugins = registry.plugins.filter(p => p.name !== options.pluginName);
  writeFileSync(pluginsJsonPath, JSON.stringify(registry, null, 2), 'utf-8');

  // 7. Success
  console.log.success(`Removed ${plugin.name}`);

  return { success: true };
}
