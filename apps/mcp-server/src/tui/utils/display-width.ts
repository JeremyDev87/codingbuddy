/**
 * Returns true if a codepoint occupies 2 terminal columns.
 * Covers: CJK Ideographs, Hangul Syllables, Fullwidth Forms,
 * Misc Symbols, Dingbats, and Supplementary Plane emojis.
 *
 * @note Does not cover less common wide ranges: Yi Syllables (U+A000-A48F),
 * Kangxi Radicals (U+2F00-2FDF), CJK Extension B+ (handled by Supplementary
 * Plane catch-all). These can be added if needed in the future.
 */
function isWide(code: number): boolean {
  return (
    code > 0xffff || // Supplementary Plane (most emojis)
    (code >= 0x2600 && code <= 0x27bf) || // Misc Symbols + Dingbats
    (code >= 0x4e00 && code <= 0x9fff) || // CJK Unified Ideographs
    (code >= 0x3400 && code <= 0x4dbf) || // CJK Extension A
    (code >= 0xac00 && code <= 0xd7af) || // Hangul Syllables
    (code >= 0xff01 && code <= 0xff60) || // Fullwidth Forms
    (code >= 0xf900 && code <= 0xfaff) // CJK Compatibility Ideographs
  );
}

/**
 * Returns the display width of a single character (0, 1, or 2 columns).
 * Zero-width: Variation Selector-16 (U+FE0F), Zero-Width Joiner (U+200D).
 */
function charDisplayWidth(code: number): number {
  if (code === 0xfe0f || code === 0x200d) return 0;
  return isWide(code) ? 2 : 1;
}

/**
 * Estimates the terminal display width of a string.
 * Emojis and misc symbols occupy 2 columns; ASCII/box-drawing occupy 1.
 *
 * @internal Intended for TUI pure functions operating on raw content strings.
 * @note Does not strip ANSI escape codes — do not use on terminal-rendered output.
 * For ANSI-aware width, consider `string-width`.
 *
 * @note Does not handle Zero-Width Joiner (ZWJ) emoji sequences (e.g. 👨‍👩‍👧‍👦).
 * Each codepoint in a ZWJ sequence is counted individually, which overestimates
 * the display width. This is acceptable for the current TUI which only uses
 * single-codepoint emojis.
 */
export function estimateDisplayWidth(str: string): number {
  let width = 0;
  for (const char of str) {
    width += charDisplayWidth(char.codePointAt(0) ?? 0);
  }
  return width;
}

/**
 * Truncates a string to fit within maxWidth display columns.
 * Correctly handles multi-byte characters (emojis, symbols).
 */
export function truncateToDisplayWidth(str: string, maxWidth: number): string {
  let width = 0;
  let codeUnitIndex = 0;
  for (const char of str) {
    const cw = charDisplayWidth(char.codePointAt(0) ?? 0);
    if (width + cw > maxWidth) break;
    width += cw;
    codeUnitIndex += char.length;
  }
  return str.slice(0, codeUnitIndex);
}

/**
 * Pads a string with trailing spaces to reach the target display width.
 * Unlike String.padEnd(), this accounts for wide characters (emoji, CJK)
 * that occupy 2 terminal columns.
 */
export function padEndDisplayWidth(str: string, targetWidth: number): string {
  const currentWidth = estimateDisplayWidth(str);
  if (currentWidth >= targetWidth) return str;
  return str + ' '.repeat(targetWidth - currentWidth);
}
