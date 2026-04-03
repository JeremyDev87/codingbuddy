import { readFile, readdir } from 'fs/promises';
import { join } from 'path';
import { AgentStackSchema } from './agent-stack.schema';
import type { AgentStack } from './agent.types';

/**
 * Load and validate a single agent stack JSON file.
 *
 * @param filePath - Absolute path to the stack JSON file
 * @returns Validated AgentStack
 * @throws Error if file cannot be read or fails validation
 */
export async function loadAgentStack(filePath: string): Promise<AgentStack> {
  const raw = await readFile(filePath, 'utf-8');
  const data: unknown = JSON.parse(raw);
  const result = AgentStackSchema.safeParse(data);

  if (!result.success) {
    const errors = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
    throw new Error(`Invalid agent stack in ${filePath}: ${errors}`);
  }

  return result.data;
}

/**
 * Load all agent stack JSON files from a directory.
 *
 * Skips non-JSON files and files that fail validation.
 * Returns empty array if directory does not exist.
 *
 * @param dirPath - Absolute path to the stacks directory
 * @returns Array of validated AgentStacks
 */
export async function loadAgentStacks(dirPath: string): Promise<AgentStack[]> {
  let entries;
  try {
    entries = await readdir(dirPath, { withFileTypes: true });
  } catch {
    return [];
  }

  const jsonFiles = entries.filter(e => e.isFile() && e.name.endsWith('.json'));
  const stacks: AgentStack[] = [];

  for (const entry of jsonFiles) {
    try {
      const stack = await loadAgentStack(join(dirPath, entry.name));
      stacks.push(stack);
    } catch {
      // Skip invalid files
    }
  }

  return stacks;
}
