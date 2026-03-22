/**
 * Pure parsing functions for context documents.
 * These functions are stateless and have no side effects.
 */
import type { Mode } from '../keyword/keyword.types';
import type {
  ContextDocument,
  ContextMetadata,
  ContextSection,
  ContextIssue,
} from './context-document.types';
import {
  CONTEXT_MARKDOWN,
  CONTEXT_SECTION_HEADER_PATTERN,
  isValidContextStatus,
  isValidSectionStatus,
} from './context-document.types';

/**
 * Valid mode values for type-safe parsing.
 */
const VALID_MODES = ['PLAN', 'ACT', 'EVAL', 'AUTO'] as const;

/**
 * Parse and validate a mode string.
 *
 * This function provides type-safe mode parsing by validating input against
 * the allowed mode values. It returns null for invalid inputs rather than
 * throwing, allowing callers to handle invalid modes gracefully.
 *
 * @param value - String to validate as Mode (case-sensitive, whitespace-trimmed)
 * @returns Validated Mode type if input matches a valid mode, null otherwise.
 *          Returns null when:
 *          - Input is empty or only whitespace
 *          - Input does not match any of: 'PLAN', 'ACT', 'EVAL', 'AUTO'
 *          - Input has incorrect case (e.g., 'plan' returns null, 'PLAN' returns 'PLAN')
 *
 * @example
 * parseMode('PLAN')     // Returns 'PLAN'
 * parseMode('  ACT  ')  // Returns 'ACT' (whitespace trimmed)
 * parseMode('plan')     // Returns null (case-sensitive)
 * parseMode('INVALID')  // Returns null
 * parseMode('')         // Returns null
 */
function parseMode(value: string): Mode | null {
  const trimmed = value.trim();
  if (VALID_MODES.includes(trimmed as Mode)) {
    return trimmed as Mode;
  }
  return null;
}

/**
 * List types that can be parsed from sections.
 */
type SectionListType = 'decisions' | 'notes' | 'progress' | 'findings' | 'recommendations';

/**
 * Add an item to a section's list, initializing if needed.
 * DRY helper for repeated list initialization and push pattern.
 *
 * @param section - Section to modify
 * @param listType - Which list to add to
 * @param item - Item to add
 */
function addToSectionList(
  section: Partial<ContextSection>,
  listType: SectionListType,
  item: string,
): void {
  if (!section[listType]) {
    section[listType] = [];
  }
  section[listType]!.push(item);
}

/**
 * Context for parsing operations.
 * Accumulates state during parsing.
 */
interface ParseContext {
  metadata: Partial<ContextMetadata>;
  sections: ContextSection[];
  currentSection: Partial<ContextSection> | null;
  currentListType: SectionListType | null;
  issues: ContextIssue[];
  parsingIssues: boolean;
}

/**
 * Parse a complete context document from markdown content.
 *
 * @param content - Raw markdown content
 * @returns Parsed ContextDocument
 */
export function parseContextDocument(content: string): ContextDocument {
  const lines = content.split('\n');
  const ctx: ParseContext = {
    metadata: {
      title: 'Untitled',
      createdAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      currentMode: 'PLAN',
      status: 'active',
    },
    sections: [],
    currentSection: null,
    currentListType: null,
    issues: [],
    parsingIssues: false,
  };

  for (const line of lines) {
    parseLine(line, ctx);
  }

  // Save last section if exists
  if (ctx.currentSection && ctx.currentSection.mode) {
    ctx.sections.push(ctx.currentSection as ContextSection);
  }

  return {
    metadata: ctx.metadata as ContextMetadata,
    sections: ctx.sections,
    issues: ctx.issues.length > 0 ? ctx.issues : undefined,
  };
}

/**
 * Parse a single line and update context.
 */
function parseLine(line: string, ctx: ParseContext): void {
  // Check for document-level issues header
  if (line === CONTEXT_MARKDOWN.ISSUES_HEADER) {
    // Save current section if any
    if (ctx.currentSection && ctx.currentSection.mode) {
      ctx.sections.push(ctx.currentSection as ContextSection);
      ctx.currentSection = null;
    }
    ctx.parsingIssues = true;
    ctx.currentListType = null;
    return;
  }

  // Parse issue items when in issues mode
  if (ctx.parsingIssues) {
    if (line.startsWith('- #')) {
      const issueMatch = line.match(/^- #(\d+): (.+) \(([^)]+)\) - (.+)$/);
      if (issueMatch) {
        ctx.issues.push({
          number: parseInt(issueMatch[1], 10),
          title: issueMatch[2],
          status: issueMatch[3],
          url: issueMatch[4],
        });
      }
      return;
    }
    // Non-issue line ends issues parsing
    if (line.trim().length > 0 && !line.startsWith('- #')) {
      ctx.parsingIssues = false;
    } else {
      return;
    }
  }

  // Try parsing metadata first (only before sections start)
  if (!ctx.currentSection && parseMetadataLine(line, ctx)) {
    return;
  }

  // Try parsing section header
  if (parseSectionHeader(line, ctx)) {
    return;
  }

  // Parse section content if in a section
  if (ctx.currentSection) {
    parseSectionContent(line, ctx);
  }
}

/**
 * Parse metadata line (title, created, updated, mode, status).
 *
 * @returns true if line was handled as metadata
 */
function parseMetadataLine(line: string, ctx: ParseContext): boolean {
  const { CONTEXT_HEADER, CREATED_PREFIX, UPDATED_PREFIX, MODE_PREFIX, STATUS_PREFIX } =
    CONTEXT_MARKDOWN;

  if (line.startsWith(CONTEXT_HEADER)) {
    ctx.metadata.title = line.replace(CONTEXT_HEADER, '').trim();
    return true;
  }

  if (line.startsWith(CREATED_PREFIX)) {
    ctx.metadata.createdAt = line.replace(CREATED_PREFIX, '').trim();
    return true;
  }

  if (line.startsWith(UPDATED_PREFIX)) {
    ctx.metadata.lastUpdatedAt = line.replace(UPDATED_PREFIX, '').trim();
    return true;
  }

  if (line.startsWith(MODE_PREFIX)) {
    const modeValue = line.replace(MODE_PREFIX, '').trim();
    const mode = parseMode(modeValue);
    if (mode) {
      ctx.metadata.currentMode = mode;
    }
    return true;
  }

  if (line.startsWith(STATUS_PREFIX) && !ctx.currentSection) {
    const status = line.replace(STATUS_PREFIX, '').trim();
    if (isValidContextStatus(status)) {
      ctx.metadata.status = status;
    }
    return true;
  }

  return false;
}

/**
 * Parse section header (## MODE (timestamp)).
 *
 * @returns true if line was a section header
 */
function parseSectionHeader(line: string, ctx: ParseContext): boolean {
  const match = line.match(CONTEXT_SECTION_HEADER_PATTERN);
  if (!match) {
    return false;
  }

  // Validate mode before proceeding
  const mode = parseMode(match[1]);
  if (!mode) {
    return false;
  }

  // Save previous section
  if (ctx.currentSection && ctx.currentSection.mode) {
    ctx.sections.push(ctx.currentSection as ContextSection);
  }

  ctx.currentSection = {
    mode,
    timestamp: match[2],
  };
  ctx.currentListType = null;
  return true;
}

/**
 * Parse section content (agent info, lists, etc.).
 */
function parseSectionContent(line: string, ctx: ParseContext): void {
  if (!ctx.currentSection) return;

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

  // Skip separator
  if (line === SECTION_SEPARATOR) {
    return;
  }

  // Parse agent info
  if (line.startsWith(PRIMARY_AGENT_PREFIX)) {
    ctx.currentSection.primaryAgent = line.replace(PRIMARY_AGENT_PREFIX, '').trim();
    return;
  }

  if (line.startsWith(RECOMMENDED_ACT_AGENT_PREFIX)) {
    const rest = line.replace(RECOMMENDED_ACT_AGENT_PREFIX, '').trim();
    const confidenceMatch = rest.match(/^([^\s(]+)(?:\s*\(confidence: ([\d.]+)\))?/);
    if (confidenceMatch) {
      ctx.currentSection.recommendedActAgent = confidenceMatch[1];
      if (confidenceMatch[2]) {
        ctx.currentSection.recommendedActAgentConfidence = parseFloat(confidenceMatch[2]);
      }
    }
    return;
  }

  if (line.startsWith(STATUS_PREFIX)) {
    const status = line.replace(STATUS_PREFIX, '').trim();
    if (isValidSectionStatus(status)) {
      ctx.currentSection.status = status;
    }
    return;
  }

  // Parse list headers
  if (line === TASK_HEADER) {
    ctx.currentListType = null; // Task content follows
    return;
  }

  // Parse list headers (array initialization handled by addToSectionList)
  if (line === DECISIONS_HEADER) {
    ctx.currentListType = 'decisions';
    return;
  }

  if (line === NOTES_HEADER) {
    ctx.currentListType = 'notes';
    return;
  }

  if (line === PROGRESS_HEADER) {
    ctx.currentListType = 'progress';
    return;
  }

  if (line === FINDINGS_HEADER) {
    ctx.currentListType = 'findings';
    return;
  }

  if (line === RECOMMENDATIONS_HEADER) {
    ctx.currentListType = 'recommendations';
    return;
  }

  // Parse list items using DRY helper
  if (line.startsWith('- ') && ctx.currentListType) {
    const item = line.replace('- ', '').trim();
    addToSectionList(ctx.currentSection, ctx.currentListType, item);
    return;
  }

  // Parse task content (non-list, non-header content after TASK_HEADER)
  if (isContentLine(line) && !ctx.currentListType) {
    ctx.currentSection.task = ctx.currentSection.task
      ? `${ctx.currentSection.task}\n${line}`
      : line;
  }
}

/**
 * Check if line is content (not structural markdown).
 */
function isContentLine(line: string): boolean {
  const trimmed = line.trim();
  return (
    trimmed.length > 0 &&
    !trimmed.startsWith('#') &&
    !trimmed.startsWith('**') &&
    !trimmed.startsWith('-') &&
    trimmed !== '---'
  );
}
