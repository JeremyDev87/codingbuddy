import { describe, it, expect } from 'vitest';
import { buildProgressBar, clampValue } from './progress-bar.pure';

describe('tui/components/progress-bar.pure', () => {
  describe('clampValue', () => {
    it('should return 0 for negative values', () => {
      expect(clampValue(-10)).toBe(0);
    });

    it('should return 100 for values over 100', () => {
      expect(clampValue(150)).toBe(100);
    });

    it('should return the value as-is for valid range', () => {
      expect(clampValue(65)).toBe(65);
    });

    it('should return 0 for 0', () => {
      expect(clampValue(0)).toBe(0);
    });

    it('should return 100 for 100', () => {
      expect(clampValue(100)).toBe(100);
    });

    it('should return 0 for NaN', () => {
      expect(clampValue(NaN)).toBe(0);
    });
  });

  describe('buildProgressBar', () => {
    it('should render a full bar for value 100', () => {
      expect(buildProgressBar(100, 10)).toBe('██████████');
    });

    it('should render an empty bar for value 0', () => {
      expect(buildProgressBar(0, 10)).toBe('░░░░░░░░░░');
    });

    it('should render proportional fill for value 50', () => {
      expect(buildProgressBar(50, 10)).toBe('█████░░░░░');
    });

    it('should render proportional fill for value 65', () => {
      // Math.round(65/100 * 10) = Math.round(6.5) = 7
      expect(buildProgressBar(65, 10)).toBe('███████░░░');
    });

    it('should handle width of 1', () => {
      expect(buildProgressBar(50, 1)).toBe('█');
      expect(buildProgressBar(0, 1)).toBe('░');
    });

    it('should handle width of 20', () => {
      const result = buildProgressBar(50, 20);
      expect(result).toHaveLength(20);
      expect(result).toBe('██████████░░░░░░░░░░');
    });

    it('should clamp values below 0', () => {
      expect(buildProgressBar(-10, 10)).toBe('░░░░░░░░░░');
    });

    it('should clamp values above 100', () => {
      expect(buildProgressBar(150, 10)).toBe('██████████');
    });

    it('should return empty string for width 0', () => {
      expect(buildProgressBar(50, 0)).toBe('');
    });

    it('should treat negative width as 0', () => {
      expect(buildProgressBar(50, -5)).toBe('');
    });

    it('should handle NaN value gracefully', () => {
      expect(buildProgressBar(NaN, 10)).toBe('░░░░░░░░░░');
    });
  });
});
