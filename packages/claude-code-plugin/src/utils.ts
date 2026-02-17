/**
 * Shared Utilities for Claude Code Plugin
 *
 * Provides:
 * - Path validation (prevent path traversal attacks)
 * - Safe error message extraction
 * - Directory utilities
 * - Shared CLI interfaces and constants
 */

import * as path from 'path';
import * as fs from 'fs';

// ============================================================================
// Plugin Root Constant (shared across all CLI tools)
// ============================================================================

/**
 * Plugin root directory - used as allowed base for safe operations
 * Exported for use by CLI tools to avoid duplication
 */
export const PLUGIN_ROOT = path.resolve(__dirname, '..');

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Safely extracts error message from unknown error type
 * Handles Error instances, strings, and other types
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return String(error);
}

// ============================================================================
// Path Validation
// ============================================================================

/**
 * Cached dangerous path patterns for isPathSafe
 * Pre-compiled at module load time for better performance
 */
const DANGEROUS_PATH_PATTERNS: ReadonlyArray<RegExp> = [
  /\.\./, // Parent directory traversal
  // Unix system directories
  /^\/etc\//,
  /^\/var\/log\//, // System logs (specific /var subdirs, not all of /var)
  /^\/var\/run\//, // Runtime data
  /^\/var\/spool\//, // Spool data
  /^\/var\/cache\//, // Cache data
  /^\/var\/lib\//, // Application state
  // Note: /var/folders/ and /var/tmp/ are intentionally allowed (temp directories)
  /^\/usr\//,
  /^\/root\//,
  /^\/bin\//,
  /^\/sbin\//,
  /^\/lib\//,
  /^\/lib64\//,
  /^\/sys\//,
  /^\/proc\//,
  /^\/dev\//,
  /^\/boot\//,
  /^\/opt\//,
  /^\/run\//,
  /^\/srv\//,
  /^\/mnt\//,
  /^\/media\//,
  // macOS system directories
  /^\/System\//i,
  /^\/Library\//i,
  /^\/private\/etc\//i, // macOS /etc (specific paths, not all of /private)
  /^\/private\/var\/(?!folders\/|tmp\/)/i, // Block /private/var except temp dirs
  /^\/Applications\//i,
  // Windows system directories
  /^[A-Z]:\\Windows/i,
  /^[A-Z]:\\Program/i,
  /^[A-Z]:\\System/i,
  /^[A-Z]:\\Users\\[^\\]+\\AppData/i,
  /^[A-Z]:\\ProgramData/i,
  // User-sensitive directories (credentials, keys, configs)
  /\/\.ssh\//i, // SSH keys and config
  /\/\.gnupg\//i, // GPG keys
  /\/\.aws\//i, // AWS credentials
  /\/\.kube\//i, // Kubernetes config
  /\/\.npmrc$/i, // npm authentication tokens
  /\/\.netrc$/i, // FTP/HTTP credentials
  /\/\.docker\//i, // Docker config and credentials
  // Additional user-sensitive paths
  /\/\.config\//i, // XDG config directory (contains many app secrets)
  /\/\.password-store\//i, // pass password manager
  /\/\.bash_history$/i, // Bash command history
  /\/\.zsh_history$/i, // Zsh command history
  /\/\.gitconfig$/i, // Git config (may contain credentials)
  /\/\.git-credentials$/i, // Git credential store
  /\/\.env$/i, // Environment variables (often contains secrets)
  /\/\.env\.[^/]+$/i, // .env.local, .env.production, etc.
  /\/\.cargo\/credentials/i, // Rust/Cargo credentials
  /\/\.gem\/credentials/i, // Ruby gem credentials
  /\/\.pypirc$/i, // Python PyPI credentials
  /\/\.gcloud\//i, // Google Cloud credentials
  /\/\.azure\//i, // Azure credentials
];

/**
 * Validates that a path is within the allowed base directory
 * Prevents path traversal attacks (e.g., ../../../etc/passwd)
 * Also validates symlinks to prevent escape via symlink targets
 *
 * @param inputPath - The path to validate
 * @param allowedBase - The base directory that inputPath must be within
 * @param options - Validation options
 * @param options.followSymlinks - If true, validates the real path of symlinks (default: true)
 * @returns The normalized absolute path
 * @throws Error if path is outside allowed base or symlink target escapes bounds
 */
export function validatePath(
  inputPath: string,
  allowedBase: string,
  options: { followSymlinks?: boolean } = {},
): string {
  const { followSymlinks = true } = options;

  // Resolve both paths to absolute
  const resolvedInput = path.resolve(inputPath);
  const resolvedBase = path.resolve(allowedBase);

  // Ensure the input path starts with the base path
  // Add path.sep to prevent matching partial directory names
  // e.g., /allowed/dir should not match /allowed/directory
  const normalizedInput = resolvedInput + (resolvedInput.endsWith(path.sep) ? '' : path.sep);
  const normalizedBase = resolvedBase + (resolvedBase.endsWith(path.sep) ? '' : path.sep);

  if (!normalizedInput.startsWith(normalizedBase) && resolvedInput !== resolvedBase) {
    throw new Error(`Path "${inputPath}" is outside allowed directory "${allowedBase}"`);
  }

  // Symlink validation: if the path exists and is a symlink, validate its target
  if (followSymlinks && fs.existsSync(resolvedInput)) {
    try {
      const stat = fs.lstatSync(resolvedInput);
      if (stat.isSymbolicLink()) {
        const realPath = fs.realpathSync(resolvedInput);
        // Also resolve the base path to handle OS-level symlinks (e.g., /var -> /private/var on macOS)
        const realBase = fs.existsSync(resolvedBase) ? fs.realpathSync(resolvedBase) : resolvedBase;
        const normalizedRealPath = realPath + (realPath.endsWith(path.sep) ? '' : path.sep);
        const normalizedRealBase = realBase + (realBase.endsWith(path.sep) ? '' : path.sep);

        if (!normalizedRealPath.startsWith(normalizedRealBase) && realPath !== realBase) {
          throw new Error(
            `Symlink "${inputPath}" points to "${realPath}" which is outside allowed directory "${allowedBase}"`,
          );
        }
      }
    } catch (error) {
      // Re-throw our own errors, ignore ENOENT for broken symlinks
      if (error instanceof Error && error.message.includes('outside allowed directory')) {
        throw error;
      }
      // For broken symlinks or permission issues, allow the path
      // (the actual operation will fail with a more specific error)
    }
  }

  return resolvedInput;
}

/**
 * Validates that a path doesn't contain path traversal sequences
 * Less strict than validatePath - just checks for obvious traversal
 *
 * Normalizes the path before matching to prevent bypass via
 * dot-segments (e.g., /./etc/passwd) or redundant separators.
 * User-sensitive directory patterns use case-insensitive matching
 * to prevent bypass on case-insensitive filesystems (macOS HFS+/APFS).
 *
 * @param inputPath - The path to check
 * @returns true if path is safe, false if it contains traversal sequences
 */
export function isPathSafe(inputPath: string): boolean {
  const normalized = path.normalize(inputPath);
  return !DANGEROUS_PATH_PATTERNS.some(pattern => pattern.test(normalized));
}

// ============================================================================
// Directory Utilities
// ============================================================================

/**
 * Ensures a directory exists, creating it if necessary
 * Uses recursive: true so it handles existing directories gracefully
 * (Avoids TOCTOU race condition)
 *
 * @param dirPath - The directory path to ensure exists
 */
export function ensureDirectory(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

/**
 * Safely removes a directory with validation
 * Only removes if path is within allowed base directory
 *
 * @param dirPath - The directory to remove
 * @param allowedBase - The base directory that dirPath must be within
 * @throws Error if dirPath is outside allowedBase
 */
export function safeRemoveDirectory(dirPath: string, allowedBase: string): void {
  // Validate path is within allowed bounds
  validatePath(dirPath, allowedBase);

  // Additional safety: don't remove if it's the base itself
  const resolvedDir = path.resolve(dirPath);
  const resolvedBase = path.resolve(allowedBase);

  if (resolvedDir === resolvedBase) {
    throw new Error('Cannot remove the base directory itself');
  }

  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true });
  }
}

// ============================================================================
// File Extension Constants
// ============================================================================

export const FILE_EXTENSIONS = {
  JSON: '.json',
  MARKDOWN: '.md',
  TYPESCRIPT: '.ts',
} as const;

// ============================================================================
// Build Mode Types and Validation
// ============================================================================

/**
 * Build modes for CLI tools
 * - development: Uses symlinks for live updates
 * - production: Copies files for distribution
 */
export type BuildMode = 'development' | 'production';

const VALID_BUILD_MODES: readonly BuildMode[] = ['development', 'production'];

/**
 * Validates and parses a BuildMode from CLI input
 * Provides runtime type safety for CLI arguments
 *
 * @param input - The CLI argument to parse
 * @returns The validated BuildMode, or undefined if input is falsy
 * @throws Error if input is a non-empty string that isn't a valid BuildMode
 */
export function parseBuildMode(input: string | undefined): BuildMode | undefined {
  if (!input) {
    return undefined;
  }
  if (!VALID_BUILD_MODES.includes(input as BuildMode)) {
    throw new Error(
      `Invalid build mode: "${input}". Expected one of: ${VALID_BUILD_MODES.join(', ')}`,
    );
  }
  return input as BuildMode;
}

// ============================================================================
// Delegation Prefix Constants
// ============================================================================

export const DELEGATION_PREFIXES = {
  TO: 'to_',
  FROM: 'from_',
} as const;

// ============================================================================
// CLI Support Interfaces
// ============================================================================

/**
 * Result object from conversion/sync operations
 */
export interface ConversionResult {
  converted?: string[];
  generated?: string[];
  synced?: string[];
  errors: string[];
}

/**
 * Standard result object for CLI tool execution
 * Provides testable output separate from console.log
 */
export interface CLIResult {
  output: string[];
  result: ConversionResult;
}

/**
 * Formats conversion results for CLI output
 * Used by agent-converter, command-generator, and skill-mapper CLIs
 *
 * @param result - The conversion result object
 * @param itemLabel - Label for items (e.g., 'agents', 'commands', 'skills')
 * @returns Array of formatted output lines
 */
export function formatConversionResult(result: ConversionResult, itemLabel: string): string[] {
  const lines: string[] = [];
  const items = result.converted || result.generated || result.synced || [];

  lines.push(
    `\n${capitalizeFirst(itemLabel)} ${items.length > 1 ? 'items' : 'item'}: ${items.length}`,
  );

  if (items.length > 0) {
    items.forEach(item => lines.push(`  ✓ ${item}`));
  }

  if (result.errors.length > 0) {
    lines.push(`\nErrors (${result.errors.length}):`);
    result.errors.forEach(e => lines.push(`  ✗ ${e}`));
  }

  return lines;
}

/**
 * Capitalizes the first letter of a string
 */
function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
