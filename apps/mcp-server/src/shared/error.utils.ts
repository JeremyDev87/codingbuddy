/**
 * Error sanitization utilities for preventing information disclosure
 */

/**
 * Patterns that indicate sensitive information in error messages
 */
const SENSITIVE_PATTERNS = [
  // Unix-style paths
  /\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_./\\-]+/,
  // Windows-style paths
  /[A-Z]:\\[a-zA-Z0-9_\\.-]+/,
  // node_modules paths
  /node_modules/i,
  // Stack trace indicators
  /\s+at\s+.+:\d+:\d+/,
  // File extensions with paths
  /\.[jt]sx?:\d+/,
];

/**
 * Check if debug mode is enabled via environment variable
 */
function isDebugMode(): boolean {
  return process.env.CODINGBUDDY_DEBUG === 'true';
}

/**
 * Check if a message contains sensitive information
 */
function containsSensitiveInfo(message: string): boolean {
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(message));
}

/**
 * Sanitize error for safe client exposure
 *
 * In production mode (CODINGBUDDY_DEBUG not set):
 * - Returns generic message if error contains paths or sensitive info
 * - Preserves safe validation messages
 *
 * In debug mode (CODINGBUDDY_DEBUG=true):
 * - Returns full error details
 *
 * @param error - The error to sanitize (Error, string, or unknown)
 * @returns Sanitized error message safe for client exposure
 */
export function sanitizeError(error: unknown): string {
  const genericMessage = 'An internal error occurred';

  // Handle null/undefined
  if (error === null || error === undefined) {
    return isDebugMode() ? 'Unknown error: null or undefined' : genericMessage;
  }

  // Handle Error objects
  if (error instanceof Error) {
    const message = error.message;

    if (isDebugMode()) {
      return message;
    }

    // Check if message contains sensitive information
    if (containsSensitiveInfo(message)) {
      return genericMessage;
    }

    return message;
  }

  // Handle string errors
  if (typeof error === 'string') {
    if (isDebugMode()) {
      return error;
    }

    if (containsSensitiveInfo(error)) {
      return genericMessage;
    }

    return error;
  }

  // Handle unknown error types
  if (isDebugMode()) {
    return `Unknown error: ${JSON.stringify(error)}`;
  }

  return genericMessage;
}
