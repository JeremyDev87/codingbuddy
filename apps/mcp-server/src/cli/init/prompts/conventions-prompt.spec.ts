/**
 * Conventions Prompt Tests
 */

import { describe, it, expect } from 'vitest';
import {
  FILE_NAMING_CHOICES,
  QUOTES_CHOICES,
  SEMICOLONS_CHOICES,
  type ConventionsSettings,
} from './conventions-prompt';

describe('conventions-prompt', () => {
  describe('FILE_NAMING_CHOICES', () => {
    it('should include kebab-case', () => {
      const kebab = FILE_NAMING_CHOICES.find(c => c.value === 'kebab-case');
      expect(kebab).toBeDefined();
    });

    it('should include camelCase', () => {
      const camel = FILE_NAMING_CHOICES.find(c => c.value === 'camelCase');
      expect(camel).toBeDefined();
    });

    it('should include PascalCase', () => {
      const pascal = FILE_NAMING_CHOICES.find(c => c.value === 'PascalCase');
      expect(pascal).toBeDefined();
    });
  });

  describe('QUOTES_CHOICES', () => {
    it('should include single', () => {
      const single = QUOTES_CHOICES.find(c => c.value === 'single');
      expect(single).toBeDefined();
    });

    it('should include double', () => {
      const double = QUOTES_CHOICES.find(c => c.value === 'double');
      expect(double).toBeDefined();
    });
  });

  describe('SEMICOLONS_CHOICES', () => {
    it('should include true (with semicolons)', () => {
      const withSemi = SEMICOLONS_CHOICES.find(c => c.value === true);
      expect(withSemi).toBeDefined();
    });

    it('should include false (without semicolons)', () => {
      const withoutSemi = SEMICOLONS_CHOICES.find(c => c.value === false);
      expect(withoutSemi).toBeDefined();
    });
  });

  describe('ConventionsSettings type', () => {
    it('should have all required fields', () => {
      const settings: ConventionsSettings = {
        fileNaming: 'kebab-case',
        quotes: 'single',
        semicolons: true,
      };

      expect(settings.fileNaming).toBe('kebab-case');
      expect(settings.quotes).toBe('single');
      expect(settings.semicolons).toBe(true);
    });
  });
});
