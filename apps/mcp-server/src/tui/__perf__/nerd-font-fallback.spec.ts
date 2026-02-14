import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { isNerdFontEnabled, getAgentIcon, AGENT_ICONS } from '../utils/icons';

const ALL_AGENT_NAMES = Object.keys(AGENT_ICONS);

describe('Nerd Font fallback – systematic icon rendering for all 29 agents', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('TERM_NERD_FONT=true 일 때 모든 Agent 아이콘', () => {
    beforeEach(() => {
      process.env.TERM_NERD_FONT = 'true';
    });

    it.each(ALL_AGENT_NAMES)(
      '%s should return its nerdFont icon',
      agentName => {
        const result = getAgentIcon(agentName);
        expect(result).toBe(AGENT_ICONS[agentName].nerdFont);
      },
    );
  });

  describe('TERM_NERD_FONT=false 일 때 모든 Agent 폴백', () => {
    beforeEach(() => {
      process.env.TERM_NERD_FONT = 'false';
    });

    it.each(ALL_AGENT_NAMES)(
      '%s should return its fallback icon',
      agentName => {
        const result = getAgentIcon(agentName);
        expect(result).toBe(AGENT_ICONS[agentName].fallback);
        expect(result).toMatch(/^\[.+\]$/);
      },
    );
  });

  describe('TERM_NERD_FONT 미설정 시 기본 폴백 동작', () => {
    beforeEach(() => {
      delete process.env.TERM_NERD_FONT;
    });

    it('isNerdFontEnabled() should return false', () => {
      expect(isNerdFontEnabled()).toBe(false);
    });

    it.each(ALL_AGENT_NAMES)(
      '%s should return its fallback when env is unset',
      agentName => {
        const result = getAgentIcon(agentName);
        expect(result).toBe(AGENT_ICONS[agentName].fallback);
      },
    );

    it('unknown agent should return default fallback "[?]"', () => {
      const result = getAgentIcon('nonexistent');
      expect(result).toBe('[?]');
    });
  });
});
