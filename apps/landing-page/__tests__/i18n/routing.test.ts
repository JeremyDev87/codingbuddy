import { describe, test, expect } from 'vitest';
import { routing } from '../../i18n/routing';

describe('i18n routing configuration', () => {
  test('supports 5 locales', () => {
    expect(routing.locales).toHaveLength(5);
    expect(routing.locales).toEqual(['en', 'ko', 'zh-CN', 'ja', 'es']);
  });

  test('uses en as default locale', () => {
    expect(routing.defaultLocale).toBe('en');
  });

  test('uses always locale prefix strategy', () => {
    expect(routing.localePrefix).toBe('always');
  });
});
