/**
 * Init Command Constants
 *
 * Constants used by the codingbuddy init command
 */

import type { GitignoreEntry } from './gitignore.utils';

/**
 * Default gitignore entries for codingbuddy
 *
 * These entries are added to .gitignore during `codingbuddy init`
 * to exclude local workspace files from version control.
 */
export const CODINGBUDDY_GITIGNORE_ENTRIES: GitignoreEntry[] = [
  {
    pattern: 'docs/codingbuddy/context.md',
    comment: '# Codingbuddy (local workspace)',
  },
];
