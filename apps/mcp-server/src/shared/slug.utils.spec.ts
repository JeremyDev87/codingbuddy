import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateSlug, generateSessionTitle } from './slug.utils';

describe('slug.utils', () => {
  describe('generateSlug', () => {
    it('should convert text to lowercase slug', () => {
      expect(generateSlug('Hello World')).toBe('hello-world');
    });

    it('should remove special characters', () => {
      expect(generateSlug('Hello! World@#$%')).toBe('hello-world');
    });

    it('should preserve Korean characters', () => {
      expect(generateSlug('한글 테스트')).toBe('한글-테스트');
    });

    it('should handle mixed Korean and English', () => {
      expect(generateSlug('Hello 세계')).toBe('hello-세계');
    });

    it('should replace multiple spaces with single hyphen', () => {
      expect(generateSlug('Multiple   Spaces   Here')).toBe(
        'multiple-spaces-here',
      );
    });

    it('should trim leading and trailing spaces', () => {
      expect(generateSlug('  trimmed  ')).toBe('trimmed');
    });

    it('should remove leading and trailing hyphens', () => {
      expect(generateSlug('--test--')).toBe('test');
    });

    it('should return "untitled" for empty string', () => {
      expect(generateSlug('')).toBe('untitled');
    });

    it('should return "untitled" for whitespace-only string', () => {
      expect(generateSlug('   ')).toBe('untitled');
    });

    it('should return "untitled" for special-chars-only string', () => {
      expect(generateSlug('!@#$%^&*()')).toBe('untitled');
    });

    it('should truncate to maxLength', () => {
      const longText = 'This is a very long text that should be truncated';
      const result = generateSlug(longText, 20);
      expect(result.length).toBeLessThanOrEqual(20);
    });

    it('should use default maxLength of 50', () => {
      const longText = 'a'.repeat(100);
      const result = generateSlug(longText);
      expect(result.length).toBeLessThanOrEqual(50);
    });

    it('should preserve existing hyphens', () => {
      expect(generateSlug('hello-world')).toBe('hello-world');
    });

    it('should handle numbers', () => {
      expect(generateSlug('Version 2.0 Release')).toBe('version-20-release');
    });

    it('should preserve Japanese hiragana', () => {
      expect(generateSlug('ひらがな テスト')).toBe('ひらがな-テスト');
    });

    it('should preserve Japanese katakana', () => {
      expect(generateSlug('カタカナ テスト')).toBe('カタカナ-テスト');
    });

    it('should preserve Chinese characters', () => {
      expect(generateSlug('中文 测试')).toBe('中文-测试');
    });

    it('should handle mixed CJK scripts', () => {
      expect(generateSlug('Hello 世界 ワールド 세계')).toBe(
        'hello-世界-ワールド-세계',
      );
    });
  });

  describe('generateSessionTitle', () => {
    beforeEach(() => {
      // Mock Date to have consistent test output
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-11T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should prefix slug with date', () => {
      const result = generateSessionTitle('Test Session');
      expect(result).toBe('2026-01-11-test-session');
    });

    it('should handle empty text', () => {
      const result = generateSessionTitle('');
      expect(result).toBe('2026-01-11-untitled');
    });

    it('should handle Korean text', () => {
      const result = generateSessionTitle('인증 기능 구현');
      expect(result).toBe('2026-01-11-인증-기능-구현');
    });

    it('should respect maxLength parameter', () => {
      const longText = 'This is a very long session title that exceeds limit';
      const result = generateSessionTitle(longText, 20);
      // Date prefix is 10 chars + hyphen = 11 chars
      // Slug portion should be max 20 chars
      expect(result.startsWith('2026-01-11-')).toBe(true);
      expect(result.length).toBeLessThanOrEqual(31); // 11 + 20
    });
  });
});
