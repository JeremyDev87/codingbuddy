import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Fallback version returned when package.json cannot be read or version is invalid
 */
export const FALLBACK_VERSION = '0.0.0';

/**
 * Get the package version from package.json
 * Reads the version dynamically to avoid hardcoding
 *
 * Path Resolution:
 * - Uses __dirname to locate package.json relative to compiled output
 * - Expected structure: dist/src/shared/version.utils.js -> ../../package.json
 * - Falls back to FALLBACK_VERSION if file not found or version invalid
 */
export function getPackageVersion(): string {
  try {
    // Use __dirname for CommonJS compatibility
    // Path: dist/src/shared/ -> dist/src/ -> dist/ -> package.json
    const packagePath = join(__dirname, '..', '..', 'package.json');
    const packageContent = readFileSync(packagePath, 'utf-8');
    const pkg = JSON.parse(packageContent) as { version?: unknown };

    // Validate version is a non-empty string
    if (typeof pkg.version === 'string' && pkg.version.length > 0) {
      return pkg.version;
    }

    return FALLBACK_VERSION;
  } catch {
    return FALLBACK_VERSION;
  }
}
