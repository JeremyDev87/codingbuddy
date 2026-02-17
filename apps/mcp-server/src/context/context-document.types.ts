import type { Mode } from '../keyword/keyword.types';

/**
 * Fixed path for the context document.
 * This is the single source of truth for context across all modes.
 */
export const CONTEXT_FILE_PATH = 'docs/codingbuddy/context.md';

/**
 * Timeout for context file operations in milliseconds (5 seconds).
 */
export const CONTEXT_FILE_TIMEOUT_MS = 5000;

/**
 * Maximum items per array (decisions, notes, etc.) for DoS prevention.
 * SEC: Prevents memory exhaustion from malicious input.
 */
export const MAX_CONTEXT_ARRAY_ITEMS = 100;

/**
 * Maximum length per array item string for DoS prevention.
 * SEC: Prevents memory exhaustion from malicious input.
 */
export const MAX_CONTEXT_ITEM_LENGTH = 2000;

/**
 * Context document metadata stored in the header.
 */
export interface ContextMetadata {
  /** Task title (derived from original prompt) */
  title: string;
  /** Creation timestamp (ISO format) */
  createdAt: string;
  /** Last update timestamp (ISO format) */
  lastUpdatedAt: string;
  /** Current active mode */
  currentMode: Mode;
  /** Overall status */
  status: 'active' | 'completed';
}

/**
 * Context section representing one mode's work.
 * Each mode (PLAN, ACT, EVAL) adds a section to the document.
 */
export interface ContextSection {
  /** Mode type (PLAN, ACT, EVAL, AUTO) */
  mode: Mode;
  /** Timestamp when section was created/updated */
  timestamp: string;
  /** Task description */
  task?: string;
  /** Key decisions made */
  decisions?: string[];
  /** Implementation notes */
  notes?: string[];
  /** Primary agent used in this mode */
  primaryAgent?: string;
  /** Agent recommended for next ACT phase (PLAN/EVAL) */
  recommendedActAgent?: string;
  /** Confidence score for recommendation (0-1) */
  recommendedActAgentConfidence?: number;
  /** Implementation progress items (ACT only) */
  progress?: string[];
  /** Evaluation findings (EVAL only) */
  findings?: string[];
  /** Evaluation recommendations (EVAL only) */
  recommendations?: string[];
  /** Section status */
  status?: 'in_progress' | 'completed' | 'blocked';
  /** Flag indicating this section was summarized (arrays truncated) */
  summarized?: boolean;
  /** Original array lengths before summarization */
  originalCounts?: {
    decisions?: number;
    notes?: number;
    progress?: number;
    findings?: number;
    recommendations?: number;
  };
}

/**
 * Complete context document structure.
 * Persisted at CONTEXT_FILE_PATH.
 */
export interface ContextDocument {
  /** Document metadata */
  metadata: ContextMetadata;
  /** Mode sections (PLAN, ACT, EVAL) */
  sections: ContextSection[];
}

/**
 * Data required to reset context (PLAN mode).
 */
export interface ResetContextData {
  /** Task title */
  title: string;
  /** Initial task description */
  task?: string;
  /** Primary agent for PLAN mode */
  primaryAgent?: string;
  /** Recommended ACT agent */
  recommendedActAgent?: string;
  /** Confidence for ACT agent recommendation */
  recommendedActAgentConfidence?: number;
  /** Initial decisions */
  decisions?: string[];
  /** Initial notes */
  notes?: string[];
}

/**
 * Data for appending to context (ACT/EVAL modes).
 */
export interface AppendContextData {
  /** Mode to append */
  mode: Mode;
  /** Task description for this mode */
  task?: string;
  /** Primary agent used */
  primaryAgent?: string;
  /** Decisions made in this mode */
  decisions?: string[];
  /** Notes for this mode */
  notes?: string[];
  /** Progress items (ACT) */
  progress?: string[];
  /** Findings (EVAL) */
  findings?: string[];
  /** Recommendations (EVAL) */
  recommendations?: string[];
  /** Agent recommended for next ACT phase (PLAN/EVAL) */
  recommendedActAgent?: string;
  /** Confidence score for recommendation (0-1) */
  recommendedActAgentConfidence?: number;
  /** Section status */
  status?: 'in_progress' | 'completed' | 'blocked';
}

/**
 * Result of context operations.
 */
export interface ContextOperationResult {
  /** Whether operation succeeded */
  success: boolean;
  /** Path to context file */
  filePath?: string;
  /** Success/error message */
  message?: string;
  /** Error details if failed */
  error?: string;
  /** The context document after operation */
  document?: ContextDocument;
}

/**
 * Context read options for controlling returned data size.
 */
export interface ContextReadOptions {
  /** Maximum number of sections to return (-1 = all) */
  maxSections?: number;
}

/**
 * Context read result.
 */
export interface ContextReadResult {
  /** Whether context exists and was read */
  exists: boolean;
  /** The context document if exists */
  document?: ContextDocument;
  /** Error message if read failed */
  error?: string;
  /** Number of sections truncated (if limited by maxSections) */
  truncatedSections?: number;
}

/**
 * Markdown format constants for context documents.
 * Aligned with existing session document format for consistency.
 */
export const CONTEXT_MARKDOWN = {
  CONTEXT_HEADER: '# Context:',
  CREATED_PREFIX: '**Created**:',
  UPDATED_PREFIX: '**Updated**:',
  MODE_PREFIX: '**Current Mode**:',
  STATUS_PREFIX: '**Status**:',
  SECTION_SEPARATOR: '---',
  TASK_HEADER: '### Task',
  DECISIONS_HEADER: '### Decisions',
  NOTES_HEADER: '### Notes',
  PROGRESS_HEADER: '### Progress',
  FINDINGS_HEADER: '### Findings',
  RECOMMENDATIONS_HEADER: '### Recommendations',
  PRIMARY_AGENT_PREFIX: '**Primary Agent**:',
  RECOMMENDED_ACT_AGENT_PREFIX: '**Recommended ACT Agent**:',
} as const;

/**
 * Pattern to match section headers: ## MODE (timestamp)
 */
export const CONTEXT_SECTION_HEADER_PATTERN = /^## (PLAN|ACT|EVAL|AUTO) \((.+)\)$/;

/**
 * Valid context status values.
 */
export const VALID_CONTEXT_STATUSES = ['active', 'completed'] as const;
export const VALID_SECTION_STATUSES = ['in_progress', 'completed', 'blocked'] as const;

/**
 * Type guard for context status.
 */
export function isValidContextStatus(value: string): value is ContextMetadata['status'] {
  return VALID_CONTEXT_STATUSES.includes(value as ContextMetadata['status']);
}

/**
 * Type guard for section status.
 */
export function isValidSectionStatus(
  value: string,
): value is NonNullable<ContextSection['status']> {
  return VALID_SECTION_STATUSES.includes(value as NonNullable<ContextSection['status']>);
}

/**
 * Context limits configuration for DoS prevention.
 */
export interface ContextLimits {
  /** Maximum items per array. Default: MAX_CONTEXT_ARRAY_ITEMS (100) */
  maxArrayItems: number;
  /** Maximum characters per item string. Default: MAX_CONTEXT_ITEM_LENGTH (2000) */
  maxItemLength: number;
}

/**
 * Default context limits.
 */
export const DEFAULT_CONTEXT_LIMITS: ContextLimits = {
  maxArrayItems: MAX_CONTEXT_ARRAY_ITEMS,
  maxItemLength: MAX_CONTEXT_ITEM_LENGTH,
};

/**
 * Truncate array to maximum allowed items.
 * SEC: DoS prevention - limits memory usage from large arrays.
 *
 * @param items - Array to truncate
 * @param limits - Optional limits configuration (defaults to DEFAULT_CONTEXT_LIMITS)
 * @returns Truncated array
 */
export function truncateArray(
  items: string[] | undefined,
  limits: ContextLimits = DEFAULT_CONTEXT_LIMITS,
): string[] | undefined {
  if (!items) return undefined;
  return items
    .slice(0, limits.maxArrayItems)
    .map(item =>
      item.length > limits.maxItemLength ? item.substring(0, limits.maxItemLength) : item,
    );
}

/**
 * Estimated size thresholds for automatic cleanup (in characters).
 * When document exceeds these thresholds, automatic summarization is triggered.
 */
export const CONTEXT_SIZE_THRESHOLDS = {
  /** Soft limit - trigger warning */
  WARN: 50_000,
  /** Hard limit - force cleanup */
  CLEANUP: 100_000,
} as const;

/**
 * Configuration for automatic context cleanup.
 */
export interface ContextCleanupConfig {
  /** Maximum number of items to keep in arrays for old sections */
  keepRecentItems: number;
  /** Number of most recent sections to keep full (no summarization) */
  keepRecentSectionsFull: number;
}
