import { describe, it, expect } from 'vitest';
import {
  getMiniCardBorderColor,
  getMiniCardTextDimmed,
  abbreviateMiniName,
  MINI_CARD_NAME_MAX,
} from './agent-mini-card.pure';

describe('agent-mini-card.pure', () => {
  describe('getMiniCardBorderColor', () => {
    it('should return category color when active', () => {
      expect(getMiniCardBorderColor(true)).toBe('cyan');
    });

    it('should return gray when inactive', () => {
      expect(getMiniCardBorderColor(false)).toBe('gray');
    });
  });

  describe('getMiniCardTextDimmed', () => {
    it('should not dim active card text', () => {
      expect(getMiniCardTextDimmed(true)).toBe(false);
    });

    it('should dim inactive card text', () => {
      expect(getMiniCardTextDimmed(false)).toBe(true);
    });
  });

  describe('abbreviateMiniName', () => {
    it('should return name as-is if within max length', () => {
      expect(abbreviateMiniName('short')).toBe('short');
    });

    it('should truncate with ellipsis if too long', () => {
      const long = 'security-specialist';
      const result = abbreviateMiniName(long);
      expect(result.length).toBeLessThanOrEqual(MINI_CARD_NAME_MAX);
      expect(result.endsWith('\u2026')).toBe(true);
    });
  });
});
