/**
 * Async utility functions for error handling and control flow
 */

import { Logger } from '@nestjs/common';

/**
 * Options for asyncWithFallback utility
 */
export interface AsyncWithFallbackOptions<T> {
  /** Function to execute */
  fn: () => Promise<T>;
  /** Fallback value to return on error */
  fallback: T;
  /** Error message to log (supports ${error} placeholder) */
  errorMessage: string;
  /** Optional logger instance for debug logging */
  logger?: Logger;
}

/**
 * Execute an async function with automatic error handling and fallback.
 *
 * This utility encapsulates the common pattern:
 * ```typescript
 * try {
 *   return await someAsyncOperation();
 * } catch (error) {
 *   this.logger.debug(`Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
 *   return fallbackValue;
 * }
 * ```
 *
 * @param options - Configuration options
 * @returns Result from fn() on success, fallback value on error
 *
 * @example
 * ```typescript
 * const config = await asyncWithFallback({
 *   fn: () => this.loadConfigFn(),
 *   fallback: DEFAULT_CONFIG,
 *   errorMessage: 'Failed to load config: ${error}',
 *   logger: this.logger,
 * });
 * ```
 */
export async function asyncWithFallback<T>(
  options: AsyncWithFallbackOptions<T>,
): Promise<T> {
  const { fn, fallback, errorMessage, logger } = options;

  try {
    return await fn();
  } catch (error) {
    const errorText = error instanceof Error ? error.message : 'Unknown error';
    const message = errorMessage.replace('${error}', errorText);

    if (logger) {
      logger.debug(message);
    }

    return fallback;
  }
}

/** Default timeout for file operations (5 seconds) */
const DEFAULT_FILE_OPERATION_TIMEOUT_MS = 5000;

/** Maximum allowed timeout (5 minutes) to prevent runaway operations */
const MAX_TIMEOUT_MS = 300000;

/** Cached timeout value to avoid repeated env reads */
let cachedTimeout: number | null = null;

/**
 * Get configured timeout from environment variable or use default.
 * Environment variable: CODINGBUDDY_FILE_TIMEOUT_MS
 *
 * The value is cached after first read for performance.
 * Valid range: 1 to 300000 (5 minutes)
 */
export function getConfiguredTimeout(): number {
  if (cachedTimeout !== null) {
    return cachedTimeout;
  }

  const envTimeout = process.env.CODINGBUDDY_FILE_TIMEOUT_MS;
  if (envTimeout) {
    const parsed = parseInt(envTimeout, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= MAX_TIMEOUT_MS) {
      cachedTimeout = parsed;
      return cachedTimeout;
    }
  }

  cachedTimeout = DEFAULT_FILE_OPERATION_TIMEOUT_MS;
  return cachedTimeout;
}

/**
 * Reset the cached timeout value.
 * Only exported for testing purposes.
 * @internal
 */
export function resetTimeoutCache(): void {
  cachedTimeout = null;
}

/**
 * Error thrown when an operation times out.
 * Includes operation name for debugging context.
 */
export class TimeoutError extends Error {
  /** The operation that timed out */
  readonly operationName: string;
  /** The timeout value in milliseconds */
  readonly timeoutMs: number;

  constructor(message: string, operationName?: string, timeoutMs?: number) {
    super(message);
    this.name = 'TimeoutError';
    this.operationName = operationName || 'unknown';
    this.timeoutMs = timeoutMs || 0;
  }
}

/**
 * Options for withTimeout utility
 */
export interface WithTimeoutOptions {
  /** Timeout in milliseconds */
  timeoutMs?: number;
  /** Description of the operation for error messages */
  operationName?: string;
}

/**
 * Wrap a promise with a timeout.
 *
 * If the promise doesn't resolve within the specified timeout,
 * a TimeoutError is thrown.
 *
 * @param promise - The promise to wrap
 * @param options - Timeout configuration
 * @returns The result of the promise
 * @throws TimeoutError if the timeout is exceeded
 *
 * @example
 * ```typescript
 * const content = await withTimeout(
 *   fs.readFile(path, 'utf-8'),
 *   { timeoutMs: 3000, operationName: 'read session file' }
 * );
 * ```
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  options: WithTimeoutOptions = {},
): Promise<T> {
  const configuredTimeout = getConfiguredTimeout();
  const { timeoutMs = configuredTimeout, operationName = 'operation' } =
    options;

  let timeoutId: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(
        new TimeoutError(
          `${operationName} timed out after ${timeoutMs}ms`,
          operationName,
          timeoutMs,
        ),
      );
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId!);
  }
}
