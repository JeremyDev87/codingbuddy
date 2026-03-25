/**
 * Sync orchestrator — reads .ai-rules, generates configs, writes files.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { readAgents, readRules } from './readers';
import { generateAll, generateForTool } from './generators';
import type { SourceData, ToolName } from './types';

export interface SyncOptions {
  /** Sync only these tools. If omitted, syncs all. */
  tools?: ToolName[];
}

export interface SyncResult {
  filesWritten: number;
  files: string[];
}

/**
 * Run the settings sync.
 * @param projectRoot  Absolute path to the project root.
 * @param options      Optional filtering.
 */
export async function syncSettings(
  projectRoot: string,
  options?: SyncOptions,
): Promise<SyncResult> {
  const aiRulesBase = path.join(projectRoot, 'packages/rules/.ai-rules');

  const data: SourceData = {
    agents: await readAgents(path.join(aiRulesBase, 'agents')),
    rules: await readRules(path.join(aiRulesBase, 'rules'), 'packages/rules/.ai-rules/rules'),
  };

  const files = options?.tools
    ? options.tools.flatMap(t => generateForTool(t, data))
    : generateAll(data);

  const writtenPaths: string[] = [];

  for (const file of files) {
    const absPath = path.join(projectRoot, file.relativePath);
    await fs.mkdir(path.dirname(absPath), { recursive: true });
    await fs.writeFile(absPath, file.content, 'utf-8');
    writtenPaths.push(file.relativePath);
  }

  return {
    filesWritten: writtenPaths.length,
    files: writtenPaths,
  };
}
