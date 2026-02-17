import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { STATUS_COLORS, getStatusColor, getColorDepth } from './colors';
import type { AgentStatus } from '../types';

describe('tui/utils/colors', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('STATUS_COLORS', () => {
    it('should define colors for all AgentStatus values', () => {
      const expectedStatuses: AgentStatus[] = ['idle', 'running', 'completed', 'failed'];
      for (const status of expectedStatuses) {
        expect(STATUS_COLORS).toHaveProperty(status);
        expect(typeof STATUS_COLORS[status]).toBe('string');
      }
    });

    it('should use expected color values', () => {
      expect(STATUS_COLORS.idle).toBe('gray');
      expect(STATUS_COLORS.running).toBe('cyan');
      expect(STATUS_COLORS.completed).toBe('green');
      expect(STATUS_COLORS.failed).toBe('red');
    });
  });

  describe('getStatusColor', () => {
    it('should return the correct color for each status', () => {
      expect(getStatusColor('idle')).toBe('gray');
      expect(getStatusColor('running')).toBe('cyan');
      expect(getStatusColor('completed')).toBe('green');
      expect(getStatusColor('failed')).toBe('red');
    });

    it('should return gray for unknown status', () => {
      expect(getStatusColor('unknown' as AgentStatus)).toBe('gray');
    });
  });

  describe('getColorDepth', () => {
    it('should return a valid ColorDepth value', () => {
      const depth = getColorDepth();
      expect(['none', 'basic', '256', 'truecolor']).toContain(depth);
    });

    it('should return "none" when NO_COLOR is set', () => {
      process.env.NO_COLOR = '1';
      expect(getColorDepth()).toBe('none');
    });
  });
});
