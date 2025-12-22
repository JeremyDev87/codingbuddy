import { existsSync } from 'fs';
import * as path from 'path';
import type { DirectoryAnalysis, ArchitecturePattern } from './analyzer.types';
import {
  shouldIgnore,
  getDefaultIgnorePatterns,
} from '../config/ignore.parser';
import { safeReadDirWithTypes } from '../shared/file.utils';

/**
 * Architecture pattern definition
 */
interface PatternDefinition {
  /** Pattern name */
  name: string;
  /** Directory indicators (can include paths like 'src/features') */
  indicators: string[];
  /** Minimum indicators required for detection */
  minIndicators: number;
}

/**
 * Known architecture pattern definitions
 */
export const ARCHITECTURE_PATTERNS: PatternDefinition[] = [
  {
    name: 'Next.js App Router',
    indicators: ['app', 'components', 'lib', 'public'],
    minIndicators: 2,
  },
  {
    name: 'Next.js Pages Router',
    indicators: ['pages', 'components', 'styles', 'public'],
    minIndicators: 2,
  },
  {
    name: 'NestJS Modular',
    indicators: ['src/modules', 'src/common', 'src/config', 'src/shared'],
    minIndicators: 2,
  },
  {
    name: 'Feature-Sliced Design',
    indicators: [
      'src/features',
      'src/entities',
      'src/shared',
      'src/widgets',
      'src/app',
    ],
    minIndicators: 3,
  },
  {
    name: 'Component-Based',
    indicators: ['src/components', 'src/hooks', 'src/utils', 'src/services'],
    minIndicators: 2,
  },
  {
    name: 'Monorepo',
    indicators: ['packages', 'apps', 'libs'],
    minIndicators: 1,
  },
  {
    name: 'Clean Architecture',
    indicators: [
      'src/domain',
      'src/application',
      'src/infrastructure',
      'src/presentation',
    ],
    minIndicators: 3,
  },
];

/**
 * Directory category type
 */
export type DirectoryCategory =
  | 'source'
  | 'test'
  | 'config'
  | 'build'
  | 'dependencies'
  | 'static'
  | 'other';

/**
 * Categorize a directory by its name
 */
export function categorizeDirectory(dirName: string): DirectoryCategory {
  const lower = dirName.toLowerCase();

  // Source directories
  if (['src', 'lib', 'source', 'app'].includes(lower)) {
    return 'source';
  }

  // Test directories
  if (
    ['test', 'tests', '__tests__', 'spec', 'specs', '__mocks__'].includes(lower)
  ) {
    return 'test';
  }

  // Config directories
  if (lower === 'config' || lower.startsWith('.config')) {
    return 'config';
  }

  // Build output directories
  if (
    ['dist', 'build', 'out', '.next', '.nuxt', 'coverage', '.output'].includes(
      lower,
    )
  ) {
    return 'build';
  }

  // Dependencies
  if (lower === 'node_modules' || lower === 'vendor') {
    return 'dependencies';
  }

  // Static/public directories
  if (['public', 'static', 'assets', 'images', 'media'].includes(lower)) {
    return 'static';
  }

  return 'other';
}

/**
 * Detect architecture patterns from directory list
 */
export function detectArchitecturePatterns(
  directories: string[],
): ArchitecturePattern[] {
  const detected: ArchitecturePattern[] = [];
  const normalizedDirs = new Set(directories.map(d => d.toLowerCase()));

  for (const pattern of ARCHITECTURE_PATTERNS) {
    const matchingIndicators = pattern.indicators.filter(indicator =>
      normalizedDirs.has(indicator.toLowerCase()),
    );

    if (matchingIndicators.length >= pattern.minIndicators) {
      const confidence = matchingIndicators.length / pattern.indicators.length;

      detected.push({
        name: pattern.name,
        confidence,
        indicators: matchingIndicators,
      });
    }
  }

  // Sort by confidence descending
  return detected.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Recursively scan directory and collect all paths
 */
async function scanDirectory(
  rootPath: string,
  ignorePatterns: string[],
  relativePath: string = '',
): Promise<{ files: string[]; dirs: string[] }> {
  const files: string[] = [];
  const dirs: string[] = [];

  const currentPath = relativePath
    ? path.join(rootPath, relativePath)
    : rootPath;

  if (!existsSync(currentPath)) {
    return { files, dirs };
  }

  const entries = await safeReadDirWithTypes(currentPath);

  for (const entry of entries) {
    const entryRelativePath = relativePath
      ? `${relativePath}/${entry.name}`
      : entry.name;

    // Check if should be ignored
    if (shouldIgnore(entryRelativePath, ignorePatterns)) {
      continue;
    }

    if (entry.isDirectory()) {
      dirs.push(entryRelativePath);

      // Recursively scan subdirectories
      const subResult = await scanDirectory(
        rootPath,
        ignorePatterns,
        entryRelativePath,
      );
      files.push(...subResult.files);
      dirs.push(...subResult.dirs);
    } else if (entry.isFile()) {
      files.push(entryRelativePath);
    }
  }

  return { files, dirs };
}

/**
 * Analyze directory structure of a project
 *
 * @param projectRoot - Project root directory
 * @param customIgnorePatterns - Additional ignore patterns
 * @returns Directory analysis result
 */
export async function analyzeDirectory(
  projectRoot: string,
  customIgnorePatterns: string[] = [],
): Promise<DirectoryAnalysis> {
  const ignorePatterns = [
    ...getDefaultIgnorePatterns(),
    ...customIgnorePatterns,
  ];

  // Scan all files and directories in one pass
  const { files, dirs } = await scanDirectory(projectRoot, ignorePatterns);

  // Empty result on error (scanDirectory returns empty arrays)
  if (files.length === 0 && dirs.length === 0) {
    // Check if directory exists but is actually empty vs error
    if (!existsSync(projectRoot)) {
      return {
        rootDirs: [],
        rootFiles: [],
        allFiles: [],
        patterns: [],
        totalFiles: 0,
        totalDirs: 0,
      };
    }
  }

  // Extract root-level entries (no slashes in path)
  const rootFiles = files.filter(f => !f.includes('/'));
  const rootDirs = dirs.filter(d => !d.includes('/'));

  // Detect architecture patterns from all directories
  const patterns = detectArchitecturePatterns(dirs);

  return {
    rootDirs,
    rootFiles,
    allFiles: files,
    patterns,
    totalFiles: files.length,
    totalDirs: dirs.length,
  };
}
