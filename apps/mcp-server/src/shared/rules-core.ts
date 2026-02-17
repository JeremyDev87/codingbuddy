/**
 * Pure functions for rules directory operations
 *
 * Extracted from duplicated logic in McpServerlessService and RulesService.
 * All functions are pure (or async-pure with injected deps) and framework-agnostic.
 */

import * as path from 'path';
import { isPathSafe } from './security.utils';
import { parseAgentProfile, AgentSchemaError } from '../rules/agent.schema';
import { parseSkill, SkillSchemaError } from '../rules/skill.schema';
import type { AgentProfile, SearchResult } from '../rules/rules.types';
import type { Skill } from '../rules/skill.schema';

// ============================================================================
// Types
// ============================================================================

interface ResolveRulesDirOptions {
  envRulesDir?: string;
  packageRulesPath?: string;
  existsSync?: (path: string) => boolean;
}

interface DirentLike {
  name: string;
  isDirectory: () => boolean;
}

export interface FileSystemDeps {
  readFile?: (path: string, encoding: string) => Promise<string>;
  readdir?: (
    path: string,
    options?: { withFileTypes?: boolean },
  ) => Promise<string[] | DirentLike[]>;
}

// ============================================================================
// Internal Helpers
// ============================================================================

async function defaultReadFile(filePath: string, encoding: string): Promise<string> {
  const fsModule = await import('fs/promises');
  return fsModule.readFile(filePath, encoding as BufferEncoding);
}

async function defaultReaddir(
  dirPath: string,
  options?: { withFileTypes?: boolean },
): Promise<string[] | DirentLike[]> {
  const fsModule = await import('fs/promises');
  if (options?.withFileTypes) {
    const entries = await fsModule.readdir(dirPath, { withFileTypes: true });
    return entries as unknown as DirentLike[];
  }
  return fsModule.readdir(dirPath);
}

function getReadFile(deps?: FileSystemDeps) {
  return deps?.readFile ?? defaultReadFile;
}

function getReaddir(
  deps?: FileSystemDeps,
): (path: string, options?: { withFileTypes?: boolean }) => Promise<string[] | DirentLike[]> {
  return deps?.readdir ?? defaultReaddir;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Resolves the rules directory path using a priority-based strategy:
 * 1. Environment variable (envRulesDir)
 * 2. Package path (packageRulesPath)
 * 3. Development fallback candidates relative to dirname
 *
 * @param dirname - The __dirname of the calling module
 * @param options - Resolution options
 * @returns Resolved rules directory path
 */
export function resolveRulesDir(dirname: string, options?: ResolveRulesDirOptions): string {
  // 1. Environment variable takes precedence
  if (options?.envRulesDir) {
    return options.envRulesDir;
  }

  // 2. Package path
  if (options?.packageRulesPath) {
    return options.packageRulesPath;
  }

  // 3. Development fallback: search for .ai-rules directory
  const candidates = [
    path.resolve(dirname, '../../../../packages/rules/.ai-rules'),
    path.resolve(dirname, '../../../packages/rules/.ai-rules'),
    path.resolve(dirname, '../../../../.ai-rules'),
    path.resolve(dirname, '../../../.ai-rules'),
  ];

  const existsSync = options?.existsSync;
  if (existsSync) {
    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        return candidate;
      }
    }
  }

  // Return first candidate as fallback
  return candidates[0];
}

/**
 * Reads a rule file with path traversal protection.
 *
 * @param rulesDir - Base rules directory
 * @param relativePath - Path relative to rulesDir
 * @param deps - Optional filesystem dependencies for testing
 * @returns File content as string
 * @throws Error('Access denied: Invalid path') on path traversal attempt
 * @throws Error('Failed to read rule file: <path>') on read failure
 */
export async function readRuleContent(
  rulesDir: string,
  relativePath: string,
  deps?: FileSystemDeps,
): Promise<string> {
  if (!isPathSafe(rulesDir, relativePath)) {
    throw new Error('Access denied: Invalid path');
  }

  const fullPath = path.join(rulesDir, relativePath);
  const readFile = getReadFile(deps);

  try {
    return await readFile(fullPath, 'utf-8');
  } catch {
    throw new Error(`Failed to read rule file: ${relativePath}`);
  }
}

/**
 * Lists agent names from JSON files in the agents directory.
 *
 * @param rulesDir - Base rules directory
 * @param deps - Optional filesystem dependencies for testing
 * @returns Array of agent names (without .json extension)
 */
export async function listAgentNames(rulesDir: string, deps?: FileSystemDeps): Promise<string[]> {
  const agentsDir = path.join(rulesDir, 'agents');
  const readdir = getReaddir(deps);

  try {
    const files = await readdir(agentsDir);
    return (files as string[]).filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
  } catch {
    return [];
  }
}

/**
 * Loads and validates an agent profile from the agents directory.
 *
 * @param rulesDir - Base rules directory
 * @param name - Agent name (without .json extension)
 * @param deps - Optional filesystem dependencies for testing
 * @returns Validated agent profile
 * @throws Error('Invalid agent profile: <name>') on schema validation failure
 * @throws Error from readRuleContent on path/read failures
 */
export async function loadAgentProfile(
  rulesDir: string,
  name: string,
  deps?: FileSystemDeps,
): Promise<AgentProfile> {
  const content = await readRuleContent(rulesDir, `agents/${name}.json`, deps);

  try {
    const parsed: unknown = JSON.parse(content);
    const validated = parseAgentProfile(parsed);
    return validated as AgentProfile;
  } catch (error) {
    if (error instanceof AgentSchemaError) {
      throw new Error(`Invalid agent profile: ${name}`);
    }
    throw error;
  }
}

/**
 * Searches for a query string across multiple rule files.
 * Performs case-insensitive line-by-line matching.
 *
 * @param rulesDir - Base rules directory
 * @param query - Search query string
 * @param files - Array of relative file paths to search
 * @param deps - Optional filesystem dependencies for testing
 * @returns Search results sorted by score (number of matching lines) descending
 */
export async function searchInRuleFiles(
  rulesDir: string,
  query: string,
  files: string[],
  deps?: FileSystemDeps,
): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  const queryLower = query.toLowerCase();

  for (const file of files) {
    try {
      const content = await readRuleContent(rulesDir, file, deps);
      const lines = content.split('\n');
      const matches: string[] = [];
      let score = 0;

      lines.forEach((line, index) => {
        if (line.toLowerCase().includes(queryLower)) {
          matches.push(`Line ${index + 1}: ${line.trim()}`);
          score++;
        }
      });

      if (score > 0) {
        results.push({ file, matches, score });
      }
    } catch {
      // Skip files that fail to read
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

/**
 * Lists skill summaries from subdirectories of the skills directory.
 * Each subdirectory should contain a SKILL.md file with YAML frontmatter.
 *
 * @param rulesDir - Base rules directory
 * @param deps - Optional filesystem dependencies for testing
 * @returns Array of skill summaries (name + description)
 */
export async function listSkillSummaries(
  rulesDir: string,
  deps?: FileSystemDeps,
): Promise<Array<{ name: string; description: string }>> {
  const skillsDir = path.join(rulesDir, 'skills');
  const readdir = getReaddir(deps);
  const readFile = getReadFile(deps);
  const summaries: Array<{ name: string; description: string }> = [];

  try {
    const entries = (await readdir(skillsDir, {
      withFileTypes: true,
    })) as DirentLike[];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillPath = path.join(skillsDir, entry.name, 'SKILL.md');
        try {
          const content = await readFile(skillPath, 'utf-8');
          const skill = parseSkill(content, `skills/${entry.name}/SKILL.md`);
          summaries.push({
            name: skill.name,
            description: skill.description,
          });
        } catch {
          // Skip invalid/missing skills
        }
      }
    }
  } catch {
    // Skills directory doesn't exist or can't be read
  }

  return summaries;
}

/**
 * Loads a specific skill by name from the skills directory.
 *
 * @param rulesDir - Base rules directory
 * @param name - Skill name (must match /^[a-z0-9-]+$/)
 * @param deps - Optional filesystem dependencies for testing
 * @returns Parsed skill object
 * @throws Error('Invalid skill name format: <name>') if name format is invalid
 * @throws Error('Access denied: Invalid path') on path traversal attempt
 * @throws Error('Invalid skill: <name>') on schema validation failure
 * @throws Error('Skill not found: <name>') if file cannot be read
 */
export async function loadSkill(
  rulesDir: string,
  name: string,
  deps?: FileSystemDeps,
): Promise<Skill> {
  // Validate name format
  if (!/^[a-z0-9-]+$/.test(name)) {
    throw new Error(`Invalid skill name format: ${name}`);
  }

  const skillPath = `skills/${name}/SKILL.md`;

  // Security check
  if (!isPathSafe(rulesDir, skillPath)) {
    throw new Error('Access denied: Invalid path');
  }

  const fullPath = path.join(rulesDir, skillPath);
  const readFile = getReadFile(deps);

  try {
    const content = await readFile(fullPath, 'utf-8');
    return parseSkill(content, skillPath);
  } catch (error) {
    if (error instanceof SkillSchemaError) {
      throw new Error(`Invalid skill: ${name}`);
    }
    throw new Error(`Skill not found: ${name}`);
  }
}
