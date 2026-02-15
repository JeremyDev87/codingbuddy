import { describe, test, expect } from 'vitest';
import { hasLocale } from 'next-intl';
import { routing } from '../../i18n/routing';
import { SUPPORTED_LOCALES } from '../../lib/locale';

// getRequestConfig requires Next.js server context and cannot be called directly in vitest.
// Instead, we test the core logic it depends on: hasLocale validation and message loading.

describe('i18n request config logic', () => {
  describe('hasLocale allowlist check', () => {
    test('returns true for all supported locales', () => {
      for (const locale of SUPPORTED_LOCALES) {
        expect(hasLocale(routing.locales, locale)).toBe(true);
      }
    });

    test('returns false for unsupported locales', () => {
      expect(hasLocale(routing.locales, 'fr')).toBe(false);
      expect(hasLocale(routing.locales, 'de')).toBe(false);
      expect(hasLocale(routing.locales, 'invalid')).toBe(false);
      expect(hasLocale(routing.locales, '')).toBe(false);
    });

    test('returns false for path traversal attempts', () => {
      expect(hasLocale(routing.locales, '../etc/passwd')).toBe(false);
      expect(hasLocale(routing.locales, 'en/../../secret')).toBe(false);
      expect(hasLocale(routing.locales, 'en%00')).toBe(false);
    });

    test('returns false for undefined/null', () => {
      expect(hasLocale(routing.locales, undefined)).toBe(false);
      expect(hasLocale(routing.locales, null as unknown as string)).toBe(false);
    });
  });

  describe('message file loading', () => {
    test('all message files can be dynamically imported', async () => {
      for (const locale of SUPPORTED_LOCALES) {
        const messages = (await import(`../../messages/${locale}.json`))
          .default;
        expect(messages).toBeDefined();
        expect(messages.hero).toBeDefined();
        expect(messages.hero.title).toBeTruthy();
      }
    });

    test('default locale message file is always available as fallback', async () => {
      const messages = (
        await import(`../../messages/${routing.defaultLocale}.json`)
      ).default;
      expect(messages).toBeDefined();
      expect(Object.keys(messages)).toEqual([
        'hero',
        'agents',
        'codeExample',
        'quickStart',
        'faq',
      ]);
    });
  });
});
