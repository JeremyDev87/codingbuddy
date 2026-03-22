/**
 * Pure serialization functions for context documents.
 * These functions are stateless and have no side effects.
 */
import type {
  ContextDocument,
  ContextMetadata,
  ContextSection,
  ContextIssue,
} from './context-document.types';
import { CONTEXT_MARKDOWN } from './context-document.types';

/**
 * Serialize a complete context document to markdown.
 *
 * @param document - Context document to serialize
 * @returns Markdown string
 */
export function serializeContextDocument(document: ContextDocument): string {
  const lines: string[] = [];

  // Serialize metadata header
  lines.push(...serializeMetadata(document.metadata));

  // Serialize sections
  for (const section of document.sections) {
    lines.push('');
    lines.push(...serializeSection(section));
  }

  // Serialize document-level issues (persist across mode changes)
  if (document.issues && document.issues.length > 0) {
    lines.push('');
    lines.push(CONTEXT_MARKDOWN.ISSUES_HEADER);
    for (const issue of document.issues) {
      lines.push(`- #${issue.number}: ${issue.title} (${issue.status}) - ${issue.url}`);
    }
  }

  return lines.join('\n');
}

/**
 * Serialize context metadata to markdown lines.
 *
 * @param metadata - Metadata to serialize
 * @returns Array of markdown lines
 */
export function serializeMetadata(metadata: ContextMetadata): string[] {
  const {
    CONTEXT_HEADER,
    CREATED_PREFIX,
    UPDATED_PREFIX,
    MODE_PREFIX,
    STATUS_PREFIX,
    SECTION_SEPARATOR,
  } = CONTEXT_MARKDOWN;

  return [
    `${CONTEXT_HEADER} ${metadata.title}`,
    '',
    `${CREATED_PREFIX} ${metadata.createdAt}`,
    `${UPDATED_PREFIX} ${metadata.lastUpdatedAt}`,
    `${MODE_PREFIX} ${metadata.currentMode}`,
    `${STATUS_PREFIX} ${metadata.status}`,
    '',
    SECTION_SEPARATOR,
  ];
}

/**
 * Serialize a list of items with a header.
 * DRY helper for repeated list serialization pattern.
 *
 * @param lines - Array to append to
 * @param header - Header line (e.g., "### Decisions")
 * @param items - Optional array of items to serialize
 */
function serializeList(lines: string[], header: string, items: string[] | undefined): void {
  if (items && items.length > 0) {
    lines.push(header);
    for (const item of items) {
      lines.push(`- ${item}`);
    }
    lines.push('');
  }
}

/**
 * Serialize a context section to markdown lines.
 *
 * @param section - Section to serialize
 * @returns Array of markdown lines
 */
export function serializeSection(section: ContextSection): string[] {
  const {
    PRIMARY_AGENT_PREFIX,
    RECOMMENDED_ACT_AGENT_PREFIX,
    STATUS_PREFIX,
    TASK_HEADER,
    DECISIONS_HEADER,
    NOTES_HEADER,
    PROGRESS_HEADER,
    FINDINGS_HEADER,
    RECOMMENDATIONS_HEADER,
    SECTION_SEPARATOR,
  } = CONTEXT_MARKDOWN;

  const lines: string[] = [];

  // Section header
  lines.push(`## ${section.mode} (${section.timestamp})`);
  lines.push('');

  // Agent info
  if (section.primaryAgent) {
    lines.push(`${PRIMARY_AGENT_PREFIX} ${section.primaryAgent}`);
  }

  if (section.recommendedActAgent) {
    const confidence = section.recommendedActAgentConfidence
      ? ` (confidence: ${section.recommendedActAgentConfidence})`
      : '';
    lines.push(`${RECOMMENDED_ACT_AGENT_PREFIX} ${section.recommendedActAgent}${confidence}`);
  }

  if (section.status) {
    lines.push(`${STATUS_PREFIX} ${section.status}`);
  }

  lines.push('');

  // Task
  if (section.task) {
    lines.push(TASK_HEADER);
    lines.push(section.task);
    lines.push('');
  }

  // Serialize all lists using DRY helper
  serializeList(lines, DECISIONS_HEADER, section.decisions);
  serializeList(lines, NOTES_HEADER, section.notes);
  serializeList(lines, PROGRESS_HEADER, section.progress);
  serializeList(lines, FINDINGS_HEADER, section.findings);
  serializeList(lines, RECOMMENDATIONS_HEADER, section.recommendations);

  lines.push(SECTION_SEPARATOR);

  return lines;
}

/**
 * Create a new context document from reset data.
 * Pure function - requires explicit timestamp for testability.
 *
 * @param title - Document title
 * @param planSection - Initial PLAN section
 * @param isoTimestamp - ISO timestamp string (required for purity)
 * @returns New context document
 */
export function createNewContextDocument(
  title: string,
  planSection: ContextSection,
  isoTimestamp: string,
  issues?: ContextIssue[],
): ContextDocument {
  return {
    metadata: {
      title,
      createdAt: isoTimestamp,
      lastUpdatedAt: isoTimestamp,
      currentMode: 'PLAN',
      status: 'active',
    },
    sections: [planSection],
    issues: issues && issues.length > 0 ? issues : undefined,
  };
}

/**
 * Create a PLAN section from reset data.
 *
 * @param data - Reset context data
 * @param timestamp - Timestamp string
 * @returns PLAN section
 */
export function createPlanSection(
  data: {
    task?: string;
    primaryAgent?: string;
    recommendedActAgent?: string;
    recommendedActAgentConfidence?: number;
    decisions?: string[];
    notes?: string[];
  },
  timestamp: string,
): ContextSection {
  return {
    mode: 'PLAN',
    timestamp,
    task: data.task,
    primaryAgent: data.primaryAgent,
    recommendedActAgent: data.recommendedActAgent,
    recommendedActAgentConfidence: data.recommendedActAgentConfidence,
    decisions: data.decisions,
    notes: data.notes,
    status: 'in_progress',
  };
}

/**
 * Merge arrays with deduplication.
 * Used for accumulating decisions and notes.
 *
 * @param existing - Existing array
 * @param newItems - New items to add
 * @returns Merged array without duplicates
 */
export function mergeArraysUnique(
  existing: string[] | undefined,
  newItems: string[] | undefined,
): string[] {
  const set = new Set(existing || []);
  for (const item of newItems || []) {
    set.add(item);
  }
  return Array.from(set);
}

/**
 * Merge a new section into an existing section.
 * Used for appending data to existing mode sections.
 *
 * @param existing - Existing section
 * @param newData - New data to merge
 * @param timestamp - New timestamp
 * @returns Merged section
 */
export function mergeSection(
  existing: ContextSection,
  newData: Partial<ContextSection>,
  timestamp: string,
): ContextSection {
  return {
    ...existing,
    timestamp,
    task: newData.task || existing.task,
    primaryAgent: newData.primaryAgent || existing.primaryAgent,
    recommendedActAgent: newData.recommendedActAgent || existing.recommendedActAgent,
    recommendedActAgentConfidence:
      newData.recommendedActAgentConfidence ?? existing.recommendedActAgentConfidence,
    decisions: mergeArraysUnique(existing.decisions, newData.decisions),
    notes: mergeArraysUnique(existing.notes, newData.notes),
    progress: mergeArraysUnique(existing.progress, newData.progress),
    findings: mergeArraysUnique(existing.findings, newData.findings),
    recommendations: mergeArraysUnique(existing.recommendations, newData.recommendations),
    status: newData.status || existing.status,
  };
}

/**
 * Merge issues arrays with deduplication by issue number.
 * Newer issues (from newIssues) take precedence for duplicate numbers.
 *
 * @param existing - Existing issues
 * @param newIssues - New issues to merge
 * @returns Merged issues without duplicates, or undefined if both empty
 */
export function mergeIssues(
  existing: ContextIssue[] | undefined,
  newIssues: ContextIssue[] | undefined,
): ContextIssue[] | undefined {
  if (!existing && !newIssues) return undefined;
  if (!existing) return newIssues;
  if (!newIssues) return existing;

  const map = new Map<number, ContextIssue>();
  for (const issue of existing) map.set(issue.number, issue);
  for (const issue of newIssues) map.set(issue.number, issue);
  const merged = Array.from(map.values());
  return merged.length > 0 ? merged : undefined;
}

/**
 * Generate a timestamp string in HH:MM format.
 *
 * @param date - Date object (defaults to now)
 * @returns Timestamp string
 */
export function generateTimestamp(date: Date = new Date()): string {
  return date.toLocaleString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Summarize a context section by keeping only the most recent N items in arrays.
 * Used for automatic cleanup to reduce document size.
 *
 * Note: Currently uses uniform retention count for all array types.
 * Future enhancement could apply different retention policies per array type
 * (e.g., keep more decisions than progress items) if needed.
 *
 * @param section - Section to summarize
 * @param keepRecentItems - Number of recent items to keep (default: 5)
 * @returns Summarized section with truncated arrays
 */
export function summarizeSection(
  section: ContextSection,
  keepRecentItems: number = 5,
): ContextSection {
  // Store original counts before summarization
  const originalCounts = {
    decisions: section.decisions?.length,
    notes: section.notes?.length,
    progress: section.progress?.length,
    findings: section.findings?.length,
    recommendations: section.recommendations?.length,
  };

  return {
    ...section,
    decisions: section.decisions?.slice(-keepRecentItems),
    notes: section.notes?.slice(-keepRecentItems),
    progress: section.progress?.slice(-keepRecentItems),
    findings: section.findings?.slice(-keepRecentItems),
    recommendations: section.recommendations?.slice(-keepRecentItems),
    summarized: true,
    originalCounts,
  };
}

/**
 * Calculate estimated size of a context document in characters.
 * Used for determining when automatic cleanup is needed.
 *
 * @param document - Context document
 * @returns Estimated size in characters
 */
export function estimateDocumentSize(document: ContextDocument): number {
  const serialized = serializeContextDocument(document);
  return serialized.length;
}

/**
 * Apply automatic cleanup to a context document.
 * Summarizes older sections while keeping recent ones full.
 *
 * @param document - Context document to cleanup
 * @param keepRecentSectionsFull - Number of recent sections to keep full
 * @param keepRecentItems - Number of items to keep in summarized sections
 * @returns Cleaned up document with size reduction info
 */
export function cleanupContextDocument(
  document: ContextDocument,
  keepRecentSectionsFull: number = 2,
  keepRecentItems: number = 5,
): { document: ContextDocument; originalSize: number; newSize: number } {
  const originalSize = estimateDocumentSize(document);

  // Keep the most recent sections full, summarize older ones
  const sectionsCount = document.sections.length;
  const cleanedSections = document.sections.map((section, index) => {
    const isRecent = index >= sectionsCount - keepRecentSectionsFull;
    if (isRecent || section.summarized) {
      // Keep recent sections or already summarized sections unchanged
      return section;
    }
    // Summarize older sections
    return summarizeSection(section, keepRecentItems);
  });

  const cleanedDocument: ContextDocument = {
    ...document,
    sections: cleanedSections,
  };

  const newSize = estimateDocumentSize(cleanedDocument);

  return {
    document: cleanedDocument,
    originalSize,
    newSize,
  };
}
