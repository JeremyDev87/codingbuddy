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
 * Automatically detect the project root by searching for config files
 * starting from the given directory and traversing up to parent directories.
 *
 * This is useful when the MCP server is started from a directory that may not
 * be the actual project root (e.g., when launched via npx from a temp directory).
 *
 * Search order:
 * 1. Look for codingbuddy.config.* files (highest priority)
 * 2. If not found, look for package.json with 'codingbuddy' field
 * 3. If nothing found after MAX_PARENT_TRAVERSAL, return the starting directory
 *
 * @param startDir - Directory to start searching from (defaults to process.cwd())
 * @returns Detected project root directory
 */
export function findProjectRoot(startDir?: string): string {
  const start = startDir ?? process.cwd();
  let currentDir = path.resolve(start);
  let traversalCount = 0;

  while (traversalCount < MAX_PARENT_TRAVERSAL) {
    // Check for codingbuddy config files
    if (findConfigFile(currentDir) !== null) {
      return currentDir;
    }

    // Check for package.json (indicates a project root)
    const packageJsonPath = path.join(currentDir, 'package.json');
    if (existsSync(packageJsonPath)) {
      // Found a package.json - this is likely the project root
      // even if there's no codingbuddy config
      return currentDir;
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

  // Fallback to starting directory
  return start;
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
