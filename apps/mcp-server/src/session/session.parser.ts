/**
 * Session Document Parser
 *
 * Parses markdown session documents with localization support.
 * Supports all languages: en, ko, ja, zh, es.
 */

import type {
  SessionDocument,
  SessionSection,
  SessionMetadata,
} from './session.types';
import type { Mode } from '../keyword/keyword.types';

/**
 * Markdown format constants for session documents.
 */
const MARKDOWN = {
  SESSION_HEADER: '# Session:',
  CREATED_PREFIX: '**Created**:',
  UPDATED_PREFIX: '**Updated**:',
  STATUS_PREFIX: '**Status**:',
  PRIMARY_AGENT_PREFIX: '**Primary Agent**:',
  RECOMMENDED_ACT_AGENT_PREFIX: '**Recommended ACT Agent**:',
  SPECIALISTS_PREFIX: '**Specialists**:',
  SECTION_SEPARATOR: '---',
  TASK_HEADER: '### Task',
  DECISIONS_HEADER: '### Decisions',
  NOTES_HEADER: '### Notes',
} as const;

/**
 * Localized labels interface for session documents.
 */
export interface LocalizedLabels {
  SESSION_HEADER: string;
  CREATED_PREFIX: string;
  UPDATED_PREFIX: string;
  STATUS_PREFIX: string;
  PRIMARY_AGENT_PREFIX: string;
  RECOMMENDED_ACT_AGENT_PREFIX: string;
  SPECIALISTS_PREFIX: string;
  SECTION_SEPARATOR: string;
  TASK_HEADER: string;
  DECISIONS_HEADER: string;
  NOTES_HEADER: string;
}

/**
 * Localized labels for session documents.
 */
export const LOCALIZED_LABELS: Record<string, LocalizedLabels> = {
  en: MARKDOWN,
  ko: {
    SESSION_HEADER: '# 세션:',
    CREATED_PREFIX: '**생성일**:',
    UPDATED_PREFIX: '**수정일**:',
    STATUS_PREFIX: '**상태**:',
    PRIMARY_AGENT_PREFIX: '**주 에이전트**:',
    RECOMMENDED_ACT_AGENT_PREFIX: '**권장 ACT 에이전트**:',
    SPECIALISTS_PREFIX: '**전문가**:',
    SECTION_SEPARATOR: '---',
    TASK_HEADER: '### 작업',
    DECISIONS_HEADER: '### 결정 사항',
    NOTES_HEADER: '### 노트',
  },
  ja: {
    SESSION_HEADER: '# セッション:',
    CREATED_PREFIX: '**作成日**:',
    UPDATED_PREFIX: '**更新日**:',
    STATUS_PREFIX: '**状態**:',
    PRIMARY_AGENT_PREFIX: '**主エージェント**:',
    RECOMMENDED_ACT_AGENT_PREFIX: '**推奨ACTエージェント**:',
    SPECIALISTS_PREFIX: '**専門家**:',
    SECTION_SEPARATOR: '---',
    TASK_HEADER: '### タスク',
    DECISIONS_HEADER: '### 決定事項',
    NOTES_HEADER: '### ノート',
  },
  zh: {
    SESSION_HEADER: '# 会话:',
    CREATED_PREFIX: '**创建时间**:',
    UPDATED_PREFIX: '**更新时间**:',
    STATUS_PREFIX: '**状态**:',
    PRIMARY_AGENT_PREFIX: '**主代理**:',
    RECOMMENDED_ACT_AGENT_PREFIX: '**推荐ACT代理**:',
    SPECIALISTS_PREFIX: '**专家**:',
    SECTION_SEPARATOR: '---',
    TASK_HEADER: '### 任务',
    DECISIONS_HEADER: '### 决策',
    NOTES_HEADER: '### 备注',
  },
  es: {
    SESSION_HEADER: '# Sesión:',
    CREATED_PREFIX: '**Creado**:',
    UPDATED_PREFIX: '**Actualizado**:',
    STATUS_PREFIX: '**Estado**:',
    PRIMARY_AGENT_PREFIX: '**Agente Principal**:',
    RECOMMENDED_ACT_AGENT_PREFIX: '**Agente ACT Recomendado**:',
    SPECIALISTS_PREFIX: '**Especialistas**:',
    SECTION_SEPARATOR: '---',
    TASK_HEADER: '### Tarea',
    DECISIONS_HEADER: '### Decisiones',
    NOTES_HEADER: '### Notas',
  },
};

/**
 * Pre-computed cache of all localized values per label key.
 */
const LOCALIZED_VALUES_CACHE: Record<keyof LocalizedLabels, string[]> = (() => {
  const keys: (keyof LocalizedLabels)[] = [
    'SESSION_HEADER',
    'CREATED_PREFIX',
    'UPDATED_PREFIX',
    'STATUS_PREFIX',
    'PRIMARY_AGENT_PREFIX',
    'RECOMMENDED_ACT_AGENT_PREFIX',
    'SPECIALISTS_PREFIX',
    'SECTION_SEPARATOR',
    'TASK_HEADER',
    'DECISIONS_HEADER',
    'NOTES_HEADER',
  ];
  const cache = {} as Record<keyof LocalizedLabels, string[]>;
  for (const key of keys) {
    cache[key] = Object.values(LOCALIZED_LABELS).map(labels => labels[key]);
  }
  return cache;
})();

/**
 * Valid session status values for type-safe parsing.
 */
const VALID_SESSION_STATUSES = ['active', 'completed', 'archived'] as const;
const VALID_SECTION_STATUSES = ['in_progress', 'completed', 'blocked'] as const;

/**
 * Pattern to match section headers: ## MODE (timestamp)
 */
const SECTION_HEADER_PATTERN = /^## (PLAN|ACT|EVAL|AUTO) \((.+)\)$/;

/**
 * Context for parsing session documents.
 */
export interface ParseContext {
  metadata: SessionMetadata;
  sections: SessionSection[];
  currentSection: Partial<SessionSection> | null;
  currentListType: 'decisions' | 'notes' | null;
}

/**
 * Result of parsing a list header line.
 */
type ListHeaderResult =
  | { matched: true; listType: 'task' | 'decisions' | 'notes' }
  | { matched: false };

/**
 * Get all localized label values for a given key.
 */
function getAllLocalizedValues(key: keyof LocalizedLabels): string[] {
  return LOCALIZED_VALUES_CACHE[key];
}

/**
 * Check if a line starts with any localized version of a label.
 */
function matchLocalizedPrefix(
  line: string,
  key: keyof LocalizedLabels,
): string | null {
  for (const prefix of getAllLocalizedValues(key)) {
    if (line.startsWith(prefix)) {
      return prefix;
    }
  }
  return null;
}

/**
 * Check if a line matches any localized version of an exact label.
 */
function matchLocalizedExact(
  line: string,
  key: keyof LocalizedLabels,
): boolean {
  return getAllLocalizedValues(key).includes(line);
}

/**
 * Type guard for session metadata status.
 */
function isValidSessionStatus(
  value: string,
): value is SessionMetadata['status'] {
  return VALID_SESSION_STATUSES.includes(value as SessionMetadata['status']);
}

/**
 * Type guard for section status.
 */
function isValidSectionStatus(
  value: string,
): value is NonNullable<SessionSection['status']> {
  return VALID_SECTION_STATUSES.includes(
    value as NonNullable<SessionSection['status']>,
  );
}

/**
 * Parse metadata line (title, created, updated, status).
 */
function parseMetadataLine(line: string, ctx: ParseContext): boolean {
  const sessionHeader = matchLocalizedPrefix(line, 'SESSION_HEADER');
  if (sessionHeader) {
    ctx.metadata.title = line.replace(sessionHeader, '').trim();
    return true;
  }

  const createdPrefix = matchLocalizedPrefix(line, 'CREATED_PREFIX');
  if (createdPrefix) {
    ctx.metadata.createdAt = line.replace(createdPrefix, '').trim();
    return true;
  }

  const updatedPrefix = matchLocalizedPrefix(line, 'UPDATED_PREFIX');
  if (updatedPrefix) {
    ctx.metadata.updatedAt = line.replace(updatedPrefix, '').trim();
    return true;
  }

  const statusPrefix = matchLocalizedPrefix(line, 'STATUS_PREFIX');
  if (statusPrefix && !ctx.currentSection) {
    const statusValue = line.replace(statusPrefix, '').trim();
    if (isValidSessionStatus(statusValue)) {
      ctx.metadata.status = statusValue;
    }
    return true;
  }

  return false;
}

/**
 * Parse section header line (## MODE (timestamp)).
 */
function parseSectionHeader(line: string, ctx: ParseContext): boolean {
  const match = line.match(SECTION_HEADER_PATTERN);
  if (!match) return false;

  // Save previous section
  if (ctx.currentSection && ctx.currentSection.mode) {
    ctx.sections.push(ctx.currentSection as SessionSection);
  }

  ctx.currentSection = {
    mode: match[1] as Mode,
    timestamp: match[2],
  };
  ctx.currentListType = null;
  return true;
}

/**
 * Parse section field line (primary agent, recommended agent, specialists, status).
 */
function parseSectionField(
  line: string,
  section: Partial<SessionSection>,
): boolean {
  const primaryAgentPrefix = matchLocalizedPrefix(line, 'PRIMARY_AGENT_PREFIX');
  if (primaryAgentPrefix) {
    section.primaryAgent = line.replace(primaryAgentPrefix, '').trim();
    return true;
  }

  const recommendedAgentPrefix = matchLocalizedPrefix(
    line,
    'RECOMMENDED_ACT_AGENT_PREFIX',
  );
  if (recommendedAgentPrefix) {
    const rest = line.replace(recommendedAgentPrefix, '').trim();
    const confidenceMatch = rest.match(
      /^([^\s(]+)(?:\s*\(confidence: ([\d.]+)\))?/,
    );
    if (confidenceMatch) {
      section.recommendedActAgent = confidenceMatch[1];
      if (confidenceMatch[2]) {
        section.recommendedActAgentConfidence = parseFloat(confidenceMatch[2]);
      }
    }
    return true;
  }

  const specialistsPrefix = matchLocalizedPrefix(line, 'SPECIALISTS_PREFIX');
  if (specialistsPrefix) {
    section.specialists = line
      .replace(specialistsPrefix, '')
      .trim()
      .split(',')
      .map(s => s.trim());
    return true;
  }

  const statusPrefix = matchLocalizedPrefix(line, 'STATUS_PREFIX');
  if (statusPrefix) {
    const statusValue = line.replace(statusPrefix, '').trim();
    if (isValidSectionStatus(statusValue)) {
      section.status = statusValue;
    }
    return true;
  }

  return false;
}

/**
 * Parse section list header (### Task, ### Decisions, ### Notes).
 */
function parseListHeader(
  line: string,
  section: Partial<SessionSection>,
): ListHeaderResult {
  if (matchLocalizedExact(line, 'TASK_HEADER')) {
    return { matched: true, listType: 'task' };
  }
  if (matchLocalizedExact(line, 'DECISIONS_HEADER')) {
    section.decisions = [];
    return { matched: true, listType: 'decisions' };
  }
  if (matchLocalizedExact(line, 'NOTES_HEADER')) {
    section.notes = [];
    return { matched: true, listType: 'notes' };
  }
  return { matched: false };
}

/**
 * Check if line is content (not structural markdown).
 */
function isContentLine(line: string): boolean {
  return (
    !line.startsWith('#') &&
    !line.startsWith('**') &&
    !line.startsWith('-') &&
    !line.startsWith('---') &&
    line.trim().length > 0
  );
}

/**
 * Parse a list item line.
 */
function parseListItem(
  line: string,
  section: Partial<SessionSection>,
  listType: 'decisions' | 'notes',
): void {
  const item = line.replace('- ', '').trim();
  if (listType === 'decisions') {
    section.decisions = section.decisions || [];
    section.decisions.push(item);
  } else {
    section.notes = section.notes || [];
    section.notes.push(item);
  }
}

/**
 * Parse a single line of section content.
 */
function parseSectionContentLine(line: string, ctx: ParseContext): void {
  if (!ctx.currentSection) return;
  const section = ctx.currentSection;

  // Try parsing as section field (primary agent, specialists, etc.)
  if (parseSectionField(line, section)) return;

  // Try parsing as list header
  const listResult = parseListHeader(line, section);
  if (listResult.matched) {
    ctx.currentListType =
      listResult.listType === 'task' ? null : listResult.listType;
    return;
  }

  // Try parsing as list item
  if (line.startsWith('- ') && ctx.currentListType) {
    parseListItem(line, section, ctx.currentListType);
    return;
  }

  // Try parsing as task content
  if (isContentLine(line) && !ctx.currentListType) {
    section.task = section.task ? `${section.task}\n${line}` : line;
  }
}

/**
 * Parse a markdown session document.
 *
 * @param content - The markdown content to parse
 * @param sessionId - The session ID for metadata
 * @returns Parsed session document
 */
export function parseDocument(
  content: string,
  sessionId: string,
): SessionDocument {
  const lines = content.split('\n');
  const ctx: ParseContext = {
    metadata: {
      id: sessionId,
      title: sessionId,
      createdAt: '',
      updatedAt: '',
      status: 'active',
    },
    sections: [],
    currentSection: null,
    currentListType: null,
  };

  for (const line of lines) {
    // Try parsing in order of precedence
    if (parseMetadataLine(line, ctx)) continue;
    if (parseSectionHeader(line, ctx)) continue;
    if (ctx.currentSection) {
      parseSectionContentLine(line, ctx);
    }
  }

  // Save last section
  if (ctx.currentSection && ctx.currentSection.mode) {
    ctx.sections.push(ctx.currentSection as SessionSection);
  }

  return { metadata: ctx.metadata, sections: ctx.sections };
}
