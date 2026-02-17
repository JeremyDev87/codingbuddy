/**
 * Init Command Constants
 *
 * Constants used by the codingbuddy init command
 */

import type { GitignoreEntry } from './gitignore.utils';

/**
 * Default Claude Code global env settings
 *
 * These entries are added to ~/.claude/settings.json env section
 * during `codingbuddy init` to configure Claude Code behavior.
 */
export const CLAUDE_SETTINGS_ENV_ENTRIES: Record<string, string> = {
  ENABLE_TOOL_SEARCH: 'false',
  CODINGBUDDY_AUTO_TUI: '1',
};

/**
 * Default gitignore entries for codingbuddy
 *
 * These entries are added to .gitignore during `codingbuddy init`
 * to exclude local workspace files from version control.
 */
export const CODINGBUDDY_GITIGNORE_ENTRIES: GitignoreEntry[] = [
  {
    pattern: 'codingbuddy.config.json',
    comment: '# Codingbuddy (local workspace)',
  },
  {
    pattern: 'docs/codingbuddy/context.md',
  },
  {
    pattern: '.codingbuddy/',
  },
];
