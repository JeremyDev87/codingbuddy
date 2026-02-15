import { describe, it, expect } from 'vitest';
import {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  isValidLocale,
} from '@/lib/locale';
import type { SupportedLocale } from '@/lib/locale';

describe('locale utilities', () => {
  describe('SUPPORTED_LOCALES', () => {
    it('should include all 5 locales', () => {
      expect(SUPPORTED_LOCALES).toEqual(['en', 'ko', 'zh-CN', 'ja', 'es']);
    });

    it('should have exactly 5 entries', () => {
      expect(SUPPORTED_LOCALES).toHaveLength(5);
    });
  });

  describe('DEFAULT_LOCALE', () => {
    it('should be en', () => {
      expect(DEFAULT_LOCALE).toBe('en');
    });
  });

  describe('isValidLocale', () => {
    it('should return true for supported locales', () => {
      expect(isValidLocale('en')).toBe(true);
      expect(isValidLocale('ko')).toBe(true);
      expect(isValidLocale('zh-CN')).toBe(true);
      expect(isValidLocale('ja')).toBe(true);
      expect(isValidLocale('es')).toBe(true);
    });

    it('should return false for unsupported locales', () => {
      expect(isValidLocale('fr')).toBe(false);
      expect(isValidLocale('de')).toBe(false);
      expect(isValidLocale('')).toBe(false);
      expect(isValidLocale('invalid')).toBe(false);
    });

    it('should be case-sensitive', () => {
      expect(isValidLocale('EN')).toBe(false);
      expect(isValidLocale('Ko')).toBe(false);
      expect(isValidLocale('zh-cn')).toBe(false);
      expect(isValidLocale('JA')).toBe(false);
      expect(isValidLocale('ES')).toBe(false);
    });
  });

  describe('SupportedLocale type', () => {
    it('should cover all 5 locales', () => {
      const locales: SupportedLocale[] = ['en', 'ko', 'zh-CN', 'ja', 'es'];
      expect(locales).toHaveLength(5);
    });
  });
});
