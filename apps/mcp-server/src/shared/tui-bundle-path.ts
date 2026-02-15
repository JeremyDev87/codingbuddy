import * as path from 'path';

/**
 * Resolve the path to tui-bundle.mjs.
 *
 * The TUI bundle is built by scripts/build-tui.js to dist/src/tui-bundle.mjs.
 * This function resolves relative to its own compiled location (dist/src/shared/),
 * which is one directory below the bundle.
 *
 * Centralizes the path logic so main.ts and cli/run-tui.ts don't each
 * maintain their own __dirname-relative paths that break if dist layout changes.
 */
export function getTuiBundlePath(): string {
  return path.resolve(__dirname, '..', 'tui-bundle.mjs');
}
