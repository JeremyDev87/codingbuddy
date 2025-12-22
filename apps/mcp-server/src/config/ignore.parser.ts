import { existsSync } from 'fs';
import * as path from 'path';
import { safeReadFile } from '../shared/file.utils';

/**
 * Default ignore file name
 */
export const IGNORE_FILE_NAME = '.codingignore';

/**
 * Result of parsing an ignore file
 */
export interface IgnoreParseResult {
  /** Parsed ignore patterns */
  patterns: string[];
  /** Path to the ignore file (null if not found) */
  source: string | null;
}

/**
 * Parse a single line from an ignore file
 * Returns null for comments and empty lines
 */
export function parseIgnoreLine(line: string): string | null {
  // Trim whitespace
  const trimmed = line.trim();

  // Skip empty lines
  if (trimmed === '') {
    return null;
  }

  // Skip comments
  if (trimmed.startsWith('#')) {
    return null;
  }

  return trimmed;
}

/**
 * Parse ignore file content into patterns
 */
export function parseIgnoreContent(content: string): string[] {
  const lines = content.split('\n');
  const patterns: string[] = [];

  for (const line of lines) {
    const parsed = parseIgnoreLine(line);
    if (parsed !== null) {
      patterns.push(parsed);
    }
  }

  return patterns;
}

/**
 * Load and parse the .codingignore file
 */
export async function loadIgnoreFile(
  projectRoot: string,
): Promise<IgnoreParseResult> {
  const ignorePath = path.join(projectRoot, IGNORE_FILE_NAME);

  if (!existsSync(ignorePath)) {
    return {
      patterns: [],
      source: null,
    };
  }

  const content = await safeReadFile(ignorePath);

  if (content === null) {
    return {
      patterns: [],
      source: null,
    };
  }

  const patterns = parseIgnoreContent(content);

  return {
    patterns,
    source: ignorePath,
  };
}

/**
 * Convert a gitignore-style pattern to a RegExp
 * Supports basic gitignore syntax:
 * - * matches anything except /
 * - ** matches anything including /
 * - ? matches single character
 * - / at start anchors to root
 * - / at end matches directories only
 */
export function patternToRegex(pattern: string): RegExp {
  let regexStr = pattern;

  // Handle negation (we'll track this separately)
  const isNegated = regexStr.startsWith('!');
  if (isNegated) {
    regexStr = regexStr.slice(1);
  }

  // Handle directory-only patterns (trailing /)
  const isDirOnly = regexStr.endsWith('/');
  if (isDirOnly) {
    regexStr = regexStr.slice(0, -1);
  }

  // Handle root-anchored patterns (leading /)
  const isRootAnchored = regexStr.startsWith('/');
  if (isRootAnchored) {
    regexStr = regexStr.slice(1);
  }

  // Check if pattern starts with **/
  const startsWithGlobstar = regexStr.startsWith('**/');
  if (startsWithGlobstar) {
    regexStr = regexStr.slice(3); // Remove **/
  }

  // Escape special regex characters (except * and ?)
  regexStr = regexStr.replace(/[.+^${}()|[\]\\]/g, '\\$&');

  // Convert gitignore wildcards to regex
  // **/ in middle means "any directory depth"
  regexStr = regexStr.replace(/\*\*\//g, '(.*/)?');
  // ** at end matches anything
  regexStr = regexStr.replace(/\*\*$/g, '.*');
  // Remaining ** (standalone)
  regexStr = regexStr.replace(/\*\*/g, '.*');
  // * matches anything except /
  regexStr = regexStr.replace(/\*/g, '[^/]*');
  // ? matches single character except /
  regexStr = regexStr.replace(/\?/g, '[^/]');

  // Add anchors
  if (isRootAnchored) {
    regexStr = '^' + regexStr;
  } else if (startsWithGlobstar) {
    // **/ at start means "any directory depth including root"
    regexStr = '^(.*/)?' + regexStr;
  } else {
    // Can match anywhere in path
    regexStr = '(^|/)' + regexStr;
  }

  // Directory-only patterns
  if (isDirOnly) {
    regexStr = regexStr + '(/|$)';
  } else {
    regexStr = regexStr + '($|/)';
  }

  return new RegExp(regexStr);
}

/**
 * Check if a path should be ignored based on patterns
 */
export function shouldIgnore(
  relativePath: string,
  patterns: string[],
): boolean {
  // Normalize path separators
  const normalizedPath = relativePath.replace(/\\/g, '/');

  let ignored = false;

  for (const pattern of patterns) {
    const isNegated = pattern.startsWith('!');
    const actualPattern = isNegated ? pattern.slice(1) : pattern;
    const regex = patternToRegex(actualPattern);

    if (regex.test(normalizedPath)) {
      ignored = !isNegated;
    }
  }

  return ignored;
}

/**
 * Filter a list of paths based on ignore patterns
 */
export function filterIgnored(paths: string[], patterns: string[]): string[] {
  return paths.filter(p => !shouldIgnore(p, patterns));
}

/**
 * Get default ignore patterns (always applied)
 */
export function getDefaultIgnorePatterns(): string[] {
  return [
    'node_modules/',
    '.git/',
    'dist/',
    'build/',
    '.next/',
    '.nuxt/',
    'coverage/',
    '.nyc_output/',
    '*.log',
    '.DS_Store',
    'Thumbs.db',
    '.env',
    '.env.*',
    '!.env.example',
  ];
}
