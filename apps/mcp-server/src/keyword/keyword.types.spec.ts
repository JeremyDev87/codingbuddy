import { describe, it, expect } from 'vitest';
import {
  isValidLanguageCode,
  SUPPORTED_LANGUAGE_CODES,
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE_CODE,
  type SupportedLanguageCode,
} from './keyword.types';

describe('keyword.types', () => {
  describe('isValidLanguageCode', () => {
    describe('valid language codes', () => {
      it.each(['en', 'ko', 'ja', 'zh', 'es'] as const)(
        'returns true for valid code: %s',
        code => {
          expect(isValidLanguageCode(code)).toBe(true);
        },
      );

      it('returns true for all SUPPORTED_LANGUAGE_CODES', () => {
        for (const code of SUPPORTED_LANGUAGE_CODES) {
          expect(isValidLanguageCode(code)).toBe(true);
        }
      });

      it('narrows type to SupportedLanguageCode when true', () => {
        const input: string = 'en';
        if (isValidLanguageCode(input)) {
          // TypeScript should narrow input to SupportedLanguageCode
          const code: SupportedLanguageCode = input;
          expect(code).toBe('en');
        }
      });
    });

    describe('invalid language codes', () => {
      it.each(['fr', 'de', 'pt', 'ru', 'it'])(
        'returns false for unsupported code: %s',
        code => {
          expect(isValidLanguageCode(code)).toBe(false);
        },
      );

      it('returns false for empty string', () => {
        expect(isValidLanguageCode('')).toBe(false);
      });

      it('returns false for random string', () => {
        expect(isValidLanguageCode('invalid')).toBe(false);
      });

      it('returns false for uppercase valid code', () => {
        expect(isValidLanguageCode('EN')).toBe(false);
      });

      it('returns false for code with whitespace', () => {
        expect(isValidLanguageCode(' en')).toBe(false);
        expect(isValidLanguageCode('en ')).toBe(false);
      });
    });
  });

  describe('SUPPORTED_LANGUAGE_CODES', () => {
    it('contains exactly 5 language codes', () => {
      expect(SUPPORTED_LANGUAGE_CODES).toHaveLength(5);
    });

    it('has English as first entry', () => {
      expect(SUPPORTED_LANGUAGE_CODES[0]).toBe('en');
    });

    it('matches keys of SUPPORTED_LANGUAGES', () => {
      const expectedCodes = Object.keys(SUPPORTED_LANGUAGES);
      expect(SUPPORTED_LANGUAGE_CODES).toEqual(expectedCodes);
    });
  });

  describe('DEFAULT_LANGUAGE_CODE', () => {
    it('is English (en)', () => {
      expect(DEFAULT_LANGUAGE_CODE).toBe('en');
    });

    it('is a valid supported language code', () => {
      expect(isValidLanguageCode(DEFAULT_LANGUAGE_CODE)).toBe(true);
    });

    it('matches first entry in SUPPORTED_LANGUAGE_CODES', () => {
      expect(DEFAULT_LANGUAGE_CODE).toBe(SUPPORTED_LANGUAGE_CODES[0]);
    });
  });
});
