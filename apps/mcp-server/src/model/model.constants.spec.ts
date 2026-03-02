import { describe, it, expect } from 'vitest';
import {
  CLAUDE_OPUS_4,
  CLAUDE_SONNET_4,
  CLAUDE_HAIKU_35,
  GPT_4O,
  GPT_4O_MINI,
  O3_MINI,
  O1_MINI,
  O4_MINI,
  GPT_5,
  GEMINI_25_PRO,
  GEMINI_25_FLASH,
  GROK_3,
  DEEPSEEK_CHAT,
  DEEPSEEK_REASONER,
  DEFAULT_MODEL,
} from './model.constants';

describe('model.constants', () => {
  describe('Claude model IDs', () => {
    it('should have valid Claude Opus 4 model ID', () => {
      expect(CLAUDE_OPUS_4).toBe('claude-opus-4-20250514');
      expect(CLAUDE_OPUS_4).toMatch(/^claude-opus-4-\d{8}$/);
    });

    it('should have valid Claude Sonnet 4 model ID', () => {
      expect(CLAUDE_SONNET_4).toBe('claude-sonnet-4-20250514');
      expect(CLAUDE_SONNET_4).toMatch(/^claude-sonnet-4-\d{8}$/);
    });

    it('should have valid Claude Haiku 3.5 model ID', () => {
      expect(CLAUDE_HAIKU_35).toBe('claude-haiku-3-5-20241022');
      expect(CLAUDE_HAIKU_35).toMatch(/^claude-haiku-3-5-\d{8}$/);
    });
  });

  describe('OpenAI model IDs', () => {
    it('should have valid GPT-4o model ID', () => {
      expect(GPT_4O).toBe('gpt-4o');
    });

    it('should have valid GPT-4o mini model ID', () => {
      expect(GPT_4O_MINI).toBe('gpt-4o-mini');
    });

    it('should have valid o3-mini model ID', () => {
      expect(O3_MINI).toBe('o3-mini');
    });

    it('should have valid o1-mini model ID', () => {
      expect(O1_MINI).toBe('o1-mini');
    });

    it('should have valid o4-mini model ID', () => {
      expect(O4_MINI).toBe('o4-mini');
    });

    it('should have valid GPT-5 model ID', () => {
      expect(GPT_5).toBe('gpt-5');
    });
  });

  describe('xAI model IDs', () => {
    it('should have valid Grok 3 model ID', () => {
      expect(GROK_3).toBe('grok-3');
    });
  });

  describe('DeepSeek model IDs', () => {
    it('should have valid DeepSeek Chat model ID', () => {
      expect(DEEPSEEK_CHAT).toBe('deepseek-chat');
    });

    it('should have valid DeepSeek Reasoner model ID', () => {
      expect(DEEPSEEK_REASONER).toBe('deepseek-reasoner');
    });
  });

  describe('Google model IDs', () => {
    it('should have valid Gemini 2.5 Pro model ID', () => {
      expect(GEMINI_25_PRO).toBe('gemini-2.5-pro');
    });

    it('should have valid Gemini 2.5 Flash model ID', () => {
      expect(GEMINI_25_FLASH).toBe('gemini-2.5-flash');
    });
  });

  describe('DEFAULT_MODEL', () => {
    it('should be Claude Sonnet 4 (balanced choice)', () => {
      expect(DEFAULT_MODEL).toBe(CLAUDE_SONNET_4);
    });

    it('should be a valid model ID string', () => {
      expect(typeof DEFAULT_MODEL).toBe('string');
      expect(DEFAULT_MODEL.length).toBeGreaterThan(0);
    });
  });

  describe('consistency', () => {
    it('should have unique model IDs across all providers', () => {
      const models = [
        CLAUDE_OPUS_4,
        CLAUDE_SONNET_4,
        CLAUDE_HAIKU_35,
        GPT_4O,
        GPT_4O_MINI,
        O3_MINI,
        O1_MINI,
        O4_MINI,
        GPT_5,
        GEMINI_25_PRO,
        GEMINI_25_FLASH,
        GROK_3,
        DEEPSEEK_CHAT,
        DEEPSEEK_REASONER,
      ];
      const uniqueModels = new Set(models);
      expect(uniqueModels.size).toBe(models.length);
      expect(uniqueModels.size).toBe(14);
    });

    it('should have Claude models starting with claude-', () => {
      const claudeModels = [CLAUDE_OPUS_4, CLAUDE_SONNET_4, CLAUDE_HAIKU_35];
      claudeModels.forEach(model => {
        expect(model).toMatch(/^claude-/);
      });
    });

    it('should have OpenAI models with correct prefixes', () => {
      expect(GPT_4O).toMatch(/^gpt-/);
      expect(GPT_4O_MINI).toMatch(/^gpt-/);
      expect(O3_MINI).toMatch(/^o3-/);
      expect(O1_MINI).toMatch(/^o1-/);
    });

    it('should have Google models starting with gemini-', () => {
      const googleModels = [GEMINI_25_PRO, GEMINI_25_FLASH];
      googleModels.forEach(model => {
        expect(model).toMatch(/^gemini-/);
      });
    });

    it('should have xAI models starting with grok-', () => {
      expect(GROK_3).toMatch(/^grok-/);
    });

    it('should have DeepSeek models starting with deepseek-', () => {
      expect(DEEPSEEK_CHAT).toMatch(/^deepseek-/);
      expect(DEEPSEEK_REASONER).toMatch(/^deepseek-/);
    });
  });
});
