import { existsSync } from 'fs';
import * as path from 'path';
import { safeReadDirWithTypes, tryReadFile } from '../shared/file.utils';

/**
 * Default context directory name
 */
export const CONTEXT_DIR_NAME = '.codingbuddy';

/**
 * Known subdirectory types in .codingbuddy/
 */
export const KNOWN_SUBDIRS = {
  context: 'context',
  prompts: 'prompts',
  agents: 'agents',
} as const;

/**
 * Type of context file based on its location
 */
export type ContextFileType = 'context' | 'prompt' | 'agent' | 'other';

/**
 * Represents a loaded context file
 */
export interface ContextFile {
  /** Relative path from .codingbuddy/ */
  path: string;
  /** File content */
  content: string;
  /** File type based on location */
  type: ContextFileType;
  /** File extension */
  extension: string;
}

/**
 * Result of loading context files
 */
export interface ContextLoadResult {
  /** Loaded context files */
  files: ContextFile[];
  /** Path to the .codingbuddy directory (null if not found) */
  source: string | null;
  /** Errors encountered while loading (non-fatal) */
  errors: string[];
}

/**
 * Determine the type of a context file based on its path
 */
export function getContextFileType(relativePath: string): ContextFileType {
  const parts = relativePath.split('/');

  if (parts[0] === KNOWN_SUBDIRS.context) {
    return 'context';
  }
  if (parts[0] === KNOWN_SUBDIRS.prompts) {
    return 'prompt';
  }
  if (parts[0] === KNOWN_SUBDIRS.agents) {
    return 'agent';
  }

  return 'other';
}

/**
 * Check if a file should be loaded (based on extension)
 */
export function isLoadableFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  const loadableExtensions = [
    '.md',
    '.txt',
    '.json',
    '.yaml',
    '.yml',
    '.js',
    '.ts',
    '.jsx',
    '.tsx',
  ];

  return loadableExtensions.includes(ext);
}

/**
 * Recursively get all files in a directory
 */
async function getAllFiles(
  dirPath: string,
  basePath: string = '',
): Promise<string[]> {
  const files: string[] = [];
  const entries = await safeReadDirWithTypes(dirPath);

  for (const entry of entries) {
    const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name;
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      const subFiles = await getAllFiles(fullPath, relativePath);
      files.push(...subFiles);
    } else if (entry.isFile()) {
      files.push(relativePath);
    }
  }

  return files;
}

/**
 * Load a single context file
 */
async function loadContextFile(
  contextDir: string,
  relativePath: string,
): Promise<ContextFile | null> {
  const fullPath = path.join(contextDir, relativePath);
  const content = await tryReadFile(fullPath);

  if (content === undefined) {
    return null;
  }

  const extension = path.extname(relativePath).toLowerCase();

  return {
    path: relativePath,
    content,
    type: getContextFileType(relativePath),
    extension,
  };
}

/**
 * Load all context files from .codingbuddy/ directory
 */
export async function loadContextFiles(
  projectRoot: string,
): Promise<ContextLoadResult> {
  const contextDir = path.join(projectRoot, CONTEXT_DIR_NAME);

  if (!existsSync(contextDir)) {
    return {
      files: [],
      source: null,
      errors: [],
    };
  }

  const allFiles = await getAllFiles(contextDir);
  const loadableFiles = allFiles.filter(isLoadableFile);

  const files: ContextFile[] = [];
  const errors: string[] = [];

  for (const relativePath of loadableFiles) {
    const file = await loadContextFile(contextDir, relativePath);

    if (file) {
      files.push(file);
    } else {
      errors.push(`Failed to load: ${relativePath}`);
    }
  }

  return {
    files,
    source: contextDir,
    errors,
  };
}

/**
 * Get context files by type (internal helper)
 */
function getFilesByType(
  files: ContextFile[],
  type: ContextFileType,
): ContextFile[] {
  return files.filter(f => f.type === type);
}

/**
 * Format context files for AI consumption
 */
export function formatContextForAI(files: ContextFile[]): string {
  if (files.length === 0) {
    return '';
  }

  const sections: string[] = [];

  // Group by type
  const contextFiles = getFilesByType(files, 'context');
  const promptFiles = getFilesByType(files, 'prompt');
  const agentFiles = getFilesByType(files, 'agent');
  const otherFiles = getFilesByType(files, 'other');

  if (contextFiles.length > 0) {
    sections.push('## Project Context\n');
    for (const file of contextFiles) {
      sections.push(`### ${file.path}\n\n${file.content}\n`);
    }
  }

  if (promptFiles.length > 0) {
    sections.push('## Custom Prompts\n');
    for (const file of promptFiles) {
      sections.push(`### ${file.path}\n\n${file.content}\n`);
    }
  }

  if (agentFiles.length > 0) {
    sections.push('## Custom Agents\n');
    for (const file of agentFiles) {
      sections.push(`### ${file.path}\n\n${file.content}\n`);
    }
  }

  if (otherFiles.length > 0) {
    sections.push('## Additional Files\n');
    for (const file of otherFiles) {
      sections.push(`### ${file.path}\n\n${file.content}\n`);
    }
  }

  return sections.join('\n');
}

/**
 * Check if .codingbuddy directory exists
 */
export function hasContextDir(projectRoot: string): boolean {
  const contextDir = path.join(projectRoot, CONTEXT_DIR_NAME);
  return existsSync(contextDir);
}
