import { describe, it, expect } from 'vitest';
import {
  formatAgentHeader,
  formatObjective,
  formatChecklist,
  formatToolIO,
  formatLogTail,
  formatSectionDivider,
  formatProgressBar,
  formatEnhancedProgressBar,
  formatActivitySparkline,
  formatEnhancedChecklist,
} from './focused-agent.pure';
import type { TaskItem, EventLogEntry } from '../dashboard-types';

describe('tui/components/focused-agent.pure', () => {
  describe('formatAgentHeader', () => {
    it('should format name, id, status, stage, and progress', () => {
      const result = formatAgentHeader('Architect', 'arch-1', 'running', 'PLAN', 45);
      expect(result).toContain('Agent: Architect (arch-1)');
      expect(result).toContain('RUNNING ●');
      expect(result).toContain('Stage: PLAN');
      expect(result).toContain('[45%]');
    });

    it('should display idle status with ○ icon', () => {
      const result = formatAgentHeader('Dev', 'dev-1', 'idle', 'ACT', 0);
      expect(result).toContain('IDLE ○');
    });

    it('should display blocked status with ⏸ icon', () => {
      const result = formatAgentHeader('Dev', 'dev-1', 'blocked', 'ACT', 50);
      expect(result).toContain('BLOCKED ⏸');
    });

    it('should display error status with ! icon', () => {
      const result = formatAgentHeader('Dev', 'dev-1', 'error', 'EVAL', 80);
      expect(result).toContain('ERROR !');
    });

    it('should display done status with ✓ icon', () => {
      const result = formatAgentHeader('Dev', 'dev-1', 'done', 'EVAL', 100);
      expect(result).toContain('DONE ✓');
    });
  });

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

  describe('formatChecklist', () => {
    it('should show completed tasks with [x] and pending with [ ]', () => {
      const tasks: TaskItem[] = [
        { id: '1', subject: 'Write tests', completed: true },
        { id: '2', subject: 'Implement feature', completed: false },
      ];

      const result = formatChecklist(tasks);
      expect(result).toContain('[x] Write tests');
      expect(result).toContain('[ ] Implement feature');
    });

    it('should show overflow count when exceeding maxItems', () => {
      const tasks: TaskItem[] = Array.from({ length: 10 }, (_, i) => ({
        id: String(i),
        subject: `Task ${i}`,
        completed: false,
      }));

      const result = formatChecklist(tasks, 6);
      const lines = result.split('\n');
      expect(lines).toHaveLength(7); // 6 items + overflow
      expect(lines[6]).toBe('(+4 more)');
    });

    it('should not show overflow when within maxItems', () => {
      const tasks: TaskItem[] = [{ id: '1', subject: 'Only task', completed: false }];

      const result = formatChecklist(tasks, 6);
      expect(result).not.toContain('more');
    });

    it('should return empty string for empty tasks', () => {
      const result = formatChecklist([]);
      expect(result).toBe('');
    });
  });

  describe('formatToolIO', () => {
    it('should format tools, inputs, and outputs', () => {
      const result = formatToolIO(['grep', 'read'], ['src/app.ts', 'src/main.ts'], {
        files: 3,
        commits: 1,
      });

      expect(result).toContain('Tools: grep / read');
      expect(result).toContain('IN : src/app.ts, src/main.ts');
      expect(result).toContain('OUT: files(3) / commits(1)');
    });

    it('should show "none" for empty tools', () => {
      const result = formatToolIO([], [], {});
      expect(result).toContain('Tools: none');
      expect(result).toContain('IN : none');
      expect(result).toContain('OUT: none');
    });

    it('should skip zero-value outputs', () => {
      const result = formatToolIO(['read'], ['a.ts'], { files: 0, commits: 2 });
      expect(result).not.toContain('files(0)');
      expect(result).toContain('commits(2)');
    });

    it('should skip undefined outputs', () => {
      const result = formatToolIO(['read'], ['a.ts'], { files: undefined, commits: 1 });
      expect(result).not.toContain('files');
      expect(result).toContain('commits(1)');
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

  describe('formatProgressBar', () => {
    it('should return filled and empty segments', () => {
      const { filled, empty } = formatProgressBar(50, 20);
      expect(filled).toBe('██████████');
      expect(empty).toBe('░░░░░░░░░░');
    });

    it('should handle 0% progress', () => {
      const { filled, empty } = formatProgressBar(0, 10);
      expect(filled).toBe('');
      expect(empty).toBe('░░░░░░░░░░');
    });

    it('should handle 100% progress', () => {
      const { filled, empty } = formatProgressBar(100, 10);
      expect(filled).toBe('██████████');
      expect(empty).toBe('');
    });

    it('should clamp values above 100', () => {
      const { filled, empty } = formatProgressBar(150, 10);
      expect(filled).toBe('██████████');
      expect(empty).toBe('');
    });

    it('should clamp values below 0', () => {
      const { filled, empty } = formatProgressBar(-10, 10);
      expect(filled).toBe('');
      expect(empty).toBe('░░░░░░░░░░');
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

  describe('formatActivitySparkline', () => {
    const NOW = 1_000_000;

    it('빈 배열 → 모두 ▁ (최소 높이)', () => {
      const result = formatActivitySparkline([], 10, 60_000, NOW);
      expect(result).toBe('▁'.repeat(10));
      expect(result).toHaveLength(10);
    });

    it('단일 스파이크 → 마지막 버킷만 █', () => {
      const calls = [{ timestamp: NOW - 1000 }];
      const result = formatActivitySparkline(calls, 10, 60_000, NOW);
      expect(result[result.length - 1]).toBe('█');
      expect(result.slice(0, -1)).toBe('▁'.repeat(9));
    });

    it('윈도우 밖 호출 무시', () => {
      const calls = [{ timestamp: NOW - 70_000 }];
      const result = formatActivitySparkline(calls, 10, 60_000, NOW);
      expect(result).toBe('▁'.repeat(10));
    });

    it('bucketCount만큼 문자 반환', () => {
      const result = formatActivitySparkline([], 20, 60_000, NOW);
      expect(result).toHaveLength(20);
    });

    it('균등 분포 → 모두 같은 높이 문자', () => {
      const bucketSize = 60_000 / 5;
      const calls = [0, 1, 2, 3, 4].map(i => ({
        timestamp: NOW - (i * bucketSize + bucketSize / 2),
      }));
      const result = formatActivitySparkline(calls, 5, 60_000, NOW);
      expect(new Set(result.split('')).size).toBe(1);
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
