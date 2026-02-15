import { describe, test, expect } from 'vitest';
import en from '../../messages/en.json';
import ko from '../../messages/ko.json';
import zhCN from '../../messages/zh-CN.json';
import ja from '../../messages/ja.json';
import es from '../../messages/es.json';

const allMessages = { en, ko, 'zh-CN': zhCN, ja, es };
const referenceKeys = Object.keys(en);

describe('message files', () => {
  test('all locales have identical top-level keys', () => {
    for (const [locale, messages] of Object.entries(allMessages)) {
      expect(
        Object.keys(messages),
        `${locale} top-level keys mismatch`,
      ).toEqual(referenceKeys);
    }
  });

  test('all locales have identical nested keys for each section', () => {
    for (const section of referenceKeys) {
      const refNestedKeys = Object.keys(
        (en as Record<string, Record<string, string>>)[section],
      ).sort();
      for (const [locale, messages] of Object.entries(allMessages)) {
        const nestedKeys = Object.keys(
          (messages as Record<string, Record<string, string>>)[section],
        ).sort();
        expect(nestedKeys, `${locale}.${section} keys mismatch`).toEqual(
          refNestedKeys,
        );
      }
    }
  });

  test('no empty string values in any locale', () => {
    for (const [locale, messages] of Object.entries(allMessages)) {
      for (const [section, content] of Object.entries(
        messages as Record<string, Record<string, string>>,
      )) {
        for (const [key, value] of Object.entries(content)) {
          expect(value, `${locale}.${section}.${key} is empty`).not.toBe('');
        }
      }
    }
  });
});
