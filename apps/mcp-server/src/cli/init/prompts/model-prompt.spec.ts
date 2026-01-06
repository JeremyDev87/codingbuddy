import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getModelChoices,
  DEFAULT_MODEL_CHOICE,
  promptModelSelection,
  type ModelChoice,
} from './model-prompt';

// Mock @inquirer/prompts
vi.mock('@inquirer/prompts', () => ({
  select: vi.fn(),
}));

describe('model-prompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  describe('getModelChoices', () => {
    it('should return array of model choices', () => {
      const choices = getModelChoices();

      expect(choices).toBeInstanceOf(Array);
      expect(choices.length).toBeGreaterThanOrEqual(3);
    });

    it('should have required properties for each choice', () => {
      const choices = getModelChoices();

      for (const choice of choices) {
        expect(choice).toHaveProperty('name');
        expect(choice).toHaveProperty('value');
        expect(typeof choice.name).toBe('string');
        expect(typeof choice.value).toBe('string');
      }
    });

    it('should include Opus, Sonnet, and Haiku models', () => {
      const choices = getModelChoices();
      const values = choices.map((c: ModelChoice) => c.value);

      expect(values.some((v: string) => v.includes('opus'))).toBe(true);
      expect(values.some((v: string) => v.includes('sonnet'))).toBe(true);
      expect(values.some((v: string) => v.includes('haiku'))).toBe(true);
    });

    it('should have Sonnet as first choice (recommended)', () => {
      const choices = getModelChoices();

      expect(choices[0].value).toContain('sonnet');
      expect(choices[0].name).toContain('Recommended');
    });
  });

  describe('DEFAULT_MODEL_CHOICE', () => {
    it('should be claude-sonnet-4-20250514', () => {
      expect(DEFAULT_MODEL_CHOICE).toBe('claude-sonnet-4-20250514');
    });
  });

  describe('promptModelSelection', () => {
    it('should call select with correct parameters', async () => {
      const { select } = await import('@inquirer/prompts');
      const mockSelect = vi.mocked(select);
      mockSelect.mockResolvedValue('claude-opus-4-20250514');

      await promptModelSelection();

      expect(mockSelect).toHaveBeenCalledWith({
        message: 'Select default AI model:',
        choices: getModelChoices(),
        default: DEFAULT_MODEL_CHOICE,
      });
    });

    it('should return selected model value', async () => {
      const { select } = await import('@inquirer/prompts');
      const mockSelect = vi.mocked(select);
      mockSelect.mockResolvedValue('claude-opus-4-20250514');

      const result = await promptModelSelection();

      expect(result).toBe('claude-opus-4-20250514');
    });

    it('should use custom message when provided', async () => {
      const { select } = await import('@inquirer/prompts');
      const mockSelect = vi.mocked(select);
      mockSelect.mockResolvedValue('claude-sonnet-4-20250514');

      await promptModelSelection('Choose your model:');

      expect(mockSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Choose your model:',
        }),
      );
    });

    it('should return default model when user selects it', async () => {
      const { select } = await import('@inquirer/prompts');
      const mockSelect = vi.mocked(select);
      mockSelect.mockResolvedValue(DEFAULT_MODEL_CHOICE);

      const result = await promptModelSelection();

      expect(result).toBe(DEFAULT_MODEL_CHOICE);
    });
  });
});
