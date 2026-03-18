import { describe, it, expect } from 'vitest';
import {
  formatObjective,
  formatLogTail,
  formatLogTailRelative,
  formatSectionDivider,
  formatEnhancedProgressBar,
  formatEnhancedChecklist,
} from './focused-agent.pure';
import type { EventLogEntry } from '../dashboard-types';

describe('tui/components/focused-agent.pure', () => {
  describe('formatObjective', () => {
    it('should format objectives as a bullet list', () => {
      const result = formatObjective(['Design auth', 'Plan API']);
      expect(result).toBe('- Design auth\n- Plan API');
    });

    it('should truncate at maxLines and show overflow count', () => {
      const objectives = ['One', 'Two', 'Three', 'Four', 'Five'];
      const result = formatObjective(objectives, 3);
      const lines = result.split('\n');
      expect(lines).toHaveLength(4); // 3 items + overflow
      expect(lines[0]).toBe('- One');
      expect(lines[1]).toBe('- Two');
      expect(lines[2]).toBe('- Three');
      expect(lines[3]).toBe('  ... (+2 more)');
    });

    it('should not show overflow when within maxLines', () => {
      const objectives = ['One', 'Two'];
      const result = formatObjective(objectives, 3);
      expect(result).not.toContain('more');
    });

    it('should return empty string for empty objectives', () => {
      const result = formatObjective([]);
      expect(result).toBe('');
    });
  });

  describe('formatLogTail', () => {
    it('should format timestamped log lines', () => {
      const events: EventLogEntry[] = [
        { timestamp: '10:00:01', message: 'Started build', level: 'info' },
        { timestamp: '10:00:02', message: 'Build complete', level: 'info' },
      ];

      const result = formatLogTail(events);
      expect(result).toBe('10:00:01 Started build\n10:00:02 Build complete');
    });

    it('should limit to maxLines from the end', () => {
      const events: EventLogEntry[] = Array.from({ length: 20 }, (_, i) => ({
        timestamp: `10:00:${String(i).padStart(2, '0')}`,
        message: `Event ${i}`,
        level: 'info' as const,
      }));

      const result = formatLogTail(events, 5);
      const lines = result.split('\n');
      expect(lines).toHaveLength(5);
      expect(lines[0]).toContain('Event 15');
      expect(lines[4]).toContain('Event 19');
    });

    it('should return empty string for empty events', () => {
      const result = formatLogTail([]);
      expect(result).toBe('');
    });

    it('should return all events when fewer than maxLines', () => {
      const events: EventLogEntry[] = [
        { timestamp: '10:00:01', message: 'Only event', level: 'info' },
      ];

      const result = formatLogTail(events, 10);
      expect(result).toBe('10:00:01 Only event');
    });
  });

  describe('formatSectionDivider', () => {
    it('should format section divider with title', () => {
      const result = formatSectionDivider('Objective', 30);
      expect(result).toContain('─── Objective');
      expect(result).toMatch(/^───/);
    });

    it('should pad with dashes to fill width', () => {
      const result = formatSectionDivider('Test', 20);
      // "─── Test " = 9 chars, remaining = 11 dashes
      expect(result.length).toBe(20);
    });

    it('should handle title longer than width gracefully', () => {
      const result = formatSectionDivider('VeryLongTitle', 10);
      expect(result).toContain('VeryLongTitle');
    });
  });

  describe('formatLogTailRelative', () => {
    it('should use formatRelativeTime when rawTimestamp is present', () => {
      const now = 1710000060000;
      const events: EventLogEntry[] = [
        { timestamp: '10:00:00', message: 'Started', level: 'info', rawTimestamp: now - 5000 },
        { timestamp: '10:01:00', message: 'Done', level: 'info', rawTimestamp: now - 1000 },
      ];
      const result = formatLogTailRelative(events, now);
      expect(result).toBe('5s ago Started\njust now Done');
    });

    it('should fall back to timestamp when rawTimestamp is absent', () => {
      const now = 1710000060000;
      const events: EventLogEntry[] = [
        { timestamp: '10:00:01', message: 'Legacy event', level: 'info' },
      ];
      const result = formatLogTailRelative(events, now);
      expect(result).toBe('10:00:01 Legacy event');
    });

    it('should handle mixed events (some with rawTimestamp, some without)', () => {
      const now = 1710000060000;
      const events: EventLogEntry[] = [
        { timestamp: '10:00:01', message: 'Old format', level: 'info' },
        { timestamp: '10:01:00', message: 'New format', level: 'info', rawTimestamp: now - 30000 },
      ];
      const result = formatLogTailRelative(events, now);
      const lines = result.split('\n');
      expect(lines[0]).toBe('10:00:01 Old format');
      expect(lines[1]).toBe('30s ago New format');
    });

    it('should respect maxLines', () => {
      const now = 1710000060000;
      const events: EventLogEntry[] = Array.from({ length: 20 }, (_, i) => ({
        timestamp: `10:00:${String(i).padStart(2, '0')}`,
        message: `Event ${i}`,
        level: 'info' as const,
        rawTimestamp: now - (20 - i) * 1000,
      }));
      const result = formatLogTailRelative(events, now, 5);
      expect(result.split('\n')).toHaveLength(5);
    });

    it('should return empty string for empty events', () => {
      expect(formatLogTailRelative([], Date.now())).toBe('');
    });
  });

  describe('formatEnhancedProgressBar', () => {
    it('0%: 전체 ░, label "0%"', () => {
      const result = formatEnhancedProgressBar(0, 20);
      expect(result.bar).toBe('░'.repeat(20));
      expect(result.label).toBe('0%');
    });

    it('50%: 절반 ⣿ + 절반 ░, label "50%"', () => {
      const result = formatEnhancedProgressBar(50, 20);
      expect(result.bar).toBe('⣿'.repeat(10) + '░'.repeat(10));
      expect(result.label).toBe('50%');
    });

    it('100%: 전체 ⣿, label "100%"', () => {
      const result = formatEnhancedProgressBar(100, 20);
      expect(result.bar).toBe('⣿'.repeat(20));
      expect(result.label).toBe('100%');
    });

    it('150 클램프 → 100%', () => {
      const result = formatEnhancedProgressBar(150, 10);
      expect(result.bar).toBe('⣿'.repeat(10));
      expect(result.label).toBe('100%');
    });

    it('-10 클램프 → 0%', () => {
      const result = formatEnhancedProgressBar(-10, 10);
      expect(result.bar).toBe('░'.repeat(10));
      expect(result.label).toBe('0%');
    });
  });

  describe('formatEnhancedChecklist', () => {
    it('완료 태스크에 ✔ 접두사', () => {
      const tasks = [{ id: '1', subject: 'Apply TDD', completed: true }];
      expect(formatEnhancedChecklist(tasks)).toContain('✔ Apply TDD');
    });

    it('미완료 태스크에 ◻ 접두사', () => {
      const tasks = [{ id: '1', subject: 'Write tests', completed: false }];
      expect(formatEnhancedChecklist(tasks)).toContain('◻ Write tests');
    });

    it('maxItems 초과 시 ⋯ (+N more) 추가', () => {
      const tasks = Array.from({ length: 8 }, (_, i) => ({
        id: String(i),
        subject: `Task ${i}`,
        completed: false,
      }));
      const result = formatEnhancedChecklist(tasks, 6);
      expect(result).toContain('⋯ (+2 more)');
    });

    it('maxItems 이하이면 ⋯ 없음', () => {
      const tasks = [{ id: '1', subject: 'Only task', completed: false }];
      const result = formatEnhancedChecklist(tasks, 6);
      expect(result).not.toContain('⋯');
    });

    it('빈 배열 → 빈 문자열', () => {
      expect(formatEnhancedChecklist([])).toBe('');
    });
  });
});
