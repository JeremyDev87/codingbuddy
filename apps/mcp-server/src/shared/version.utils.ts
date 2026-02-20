import { VERSION } from './version';

/**
 * Fallback version constant.
 * Not returned by getPackageVersion() in normal operation.
 * Exported for use in error handling by callers.
 */
export const FALLBACK_VERSION = '0.0.0';

/**
 * Get the package version.
 * Version is sourced from version.ts (single source of truth).
 */
export function getPackageVersion(): string {
  return VERSION;
}
