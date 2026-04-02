/**
 * Plugin Update Command
 *
 * CLI command handler for `codingbuddy update [name]`.
 * Checks installed plugins against the registry for newer versions
 * and re-installs outdated plugins.
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { RegistryClient } from '../../plugin/registry-client';
import { PluginInstallerService } from '../../plugin/plugin-installer.service';
import { createConsoleUtils } from '../utils/console';

// ============================================================================
// Types
// ============================================================================

export interface UpdateCommandOptions {
  projectRoot: string;
  pluginName?: string;
}

export interface UpdateCommandResult {
  success: boolean;
  checked: number;
  updated: number;
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
// Helpers
// ============================================================================

/**
 * Compare two semver strings. Returns negative if a < b, 0 if equal, positive if a > b.
 */
function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    const diff = (partsA[i] ?? 0) - (partsB[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

// ============================================================================
// Command
// ============================================================================

export async function runUpdate(options: UpdateCommandOptions): Promise<UpdateCommandResult> {
  const console = createConsoleUtils();
  const pluginsJsonPath = join(options.projectRoot, '.codingbuddy', 'plugins.json');

  // 1. Read installed plugins
  if (!existsSync(pluginsJsonPath)) {
    console.log.info('No plugins installed.');
    return { success: true, checked: 0, updated: 0 };
  }

  let registry: PluginsRegistry;
  try {
    const raw = readFileSync(pluginsJsonPath, 'utf-8');
    registry = JSON.parse(raw) as PluginsRegistry;
  } catch {
    console.log.error('Failed to read plugins.json. File may be corrupted.');
    return { success: false, checked: 0, updated: 0, error: 'Corrupted plugins.json' };
  }

  // 2. Filter to specific plugin if name provided
  let pluginsToCheck = registry.plugins;

  if (options.pluginName) {
    const found = registry.plugins.find(p => p.name === options.pluginName);
    if (!found) {
      console.log.error(`Plugin "${options.pluginName}" is not installed.`);
      return { success: false, checked: 0, updated: 0, error: 'Plugin not installed' };
    }
    pluginsToCheck = [found];
  }

  if (pluginsToCheck.length === 0) {
    console.log.info('No plugins installed.');
    return { success: true, checked: 0, updated: 0 };
  }

  // 3. Fetch registry index
  const client = new RegistryClient();
  let registryIndex;
  try {
    registryIndex = await client.fetchIndex();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log.error(`Failed to fetch registry: ${message}`);
    return { success: false, checked: 0, updated: 0, error: message };
  }

  // 4. Compare versions
  console.log.step('🔍', 'Checking for plugin updates...\n');

  const outdated: Array<{ installed: PluginRecord; latestVersion: string }> = [];

  for (const installed of pluginsToCheck) {
    const registryEntry = registryIndex.plugins.find(p => p.name === installed.name);

    if (!registryEntry) {
      console.log.warn(`${installed.name}: not found in registry, skipping.`);
      continue;
    }

    if (compareVersions(registryEntry.version, installed.version) > 0) {
      outdated.push({ installed, latestVersion: registryEntry.version });
      console.log.step('📦', `${installed.name}: ${installed.version} → ${registryEntry.version}`);
    }
  }

  if (outdated.length === 0) {
    console.log.success('All plugins are up-to-date.');
    return { success: true, checked: pluginsToCheck.length, updated: 0 };
  }

  // 5. Update outdated plugins
  const installer = new PluginInstallerService();
  let updatedCount = 0;
  let hasFailure = false;

  for (const { installed, latestVersion } of outdated) {
    console.log.step('⬆️', `Updating ${installed.name} to ${latestVersion}...`);

    const result = await installer.install({
      source: installed.source,
      targetRoot: options.projectRoot,
      force: true,
    });

    if (result.success) {
      console.log.success(`Updated ${installed.name} to ${latestVersion}`);
      updatedCount++;
    } else {
      console.log.error(`Failed to update ${installed.name}: ${result.error}`);
      hasFailure = true;
    }
  }

  // 6. Summary
  if (updatedCount > 0) {
    console.log.info(`Updated ${updatedCount} plugin${updatedCount !== 1 ? 's' : ''}.`);
  }

  return {
    success: !hasFailure,
    checked: pluginsToCheck.length,
    updated: updatedCount,
  };
}
