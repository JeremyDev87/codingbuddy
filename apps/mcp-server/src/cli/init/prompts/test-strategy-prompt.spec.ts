/**
 * Test Strategy Prompt Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  APPROACH_CHOICES,
  MOCKING_STRATEGY_CHOICES,
  DEFAULT_COVERAGE,
  validateCoverage,
  promptTestStrategySettings,
  type TestStrategySettings,
} from './test-strategy-prompt';

// Mock @inquirer/prompts
vi.mock('@inquirer/prompts', () => ({
  select: vi.fn(),
  input: vi.fn(),
}));

describe('test-strategy-prompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('APPROACH_CHOICES', () => {
    it('should include tdd', () => {
      const tdd = APPROACH_CHOICES.find(c => c.value === 'tdd');
      expect(tdd).toBeDefined();
    });

    it('should include bdd', () => {
      const bdd = APPROACH_CHOICES.find(c => c.value === 'bdd');
      expect(bdd).toBeDefined();
    });

    it('should include test-after', () => {
      const testAfter = APPROACH_CHOICES.find(c => c.value === 'test-after');
      expect(testAfter).toBeDefined();
    });

    it('should include mixed', () => {
      const mixed = APPROACH_CHOICES.find(c => c.value === 'mixed');
      expect(mixed).toBeDefined();
    });

    it('should have descriptions for all choices', () => {
      for (const choice of APPROACH_CHOICES) {
        expect(choice.description).toBeDefined();
        expect(typeof choice.description).toBe('string');
      }
    });
  });

  describe('MOCKING_STRATEGY_CHOICES', () => {
    it('should include minimal', () => {
      const minimal = MOCKING_STRATEGY_CHOICES.find(c => c.value === 'minimal');
      expect(minimal).toBeDefined();
    });

    it('should include extensive', () => {
      const extensive = MOCKING_STRATEGY_CHOICES.find(
        c => c.value === 'extensive',
      );
      expect(extensive).toBeDefined();
    });

    it('should include no-mocks', () => {
      const noMocks = MOCKING_STRATEGY_CHOICES.find(
        c => c.value === 'no-mocks',
      );
      expect(noMocks).toBeDefined();
    });

    it('should have descriptions for all choices', () => {
      for (const choice of MOCKING_STRATEGY_CHOICES) {
        expect(choice.description).toBeDefined();
        expect(typeof choice.description).toBe('string');
      }
    });
  });

  describe('DEFAULT_COVERAGE', () => {
    it('should be 90', () => {
      expect(DEFAULT_COVERAGE).toBe(90);
    });
  });

  describe('TestStrategySettings type', () => {
    it('should have all required fields', () => {
      const settings: TestStrategySettings = {
        approach: 'tdd',
        coverage: 90,
        mockingStrategy: 'minimal',
      };

      expect(settings.approach).toBe('tdd');
      expect(settings.coverage).toBe(90);
      expect(settings.mockingStrategy).toBe('minimal');
    });
  });

  describe('validateCoverage', () => {
    it('should accept valid coverage values', () => {
      expect(validateCoverage('90')).toBe(true);
      expect(validateCoverage('0')).toBe(true);
      expect(validateCoverage('100')).toBe(true);
      expect(validateCoverage('50')).toBe(true);
    });

    it('should reject values below 0', () => {
      const result = validateCoverage('-1');
      expect(result).not.toBe(true);
      expect(typeof result).toBe('string');
      expect(result).toContain('0 and 100');
    });

    it('should reject values above 100', () => {
      const result = validateCoverage('101');
      expect(result).not.toBe(true);
      expect(typeof result).toBe('string');
    });

    it('should reject non-numeric values', () => {
      const result = validateCoverage('abc');
      expect(result).not.toBe(true);
      expect(typeof result).toBe('string');
    });

    it('should reject empty string', () => {
      const result = validateCoverage('');
      expect(result).not.toBe(true);
    });

    it('should accept boundary values', () => {
      expect(validateCoverage('0')).toBe(true);
      expect(validateCoverage('100')).toBe(true);
    });
  });

  describe('promptTestStrategySettings', () => {
    it('should call prompts with correct default parameters', async () => {
      const { select, input } = await import('@inquirer/prompts');
      const mockSelect = vi.mocked(select);
      const mockInput = vi.mocked(input);

      mockSelect.mockResolvedValueOnce('tdd').mockResolvedValueOnce('minimal');
      mockInput.mockResolvedValueOnce('90');

      await promptTestStrategySettings();

      expect(mockSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Select test approach:',
          choices: APPROACH_CHOICES,
          default: 'tdd',
        }),
      );

      expect(mockInput).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Target test coverage (%):',
          default: '90',
          validate: validateCoverage,
        }),
      );

      expect(mockSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Select mocking strategy:',
          choices: MOCKING_STRATEGY_CHOICES,
          default: 'minimal',
        }),
      );
    });

    it('should return user selections', async () => {
      const { select, input } = await import('@inquirer/prompts');
      const mockSelect = vi.mocked(select);
      const mockInput = vi.mocked(input);

      mockSelect
        .mockResolvedValueOnce('bdd')
        .mockResolvedValueOnce('extensive');
      mockInput.mockResolvedValueOnce('80');

      const result = await promptTestStrategySettings();

      expect(result).toEqual({
        approach: 'bdd',
        coverage: 80,
        mockingStrategy: 'extensive',
      });
    });

    it('should use detected options as defaults', async () => {
      const { select, input } = await import('@inquirer/prompts');
      const mockSelect = vi.mocked(select);
      const mockInput = vi.mocked(input);

      mockSelect
        .mockResolvedValueOnce('mixed')
        .mockResolvedValueOnce('no-mocks');
      mockInput.mockResolvedValueOnce('85');

      await promptTestStrategySettings({
        detectedApproach: 'mixed',
        detectedCoverage: 85,
        detectedMockingStrategy: 'no-mocks',
      });

      expect(mockSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          default: 'mixed',
        }),
      );

      expect(mockInput).toHaveBeenCalledWith(
        expect.objectContaining({
          default: '85',
        }),
      );

      expect(mockSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          default: 'no-mocks',
        }),
      );
    });

    it('should parse coverage as integer', async () => {
      const { select, input } = await import('@inquirer/prompts');
      const mockSelect = vi.mocked(select);
      const mockInput = vi.mocked(input);

      mockSelect.mockResolvedValueOnce('tdd').mockResolvedValueOnce('minimal');
      mockInput.mockResolvedValueOnce('75');

      const result = await promptTestStrategySettings();

      expect(result.coverage).toBe(75);
      expect(typeof result.coverage).toBe('number');
    });

    it('should handle all approach options', async () => {
      const { select, input } = await import('@inquirer/prompts');
      const mockSelect = vi.mocked(select);
      const mockInput = vi.mocked(input);

      const approaches = ['tdd', 'bdd', 'test-after', 'mixed'] as const;

      for (const approach of approaches) {
        vi.clearAllMocks();
        mockSelect
          .mockResolvedValueOnce(approach)
          .mockResolvedValueOnce('minimal');
        mockInput.mockResolvedValueOnce('90');

        const result = await promptTestStrategySettings();
        expect(result.approach).toBe(approach);
      }
    });

    it('should handle all mocking strategy options', async () => {
      const { select, input } = await import('@inquirer/prompts');
      const mockSelect = vi.mocked(select);
      const mockInput = vi.mocked(input);

      const strategies = ['minimal', 'extensive', 'no-mocks'] as const;

      for (const strategy of strategies) {
        vi.clearAllMocks();
        mockSelect.mockResolvedValueOnce('tdd').mockResolvedValueOnce(strategy);
        mockInput.mockResolvedValueOnce('90');

        const result = await promptTestStrategySettings();
        expect(result.mockingStrategy).toBe(strategy);
      }
    });
  });
});
