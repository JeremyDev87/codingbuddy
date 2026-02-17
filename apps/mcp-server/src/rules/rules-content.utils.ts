/**
 * Utilities for processing and truncating rule content based on verbosity level.
 *
 * These utilities handle content optimization while preserving markdown structure
 * and important information like headings and code blocks.
 */

import { type VerbosityLevel } from '../shared/verbosity.types';

/**
 * Maximum characters for rule content at each verbosity level.
 * These limits balance token consumption with content usefulness.
 */
const CONTENT_LIMITS: Record<VerbosityLevel, number> = {
  minimal: 0, // No content, paths only
  standard: 2000, // ~500 tokens per rule
  full: Infinity, // No limit
};

/**
 * Truncate rule content based on verbosity level.
 * Preserves markdown structure and adds truncation notice if content is cut.
 *
 * @param content - Original rule content (markdown)
 * @param verbosity - Verbosity level
 * @returns Truncated content or empty string based on verbosity
 *
 * @example
 * ```typescript
 * const full = await fs.readFile('rules/core.md', 'utf-8');
 * const truncated = truncateRuleContent(full, 'standard');
 * // Returns first ~2000 chars preserving markdown structure
 * ```
 */
export function truncateRuleContent(content: string, verbosity: VerbosityLevel): string {
  const limit = CONTENT_LIMITS[verbosity];

  // minimal: return empty string (paths only)
  if (limit === 0) {
    return '';
  }

  // full: return original content
  if (limit === Infinity) {
    return content;
  }

  // standard: truncate intelligently
  if (content.length <= limit) {
    return content;
  }

  // Find a good truncation point near the limit
  // Try to break at:
  // 1. End of heading (##)
  // 2. End of paragraph (double newline)
  // 3. End of line (single newline)
  // 4. Anywhere (fallback)
  const searchWindow = content.slice(0, limit + 100); // Look slightly ahead
  const candidates = [
    searchWindow.lastIndexOf('\n## '), // Heading
    searchWindow.lastIndexOf('\n\n'), // Paragraph
    searchWindow.lastIndexOf('\n'), // Line
  ];

  let truncateAt = limit;
  for (const pos of candidates) {
    if (pos > limit * 0.8 && pos <= limit) {
      // Found a good break point (within 80%-100% of limit)
      truncateAt = pos;
      break;
    }
  }

  const truncated = content.slice(0, truncateAt).trim();
  return `${truncated}\n\n_[Content truncated at ${truncateAt} characters for token optimization]_`;
}

/**
 * Check if verbosity level includes rule content.
 * Helper for conditional logic in services.
 *
 * @param verbosity - Verbosity level
 * @returns true if content should be included, false if paths only
 *
 * @example
 * ```typescript
 * if (shouldIncludeContent('minimal')) {
 *   // false - skip loading full content
 * }
 * ```
 */
export function shouldIncludeContent(verbosity: VerbosityLevel): boolean {
  return CONTENT_LIMITS[verbosity] > 0;
}
