/**
 * Security utilities for MCP server
 */

import * as path from 'path';

/**
 * Check if a relative path is safe (doesn't escape base directory)
 *
 * Handles:
 * - Path traversal (../)
 * - Windows backslash paths (\)
 * - Absolute paths
 * - Null byte injection
 *
 * @param basePath - The base directory path
 * @param relativePath - The relative path to validate
 * @returns true if the path is safe, false otherwise
 */
export function isPathSafe(basePath: string, relativePath: string): boolean {
  // Reject null bytes (null byte injection attack)
  if (relativePath.includes('\x00')) {
    return false;
  }

  // Normalize path separators for cross-platform compatibility
  // Convert Windows backslashes to forward slashes before processing
  const normalizedRelative = relativePath.replace(/\\/g, '/');

  // Resolve both paths to absolute paths
  const resolvedBase = path.resolve(basePath);
  const resolvedTarget = path.resolve(basePath, normalizedRelative);

  // Check if the resolved target is equal to or inside the base directory
  // We need to handle the case where resolvedTarget === resolvedBase (e.g., '.' or '')
  if (resolvedTarget === resolvedBase) {
    return true;
  }

  // Check if target starts with base directory + separator
  // This prevents matching /app/rules-backup when base is /app/rules
  return resolvedTarget.startsWith(resolvedBase + path.sep);
}
