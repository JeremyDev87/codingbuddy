import * as path from 'path';

/** Project root: two levels up from shared/ (→ apps/mcp-server/) */
const PROJECT_ROOT = path.resolve(__dirname, '..');

/**
 * Real dynamic import() that preserves ESM loading in CJS output.
 * TypeScript compiles import() to require() in CommonJS mode,
 * but ink v6+ requires ESM with top-level await.
 *
 * Shared between main.ts and run-tui.ts to avoid duplication.
 *
 * @internal Only accepts absolute or relative file paths within the
 * project root to prevent arbitrary module loading via the
 * new Function() workaround.
 */
export async function esmImport(specifier: string): Promise<Record<string, unknown>> {
  if (!path.isAbsolute(specifier)) {
    throw new Error(`esmImport: only absolute paths are accepted, got: ${specifier}`);
  }
  const resolved = path.resolve(specifier);
  if (!resolved.startsWith(PROJECT_ROOT + path.sep) && resolved !== PROJECT_ROOT) {
    throw new Error(
      `esmImport: path must be within project root (${PROJECT_ROOT}), got: ${resolved}`,
    );
  }
  // SECURITY: new Function() is used as a workaround for TypeScript compiling
  // import() to require() in CommonJS mode. The path guard above (lines 18-28)
  // restricts input to absolute paths within PROJECT_ROOT, preventing arbitrary
  // module loading. This is the accepted mitigation for the eval-equivalent risk.
  const dynamicImport = new Function('s', 'return import(s)') as (
    s: string,
  ) => Promise<Record<string, unknown>>;
  return dynamicImport(resolved);
}
