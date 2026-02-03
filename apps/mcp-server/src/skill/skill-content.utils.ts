/**
 * Maximum characters per skill content for token optimization
 * Prevents excessive token consumption when including skill content in responses
 */
export const MAX_SKILL_CONTENT_LENGTH = 3000;

/**
 * Standard truncation notice appended when skill content is truncated.
 * Guides users to use the `get_skill` tool for full content.
 */
export const SKILL_TRUNCATION_NOTICE =
  '[Content truncated. Use `get_skill` tool for full content]';

/**
 * Intelligently truncate skill content to stay within token limits
 *
 * Strategy:
 * - Returns content as-is if under limit
 * - Finds last newline within 80% of limit for clean break
 * - Falls back to hard cutoff if no suitable newline found
 * - Appends truncation notice with guidance
 *
 * @param content - Full skill content from markdown file
 * @returns Truncated content with notice if applicable
 *
 * @example
 * ```typescript
 * const shortContent = "Brief skill description";
 * truncateSkillContent(shortContent);
 * // Returns original content unchanged
 *
 * const longContent = "...very long content..."; // > 3000 chars
 * truncateSkillContent(longContent);
 * // Returns content cut at ~3000 chars with truncation notice
 * ```
 */
export function truncateSkillContent(content: string): string {
  if (content.length <= MAX_SKILL_CONTENT_LENGTH) {
    return content;
  }

  // Try to cut at last newline within 80% of limit for cleaner break
  const truncated = content.slice(0, MAX_SKILL_CONTENT_LENGTH);
  const lastNewline = truncated.lastIndexOf('\n');
  const cutPoint =
    lastNewline > MAX_SKILL_CONTENT_LENGTH * 0.8
      ? lastNewline
      : MAX_SKILL_CONTENT_LENGTH;

  return truncated.slice(0, cutPoint) + '\n\n---\n' + SKILL_TRUNCATION_NOTICE;
}

/**
 * Check if skill content has been truncated
 *
 * Useful for:
 * - Determining if full content needs to be fetched
 * - Showing appropriate UI indicators
 * - Logging truncation statistics
 *
 * @param content - Skill content to check
 * @returns true if content was truncated, false otherwise
 *
 * @example
 * ```typescript
 * const truncated = truncateSkillContent(longContent);
 * if (isSkillContentTruncated(truncated)) {
 *   console.log("Recommend using get_skill for full content");
 * }
 * ```
 */
export function isSkillContentTruncated(content: string): boolean {
  return content.endsWith(SKILL_TRUNCATION_NOTICE);
}
