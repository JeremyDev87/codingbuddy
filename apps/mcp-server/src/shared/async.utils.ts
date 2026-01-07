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
