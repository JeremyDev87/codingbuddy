/**
 * Slug generation utilities for creating URL-safe identifiers.
 *
 * These utilities convert strings into slug format suitable for:
 * - File names
 * - URL paths
 * - Session identifiers
 */

/** Default maximum length for generated slugs */
const DEFAULT_MAX_LENGTH = 50;

/**
 * Generates a URL-safe slug from the given text.
 *
 * Features:
 * - Converts to lowercase
 * - Removes special characters (preserves CJK scripts, alphanumeric, spaces, hyphens)
 * - Supports: Han (Chinese/Japanese kanji), Hangul (Korean), Hiragana, Katakana
 * - Replaces spaces with hyphens
 * - Trims leading/trailing hyphens
 * - Truncates to maxLength
 *
 * @param text - The input text to convert to a slug
 * @param maxLength - Maximum length of the resulting slug (default: 50)
 * @returns A URL-safe slug, or 'untitled' if input is empty
 *
 * @example
 * ```typescript
 * generateSlug('Hello World!') // 'hello-world'
 * generateSlug('한글 테스트') // '한글-테스트'
 * generateSlug('日本語 テスト') // '日本語-テスト'
 * generateSlug('中文 测试') // '中文-测试'
 * generateSlug('') // 'untitled'
 * ```
 */
export function generateSlug(
  text: string,
  maxLength: number = DEFAULT_MAX_LENGTH,
): string {
  // Take first N chars and trim
  const truncated = text.slice(0, maxLength).trim();

  // Convert to slug format
  const slug = truncated
    .toLowerCase()
    // Keep alphanumeric, CJK scripts (Han, Hangul, Hiragana, Katakana), spaces, hyphens, and prolonged sound mark
    .replace(
      /[^a-z0-9\p{Script=Han}\p{Script=Hangul}\p{Script=Hiragana}\p{Script=Katakana}\u30FC\s-]/gu,
      '',
    )
    // Replace multiple spaces with single hyphen
    .replace(/\s+/g, '-')
    // Remove leading/trailing hyphens (one or more)
    .replace(/^-+|-+$/g, '');

  return slug || 'untitled';
}

/**
 * Generates a session title slug with date prefix.
 *
 * @param text - The input text to convert to a session title
 * @param maxLength - Maximum length for the text portion (default: 50)
 * @returns A date-prefixed session title slug
 *
 * @example
 * ```typescript
 * generateSessionTitle('Implement Auth Feature')
 * // '2026-01-11-implement-auth-feature'
 * ```
 */
export function generateSessionTitle(
  text: string,
  maxLength: number = DEFAULT_MAX_LENGTH,
): string {
  const datePrefix = new Date().toISOString().slice(0, 10);
  const slug = generateSlug(text, maxLength);
  return `${datePrefix}-${slug}`;
}
