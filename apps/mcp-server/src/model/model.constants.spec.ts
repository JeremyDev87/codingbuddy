import { describe, it, expect } from 'vitest';
import {
  CLAUDE_OPUS_4,
  CLAUDE_SONNET_4,
  CLAUDE_HAIKU_35,
  DEFAULT_MODEL,
} from './model.constants';

describe('model.constants', () => {
  describe('model IDs', () => {
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
    it('should have unique model IDs', () => {
      const models = [CLAUDE_OPUS_4, CLAUDE_SONNET_4, CLAUDE_HAIKU_35];
      const uniqueModels = new Set(models);
      expect(uniqueModels.size).toBe(models.length);
    });

    it('should all start with claude-', () => {
      const models = [CLAUDE_OPUS_4, CLAUDE_SONNET_4, CLAUDE_HAIKU_35];
      models.forEach(model => {
        expect(model).toMatch(/^claude-/);
      });
    });
  });
});
