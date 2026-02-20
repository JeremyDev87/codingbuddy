import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { isNerdFontEnabled, getAgentIcon, AGENT_ICONS } from './icons';

describe('tui/utils/icons', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('isNerdFontEnabled', () => {
    it('should return true when TERM_NERD_FONT is "1"', () => {
      process.env.TERM_NERD_FONT = '1';
      expect(isNerdFontEnabled()).toBe(true);
    });

    it('should return true when TERM_NERD_FONT is "true"', () => {
      process.env.TERM_NERD_FONT = 'true';
      expect(isNerdFontEnabled()).toBe(true);
    });

    it('should return false when TERM_NERD_FONT is not set', () => {
      delete process.env.TERM_NERD_FONT;
      expect(isNerdFontEnabled()).toBe(false);
    });

    it('should return false when TERM_NERD_FONT is "0"', () => {
      process.env.TERM_NERD_FONT = '0';
      expect(isNerdFontEnabled()).toBe(false);
    });

    it('should return false when TERM_NERD_FONT is "false"', () => {
      process.env.TERM_NERD_FONT = 'false';
      expect(isNerdFontEnabled()).toBe(false);
    });
  });

  describe('AGENT_ICONS', () => {
    it('should have entries for all agents in AGENT_ICONS', () => {
      expect(Object.keys(AGENT_ICONS)).toHaveLength(29);
    });

    it('should have nerdFont and fallback for each entry', () => {
      for (const entry of Object.values(AGENT_ICONS)) {
        expect(entry).toHaveProperty('nerdFont');
        expect(entry).toHaveProperty('fallback');
        expect(typeof entry.nerdFont).toBe('string');
        expect(typeof entry.fallback).toBe('string');
        expect(entry.nerdFont.length).toBeGreaterThan(0);
        expect(entry.fallback).toMatch(/^\[.+\]$/); // e.g. [A], [T]
      }
    });

    it('should contain key agents', () => {
      // Note: auto-mode, data-scientist, systems-developer, software-engineer,
      // test-engineer, security-engineer are intentionally absent from AGENT_ICONS
      // (they use DEFAULT_ICON fallback in icons.ts)
      const expectedKeys = [
        'architecture-specialist',
        'test-strategy-specialist',
        'security-specialist',
        'frontend-developer',
        'backend-developer',
        'code-reviewer',
        'plan-mode',
        'act-mode',
        'eval-mode',
      ];
      for (const key of expectedKeys) {
        expect(AGENT_ICONS).toHaveProperty(key);
      }
    });

    it('should have unique fallback labels', () => {
      const fallbacks = Object.values(AGENT_ICONS).map(e => e.fallback);
      expect(new Set(fallbacks).size).toBe(fallbacks.length);
    });
  });

  describe('getAgentIcon', () => {
    it('should return nerdFont icon when enabled', () => {
      process.env.TERM_NERD_FONT = '1';
      const icon = getAgentIcon('security-specialist');
      expect(icon).toBe(AGENT_ICONS['security-specialist'].nerdFont);
    });

    it('should return fallback icon when nerd font disabled', () => {
      delete process.env.TERM_NERD_FONT;
      const icon = getAgentIcon('security-specialist');
      expect(icon).toBe(AGENT_ICONS['security-specialist'].fallback);
    });

    it('should return default icon for unknown agent', () => {
      const icon = getAgentIcon('unknown-agent');
      expect(icon).toBe(isNerdFontEnabled() ? '\u{F06A9}' : '[?]');
    });
  });
});
