import { describe, it, expect } from 'vitest';
import { MODE_COLORS, getModeColor } from './constants';
import type { Mode } from '../types';

describe('tui/utils/constants', () => {
  describe('MODE_COLORS', () => {
    it('should define colors for all modes', () => {
      const modes: Mode[] = ['PLAN', 'ACT', 'EVAL', 'AUTO'];
      for (const mode of modes) {
        expect(MODE_COLORS).toHaveProperty(mode);
        expect(typeof MODE_COLORS[mode]).toBe('string');
      }
    });

    it('should use expected color values', () => {
      expect(MODE_COLORS.PLAN).toBe('blue');
      expect(MODE_COLORS.ACT).toBe('green');
      expect(MODE_COLORS.EVAL).toBe('yellow');
      expect(MODE_COLORS.AUTO).toBe('magenta');
    });
  });

  describe('getModeColor', () => {
    it('should return the correct color for each mode', () => {
      expect(getModeColor('PLAN')).toBe('blue');
      expect(getModeColor('ACT')).toBe('green');
      expect(getModeColor('EVAL')).toBe('yellow');
      expect(getModeColor('AUTO')).toBe('magenta');
    });

    it('should return blue for unknown mode', () => {
      expect(getModeColor('UNKNOWN' as Mode)).toBe('blue');
    });
  });
});
