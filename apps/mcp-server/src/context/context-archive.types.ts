/**
 * Types and constants for the context archive system.
 *
 * Archives previous context documents before PLAN mode resets,
 * enabling cross-session decision tracking.
 */

/**
 * Directory for archived context documents.
 * Relative to project root.
 */
export const ARCHIVE_DIR = 'docs/codingbuddy/archive';

/**
 * Maximum number of archives to return in a single query.
 * SEC: Prevents memory exhaustion from unbounded queries.
 */
export const MAX_ARCHIVE_RESULTS = 50;

/**
 * Maximum age in days before archives are eligible for auto-cleanup.
 */
export const ARCHIVE_MAX_AGE_DAYS = 30;

/**
 * Maximum search keyword length.
 * SEC: Prevents ReDoS and excessive memory usage.
 */
export const MAX_SEARCH_KEYWORD_LENGTH = 500;

/**
 * Pattern for valid archive filenames: YYYY-MM-DD-HHmm.md
 */
export const ARCHIVE_FILENAME_PATTERN = /^\d{4}-\d{2}-\d{2}-\d{4}\.md$/;

/**
 * Metadata extracted from an archived context document.
 */
export interface ArchiveEntry {
  /** Archive filename (e.g., '2026-03-28-1430.md') */
  filename: string;
  /** Full relative path from project root */
  path: string;
  /** Original task title from the context document */
  title: string;
  /** When the context was originally created (ISO timestamp) */
  createdAt: string;
  /** File size in bytes */
  sizeBytes: number;
}

/**
 * Result of a context history query.
 */
export interface ArchiveHistoryResult {
  /** List of archive entries (newest first) */
  entries: ArchiveEntry[];
  /** Total number of archives available */
  totalCount: number;
  /** Whether the result was truncated */
  truncated: boolean;
}

/**
 * A search match within an archive.
 */
export interface ArchiveSearchMatch {
  /** Archive entry metadata */
  entry: ArchiveEntry;
  /** Matching lines with context */
  matches: string[];
}

/**
 * Result of a keyword search across archives.
 */
export interface ArchiveSearchResult {
  /** Keyword that was searched */
  keyword: string;
  /** Archives containing matches */
  results: ArchiveSearchMatch[];
  /** Total archives searched */
  totalSearched: number;
}

/**
 * Result of archive cleanup operation.
 */
export interface ArchiveCleanupResult {
  /** Number of archives summarized */
  summarizedCount: number;
  /** Number of archives deleted after summarization */
  deletedCount: number;
  /** Remaining archive count */
  remainingCount: number;
}

/**
 * Generate an archive filename from the current timestamp.
 * Format: YYYY-MM-DD-HHmm.md
 *
 * @param date - Date to generate filename from (defaults to now)
 * @returns Filename string
 */
export function generateArchiveFilename(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}-${hours}${minutes}.md`;
}

/**
 * Parse a date from an archive filename.
 *
 * @param filename - Archive filename (e.g., '2026-03-28-1430.md')
 * @returns Date object or null if invalid
 */
export function parseArchiveDate(filename: string): Date | null {
  if (!ARCHIVE_FILENAME_PATTERN.test(filename)) {
    return null;
  }

  const year = parseInt(filename.substring(0, 4), 10);
  const month = parseInt(filename.substring(5, 7), 10) - 1;
  const day = parseInt(filename.substring(8, 10), 10);
  const hours = parseInt(filename.substring(11, 13), 10);
  const minutes = parseInt(filename.substring(13, 15), 10);

  const date = new Date(year, month, day, hours, minutes);
  // Validate the date is real (not NaN)
  if (isNaN(date.getTime())) {
    return null;
  }
  return date;
}

/**
 * Validate a search keyword.
 *
 * @param keyword - Search keyword to validate
 * @returns Object with valid flag and optional error
 */
export function validateSearchKeyword(keyword: string): {
  valid: boolean;
  error?: string;
} {
  if (!keyword || keyword.trim().length === 0) {
    return { valid: false, error: 'Search keyword cannot be empty' };
  }
  if (keyword.length > MAX_SEARCH_KEYWORD_LENGTH) {
    return {
      valid: false,
      error: `Search keyword exceeds maximum length of ${MAX_SEARCH_KEYWORD_LENGTH} characters`,
    };
  }
  return { valid: true };
}
