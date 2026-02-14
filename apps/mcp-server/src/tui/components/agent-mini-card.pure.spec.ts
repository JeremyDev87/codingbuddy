import { describe, it, expect } from 'vitest';
import {
  buildInlineAgentTag,
  joinAgentTags,
} from './agent-mini-card.pure';
import { estimateDisplayWidth } from '../utils/display-width';

describe('agent-mini-card.pure', () => {
  describe('buildInlineAgentTag', () => {
    it('should return agent name as-is when short enough', () => {
      expect(buildInlineAgentTag('security')).toBe('security');
    });

    it('should truncate long names with ellipsis', () => {
      const result = buildInlineAgentTag('very-long-agent-specialist-name');
      expect(estimateDisplayWidth(result)).toBeLessThanOrEqual(20);
      expect(result).toContain('\u2026');
    });

    it('should handle exact max length', () => {
      const name = 'a'.repeat(20);
      expect(buildInlineAgentTag(name)).toBe(name);
    });
  });

  describe('joinAgentTags', () => {
    it('should join names with middle dot separator', () => {
      expect(joinAgentTags(['agent-a', 'agent-b'])).toBe('agent-a \u00b7 agent-b');
    });

    it('should handle single agent', () => {
      expect(joinAgentTags(['solo-agent'])).toBe('solo-agent');
    });

    it('should handle empty array', () => {
      expect(joinAgentTags([])).toBe('');
    });

    it('should truncate individual long names', () => {
      const result = joinAgentTags(['very-long-agent-specialist-name', 'short']);
      expect(result).toContain('\u2026');
      expect(result).toContain('short');
    });
  });
});
