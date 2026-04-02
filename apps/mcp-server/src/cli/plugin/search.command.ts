/**
 * Plugin Search Command
 *
 * CLI command handler for `codingbuddy search <query>`.
 * Fetches the registry index and searches for matching plugins.
 */

import {
  RegistryClient,
  RegistryPlugin,
  RegistryPluginProvides,
} from '../../plugin/registry-client';
import { createConsoleUtils } from '../utils/console';

// ============================================================================
// Types
// ============================================================================

export interface SearchCommandOptions {
  query: string;
}

export interface SearchCommandResult {
  success: boolean;
  count: number;
  error?: string;
}

// ============================================================================
// Helpers
// ============================================================================

function formatProvides(provides: RegistryPluginProvides): string {
  const parts: string[] = [];

  const agents = provides.agents?.length ?? 0;
  const rules = provides.rules?.length ?? 0;
  const skills = provides.skills?.length ?? 0;
  const checklists = provides.checklists?.length ?? 0;

  if (agents > 0) parts.push(`${agents} agent${agents !== 1 ? 's' : ''}`);
  if (rules > 0) parts.push(`${rules} rule${rules !== 1 ? 's' : ''}`);
  if (skills > 0) parts.push(`${skills} skill${skills !== 1 ? 's' : ''}`);
  if (checklists > 0) parts.push(`${checklists} checklist${checklists !== 1 ? 's' : ''}`);

  return parts.length > 0 ? parts.join(', ') : 'no assets';
}

function printPlugin(console: ReturnType<typeof createConsoleUtils>, plugin: RegistryPlugin): void {
  console.log.step('  ', `${plugin.name} (${plugin.version}) — ${plugin.description}`);
  if (plugin.tags.length > 0) {
    console.log.step('  ', `  Tags: ${plugin.tags.join(', ')}`);
  }
  console.log.step('  ', `  Provides: ${formatProvides(plugin.provides)}`);
  console.log.step('  ', `  Install: codingbuddy install ${plugin.name}`);
}

// ============================================================================
// Command
// ============================================================================

export async function runSearch(options: SearchCommandOptions): Promise<SearchCommandResult> {
  const console = createConsoleUtils();
  const client = new RegistryClient();

  try {
    const results = await client.search(options.query);

    if (results.length === 0) {
      console.log.info(`No plugins found matching "${options.query}"`);
      return { success: true, count: 0 };
    }

    console.log.step('🔍', `Search results for "${options.query}":\n`);

    for (const plugin of results) {
      printPlugin(console, plugin);
      process.stdout.write('\n');
    }

    console.log.info(
      `Found ${results.length} plugin${results.length !== 1 ? 's' : ''} matching "${options.query}"`,
    );

    return { success: true, count: results.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log.error(`Search failed: ${message}`);
    return { success: false, count: 0, error: message };
  }
}
