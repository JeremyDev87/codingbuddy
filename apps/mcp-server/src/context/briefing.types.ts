/**
 * Types and constants for the briefing system.
 *
 * Captures current session state into a structured briefing document
 * for cross-session recovery at `docs/codingbuddy/briefings/`.
 */

/**
 * Directory for briefing documents.
 * Relative to project root.
 */
export const BRIEFING_DIR = 'docs/codingbuddy/briefings';

/**
 * Default path to the context document.
 */
export const DEFAULT_CONTEXT_PATH = 'docs/codingbuddy/context.md';

/**
 * Input parameters for creating a briefing.
 */
export interface BriefingInput {
  /** Path to context.md (default: docs/codingbuddy/context.md) */
  contextPath?: string;
  /** Project root directory */
  projectRoot?: string;
}

/**
 * Result of creating a briefing.
 */
export interface BriefingResult {
  /** Path to the written briefing file */
  filePath: string;
  /** Key decisions extracted from context */
  decisions: string[];
  /** Pending/incomplete tasks from context */
  pendingTasks: string[];
  /** Files changed according to git diff */
  changedFiles: string[];
  /** Suggested command to resume work */
  resumeCommand: string;
}

/**
 * Generate a briefing filename from the current timestamp.
 * Format: YYYY-MM-DDTHH-mm-ss.md (ISO-like, filesystem-safe)
 *
 * @param date - Date to generate filename from (defaults to now)
 * @returns Filename string
 */
export function generateBriefingFilename(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}-${minutes}-${seconds}.md`;
}
