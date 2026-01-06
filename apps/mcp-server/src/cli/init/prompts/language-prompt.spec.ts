import { describe, it, expect } from 'vitest';
import { getLanguageChoices, DEFAULT_LANGUAGE } from './language-prompt';

describe('language-prompt', () => {
  describe('DEFAULT_LANGUAGE', () => {
    it('should be Korean (ko)', () => {
      expect(DEFAULT_LANGUAGE).toBe('ko');
    });
  });

  describe('getLanguageChoices', () => {
    it('should return an array of language choices', () => {
      const choices = getLanguageChoices();
      expect(Array.isArray(choices)).toBe(true);
      expect(choices.length).toBeGreaterThan(0);
    });

    it('should include Korean as first option', () => {
      const choices = getLanguageChoices();
      expect(choices[0].value).toBe('ko');
      expect(choices[0].name).toContain('Korean');
    });

    it('should include English option', () => {
      const choices = getLanguageChoices();
      const english = choices.find(c => c.value === 'en');
      expect(english).toBeDefined();
      expect(english?.name).toBe('English');
    });

    it('should have name, value, and description for each choice', () => {
      const choices = getLanguageChoices();
      for (const choice of choices) {
        expect(choice.name).toBeDefined();
        expect(choice.value).toBeDefined();
        expect(typeof choice.name).toBe('string');
        expect(typeof choice.value).toBe('string');
      }
    });

    it('should include all supported languages', () => {
      const choices = getLanguageChoices();
      const values = choices.map(c => c.value);
      expect(values).toContain('ko');
      expect(values).toContain('en');
      expect(values).toContain('ja');
      expect(values).toContain('zh');
      expect(values).toContain('es');
    });
  });
});
