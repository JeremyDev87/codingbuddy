/**
 * Architecture Prompt Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  PATTERN_CHOICES,
  COMPONENT_STYLE_CHOICES,
  promptArchitectureSettings,
  type ArchitectureSettings,
} from './architecture-prompt';

// Mock @inquirer/prompts
vi.mock('@inquirer/prompts', () => ({
  select: vi.fn(),
}));

describe('architecture-prompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PATTERN_CHOICES', () => {
    it('should include monorepo', () => {
      const mono = PATTERN_CHOICES.find(c => c.value === 'monorepo');
      expect(mono).toBeDefined();
    });

    it('should include modular', () => {
      const modular = PATTERN_CHOICES.find(c => c.value === 'modular');
      expect(modular).toBeDefined();
    });

    it('should include layered', () => {
      const layered = PATTERN_CHOICES.find(c => c.value === 'layered');
      expect(layered).toBeDefined();
    });

    it('should include clean architecture', () => {
      const clean = PATTERN_CHOICES.find(c => c.value === 'clean');
      expect(clean).toBeDefined();
    });

    it('should include microservices', () => {
      const micro = PATTERN_CHOICES.find(c => c.value === 'microservices');
      expect(micro).toBeDefined();
    });

    it('should have descriptions for all choices', () => {
      for (const choice of PATTERN_CHOICES) {
        expect(choice.description).toBeDefined();
        expect(typeof choice.description).toBe('string');
      }
    });
  });

  describe('COMPONENT_STYLE_CHOICES', () => {
    it('should include feature-based', () => {
      const feature = COMPONENT_STYLE_CHOICES.find(
        c => c.value === 'feature-based',
      );
      expect(feature).toBeDefined();
    });

    it('should include flat', () => {
      const flat = COMPONENT_STYLE_CHOICES.find(c => c.value === 'flat');
      expect(flat).toBeDefined();
    });

    it('should include grouped', () => {
      const grouped = COMPONENT_STYLE_CHOICES.find(c => c.value === 'grouped');
      expect(grouped).toBeDefined();
    });

    it('should have descriptions for all choices', () => {
      for (const choice of COMPONENT_STYLE_CHOICES) {
        expect(choice.description).toBeDefined();
        expect(typeof choice.description).toBe('string');
      }
    });
  });

  describe('ArchitectureSettings type', () => {
    it('should have pattern and componentStyle fields', () => {
      const settings: ArchitectureSettings = {
        pattern: 'monorepo',
        componentStyle: 'feature-based',
      };

      expect(settings.pattern).toBe('monorepo');
      expect(settings.componentStyle).toBe('feature-based');
    });
  });

  describe('promptArchitectureSettings', () => {
    it('should call select for pattern and componentStyle', async () => {
      const { select } = await import('@inquirer/prompts');
      const mockSelect = vi.mocked(select);

      mockSelect
        .mockResolvedValueOnce('modular')
        .mockResolvedValueOnce('feature-based');

      await promptArchitectureSettings();

      expect(mockSelect).toHaveBeenCalledTimes(2);
    });

    it('should return user selections', async () => {
      const { select } = await import('@inquirer/prompts');
      const mockSelect = vi.mocked(select);

      mockSelect
        .mockResolvedValueOnce('monorepo')
        .mockResolvedValueOnce('grouped');

      const result = await promptArchitectureSettings();

      expect(result).toEqual({
        pattern: 'monorepo',
        componentStyle: 'grouped',
      });
    });

    it('should use default values when no options provided', async () => {
      const { select } = await import('@inquirer/prompts');
      const mockSelect = vi.mocked(select);

      mockSelect
        .mockResolvedValueOnce('modular')
        .mockResolvedValueOnce('feature-based');

      await promptArchitectureSettings();

      expect(mockSelect).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          message: 'Select architecture pattern:',
          choices: PATTERN_CHOICES,
          default: 'modular',
        }),
      );

      expect(mockSelect).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          message: 'Select component organization style:',
          choices: COMPONENT_STYLE_CHOICES,
          default: 'feature-based',
        }),
      );
    });

    it('should use detected options as defaults', async () => {
      const { select } = await import('@inquirer/prompts');
      const mockSelect = vi.mocked(select);

      mockSelect.mockResolvedValueOnce('clean').mockResolvedValueOnce('flat');

      await promptArchitectureSettings({
        detectedPattern: 'clean',
        detectedComponentStyle: 'flat',
      });

      expect(mockSelect).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          default: 'clean',
        }),
      );

      expect(mockSelect).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          default: 'flat',
        }),
      );
    });

    it('should handle all pattern options', async () => {
      const { select } = await import('@inquirer/prompts');
      const mockSelect = vi.mocked(select);

      const patterns = [
        'monorepo',
        'modular',
        'layered',
        'clean',
        'microservices',
      ];

      for (const pattern of patterns) {
        vi.clearAllMocks();
        mockSelect
          .mockResolvedValueOnce(pattern)
          .mockResolvedValueOnce('feature-based');

        const result = await promptArchitectureSettings();
        expect(result.pattern).toBe(pattern);
      }
    });

    it('should handle all component style options', async () => {
      const { select } = await import('@inquirer/prompts');
      const mockSelect = vi.mocked(select);

      const styles = ['feature-based', 'flat', 'grouped'];

      for (const style of styles) {
        vi.clearAllMocks();
        mockSelect
          .mockResolvedValueOnce('modular')
          .mockResolvedValueOnce(style);

        const result = await promptArchitectureSettings();
        expect(result.componentStyle).toBe(style);
      }
    });
  });
});
