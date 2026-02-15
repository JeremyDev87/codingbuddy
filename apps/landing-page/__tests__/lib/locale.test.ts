import { describe, it, expect } from 'vitest';
import { SUPPORTED_LOCALES, DEFAULT_LOCALE, isValidLocale } from '@/lib/locale';

describe('locale utilities', () => {
  describe('SUPPORTED_LOCALES', () => {
    it('should contain en and ko', () => {
      expect(SUPPORTED_LOCALES).toContain('en');
      expect(SUPPORTED_LOCALES).toContain('ko');
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
    });

    it('should return false for unsupported locales', () => {
      expect(isValidLocale('fr')).toBe(false);
      expect(isValidLocale('')).toBe(false);
      expect(isValidLocale('invalid')).toBe(false);
    });
  });
});
