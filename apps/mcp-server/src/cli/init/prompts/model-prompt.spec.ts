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
  input: vi.fn(),
}));

describe('model-prompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  describe('getModelChoices', () => {
    it('should return array of model choices', () => {
      const choices = getModelChoices();

      expect(choices).toBeInstanceOf(Array);
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

    it('should include Opus and Sonnet models', () => {
      const choices = getModelChoices();
      const values = choices.map((c: ModelChoice) => c.value);

      expect(values.some((v: string) => v.includes('opus'))).toBe(true);
      expect(values.some((v: string) => v.includes('sonnet'))).toBe(true);
    });

    it('should have Sonnet as first choice (recommended)', () => {
      const choices = getModelChoices();

      expect(choices[0].value).toContain('sonnet');
      expect(choices[0].name).toContain('Recommended');
    });

    it('should return at least 10 choices (multi-provider + custom)', () => {
      const choices = getModelChoices();
      expect(choices.length).toBeGreaterThanOrEqual(10);
    });

    it('should include at least one OpenAI model (gpt- prefix)', () => {
      const choices = getModelChoices();
      const hasGpt = choices.some((c: ModelChoice) => c.value.startsWith('gpt-'));
      expect(hasGpt).toBe(true);
    });

    it('should include at least one Google model (gemini- prefix)', () => {
      const choices = getModelChoices();
      const hasGemini = choices.some((c: ModelChoice) => c.value.startsWith('gemini-'));
      expect(hasGemini).toBe(true);
    });

    it('should include __custom__ escape hatch choice', () => {
      const choices = getModelChoices();
      const hasCustom = choices.some((c: ModelChoice) => c.value === '__custom__');
      expect(hasCustom).toBe(true);
    });

    it('should include at least one xAI model (grok- prefix)', () => {
      const choices = getModelChoices();
      const hasGrok = choices.some((c: ModelChoice) => c.value.startsWith('grok-'));
      expect(hasGrok).toBe(true);
    });

    it('should include at least one DeepSeek model (deepseek- prefix)', () => {
      const choices = getModelChoices();
      const hasDeepSeek = choices.some((c: ModelChoice) => c.value.startsWith('deepseek-'));
      expect(hasDeepSeek).toBe(true);
    });

    it('should include latest OpenAI models (GPT-5 or o4-mini)', () => {
      const choices = getModelChoices();
      const values = choices.map((c: ModelChoice) => c.value);
      expect(values).toContain('gpt-5');
      expect(values).toContain('o4-mini');
    });

    it('should include provider info in descriptions', () => {
      const choices = getModelChoices();
      const gptChoice = choices.find((c: ModelChoice) => c.value.startsWith('gpt-'));
      expect(gptChoice?.description).toContain('OpenAI');
      const geminiChoice = choices.find((c: ModelChoice) => c.value.startsWith('gemini-'));
      expect(geminiChoice?.description).toContain('Google');
      const claudeChoice = choices.find((c: ModelChoice) => c.value.includes('sonnet'));
      expect(claudeChoice?.description).toContain('Anthropic');
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

    it('should prompt for custom model ID when __custom__ is selected', async () => {
      const { select, input } = await import('@inquirer/prompts');
      const mockSelect = vi.mocked(select);
      const mockInput = vi.mocked(input);
      mockSelect.mockResolvedValue('__custom__');
      mockInput.mockResolvedValue('my-custom-model-v1');

      const result = await promptModelSelection();

      expect(mockInput).toHaveBeenCalled();
      expect(result).toBe('my-custom-model-v1');
    });

    it('should return selected model directly when not __custom__', async () => {
      const { select, input } = await import('@inquirer/prompts');
      const mockSelect = vi.mocked(select);
      const mockInput = vi.mocked(input);
      mockSelect.mockResolvedValue('gpt-4o');

      const result = await promptModelSelection();

      expect(result).toBe('gpt-4o');
      expect(mockInput).not.toHaveBeenCalled();
    });
  });
});
