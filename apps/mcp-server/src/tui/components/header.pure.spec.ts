import { describe, it, expect } from 'vitest';
import { formatTime, buildModeIndicator, MODE_INDICATOR } from './header.pure';

describe('tui/components/header.pure', () => {
  describe('formatTime', () => {
    it('should format time as HH:MM', () => {
      const date = new Date(2026, 0, 1, 9, 5, 0);
      expect(formatTime(date)).toBe('09:05');
    });

    it('should pad single-digit hours and minutes with zero', () => {
      const date = new Date(2026, 0, 1, 1, 3, 0);
      expect(formatTime(date)).toBe('01:03');
    });

    it('should handle midnight correctly', () => {
      const date = new Date(2026, 0, 1, 0, 0, 0);
      expect(formatTime(date)).toBe('00:00');
    });

    it('should handle 23:59 correctly', () => {
      const date = new Date(2026, 0, 1, 23, 59, 0);
      expect(formatTime(date)).toBe('23:59');
    });
  });

  describe('MODE_INDICATOR', () => {
    it('should be a filled circle character', () => {
      expect(MODE_INDICATOR).toBe('●');
    });
  });

  describe('buildModeIndicator', () => {
    it('should return indicator with mode name for PLAN', () => {
      expect(buildModeIndicator('PLAN')).toBe('● PLAN');
    });

    it('should return indicator with mode name for ACT', () => {
      expect(buildModeIndicator('ACT')).toBe('● ACT');
    });

    it('should return indicator with mode name for EVAL', () => {
      expect(buildModeIndicator('EVAL')).toBe('● EVAL');
    });

    it('should return indicator with mode name for AUTO', () => {
      expect(buildModeIndicator('AUTO')).toBe('● AUTO');
    });
  });
});
