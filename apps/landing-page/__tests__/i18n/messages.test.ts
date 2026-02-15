import { describe, test, expect } from 'vitest';
import en from '../../messages/en.json';
import ko from '../../messages/ko.json';
import zhCN from '../../messages/zh-CN.json';
import ja from '../../messages/ja.json';
import es from '../../messages/es.json';

interface MessageMap {
  [key: string]: string | MessageMap;
}
type Messages = Record<string, MessageMap>;

const allMessages: Record<string, Messages> = {
  en: en as Messages,
  ko: ko as Messages,
  'zh-CN': zhCN as Messages,
  ja: ja as Messages,
  es: es as Messages,
};
const referenceKeys = Object.keys(en);

/** Recursively extract sorted keys from a nested object */
function getKeysDeep(obj: MessageMap, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    keys.push(path);
    if (typeof value === 'object' && value !== null) {
      keys.push(...getKeysDeep(value as MessageMap, path));
    }
  }
  return keys.sort();
}

/** Recursively check no empty string values */
function checkNoEmptyValues(obj: MessageMap, locale: string, prefix: string) {
  for (const [key, value] of Object.entries(obj)) {
    const path = `${prefix}.${key}`;
    if (typeof value === 'string') {
      expect(value, `${locale}.${path} is empty`).not.toBe('');
    } else if (typeof value === 'object' && value !== null) {
      checkNoEmptyValues(value as MessageMap, locale, path);
    }
  }
}

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
    const ref = allMessages.en;
    for (const section of referenceKeys) {
      const refNestedKeys = getKeysDeep(ref[section] as MessageMap);
      for (const [locale, messages] of Object.entries(allMessages)) {
        const nestedKeys = getKeysDeep(messages[section] as MessageMap);
        expect(nestedKeys, `${locale}.${section} keys mismatch`).toEqual(
          refNestedKeys,
        );
      }
    }
  });

  test('no empty string values in any locale', () => {
    for (const [locale, messages] of Object.entries(allMessages)) {
      for (const [section, content] of Object.entries(messages)) {
        checkNoEmptyValues(content as MessageMap, locale, section);
      }
    }
  });
});
