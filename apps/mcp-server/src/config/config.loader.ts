import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import { validateConfig, type CodingBuddyConfig } from './config.schema';

/**
 * Supported config file names in priority order
 *
 * Only JSON format is supported to ensure compatibility with both
 * CommonJS and ESM projects.
 */
export const CONFIG_FILE_NAMES = ['codingbuddy.config.json'] as const;

/**
 * Deprecated config file names that are no longer supported.
 * Used to detect and warn users about legacy configurations.
 *
 * @since 3.2.0 - JavaScript config files removed for ESM/CJS compatibility
 */
export const DEPRECATED_CONFIG_FILE_NAMES = [
  'codingbuddy.config.js',
  'codingbuddy.config.mjs',
  'codingbuddy.config.cjs',
] as const;

/**
 * Version when JavaScript config support was removed.
 * Used in deprecation warning messages.
 */
export const JS_CONFIG_DEPRECATION_VERSION = '3.2.0';

/**
 * URL to migration documentation for users upgrading from JavaScript configs.
 * Uses HEAD reference to avoid staleness when branch names change.
 */
export const CONFIG_MIGRATION_DOCS_URL =
  'https://github.com/JeremyDev87/codingbuddy/blob/HEAD/apps/mcp-server/README.md#configuration-file';

/**
 * Detect if running in a CI environment.
 * Checks common CI environment variables used by major CI/CD platforms.
 */
export function isCI(): boolean {
  return !!(
    process.env.CI ||
    process.env.CONTINUOUS_INTEGRATION ||
    process.env.GITHUB_ACTIONS ||
    process.env.GITLAB_CI ||
    process.env.CIRCLECI ||
    process.env.JENKINS_URL ||
    process.env.BUILDKITE ||
    process.env.TRAVIS
  );
}

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
 * Find deprecated JavaScript config files in the project root.
 * Returns all found deprecated config files for warning purposes.
 *
 * @param projectRoot - Project root directory to search
 * @returns Array of deprecated config file paths found
 */
export function findDeprecatedConfigFiles(projectRoot: string): string[] {
  const found: string[] = [];
  for (const fileName of DEPRECATED_CONFIG_FILE_NAMES) {
    const filePath = path.join(projectRoot, fileName);
    if (existsSync(filePath)) {
      found.push(filePath);
    }
  }
  return found;
}

/**
 * Generate a deprecation warning message for legacy JavaScript config files.
 * Returns a shorter message in CI environments to reduce log noise.
 *
 * @param deprecatedFiles - Array of deprecated config file paths
 * @returns Warning message with migration guidance
 */
export function getDeprecatedConfigWarning(deprecatedFiles: string[]): string {
  const fileNames = deprecatedFiles.map(f => path.basename(f));

  // In CI, emit a shorter single-line warning to reduce log noise
  if (isCI()) {
    return (
      `[DEPRECATION] JS config detected (${fileNames.join(', ')}). ` +
      `Migrate to codingbuddy.config.json. See: ${CONFIG_MIGRATION_DOCS_URL}`
    );
  }

  // In interactive mode, provide detailed migration guidance
  const fileList = fileNames.map(f => `  - ${f}`).join('\n');
  return (
    `Deprecated JavaScript config file(s) detected:\n${fileList}\n\n` +
    `JavaScript configuration files are no longer supported as of v${JS_CONFIG_DEPRECATION_VERSION}.\n` +
    `Please migrate to JSON format:\n` +
    `  1. Rename your config to codingbuddy.config.json\n` +
    `  2. Convert the export to a JSON object\n` +
    `  3. Remove the deprecated .js/.mjs/.cjs file\n\n` +
    `For more information, see: ${CONFIG_MIGRATION_DOCS_URL}`
  );
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
 * - Ensure parent directory configs are trusted before running in sub-packages
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
 * Load config from a file path
 *
 * Only JSON format is supported.
 */
export async function loadConfigFromFile(filePath: string): Promise<unknown> {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.json') {
    return loadJsonConfig(filePath);
  }

  throw new ConfigLoadError(
    `Unsupported config file format: ${ext}. Only .json is supported.`,
    filePath,
  );
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
  const deprecatedFiles = findDeprecatedConfigFiles(root);

  // Collect warnings for deprecated config files
  const deprecationWarnings: string[] = [];
  if (deprecatedFiles.length > 0) {
    deprecationWarnings.push(getDeprecatedConfigWarning(deprecatedFiles));
  }

  // No config file found - return empty config with deprecation warnings if any
  if (!configPath) {
    return {
      config: {},
      source: null,
      warnings: deprecationWarnings,
    };
  }

  // Load and validate config
  const raw = await loadConfigFromFile(configPath);
  const { config, warnings } = validateAndTransform(raw, configPath);

  return {
    config,
    source: configPath,
    warnings: [...deprecationWarnings, ...warnings],
  };
}

/**
 * Check if a config file exists in the project root
 */
export function hasConfigFile(projectRoot: string): boolean {
  return findConfigFile(projectRoot) !== null;
}
