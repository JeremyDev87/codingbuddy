import { promises as fs, type Dirent } from 'fs';
import { resolve, normalize, sep } from 'path';
import { AccessibleErrorResponse } from './validation.constants';
import { formatBytes } from './format.utils';

/**
 * Minimal logger interface for structured logging
 * Compatible with NestJS Logger and similar logging frameworks
 */
export interface Logger {
  warn(message: string, context?: Record<string, unknown>): void;
}

/**
 * Options for file reading operations
 */
export interface FileReadOptions {
  /**
   * Maximum file size in bytes (default: undefined = no limit)
   * DoS Protection: Recommended 1MB (1024 * 1024) for config files
   */
  maxSize?: number;

  /**
   * Optional logger for structured logging
   * SEC-004: Enables production observability for silent failures
   */
  logger?: Logger;

  /**
   * Optional base directory path for security validation
   * SEC-005: When provided, validates that file path does not escape this directory
   * Protects against path traversal attacks (e.g., ../../etc/passwd)
   */
  allowedBasePath?: string;
}

/**
 * Custom error class for file size violations
 * ACC-003: Implements AccessibleErrorResponse for downstream UI consumption
 * ARCH-001: Addresses type system integration gap identified in architecture analysis
 *
 * @example Basic error handling
 * ```typescript
 * try {
 *   await safeReadFile('large.txt', { maxSize: 1024 * 1024 });
 * } catch (error) {
 *   if (error instanceof FileSizeError) {
 *     console.log(error.code); // 'FILE_SIZE_EXCEEDED'
 *     console.log(error.userMessage); // 'File too large (2 MB). Maximum size is 1 MB.'
 *     console.log(error.suggestions); // ['Use a smaller file', ...]
 *   }
 * }
 * ```
 *
 * @example React UI integration with accessibility
 * ```tsx
 * function FileUploadError({ error }: { error: FileSizeError }) {
 *   return (
 *     <div
 *       role={error.accessibilityHints.role}
 *       aria-live={error.accessibilityHints.live}
 *       aria-atomic={error.accessibilityHints.announce}
 *       className="error-alert"
 *     >
 *       <p className="error-message">{error.userMessage}</p>
 *       <ul className="error-suggestions" aria-label="How to fix this error">
 *         {error.suggestions.map((suggestion, i) => (
 *           <li key={i}>{suggestion}</li>
 *         ))}
 *       </ul>
 *     </div>
 *   );
 * }
 * ```
 *
 * @example Backend logging with technical details
 * ```typescript
 * try {
 *   await safeReadFile(filePath, { maxSize: MAX_SIZE });
 * } catch (error) {
 *   if (error instanceof FileSizeError) {
 *     // Log technical details for debugging
 *     logger.error('File size violation', {
 *       code: error.code,
 *       technicalMessage: error.technicalMessage,
 *       stack: error.stack
 *     });
 *     // Return user-friendly message to client (no sensitive data)
 *     res.status(400).json({
 *       error: error.code,
 *       message: error.userMessage,
 *       suggestions: error.suggestions
 *     });
 *   }
 * }
 * ```
 */
export class FileSizeError extends Error implements AccessibleErrorResponse {
  readonly code = 'FILE_SIZE_EXCEEDED';
  readonly userMessage: string;
  readonly technicalMessage: string;
  readonly accessibilityHints = {
    role: 'alert' as const,
    live: 'assertive' as const,
    announce: true,
  };
  readonly suggestions: string[];

  constructor(actualSize: number, maxSize: number, filePath?: string) {
    const userMsg = `File too large (${formatBytes(actualSize)}). Maximum size is ${formatBytes(maxSize)}.`;
    super(userMsg);

    this.userMessage = userMsg;
    this.technicalMessage = `File size ${actualSize} bytes exceeds maximum ${maxSize} bytes${filePath ? ` (${filePath})` : ''}`;
    this.suggestions = [
      'Use a smaller file',
      'Compress the file before uploading',
      `Split file into chunks under ${formatBytes(maxSize)}`,
    ];

    this.name = 'FileSizeError';
  }
}

/**
 * Path traversal validation error
 * SEC-005: Prevents directory traversal attacks
 * ACC-003: Implements AccessibleErrorResponse for downstream UI consumption
 *
 * @example Basic error handling
 * ```typescript
 * try {
 *   validateFilePath('../../etc/passwd', { allowedBasePath: '/project' });
 * } catch (error) {
 *   if (error instanceof PathTraversalError) {
 *     console.log(error.code); // 'PATH_TRAVERSAL_DETECTED'
 *     console.log(error.userMessage); // 'Invalid file path: path traversal attempt detected'
 *     console.log(error.suggestions); // ['Use file paths without .. components', ...]
 *   }
 * }
 * ```
 *
 * @example React UI integration for security errors
 * ```tsx
 * function SecurityErrorAlert({ error }: { error: PathTraversalError }) {
 *   return (
 *     <div
 *       role={error.accessibilityHints.role}
 *       aria-live={error.accessibilityHints.live}
 *       aria-atomic={error.accessibilityHints.announce}
 *       className="security-alert"
 *     >
 *       <strong className="error-message">{error.userMessage}</strong>
 *       <ul aria-label="Security recommendations">
 *         {error.suggestions.map((suggestion, i) => (
 *           <li key={i}>{suggestion}</li>
 *         ))}
 *       </ul>
 *     </div>
 *   );
 * }
 * ```
 *
 * @example Security monitoring and logging
 * ```typescript
 * try {
 *   await safeReadFile(userProvidedPath, { allowedBasePath: SAFE_DIR });
 * } catch (error) {
 *   if (error instanceof PathTraversalError) {
 *     // Log security incident with full technical details
 *     securityLogger.warn('Path traversal attempt detected', {
 *       code: error.code,
 *       technicalMessage: error.technicalMessage,
 *       userAgent: req.headers['user-agent'],
 *       ipAddress: req.ip,
 *       timestamp: new Date().toISOString()
 *     });
 *     // Return generic error to user (don't leak path details)
 *     res.status(400).json({
 *       error: error.code,
 *       message: error.userMessage,
 *       suggestions: error.suggestions
 *     });
 *   }
 * }
 * ```
 */
export class PathTraversalError extends Error implements AccessibleErrorResponse {
  readonly code = 'PATH_TRAVERSAL_DETECTED';
  readonly userMessage: string;
  readonly technicalMessage: string;
  readonly accessibilityHints = {
    role: 'alert' as const,
    live: 'assertive' as const,
    announce: true,
  };
  readonly suggestions: string[];

  constructor(filePath: string, reason: string) {
    const userMsg = 'Invalid file path: path traversal attempt detected';
    super(`Path traversal detected in "${filePath}": ${reason}`);

    this.userMessage = userMsg;
    this.technicalMessage = `Path traversal detected in "${filePath}": ${reason}`;
    this.suggestions = [
      'Use file paths without .. components',
      'Use absolute paths within allowed directories',
      'Avoid null bytes and special characters in file paths',
    ];

    this.name = 'PathTraversalError';
  }
}

/**
 * Validates file path for security issues
 * SEC-005: Prevents path traversal attacks (../, ..\, null bytes, etc.)
 *
 * @security This function protects against directory traversal attacks by:
 * - Detecting .. path components (both Unix / and Windows \ separators)
 * - Detecting null bytes (common in path traversal exploits)
 * - Verifying paths stay within allowed base directory (prevents symlink escapes)
 *
 * @param filePath - Path to validate
 * @param options - Validation options
 * @param options.allowedBasePath - Optional base directory that file must be within
 * @throws PathTraversalError if path contains traversal patterns or escapes base path
 *
 * @example Basic validation
 * ```typescript
 * // ✅ SECURE: Safe paths allowed
 * validateFilePath('/safe/path/file.txt');
 * validateFilePath('relative/path/file.txt');
 *
 * // ❌ INSECURE: Path traversal blocked
 * validateFilePath('/safe/../evil.txt');   // Throws PathTraversalError
 * validateFilePath('..\\windows\\system32'); // Throws PathTraversalError
 * validateFilePath('/safe/file\0.txt');    // Throws PathTraversalError (null byte)
 * ```
 *
 * @example With base path restriction (recommended for user input)
 * ```typescript
 * const UPLOAD_DIR = '/var/app/uploads';
 *
 * // ✅ SECURE: Path within allowed directory
 * validateFilePath('/var/app/uploads/user/file.txt', { allowedBasePath: UPLOAD_DIR });
 *
 * // ❌ INSECURE: Attempts to escape base directory
 * validateFilePath('/etc/passwd', { allowedBasePath: UPLOAD_DIR });        // Throws
 * validateFilePath('/var/app/uploads/../etc/passwd', { allowedBasePath: UPLOAD_DIR }); // Throws
 * ```
 *
 * @example Protecting file operations with user input
 * ```typescript
 * async function downloadUserFile(userProvidedPath: string) {
 *   try {
 *     // CRITICAL: Validate before any file operation
 *     validateFilePath(userProvidedPath, { allowedBasePath: '/uploads' });
 *     return await fs.readFile(userProvidedPath, 'utf-8');
 *   } catch (error) {
 *     if (error instanceof PathTraversalError) {
 *       throw new Error('Invalid file path'); // Generic message for user
 *     }
 *     throw error;
 *   }
 * }
 * ```
 */
export function validateFilePath(filePath: string, options?: { allowedBasePath?: string }): void {
  // Check for null bytes (common in path traversal attacks)
  if (filePath.includes('\0')) {
    throw new PathTraversalError(filePath, 'Null byte detected');
  }

  // Check for path traversal patterns as path components
  // Split by both Unix (/) and Windows (\) separators
  const segments = filePath.split(/[/\\]/);
  for (const segment of segments) {
    if (segment === '..') {
      throw new PathTraversalError(filePath, 'Path traversal pattern detected (..)');
    }
  }

  // If base path is specified, ensure file is within allowed directory
  if (options?.allowedBasePath) {
    const resolvedPath = resolve(filePath);
    const resolvedBase = resolve(options.allowedBasePath);

    // Normalize to handle trailing slashes consistently
    const normalizedPath = normalize(resolvedPath);
    const normalizedBase = normalize(resolvedBase);

    // Check if resolved path starts with base path
    // This prevents escaping via symlinks or absolute paths
    if (!normalizedPath.startsWith(normalizedBase + sep) && normalizedPath !== normalizedBase) {
      throw new PathTraversalError(
        filePath,
        `Path escapes allowed base directory "${options.allowedBasePath}"`,
      );
    }
  }
}

/**
 * Validates file size against maximum allowed size
 * CQ-002: Extracted to eliminate duplication between safeReadFile() and tryReadFile()
 * SEC-004: DoS protection via file size limit
 * ACC-003: Throws FileSizeError with accessibility metadata
 *
 * Performance note: This function calls fs.stat() before fs.readFile() is called,
 * which results in two I/O operations per file read. This is intentional - we fail
 * fast before reading large files into memory (DoS protection). The small overhead
 * of the stat call is negligible compared to the security benefit of preventing
 * memory exhaustion attacks via maliciously large files.
 *
 * @param filePath - Path to file to check
 * @param maxSize - Maximum allowed size in bytes
 * @throws FileSizeError if file exceeds maxSize
 */
async function validateFileSize(filePath: string, maxSize: number): Promise<void> {
  const stats = await fs.stat(filePath);
  if (stats.size > maxSize) {
    throw new FileSizeError(stats.size, maxSize, filePath);
  }
}

/**
 * Safely reads a file, returning null if the file doesn't exist.
 * Throws on permission errors, file size violations, path traversal, or other issues.
 * SEC-004: DoS protection via maxSize option
 * SEC-005: Path traversal protection via allowedBasePath option
 *
 * @security This function provides defense-in-depth protection against:
 * - Path traversal attacks (when allowedBasePath is specified)
 * - DoS via memory exhaustion (when maxSize is specified)
 * - Distinguishes file-not-found (returns null) from security violations (throws)
 *
 * @param filePath - Path to file to read
 * @param options - Security and logging options
 * @param options.maxSize - Maximum file size in bytes (DoS protection)
 * @param options.allowedBasePath - Base directory restriction (path traversal protection)
 * @param options.logger - Logger for security events
 * @returns File contents as string, or null if file doesn't exist
 * @throws FileSizeError if file exceeds maxSize
 * @throws PathTraversalError if path escapes allowedBasePath
 * @throws Other errors for permission issues, read failures, etc.
 *
 * @example Basic usage (no security restrictions)
 * ```typescript
 * // Read optional config file
 * const config = await safeReadFile('/app/config.json');
 * if (config === null) {
 *   console.log('Config not found, using defaults');
 * }
 * ```
 *
 * @example DoS protection for user-uploaded files
 * ```typescript
 * const MAX_CONFIG_SIZE = 1024 * 1024; // 1MB
 *
 * try {
 *   const userConfig = await safeReadFile(userFilePath, {
 *     maxSize: MAX_CONFIG_SIZE
 *   });
 *   if (userConfig === null) {
 *     return { error: 'File not found' };
 *   }
 *   return JSON.parse(userConfig);
 * } catch (error) {
 *   if (error instanceof FileSizeError) {
 *     // User-friendly message, no sensitive data
 *     return { error: error.userMessage, suggestions: error.suggestions };
 *   }
 *   throw error;
 * }
 * ```
 *
 * @example Path traversal protection for user input
 * ```typescript
 * const UPLOAD_DIR = '/var/app/uploads';
 *
 * async function readUserFile(userId: string, filename: string) {
 *   const filePath = `${UPLOAD_DIR}/${userId}/${filename}`;
 *
 *   try {
 *     const content = await safeReadFile(filePath, {
 *       allowedBasePath: UPLOAD_DIR,
 *       maxSize: 10 * 1024 * 1024 // 10MB
 *     });
 *
 *     if (content === null) {
 *       return { status: 404, error: 'File not found' };
 *     }
 *
 *     return { status: 200, data: content };
 *   } catch (error) {
 *     if (error instanceof PathTraversalError) {
 *       // Security violation - log but return generic message
 *       securityLogger.warn('Path traversal attempt', {
 *         userId,
 *         filename,
 *         code: error.code
 *       });
 *       return { status: 400, error: 'Invalid file path' };
 *     }
 *     if (error instanceof FileSizeError) {
 *       return { status: 413, error: error.userMessage };
 *     }
 *     throw error;
 *   }
 * }
 * ```
 *
 * @example Combined with logging for production observability
 * ```typescript
 * import { Logger } from '@nestjs/common';
 *
 * async function loadConfig(path: string, logger: Logger) {
 *   try {
 *     const config = await safeReadFile(path, {
 *       maxSize: 1024 * 1024,
 *       allowedBasePath: '/etc/app',
 *       logger
 *     });
 *
 *     if (config === null) {
 *       logger.warn(`Config not found: ${path}`);
 *       return DEFAULT_CONFIG;
 *     }
 *
 *     return JSON.parse(config);
 *   } catch (error) {
 *     if (error instanceof FileSizeError || error instanceof PathTraversalError) {
 *       logger.error('Config security violation', {
 *         code: error.code,
 *         technicalMessage: error.technicalMessage
 *       });
 *     }
 *     throw error;
 *   }
 * }
 * ```
 */
export async function safeReadFile(
  filePath: string,
  options?: FileReadOptions,
): Promise<string | null> {
  try {
    // Validate file path if allowedBasePath is specified
    if (options?.allowedBasePath !== undefined) {
      validateFilePath(filePath, { allowedBasePath: options.allowedBasePath });
    }

    // Check file size if maxSize is specified
    if (options?.maxSize !== undefined) {
      await validateFileSize(filePath, options.maxSize);
    }

    return await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

/**
 * Attempts to read a file, returning undefined on any error.
 * Use this for skip-on-error patterns where errors should be silently ignored.
 * SEC-004: DoS protection via maxSize option
 * SEC-005: Path traversal protection via allowedBasePath option
 *
 * @security This function provides silent-fail security with observability:
 * - Path traversal protection (when allowedBasePath is specified)
 * - DoS protection (when maxSize is specified)
 * - Security violations are logged (when logger is provided) but return undefined
 * - Enables fail-safe patterns while maintaining security audit trail
 *
 * @param filePath - Path to file to read
 * @param options - Security and logging options
 * @param options.maxSize - Maximum file size in bytes (DoS protection)
 * @param options.allowedBasePath - Base directory restriction (path traversal protection)
 * @param options.logger - Logger for security events (HIGHLY RECOMMENDED for production)
 * @returns File contents as string, or undefined if file doesn't exist or any error occurs
 *
 * @example Basic optional file reading
 * ```typescript
 * // Read optional config file, use defaults if missing
 * const userPrefs = await tryReadFile('/app/user-prefs.json');
 * const config = userPrefs ? JSON.parse(userPrefs) : DEFAULT_PREFS;
 * ```
 *
 * @example Silent DoS protection with logging (RECOMMENDED)
 * ```typescript
 * import { Logger } from '@nestjs/common';
 *
 * async function loadOptionalPlugins(logger: Logger) {
 *   const pluginFiles = await fs.readdir('/plugins');
 *   const plugins = [];
 *
 *   for (const file of pluginFiles) {
 *     // Silent fail for individual plugin load errors
 *     const content = await tryReadFile(`/plugins/${file}`, {
 *       maxSize: 5 * 1024 * 1024, // 5MB per plugin
 *       logger // Critical: logs size violations for security monitoring
 *     });
 *
 *     if (content) {
 *       try {
 *         plugins.push(JSON.parse(content));
 *       } catch (e) {
 *         logger.warn(`Invalid plugin JSON: ${file}`);
 *       }
 *     }
 *   }
 *
 *   return plugins;
 * }
 * ```
 *
 * @example Silent path traversal protection with security monitoring
 * ```typescript
 * async function batchLoadUserFiles(
 *   userIds: string[],
 *   logger: Logger
 * ): Promise<Map<string, string>> {
 *   const SAFE_DIR = '/var/app/user-data';
 *   const results = new Map();
 *
 *   for (const userId of userIds) {
 *     const filePath = `${SAFE_DIR}/${userId}/profile.json`;
 *
 *     // Silent fail - but security violations are logged
 *     const content = await tryReadFile(filePath, {
 *       allowedBasePath: SAFE_DIR,
 *       maxSize: 1024 * 1024,
 *       logger // CRITICAL: Security events logged for forensics
 *     });
 *
 *     if (content) {
 *       results.set(userId, content);
 *     }
 *     // Missing files are silently skipped (no log spam)
 *   }
 *
 *   return results;
 * }
 * ```
 *
 * @example Anti-pattern: Missing logger in production (INSECURE)
 * ```typescript
 * // ❌ INSECURE: Path traversal attempts silently ignored, no audit trail
 * const data = await tryReadFile(userProvidedPath, {
 *   allowedBasePath: SAFE_DIR
 *   // Missing logger - security violations not logged!
 * });
 *
 * // ✅ SECURE: Logger provides security observability
 * const data = await tryReadFile(userProvidedPath, {
 *   allowedBasePath: SAFE_DIR,
 *   logger // Security violations logged for monitoring
 * });
 * ```
 *
 * @example Difference from safeReadFile
 * ```typescript
 * // safeReadFile: Distinguishes not-found from errors (throws on errors)
 * const config = await safeReadFile(path, { maxSize: MAX_SIZE });
 * if (config === null) {
 *   console.log('File not found'); // Specific handling for not-found
 * }
 * // Throws FileSizeError if too large
 *
 * // tryReadFile: Silent fail for all errors (returns undefined)
 * const config = await tryReadFile(path, { maxSize: MAX_SIZE, logger });
 * if (config === undefined) {
 *   console.log('File not found or error'); // All failures treated the same
 * }
 * // Returns undefined if too large (but logs security violation)
 * ```
 */
export async function tryReadFile(
  filePath: string,
  options?: FileReadOptions,
): Promise<string | undefined> {
  try {
    // Validate file path if allowedBasePath is specified
    if (options?.allowedBasePath !== undefined) {
      validateFilePath(filePath, { allowedBasePath: options.allowedBasePath });
    }

    // Check file size if maxSize is specified
    if (options?.maxSize !== undefined) {
      await validateFileSize(filePath, options.maxSize);
    }

    return await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    // Log size violations for observability in production
    // ACC-002: Structured logging for silent failures
    // ACC-003: Log AccessibleErrorResponse metadata
    if (error instanceof FileSizeError) {
      options?.logger?.warn('tryReadFile: File size violation (silent failure)', {
        code: error.code,
        filePath,
        userMessage: error.userMessage,
        technicalMessage: error.technicalMessage,
        suggestions: error.suggestions,
      });
    }
    // Log path traversal attempts for security monitoring
    if (error instanceof PathTraversalError) {
      options?.logger?.warn('tryReadFile: Path traversal attempt (silent failure)', {
        code: error.code,
        filePath,
        message: error.message,
      });
    }
    return undefined; // Silent failure for all errors including size violations
  }
}

/**
 * Safely reads directory with file types, returning an empty array if the directory doesn't exist.
 * Throws on permission errors or other issues.
 */
export async function safeReadDirWithTypes(dirPath: string): Promise<Dirent[]> {
  try {
    return await fs.readdir(dirPath, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}
