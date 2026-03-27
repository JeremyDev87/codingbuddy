import {
  generateArchiveFilename,
  parseArchiveDate,
  validateSearchKeyword,
  ARCHIVE_FILENAME_PATTERN,
  MAX_SEARCH_KEYWORD_LENGTH,
} from './context-archive.types';

describe('context-archive.types', () => {
  describe('generateArchiveFilename', () => {
    it('should generate filename in YYYY-MM-DD-HHmm.md format', () => {
      const date = new Date(2026, 2, 28, 14, 30); // March 28, 2026 14:30
      expect(generateArchiveFilename(date)).toBe('2026-03-28-1430.md');
    });

    it('should zero-pad single digit months and days', () => {
      const date = new Date(2026, 0, 5, 9, 3); // Jan 5, 2026 09:03
      expect(generateArchiveFilename(date)).toBe('2026-01-05-0903.md');
    });

    it('should use current time when no date provided', () => {
      const result = generateArchiveFilename();
      expect(result).toMatch(ARCHIVE_FILENAME_PATTERN);
    });
  });

  describe('parseArchiveDate', () => {
    it('should parse valid archive filename', () => {
      const date = parseArchiveDate('2026-03-28-1430.md');
      expect(date).not.toBeNull();
      expect(date!.getFullYear()).toBe(2026);
      expect(date!.getMonth()).toBe(2); // March = 2
      expect(date!.getDate()).toBe(28);
      expect(date!.getHours()).toBe(14);
      expect(date!.getMinutes()).toBe(30);
    });

    it('should return null for invalid filename', () => {
      expect(parseArchiveDate('not-a-file.md')).toBeNull();
      expect(parseArchiveDate('2026-03-28.md')).toBeNull();
      expect(parseArchiveDate('')).toBeNull();
    });

    it('should roundtrip with generateArchiveFilename', () => {
      const original = new Date(2026, 5, 15, 8, 45);
      const filename = generateArchiveFilename(original);
      const parsed = parseArchiveDate(filename);
      expect(parsed).not.toBeNull();
      expect(parsed!.getFullYear()).toBe(original.getFullYear());
      expect(parsed!.getMonth()).toBe(original.getMonth());
      expect(parsed!.getDate()).toBe(original.getDate());
      expect(parsed!.getHours()).toBe(original.getHours());
      expect(parsed!.getMinutes()).toBe(original.getMinutes());
    });
  });

  describe('validateSearchKeyword', () => {
    it('should accept valid keywords', () => {
      expect(validateSearchKeyword('auth')).toEqual({ valid: true });
      expect(validateSearchKeyword('database migration')).toEqual({ valid: true });
    });

    it('should reject empty keywords', () => {
      const result = validateSearchKeyword('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('should reject whitespace-only keywords', () => {
      const result = validateSearchKeyword('   ');
      expect(result.valid).toBe(false);
    });

    it('should reject keywords exceeding max length', () => {
      const long = 'a'.repeat(MAX_SEARCH_KEYWORD_LENGTH + 1);
      const result = validateSearchKeyword(long);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('maximum length');
    });

    it('should accept keywords at exact max length', () => {
      const exact = 'a'.repeat(MAX_SEARCH_KEYWORD_LENGTH);
      expect(validateSearchKeyword(exact)).toEqual({ valid: true });
    });
  });
});
