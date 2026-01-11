/**
 * Session Document Serializer
 *
 * Serializes session documents to markdown with localization support.
 * Supports all languages: en, ko, ja, zh, es.
 */

import type { SessionDocument, SessionSection } from './session.types';
import { LOCALIZED_LABELS, type LocalizedLabels } from './session.parser';

/**
 * Mapping from language codes to locale strings for timestamp formatting.
 */
export const LANGUAGE_TO_LOCALE: Record<string, string> = {
  en: 'en-US',
  ko: 'ko-KR',
  ja: 'ja-JP',
  zh: 'zh-CN',
  es: 'es-ES',
};

/**
 * Get localized labels for session documents.
 * Falls back to English if language not supported.
 */
export function getLocalizedLabels(language: string): LocalizedLabels {
  return LOCALIZED_LABELS[language] || LOCALIZED_LABELS.en;
}

/**
 * Serialize a section to markdown lines.
 */
function serializeSection(
  section: SessionSection,
  labels: LocalizedLabels,
): string[] {
  const lines: string[] = [];

  lines.push('');
  lines.push(`## ${section.mode} (${section.timestamp})`);
  lines.push('');

  if (section.primaryAgent) {
    lines.push(`${labels.PRIMARY_AGENT_PREFIX} ${section.primaryAgent}`);
  }

  if (section.recommendedActAgent) {
    const confidence = section.recommendedActAgentConfidence
      ? ` (confidence: ${section.recommendedActAgentConfidence})`
      : '';
    lines.push(
      `${labels.RECOMMENDED_ACT_AGENT_PREFIX} ${section.recommendedActAgent}${confidence}`,
    );
  }

  if (section.specialists && section.specialists.length > 0) {
    lines.push(
      `${labels.SPECIALISTS_PREFIX} ${section.specialists.join(', ')}`,
    );
  }

  if (section.status) {
    lines.push(`${labels.STATUS_PREFIX} ${section.status}`);
  }

  lines.push('');

  if (section.task) {
    lines.push(labels.TASK_HEADER);
    lines.push(section.task);
    lines.push('');
  }

  if (section.decisions && section.decisions.length > 0) {
    lines.push(labels.DECISIONS_HEADER);
    for (const decision of section.decisions) {
      lines.push(`- ${decision}`);
    }
    lines.push('');
  }

  if (section.notes && section.notes.length > 0) {
    lines.push(labels.NOTES_HEADER);
    for (const note of section.notes) {
      lines.push(`- ${note}`);
    }
    lines.push('');
  }

  lines.push(labels.SECTION_SEPARATOR);

  return lines;
}

/**
 * Serialize a session document to markdown.
 * Uses localized labels based on language setting.
 *
 * @param doc - The session document to serialize
 * @param language - Language code (en, ko, ja, zh, es)
 * @returns Markdown string
 */
export function serializeDocument(
  doc: SessionDocument,
  language: string,
): string {
  const labels = getLocalizedLabels(language);
  const lines: string[] = [];

  // Header
  lines.push(`${labels.SESSION_HEADER} ${doc.metadata.title}`);
  lines.push('');
  lines.push(`${labels.CREATED_PREFIX} ${doc.metadata.createdAt}`);
  lines.push(`${labels.UPDATED_PREFIX} ${doc.metadata.updatedAt}`);
  lines.push(`${labels.STATUS_PREFIX} ${doc.metadata.status}`);
  lines.push('');
  lines.push(labels.SECTION_SEPARATOR);

  // Sections
  for (const section of doc.sections) {
    lines.push(...serializeSection(section, labels));
  }

  return lines.join('\n');
}

/**
 * Format timestamp for session documents.
 *
 * @param date - Date to format
 * @param language - Language code for locale
 * @returns Formatted timestamp string (HH:MM)
 */
export function formatTimestamp(date: Date, language: string): string {
  const locale = LANGUAGE_TO_LOCALE[language] || 'en-US';
  return date.toLocaleString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
