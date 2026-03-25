/**
 * Readers — pure-ish functions that extract SourceData from .ai-rules.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import type { AgentInfo, RuleInfo } from './types';

/**
 * Read all agent JSON files from the given directory.
 * Returns AgentInfo[] sorted alphabetically by name.
 */
export async function readAgents(agentsDir: string): Promise<AgentInfo[]> {
  const entries = await fs.readdir(agentsDir);
  const jsonFiles = entries.filter(f => f.endsWith('.json')).sort();

  const agents: AgentInfo[] = [];

  for (const file of jsonFiles) {
    const raw = await fs.readFile(path.join(agentsDir, file), 'utf-8');
    const data = JSON.parse(raw);
    agents.push({
      name: path.basename(file, '.json'),
      displayName: data.name ?? path.basename(file, '.json'),
      description: data.description ?? '',
      expertise: Array.isArray(data.expertise) ? data.expertise : [],
    });
  }

  return agents;
}

/**
 * Read all rule markdown files from the given directory.
 * Returns RuleInfo[] sorted alphabetically by name.
 * @param rulesDir  Absolute path to the rules directory on disk.
 * @param relativeBase  Relative path prefix from project root (e.g. "packages/rules/.ai-rules/rules").
 */
export async function readRules(rulesDir: string, relativeBase: string): Promise<RuleInfo[]> {
  const entries = await fs.readdir(rulesDir);
  const mdFiles = entries.filter(f => f.endsWith('.md')).sort();

  return mdFiles.map(file => ({
    name: path.basename(file, '.md'),
    relativePath: `${relativeBase}/${file}`,
  }));
}
