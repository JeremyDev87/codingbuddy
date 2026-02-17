import { describe, it, expect } from 'vitest';
import {
  resolveProgress,
  abbreviateName,
  buildStatusLabel,
  resolveIcon,
  buildInlineCard,
} from './agent-card.pure';

describe('tui/components/agent-card.pure', () => {
  describe('resolveProgress', () => {
    it('should return 0 for idle status', () => {
      expect(resolveProgress('idle', 50)).toBe(0);
    });

    it('should return max(progress, 10) for running status', () => {
      expect(resolveProgress('running', 50)).toBe(50);
    });

    it('should return minimum 10 for running status with low progress', () => {
      expect(resolveProgress('running', 0)).toBe(10);
    });

    it('should return 10 for running status with progress exactly 10', () => {
      expect(resolveProgress('running', 10)).toBe(10);
    });

    it('should return 10 for running status with progress below 10', () => {
      expect(resolveProgress('running', 5)).toBe(10);
    });

    it('should return 100 for completed status', () => {
      expect(resolveProgress('completed', 60)).toBe(100);
    });

    it('should return current progress for failed status', () => {
      expect(resolveProgress('failed', 45)).toBe(45);
    });

    it('should treat NaN progress as 0 for running status', () => {
      expect(resolveProgress('running', NaN)).toBe(10);
    });

    it('should treat NaN progress as 0 for failed status', () => {
      expect(resolveProgress('failed', NaN)).toBe(0);
    });
  });

  describe('abbreviateName', () => {
    it('should return name as-is when shorter than maxLength', () => {
      expect(abbreviateName('Test', 7)).toBe('Test');
    });

    it('should return name as-is when exactly maxLength', () => {
      expect(abbreviateName('Testing', 7)).toBe('Testing');
    });

    it('should truncate and add ellipsis when longer than maxLength', () => {
      expect(abbreviateName('security-specialist', 7)).toBe('securi\u2026');
    });

    it('should handle maxLength of 1', () => {
      expect(abbreviateName('Test', 1)).toBe('\u2026');
    });

    it('should handle empty string', () => {
      expect(abbreviateName('', 7)).toBe('');
    });

    it('should return empty string for maxLength of 0', () => {
      expect(abbreviateName('Test', 0)).toBe('');
    });

    it('should return empty string for negative maxLength', () => {
      expect(abbreviateName('Test', -5)).toBe('');
    });
  });

  describe('buildStatusLabel', () => {
    it('should capitalize idle', () => {
      expect(buildStatusLabel('idle')).toBe('Idle');
    });

    it('should capitalize running', () => {
      expect(buildStatusLabel('running')).toBe('Running');
    });

    it('should return Done for completed', () => {
      expect(buildStatusLabel('completed')).toBe('Done');
    });

    it('should capitalize failed', () => {
      expect(buildStatusLabel('failed')).toBe('Failed');
    });
  });

  describe('resolveIcon', () => {
    it('should return original icon for idle status', () => {
      expect(resolveIcon('idle', '\ud83e\uddea')).toBe('\ud83e\uddea');
    });

    it('should return original icon for running status', () => {
      expect(resolveIcon('running', '\ud83e\uddea')).toBe('\ud83e\uddea');
    });

    it('should return checkmark for completed status', () => {
      expect(resolveIcon('completed', '\ud83e\uddea')).toBe('\u2713');
    });

    it('should return X for failed status', () => {
      expect(resolveIcon('failed', '\ud83e\uddea')).toBe('\u2717');
    });
  });

  describe('buildInlineCard', () => {
    it('should build single-line format with icon, name, progress bar, percentage, and status', () => {
      const result = buildInlineCard('\ud83e\udd16', 'solution-architect', 50, 'Running');
      expect(result).toBe(
        '\ud83e\udd16 solution-architect     \u2593\u2593\u2593\u2593\u2593\u2591\u2591\u2591\u2591\u2591  50%  Running',
      );
    });

    it('should pad name to INLINE_NAME_COL_WIDTH display columns', () => {
      const result = buildInlineCard('\ud83e\uddea', 'test', 20, 'Running');
      expect(result).toContain('\ud83e\uddea test');
      expect(result).toContain('20%');
      expect(result).toContain('Running');
    });

    it('should truncate long names with ellipsis', () => {
      const result = buildInlineCard(
        '\ud83d\udd12',
        'very-long-agent-name-that-exceeds',
        10,
        'Running',
      );
      expect(result).toContain('\u2026');
    });

    it('should show 100% for completed status', () => {
      const result = buildInlineCard('\u2713', 'agent', 100, 'Done');
      expect(result).toContain('100%');
      expect(result).toContain('Done');
      // All filled
      expect(result).toContain('\u2593\u2593\u2593\u2593\u2593\u2593\u2593\u2593\u2593\u2593');
    });
  });
});
