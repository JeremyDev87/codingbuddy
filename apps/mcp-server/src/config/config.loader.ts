import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import { pathToFileURL } from 'url';
import { validateConfig, type CodingBuddyConfig } from './config.schema';

/**
 * Supported config file names in priority order
 */
export const CONFIG_FILE_NAMES = [
  'codingbuddy.config.js',
  'codingbuddy.config.mjs',
  'codingbuddy.config.json',
] as const;

/**
 * Result of loading a config file
 */
export interface ConfigLoadResult {
  /** Loaded and validated configuration */
  config: CodingBuddyConfig;
  /** Path to the loaded config file (null if no file found) */
  source: string | null;
  /** Warning messages (e.g., validation issues that were auto-fixed) */
  warnings: string[];
}

/**
 * Error thrown when config loading fails
 */
export class ConfigLoadError extends Error {
  constructor(
    message: string,
    public readonly filePath: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = 'ConfigLoadError';
  }
}

/**
 * Find the config file in the project root
 */
export function findConfigFile(projectRoot: string): string | null {
  for (const fileName of CONFIG_FILE_NAMES) {
    const filePath = path.join(projectRoot, fileName);
    if (existsSync(filePath)) {
      return filePath;
    }
  }
  return null;
}

/**
 * Maximum number of parent directories to traverse when searching for project root
 */
const MAX_PARENT_TRAVERSAL = 10;

/**
 * Maximum number of entries to keep in the project root cache.
 * When exceeded, oldest entries are evicted (FIFO).
 */
const MAX_CACHE_SIZE = 100;

/**
 * Cache for findProjectRoot results to avoid redundant filesystem traversals.
 * Uses Map to maintain insertion order for FIFO eviction.
 */
const projectRootCache = new Map<string, string>();

/**
 * Add an entry to the cache with size limit enforcement.
 * Evicts oldest entries (FIFO) when cache exceeds MAX_CACHE_SIZE.
 */
function setCacheEntry(key: string, value: string): void {
  // If key already exists, delete it first to update insertion order
  if (projectRootCache.has(key)) {
    projectRootCache.delete(key);
  }

  // Evict oldest entries if at capacity
  while (projectRootCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = projectRootCache.keys().next().value;
    if (oldestKey !== undefined) {
      projectRootCache.delete(oldestKey);
    }
  }

  projectRootCache.set(key, value);
}

/**
 * Clear the project root cache.
 * Useful when config files may have been added/removed during runtime.
 */
export function clearProjectRootCache(): void {
  projectRootCache.clear();
}

/**
 * Get the current cache size (for testing purposes).
 * @internal
 */
export function getProjectRootCacheSize(): number {
  return projectRootCache.size;
}

/**
 * Automatically detect the project root by searching for config files
 * starting from the given directory and traversing up to parent directories.
 *
 * This is useful when the MCP server is started from a directory that may not
 * be the actual project root (e.g., when launched via npx from a temp directory).
 *
 * Search priority:
 * 1. codingbuddy.config.* files (highest priority - continues searching parent
 *    directories even after finding package.json to support monorepo setups)
 * 2. First package.json found (fallback when no config file exists in any
 *    parent directory up to MAX_PARENT_TRAVERSAL)
 * 3. Starting directory (fallback when nothing found)
 *
 * @caching
 * **Caching Behavior:**
 * - Results are cached by resolved start directory path
 * - Cache uses FIFO eviction with max 100 entries to prevent memory leaks
 * - Use {@link clearProjectRootCache} to invalidate cache when config files change
 * - Use {@link getProjectRootCacheSize} to inspect cache size (for testing)
 *
 * @security
 * **Monorepo Security Considerations:**
 * - In monorepo setups, sub-packages will load config from parent directories
 * - JavaScript config files (.js, .mjs) execute arbitrary code when loaded
 * - Ensure parent directory configs are trusted before running in sub-packages
 * - Consider using JSON configs in shared/untrusted environments
 *
 * **Symlink Behavior:**
 * - This function follows symbolic links without verification
 * - In untrusted environments, symlinks could redirect to malicious configs
 *
 * @param startDir - Directory to start searching from (defaults to process.cwd())
 * @returns Detected project root directory
 */
export function findProjectRoot(startDir?: string): string {
  const start = startDir ?? process.cwd();
  const resolvedStart = path.resolve(start);

  // Check cache first
  const cached = projectRootCache.get(resolvedStart);
  if (cached !== undefined) {
    return cached;
  }

  let currentDir = resolvedStart;
  let traversalCount = 0;
  let firstPackageJsonDir: string | null = null;

  while (traversalCount < MAX_PARENT_TRAVERSAL) {
    // Check for codingbuddy config files (highest priority)
    if (findConfigFile(currentDir) !== null) {
      setCacheEntry(resolvedStart, currentDir);
      return currentDir;
    }

    // Store first package.json location as fallback, but continue searching
    const packageJsonPath = path.join(currentDir, 'package.json');
    if (existsSync(packageJsonPath) && firstPackageJsonDir === null) {
      firstPackageJsonDir = currentDir;
    }

    // Move to parent directory
    const parentDir = path.dirname(currentDir);

    // Reached filesystem root - stop searching
    if (parentDir === currentDir) {
      break;
    }

    currentDir = parentDir;
    traversalCount++;
  }

  // Return first package.json dir if no config found, otherwise start dir
  const result = firstPackageJsonDir ?? start;
  setCacheEntry(resolvedStart, result);
  return result;
}

/**
 * Load a JavaScript/ESM config file using dynamic import
 */
export async function loadJsConfig(filePath: string): Promise<unknown> {
  try {
    // Convert to file:// URL for cross-platform compatibility (Windows/Unix)
    const fileUrl = pathToFileURL(filePath).href;
    const module = await import(fileUrl);

    // Handle both default export and module.exports
    return module.default ?? module;
  } catch (error) {
    throw new ConfigLoadError(
      `Failed to load JavaScript config: ${error instanceof Error ? error.message : String(error)}`,
      filePath,
      error instanceof Error ? error : undefined,
    );
  }
}

/**
 * Load a JSON config file
 */
export async function loadJsonConfig(filePath: string): Promise<unknown> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new ConfigLoadError(
        `Invalid JSON in config file: ${error.message}`,
        filePath,
        error,
      );
    }
    throw new ConfigLoadError(
      `Failed to read config file: ${error instanceof Error ? error.message : String(error)}`,
      filePath,
      error instanceof Error ? error : undefined,
    );
  }
}

/**
 * Load config from a file path (auto-detects format)
 */
export async function loadConfigFromFile(filePath: string): Promise<unknown> {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.json') {
    return loadJsonConfig(filePath);
  }

  if (ext === '.js' || ext === '.mjs') {
    return loadJsConfig(filePath);
  }

  throw new ConfigLoadError(`Unsupported config file format: ${ext}`, filePath);
}

/**
 * Validate and transform raw config into CodingBuddyConfig
 */
export function validateAndTransform(
  raw: unknown,
  filePath: string,
): { config: CodingBuddyConfig; warnings: string[] } {
  const result = validateConfig(raw);

  if (!result.success) {
    const errorMessages = result
      .errors!.map(e => `  - ${e.path}: ${e.message}`)
      .join('\n');

    throw new ConfigLoadError(
      `Invalid configuration:\n${errorMessages}`,
      filePath,
    );
  }

  return {
    config: result.data!,
    warnings: [],
  };
}

/**
 * Check if a file is a JavaScript config (potentially executable code)
 */
export function isJsConfig(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return ext === '.js' || ext === '.mjs';
}

/**
 * Generate security warning for JavaScript config files
 */
export function getJsConfigWarning(filePath: string): string {
  return (
    `Security notice: Loading JavaScript config file (${path.basename(filePath)}). ` +
    'JS configs execute code and may pose security risks in untrusted projects. ' +
    'Consider using codingbuddy.config.json for safer static configuration.'
  );
}

/**
 * Load project configuration from the specified root directory
 *
 * @param projectRoot - Project root directory (defaults to process.cwd())
 * @returns Loaded configuration with metadata
 */
export async function loadConfig(
  projectRoot?: string,
): Promise<ConfigLoadResult> {
  const root = projectRoot ?? process.cwd();
  const configPath = findConfigFile(root);

  // No config file found - return empty config
  if (!configPath) {
    return {
      config: {},
      source: null,
      warnings: [],
    };
  }

  // Load and validate config
  const raw = await loadConfigFromFile(configPath);
  const { config, warnings } = validateAndTransform(raw, configPath);

  // Add security warning for JS configs
  if (isJsConfig(configPath)) {
    warnings.push(getJsConfigWarning(configPath));
  }

  return {
    config,
    source: configPath,
    warnings,
  };
}

/**
 * Check if a config file exists in the project root
 */
export function hasConfigFile(projectRoot: string): boolean {
  return findConfigFile(projectRoot) !== null;
}
