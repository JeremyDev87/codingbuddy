import { describe, it, expect } from 'vitest';
import { estimateDisplayWidth, truncateToDisplayWidth, padEndDisplayWidth } from './display-width';

describe('tui/utils/display-width', () => {
  describe('estimateDisplayWidth', () => {
    it('should return 0 for empty string', () => {
      expect(estimateDisplayWidth('')).toBe(0);
    });

    it('should count ASCII characters as width 1', () => {
      expect(estimateDisplayWidth('hello')).toBe(5);
      expect(estimateDisplayWidth('abc 123')).toBe(7);
    });

    it('should count box-drawing characters as width 1', () => {
      expect(estimateDisplayWidth('│──┌└├')).toBe(6);
    });

    it('should count emojis (supplementary plane) as width 2', () => {
      expect(estimateDisplayWidth('🤖')).toBe(2);
      expect(estimateDisplayWidth('🎹')).toBe(2);
      expect(estimateDisplayWidth('🧪')).toBe(2);
    });

    it('should treat Variation Selector-16 (U+FE0F) as width 0', () => {
      // 🏛️ = U+1F3DB (wide, 2) + U+FE0F (VS-16, 0) = 2
      expect(estimateDisplayWidth('🏛️')).toBe(2);
      // ⚙️ = U+2699 (wide, 2) + U+FE0F (VS-16, 0) = 2
      expect(estimateDisplayWidth('⚙️')).toBe(2);
    });

    it('should treat Zero-Width Joiner (U+200D) as width 0', () => {
      expect(estimateDisplayWidth('\u200D')).toBe(0);
    });

    it('should count misc symbols (U+2600-U+27BF) as width 2', () => {
      expect(estimateDisplayWidth('⚡')).toBe(2);
    });

    it('should count CJK ideographs as width 2', () => {
      expect(estimateDisplayWidth('漢')).toBe(2);
      expect(estimateDisplayWidth('字')).toBe(2);
      expect(estimateDisplayWidth('漢字')).toBe(4);
    });

    it('should count Hangul syllables as width 2', () => {
      expect(estimateDisplayWidth('한')).toBe(2);
      expect(estimateDisplayWidth('글')).toBe(2);
      expect(estimateDisplayWidth('한글')).toBe(4);
    });

    it('should count fullwidth forms as width 2', () => {
      expect(estimateDisplayWidth('Ａ')).toBe(2); // U+FF21
    });

    it('should correctly estimate mixed content', () => {
      // "🤖 2 active" = emoji(2) + " 2 active"(9) = 11
      expect(estimateDisplayWidth('🤖 2 active')).toBe(11);
      // "🎹 tdd" = emoji(2) + " tdd"(4) = 6
      expect(estimateDisplayWidth('🎹 tdd')).toBe(6);
      // "⚡ Parallel" = symbol(2) + " Parallel"(9) = 11
      expect(estimateDisplayWidth('⚡ Parallel')).toBe(11);
    });

    it('should handle string with multiple emojis', () => {
      // "🤖 a │ 🎹 b │ ⚡ c" = 2+3+1+3+2+3+1+3+2+2 = ...
      const s = '🤖 a │ 🎹 b │ ⚡ c';
      const expected = 2 + 1 + 1 + 1 + 1 + 1 + 2 + 1 + 1 + 1 + 1 + 1 + 2 + 1 + 1; // = 18
      expect(estimateDisplayWidth(s)).toBe(expected);
    });
  });

  describe('truncateToDisplayWidth', () => {
    it('should return full string when within maxWidth', () => {
      expect(truncateToDisplayWidth('hello', 10)).toBe('hello');
    });

    it('should truncate ASCII string at exact width', () => {
      expect(truncateToDisplayWidth('abcdefgh', 5)).toBe('abcde');
    });

    it('should not split an emoji that would exceed maxWidth', () => {
      // '🤖' is 2 columns wide; maxWidth=1 means it cannot fit
      expect(truncateToDisplayWidth('🤖hello', 1)).toBe('');
    });

    it('should include emoji when it fits within maxWidth', () => {
      // '🤖' is 2 columns; maxWidth=2 fits exactly
      expect(truncateToDisplayWidth('🤖hello', 2)).toBe('🤖');
    });

    it('should correctly truncate mixed emoji and ASCII', () => {
      // '🤖 ab' = 2+1+1+1 = 5 columns
      expect(truncateToDisplayWidth('🤖 ab', 4)).toBe('🤖 a');
      expect(truncateToDisplayWidth('🤖 ab', 5)).toBe('🤖 ab');
    });

    it('should handle empty string', () => {
      expect(truncateToDisplayWidth('', 10)).toBe('');
    });

    it('should handle maxWidth of 0', () => {
      expect(truncateToDisplayWidth('hello', 0)).toBe('');
    });

    it('should handle misc symbols (U+2600-U+27BF)', () => {
      // '⚡' is 2 columns; 'ab' is 2; total = 4
      expect(truncateToDisplayWidth('⚡ab', 3)).toBe('⚡a');
    });
  });

  describe('padEndDisplayWidth', () => {
    it('should pad ASCII string to target width', () => {
      expect(padEndDisplayWidth('hello', 10)).toBe('hello     ');
      expect(estimateDisplayWidth(padEndDisplayWidth('hello', 10))).toBe(10);
    });

    it('should not pad when string already meets target width', () => {
      expect(padEndDisplayWidth('hello', 5)).toBe('hello');
    });

    it('should not pad when string exceeds target width', () => {
      expect(padEndDisplayWidth('hello world', 5)).toBe('hello world');
    });

    it('should account for wide emoji characters in padding', () => {
      // '🤖' is 2 display columns, so 'hello' needs less padding to reach 10
      // '🤖 hi' = 2+1+1+1 = 5 display columns → needs 5 more spaces for width 10
      const result = padEndDisplayWidth('🤖 hi', 10);
      expect(estimateDisplayWidth(result)).toBe(10);
    });

    it('should account for CJK characters in padding', () => {
      // '한글' = 4 display columns → needs 6 spaces for width 10
      const result = padEndDisplayWidth('한글', 10);
      expect(estimateDisplayWidth(result)).toBe(10);
      expect(result).toBe('한글      ');
    });

    it('should handle empty string', () => {
      expect(padEndDisplayWidth('', 5)).toBe('     ');
      expect(estimateDisplayWidth(padEndDisplayWidth('', 5))).toBe(5);
    });
  });

  describe('known limitations', () => {
    it('should overestimate ZWJ emoji sequences (each emoji codepoint counted individually)', () => {
      // 👨‍👩‍👧‍👦 is a ZWJ sequence: 👨 + ZWJ + 👩 + ZWJ + 👧 + ZWJ + 👦
      // Renders as 2 columns in most terminals, but we count each emoji codepoint
      const familyEmoji = '\u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466}';
      const width = estimateDisplayWidth(familyEmoji);
      // ZWJ (U+200D) is now width 0, so: 4 emojis (2 each) + 3 ZWJ (0 each) = 8
      // Actual terminal width would be 2
      expect(width).toBe(8);
      expect(width).toBeGreaterThan(2);
    });
  });
});
