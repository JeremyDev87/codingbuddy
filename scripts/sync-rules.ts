#!/usr/bin/env npx tsx
/**
 * sync-rules — Keep tool-specific config files in sync with .ai-rules/ (Single Source of Truth).
 *
 * Usage:
 *   npx tsx scripts/sync-rules.ts              # sync all tools (write files)
 *   npx tsx scripts/sync-rules.ts --dry-run    # preview changes without writing
 *   npx tsx scripts/sync-rules.ts --check      # CI validation — exit 1 if out of sync
 *   npx tsx scripts/sync-rules.ts cursor       # sync single tool
 *   npx tsx scripts/sync-rules.ts --check kiro # check single tool
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { readAgents, readRules } from './sync-settings/readers';
import { generateAll, generateForTool } from './sync-settings/generators';
import type { GeneratedFile, SourceData, ToolName } from './sync-settings/types';

const VALID_TOOLS: ToolName[] = ['cursor', 'claude', 'antigravity', 'codex', 'q', 'kiro'];

export interface SyncRulesOptions {
  dryRun?: boolean;
  check?: boolean;
  tools?: ToolName[];
}

export interface FileChange {
  relativePath: string;
  status: 'added' | 'modified' | 'unchanged';
}

export interface SyncRulesResult {
  changes: FileChange[];
  outOfSync: boolean;
}

/**
 * Read .ai-rules source data.
 */
export async function readSourceData(projectRoot: string): Promise<SourceData> {
  const aiRulesBase = path.join(projectRoot, 'packages/rules/.ai-rules');
  return {
    agents: await readAgents(path.join(aiRulesBase, 'agents')),
    rules: await readRules(path.join(aiRulesBase, 'rules'), 'packages/rules/.ai-rules/rules'),
  };
}

/**
 * Generate files for the requested tools.
 */
export function generateFiles(data: SourceData, tools?: ToolName[]): GeneratedFile[] {
  return tools ? tools.flatMap(t => generateForTool(t, data)) : generateAll(data);
}

/**
 * Compare generated content with what's on disk.
 * Returns changes with status for each file.
 */
export async function diffFiles(
  projectRoot: string,
  files: GeneratedFile[],
): Promise<FileChange[]> {
  const changes: FileChange[] = [];

  for (const file of files) {
    const absPath = path.join(projectRoot, file.relativePath);
    let current: string | null = null;
    try {
      current = await fs.readFile(absPath, 'utf-8');
    } catch {
      // file does not exist
    }

    if (current === null) {
      changes.push({ relativePath: file.relativePath, status: 'added' });
    } else if (current !== file.content) {
      changes.push({ relativePath: file.relativePath, status: 'modified' });
    } else {
      changes.push({ relativePath: file.relativePath, status: 'unchanged' });
    }
  }

  return changes;
}

/**
 * Write generated files to disk.
 */
export async function writeFiles(
  projectRoot: string,
  files: GeneratedFile[],
): Promise<void> {
  for (const file of files) {
    const absPath = path.join(projectRoot, file.relativePath);
    await fs.mkdir(path.dirname(absPath), { recursive: true });
    await fs.writeFile(absPath, file.content, 'utf-8');
  }
}

/**
 * Run sync-rules with the given options.
 */
export async function syncRules(
  projectRoot: string,
  options: SyncRulesOptions = {},
): Promise<SyncRulesResult> {
  const data = await readSourceData(projectRoot);
  const files = generateFiles(data, options.tools);
  const changes = await diffFiles(projectRoot, files);
  const outOfSync = changes.some(c => c.status !== 'unchanged');

  if (!options.dryRun && !options.check && outOfSync) {
    await writeFiles(projectRoot, files);
  }

  return { changes, outOfSync };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv: string[]): SyncRulesOptions {
  const args = argv.slice(2);
  const options: SyncRulesOptions = {};
  const toolArgs: string[] = [];

  for (const arg of args) {
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--check') {
      options.check = true;
    } else {
      toolArgs.push(arg);
    }
  }

  if (toolArgs.length > 0) {
    options.tools = toolArgs.map(arg => {
      if (!VALID_TOOLS.includes(arg as ToolName)) {
        console.error(`Unknown tool: ${arg}. Valid tools: ${VALID_TOOLS.join(', ')}`);
        process.exit(1);
      }
      return arg as ToolName;
    });
  }

  return options;
}

function formatStatus(status: FileChange['status']): string {
  switch (status) {
    case 'added':
      return '+ (new)';
    case 'modified':
      return '~ (modified)';
    case 'unchanged':
      return '= (up to date)';
  }
}

async function main(): Promise<void> {
  const projectRoot = path.resolve(__dirname, '..');
  const options = parseArgs(process.argv);

  const scope = options.tools ? options.tools.join(', ') : 'all tools';

  if (options.check) {
    console.log(`Checking sync status for: ${scope}`);
  } else if (options.dryRun) {
    console.log(`Dry run for: ${scope}`);
  } else {
    console.log(`Syncing rules for: ${scope}`);
  }

  const result = await syncRules(projectRoot, options);

  // Print status for each file
  for (const change of result.changes) {
    console.log(`  ${formatStatus(change.status)}  ${change.relativePath}`);
  }

  const changedCount = result.changes.filter(c => c.status !== 'unchanged').length;

  if (options.check) {
    if (result.outOfSync) {
      console.error(`\nOut of sync! ${changedCount} file(s) differ from .ai-rules/ source.`);
      console.error('Run `yarn sync-rules` to update.');
      process.exit(1);
    } else {
      console.log('\nAll files are in sync.');
    }
  } else if (options.dryRun) {
    if (result.outOfSync) {
      console.log(`\n${changedCount} file(s) would be updated.`);
    } else {
      console.log('\nAll files are already in sync. No changes needed.');
    }
  } else {
    if (changedCount > 0) {
      console.log(`\nDone! ${changedCount} file(s) updated.`);
    } else {
      console.log('\nAll files already in sync. Nothing to do.');
    }
  }
}

main().catch(err => {
  console.error('sync-rules failed:', err);
  process.exit(1);
});
