/**
 * Conventions Prompt Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  FILE_NAMING_CHOICES,
  QUOTES_CHOICES,
  SEMICOLONS_CHOICES,
  promptConventionsSettings,
  type ConventionsSettings,
} from './conventions-prompt';

// Mock @inquirer/prompts
vi.mock('@inquirer/prompts', () => ({
  select: vi.fn(),
}));

describe('conventions-prompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

    it('should include snake_case', () => {
      const snake = FILE_NAMING_CHOICES.find(c => c.value === 'snake_case');
      expect(snake).toBeDefined();
    });

    it('should have descriptions for all choices', () => {
      for (const choice of FILE_NAMING_CHOICES) {
        expect(choice.description).toBeDefined();
        expect(typeof choice.description).toBe('string');
      }
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

    it('should have descriptions for all choices', () => {
      for (const choice of QUOTES_CHOICES) {
        expect(choice.description).toBeDefined();
        expect(typeof choice.description).toBe('string');
      }
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

    it('should have descriptions for all choices', () => {
      for (const choice of SEMICOLONS_CHOICES) {
        expect(choice.description).toBeDefined();
        expect(typeof choice.description).toBe('string');
      }
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

  describe('promptConventionsSettings', () => {
    it('should call select for all three options', async () => {
      const { select } = await import('@inquirer/prompts');
      const mockSelect = vi.mocked(select);

      mockSelect
        .mockResolvedValueOnce('kebab-case')
        .mockResolvedValueOnce('single')
        .mockResolvedValueOnce(true);

      await promptConventionsSettings();

      expect(mockSelect).toHaveBeenCalledTimes(3);
    });

    it('should return user selections', async () => {
      const { select } = await import('@inquirer/prompts');
      const mockSelect = vi.mocked(select);

      mockSelect
        .mockResolvedValueOnce('PascalCase')
        .mockResolvedValueOnce('double')
        .mockResolvedValueOnce(false);

      const result = await promptConventionsSettings();

      expect(result).toEqual({
        fileNaming: 'PascalCase',
        quotes: 'double',
        semicolons: false,
      });
    });

    it('should use default values when no options provided', async () => {
      const { select } = await import('@inquirer/prompts');
      const mockSelect = vi.mocked(select);

      mockSelect
        .mockResolvedValueOnce('kebab-case')
        .mockResolvedValueOnce('single')
        .mockResolvedValueOnce(true);

      await promptConventionsSettings();

      expect(mockSelect).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          message: 'Select file naming convention:',
          choices: FILE_NAMING_CHOICES,
          default: 'kebab-case',
        }),
      );

      expect(mockSelect).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          message: 'Select quote style:',
          choices: QUOTES_CHOICES,
          default: 'single',
        }),
      );

      expect(mockSelect).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          message: 'Use semicolons?',
          choices: SEMICOLONS_CHOICES,
          default: true,
        }),
      );
    });

    it('should use detected options as defaults', async () => {
      const { select } = await import('@inquirer/prompts');
      const mockSelect = vi.mocked(select);

      mockSelect
        .mockResolvedValueOnce('camelCase')
        .mockResolvedValueOnce('double')
        .mockResolvedValueOnce(false);

      await promptConventionsSettings({
        detectedFileNaming: 'camelCase',
        detectedQuotes: 'double',
        detectedSemicolons: false,
      });

      expect(mockSelect).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          default: 'camelCase',
        }),
      );

      expect(mockSelect).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          default: 'double',
        }),
      );

      expect(mockSelect).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          default: false,
        }),
      );
    });

    it('should handle all file naming options', async () => {
      const { select } = await import('@inquirer/prompts');
      const mockSelect = vi.mocked(select);

      const namings = ['kebab-case', 'camelCase', 'PascalCase', 'snake_case'];

      for (const naming of namings) {
        vi.clearAllMocks();
        mockSelect
          .mockResolvedValueOnce(naming)
          .mockResolvedValueOnce('single')
          .mockResolvedValueOnce(true);

        const result = await promptConventionsSettings();
        expect(result.fileNaming).toBe(naming);
      }
    });

    it('should handle all quote style options', async () => {
      const { select } = await import('@inquirer/prompts');
      const mockSelect = vi.mocked(select);

      const quoteStyles = ['single', 'double'] as const;

      for (const quotes of quoteStyles) {
        vi.clearAllMocks();
        mockSelect
          .mockResolvedValueOnce('kebab-case')
          .mockResolvedValueOnce(quotes)
          .mockResolvedValueOnce(true);

        const result = await promptConventionsSettings();
        expect(result.quotes).toBe(quotes);
      }
    });

    it('should handle all semicolon options', async () => {
      const { select } = await import('@inquirer/prompts');
      const mockSelect = vi.mocked(select);

      const semiOptions = [true, false];

      for (const semi of semiOptions) {
        vi.clearAllMocks();
        mockSelect
          .mockResolvedValueOnce('kebab-case')
          .mockResolvedValueOnce('single')
          .mockResolvedValueOnce(semi);

        const result = await promptConventionsSettings();
        expect(result.semicolons).toBe(semi);
      }
    });
  });
});
