import * as fs from 'fs/promises';
import * as path from 'path';
import type { CodeSample, CodeCategory } from './analyzer.types';

/**
 * Language detection by file extension
 */
export const LANGUAGE_EXTENSIONS: Record<string, string> = {
  // TypeScript
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.mts': 'typescript',
  '.cts': 'typescript',

  // JavaScript
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',

  // Python
  '.py': 'python',
  '.pyw': 'python',

  // Java/Kotlin
  '.java': 'java',
  '.kt': 'kotlin',
  '.kts': 'kotlin',

  // Go
  '.go': 'go',

  // Rust
  '.rs': 'rust',

  // C/C++
  '.c': 'c',
  '.h': 'c',
  '.cpp': 'cpp',
  '.hpp': 'cpp',
  '.cc': 'cpp',

  // C#
  '.cs': 'csharp',

  // Ruby
  '.rb': 'ruby',

  // PHP
  '.php': 'php',

  // Swift
  '.swift': 'swift',

  // Styles
  '.css': 'css',
  '.scss': 'scss',
  '.sass': 'sass',
  '.less': 'less',

  // Data/Config
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.toml': 'toml',
  '.xml': 'xml',

  // Shell
  '.sh': 'shell',
  '.bash': 'shell',
  '.zsh': 'shell',

  // SQL
  '.sql': 'sql',

  // GraphQL
  '.graphql': 'graphql',
  '.gql': 'graphql',
};

/**
 * Extensions considered as code (for sampling)
 */
const CODE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.py',
  '.java',
  '.kt',
  '.go',
  '.rs',
  '.c',
  '.cpp',
  '.cs',
  '.rb',
  '.php',
  '.swift',
  '.css',
  '.scss',
  '.vue',
  '.svelte',
]);

/**
 * Detect programming language from file path
 */
export function detectLanguage(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return LANGUAGE_EXTENSIONS[ext] ?? 'unknown';
}

/**
 * Check if a file is a code file (for sampling purposes)
 */
export function isCodeFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return CODE_EXTENSIONS.has(ext);
}

/**
 * Check if path contains a directory (handles both /dir/ and dir/ at start)
 */
function pathContainsDir(lowerPath: string, dirName: string): boolean {
  return (
    lowerPath.includes(`/${dirName}/`) ||
    lowerPath.includes(`\\${dirName}\\`) ||
    lowerPath.startsWith(`${dirName}/`) ||
    lowerPath.startsWith(`${dirName}\\`)
  );
}

/**
 * Categorize a file based on its path and name
 */
export function categorizeFile(filePath: string): CodeCategory {
  const lower = filePath.toLowerCase();
  const fileName = path.basename(filePath).toLowerCase();

  // Test files (check first to avoid false positives)
  if (
    fileName.includes('.spec.') ||
    fileName.includes('.test.') ||
    lower.includes('__tests__') ||
    lower.includes('__mocks__')
  ) {
    return 'test';
  }

  // API/Route files (check before hooks to avoid false positives like 'users.ts')
  if (
    pathContainsDir(lower, 'api') ||
    fileName === 'route.ts' ||
    fileName === 'route.js'
  ) {
    return 'api';
  }

  // Service files
  if (pathContainsDir(lower, 'services') || fileName.includes('.service.')) {
    return 'service';
  }

  // Model/Entity files
  if (pathContainsDir(lower, 'models') || pathContainsDir(lower, 'entities')) {
    return 'model';
  }

  // Hook files (React hooks pattern - useXxx where X is uppercase)
  if (pathContainsDir(lower, 'hooks')) {
    return 'hook';
  }
  // Check for useXxx pattern (use followed by uppercase letter)
  const baseFileName = path.basename(filePath);
  if (/^use[A-Z]/.test(baseFileName)) {
    return 'hook';
  }

  // Component files
  if (pathContainsDir(lower, 'components') || pathContainsDir(lower, 'ui')) {
    return 'component';
  }

  // Page files
  if (
    pathContainsDir(lower, 'pages') ||
    fileName === 'page.tsx' ||
    fileName === 'page.ts' ||
    fileName === 'page.jsx' ||
    fileName === 'page.js'
  ) {
    return 'page';
  }

  // Utility files
  if (
    pathContainsDir(lower, 'utils') ||
    pathContainsDir(lower, 'lib') ||
    pathContainsDir(lower, 'helpers')
  ) {
    return 'util';
  }

  // Config files
  if (pathContainsDir(lower, 'config')) {
    return 'config';
  }

  return 'other';
}

/**
 * Select representative sample files from a list
 * Prioritizes diversity across categories
 */
export function selectSampleFiles(files: string[], maxSamples: number): string[] {
  // Filter to code files only, excluding tests
  const codeFiles = files.filter((f) => {
    if (!isCodeFile(f)) return false;
    const category = categorizeFile(f);
    return category !== 'test';
  });

  if (codeFiles.length === 0) {
    return [];
  }

  // Group by category
  const byCategory = new Map<CodeCategory, string[]>();
  for (const file of codeFiles) {
    const category = categorizeFile(file);
    if (!byCategory.has(category)) {
      byCategory.set(category, []);
    }
    byCategory.get(category)!.push(file);
  }

  // Select one from each category (round-robin) until we hit maxSamples
  const selected: string[] = [];
  const categories = Array.from(byCategory.keys());

  let categoryIndex = 0;
  while (selected.length < maxSamples && byCategory.size > 0) {
    const category = categories[categoryIndex % categories.length];
    const filesInCategory = byCategory.get(category);

    if (filesInCategory && filesInCategory.length > 0) {
      selected.push(filesInCategory.shift()!);

      if (filesInCategory.length === 0) {
        byCategory.delete(category);
        categories.splice(categories.indexOf(category), 1);
      }
    }

    categoryIndex++;

    // Safety check to avoid infinite loop
    if (categories.length === 0) break;
  }

  return selected;
}

/**
 * Default number of preview lines
 */
const PREVIEW_LINES = 50;

/**
 * Maximum file size to sample (in bytes)
 */
const MAX_FILE_SIZE = 100 * 1024; // 100KB

/**
 * Sample code files from a project
 *
 * @param projectRoot - Project root directory
 * @param files - List of all file paths (relative)
 * @param maxSamples - Maximum number of samples to collect
 * @returns Array of code samples
 */
export async function sampleCode(
  projectRoot: string,
  files: string[],
  maxSamples: number = 5,
): Promise<CodeSample[]> {
  const selectedFiles = selectSampleFiles(files, maxSamples);
  const samples: CodeSample[] = [];

  for (const relativePath of selectedFiles) {
    const fullPath = path.join(projectRoot, relativePath);

    try {
      const stats = await fs.stat(fullPath);

      // Skip files that are too large
      if (stats.size > MAX_FILE_SIZE) {
        continue;
      }

      const content = await fs.readFile(fullPath, 'utf-8');
      const lines = content.split('\n');

      samples.push({
        path: relativePath,
        language: detectLanguage(relativePath),
        category: categorizeFile(relativePath),
        preview: lines.slice(0, PREVIEW_LINES).join('\n'),
        lineCount: lines.length,
      });
    } catch {
      // Skip files that can't be read
    }
  }

  return samples;
}
