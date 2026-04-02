/**
 * Types for the Briefing feature.
 *
 * Briefings capture current session state into structured documents
 * for cross-session recovery.
 */

/**
 * Input parameters for briefing generation.
 */
export interface BriefingInput {
  /** Path to context.md file. Default: docs/codingbuddy/context.md */
  contextPath?: string;
  /** Project root directory. Default: resolved from ConfigService */
  projectRoot?: string;
}

/**
 * Result of briefing generation.
 */
export interface BriefingResult {
  /** Absolute path to the written briefing file */
  filePath: string;
  /** Key decisions extracted from context */
  decisions: string[];
  /** Pending tasks extracted from context */
  pendingTasks: string[];
  /** Changed files from git diff */
  changedFiles: string[];
  /** Suggested command to resume work */
  resumeCommand: string;
}

/**
 * Directory path for briefing output files.
 */
export const BRIEFING_OUTPUT_DIR = 'docs/codingbuddy/briefings';

/**
 * Timeout for git operations in milliseconds.
 */
export const GIT_DIFF_TIMEOUT_MS = 10_000;
