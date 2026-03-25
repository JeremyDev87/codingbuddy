#!/usr/bin/env npx tsx
/**
 * CLI entry point for sync-settings.
 *
 * Usage:
 *   npx tsx scripts/sync-settings/index.ts            # sync all tools
 *   npx tsx scripts/sync-settings/index.ts cursor      # sync single tool
 *   npx tsx scripts/sync-settings/index.ts cursor kiro # sync multiple tools
 */

import path from 'node:path';
import { syncSettings } from './sync';
import type { ToolName } from './types';

const VALID_TOOLS: ToolName[] = ['cursor', 'claude', 'antigravity', 'codex', 'q', 'kiro'];

async function main(): Promise<void> {
  const projectRoot = path.resolve(__dirname, '../..');
  const args = process.argv.slice(2);

  // Validate tool names if provided
  const tools: ToolName[] | undefined =
    args.length > 0
      ? args.map(arg => {
          if (!VALID_TOOLS.includes(arg as ToolName)) {
            console.error(`Unknown tool: ${arg}. Valid tools: ${VALID_TOOLS.join(', ')}`);
            process.exit(1);
          }
          return arg as ToolName;
        })
      : undefined;

  console.log(
    tools ? `Syncing settings for: ${tools.join(', ')}` : 'Syncing settings for all tools...',
  );

  const result = await syncSettings(projectRoot, tools ? { tools } : undefined);

  console.log(`\nDone! ${result.filesWritten} file(s) written:`);
  for (const f of result.files) {
    console.log(`  ✓ ${f}`);
  }
}

main().catch(err => {
  console.error('Sync failed:', err);
  process.exit(1);
});
