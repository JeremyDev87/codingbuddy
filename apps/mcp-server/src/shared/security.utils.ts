/**
 * Security utilities for MCP server
 */

import * as path from 'path';

// ============================================================================
// Prototype Pollution Prevention
// ============================================================================

const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype'] as const;

/**
 * Recursively check for dangerous keys in an object (prototype pollution prevention)
 * Uses Object.getOwnPropertyNames to also check non-enumerable properties
 *
 * @param obj - Object to check
 * @param objPath - Current path in object (for error messages)
 * @returns The path to the dangerous key if found, null otherwise
 */
export function containsDangerousKeys(
  obj: unknown,
  objPath = '',
): string | null {
  if (obj === null || typeof obj !== 'object') {
    return null;
  }

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const result = containsDangerousKeys(obj[i], `${objPath}[${i}]`);
      if (result) return result;
    }
    return null;
  }

  // Use Object.getOwnPropertyNames to catch all properties including non-enumerable
  const keys = Object.getOwnPropertyNames(obj);

  for (const key of keys) {
    if (DANGEROUS_KEYS.includes(key as (typeof DANGEROUS_KEYS)[number])) {
      return objPath ? `${objPath}.${key}` : key;
    }
  }

  // Recursively check nested objects
  for (const key of keys) {
    if (!DANGEROUS_KEYS.includes(key as (typeof DANGEROUS_KEYS)[number])) {
      const result = containsDangerousKeys(
        (obj as Record<string, unknown>)[key],
        objPath ? `${objPath}.${key}` : key,
      );
      if (result) return result;
    }
  }

  return null;
}

// ============================================================================
// Path Safety
// ============================================================================

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

/**
 * Result of path validation
 */
export interface PathValidationResult {
  /** Whether the path is valid */
  valid: boolean;
  /** Error message if validation failed */
  error?: string;
  /** Resolved absolute path if valid */
  resolvedPath?: string;
}

/**
 * Options for comprehensive path validation
 */
export interface ValidatePathOptions {
  /** Base directory that paths must be contained within */
  basePath: string;
  /** Whether to allow absolute paths (default: false) */
  allowAbsolute?: boolean;
  /** File extensions to allow (if specified, only these extensions are allowed) */
  allowedExtensions?: string[];
}

/**
 * Comprehensive path validation with detailed error reporting
 *
 * Validates:
 * - Null byte injection
 * - Path traversal attacks (../)
 * - Base directory containment
 * - File extension restrictions (optional)
 * - Absolute path restrictions (optional)
 *
 * @param targetPath - The path to validate
 * @param options - Validation options
 * @returns Validation result with error details
 */
export function validatePath(
  targetPath: string,
  options: ValidatePathOptions,
): PathValidationResult {
  const { basePath, allowAbsolute = false, allowedExtensions } = options;

  // Check for null bytes
  if (targetPath.includes('\x00')) {
    return {
      valid: false,
      error: 'Path contains null bytes (possible null byte injection)',
    };
  }

  // Check for absolute path if not allowed
  if (!allowAbsolute && path.isAbsolute(targetPath)) {
    return {
      valid: false,
      error: 'Absolute paths are not allowed',
    };
  }

  // Normalize and resolve the path
  const normalizedPath = targetPath.replace(/\\/g, '/');
  const resolvedBase = path.resolve(basePath);
  const resolvedTarget = path.resolve(basePath, normalizedPath);

  // Check path containment (prevent path traversal)
  const isContained =
    resolvedTarget === resolvedBase ||
    resolvedTarget.startsWith(resolvedBase + path.sep);

  if (!isContained) {
    return {
      valid: false,
      error: `Path escapes base directory: ${targetPath} resolves outside ${basePath}`,
    };
  }

  // Check allowed extensions if specified
  if (allowedExtensions && allowedExtensions.length > 0) {
    const ext = path.extname(resolvedTarget).toLowerCase();
    const normalizedAllowed = allowedExtensions.map(e =>
      e.startsWith('.') ? e.toLowerCase() : `.${e.toLowerCase()}`,
    );

    if (!normalizedAllowed.includes(ext)) {
      return {
        valid: false,
        error: `File extension '${ext}' not allowed. Allowed: ${normalizedAllowed.join(', ')}`,
      };
    }
  }

  return {
    valid: true,
    resolvedPath: resolvedTarget,
  };
}

/**
 * Assert that a path is valid, throwing an error if not
 *
 * @param targetPath - The path to validate
 * @param options - Validation options
 * @throws Error if path validation fails
 * @returns The resolved absolute path
 */
export function assertPathSafe(
  targetPath: string,
  options: ValidatePathOptions,
): string {
  const result = validatePath(targetPath, options);
  if (!result.valid) {
    throw new Error(`Path validation failed: ${result.error}`);
  }
  return result.resolvedPath!;
}

// ============================================================================
// Handler Argument Sanitization
// ============================================================================

/**
 * Result of handler argument validation
 */
export interface HandlerArgsSanitizeResult {
  /** Whether args are safe to process */
  safe: boolean;
  /** Error message if validation failed */
  error?: string;
}

/**
 * Validate handler arguments for prototype pollution
 *
 * This should be called at the entry point of every handler's handle() method
 * before any processing occurs. It checks for dangerous keys like __proto__,
 * constructor, and prototype that could enable prototype pollution attacks.
 *
 * @param args - The handler arguments to validate
 * @returns Validation result indicating if args are safe
 *
 * @example
 * ```typescript
 * async handle(toolName: string, args: Record<string, unknown> | undefined) {
 *   const validation = sanitizeHandlerArgs(args);
 *   if (!validation.safe) {
 *     return createErrorResponse(validation.error!);
 *   }
 *   // ... proceed with processing
 * }
 * ```
 */
export function sanitizeHandlerArgs(
  args: Record<string, unknown> | undefined,
): HandlerArgsSanitizeResult {
  if (args === undefined) {
    return { safe: true };
  }

  const dangerousPath = containsDangerousKeys(args);
  if (dangerousPath !== null) {
    return {
      safe: false,
      error: `Invalid argument: dangerous key detected at '${dangerousPath}'`,
    };
  }

  return { safe: true };
}
