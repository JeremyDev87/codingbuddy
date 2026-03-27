import { describe, it, expect } from 'vitest';
import {
  computeToolDistribution,
  computeAgentTimeline,
  computeTddCycleStats,
  renderBar,
  renderToolDistribution,
  renderAgentTimeline,
  renderTddStats,
  renderFileChangeStats,
  renderModeTransitions,
  renderSessionDashboard,
  formatDurationMs,
} from './session-dashboard.pure';
import type { ToolCallRecord, TddStep, DashboardNode, ModeTransition } from '../dashboard-types';

function makeToolCall(name: string, timestamp = 1000): ToolCallRecord {
  return { agentId: 'a1', toolName: name, timestamp, status: 'completed' };
}

function makeTddStep(phase: 'RED' | 'GREEN' | 'REFACTOR', id?: string): TddStep {
  return {
    id: id ?? `step-${phase}-${Math.random()}`,
    label: `${phase} step`,
    phase,
    agentId: null,
    status: 'done',
  };
}

function makeAgent(
  overrides: Partial<DashboardNode> & { id: string; name: string },
): DashboardNode {
  return {
    stage: 'ACT',
    status: 'done',
    isPrimary: false,
    progress: 100,
    isParallel: false,
    ...overrides,
  };
}

describe('tui/components/session-dashboard.pure', () => {
  describe('computeToolDistribution', () => {
    it('should return empty array for no calls', () => {
      expect(computeToolDistribution([])).toEqual([]);
    });

    it('should count and sort by frequency descending', () => {
      const calls = [
        makeToolCall('Edit'),
        makeToolCall('Edit'),
        makeToolCall('Edit'),
        makeToolCall('Read'),
        makeToolCall('Read'),
        makeToolCall('Bash'),
      ];

      const result = computeToolDistribution(calls);

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('Edit');
      expect(result[0].count).toBe(3);
      expect(result[0].pct).toBe(50);
      expect(result[1].name).toBe('Read');
      expect(result[1].count).toBe(2);
      expect(result[1].pct).toBe(33);
      expect(result[2].name).toBe('Bash');
      expect(result[2].count).toBe(1);
      expect(result[2].pct).toBe(17);
    });

    it('should handle single tool type', () => {
      const calls = [makeToolCall('Read'), makeToolCall('Read')];
      const result = computeToolDistribution(calls);

      expect(result).toHaveLength(1);
      expect(result[0].pct).toBe(100);
    });
  });

  describe('computeAgentTimeline', () => {
    it('should return empty for no agents', () => {
      expect(computeAgentTimeline(new Map(), 5000)).toEqual([]);
    });

    it('should compute duration for completed agents', () => {
      const now = 10000;
      const agents = new Map<string, DashboardNode>([
        ['a1', makeAgent({ id: 'a1', name: 'Architect', startedAt: 1000, completedAt: 5000 })],
      ]);

      const result = computeAgentTimeline(agents, now);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Architect');
      expect(result[0].durationMs).toBe(4000);
    });

    it('should use now for running agents without completedAt', () => {
      const now = 10000;
      const agents = new Map<string, DashboardNode>([
        ['a1', makeAgent({ id: 'a1', name: 'Runner', startedAt: 2000, status: 'running' })],
      ]);

      const result = computeAgentTimeline(agents, now);

      expect(result[0].durationMs).toBe(8000);
    });

    it('should sort by startedAt ascending', () => {
      const now = 10000;
      const agents = new Map<string, DashboardNode>([
        ['a2', makeAgent({ id: 'a2', name: 'Second', startedAt: 5000, completedAt: 8000 })],
        ['a1', makeAgent({ id: 'a1', name: 'First', startedAt: 1000, completedAt: 3000 })],
      ]);

      const result = computeAgentTimeline(agents, now);

      expect(result[0].name).toBe('First');
      expect(result[1].name).toBe('Second');
    });

    it('should skip agents without startedAt', () => {
      const agents = new Map<string, DashboardNode>([
        ['a1', makeAgent({ id: 'a1', name: 'NoStart' })],
      ]);

      expect(computeAgentTimeline(agents, 10000)).toEqual([]);
    });
  });

  describe('computeTddCycleStats', () => {
    it('should return zeros for no steps', () => {
      const result = computeTddCycleStats([]);
      expect(result).toEqual({ red: 0, green: 0, refactor: 0, cycles: 0 });
    });

    it('should count phases correctly', () => {
      const steps = [
        makeTddStep('RED'),
        makeTddStep('GREEN'),
        makeTddStep('REFACTOR'),
        makeTddStep('RED'),
        makeTddStep('GREEN'),
      ];

      const result = computeTddCycleStats(steps);

      expect(result.red).toBe(2);
      expect(result.green).toBe(2);
      expect(result.refactor).toBe(1);
      expect(result.cycles).toBe(1); // min(2,2,1)
    });

    it('should compute complete cycles as min of all phases', () => {
      const steps = [
        makeTddStep('RED'),
        makeTddStep('GREEN'),
        makeTddStep('REFACTOR'),
        makeTddStep('RED'),
        makeTddStep('GREEN'),
        makeTddStep('REFACTOR'),
      ];

      const result = computeTddCycleStats(steps);
      expect(result.cycles).toBe(2);
    });
  });

  describe('formatDurationMs', () => {
    it('should format seconds only', () => {
      expect(formatDurationMs(5000)).toBe('5s');
      expect(formatDurationMs(0)).toBe('0s');
      expect(formatDurationMs(59999)).toBe('59s');
    });

    it('should format minutes and seconds', () => {
      expect(formatDurationMs(60000)).toBe('1m 0s');
      expect(formatDurationMs(90000)).toBe('1m 30s');
      expect(formatDurationMs(3661000)).toBe('61m 1s');
    });

    it('should handle negative values as 0s', () => {
      expect(formatDurationMs(-1000)).toBe('0s');
    });
  });

  describe('renderBar', () => {
    it('should render full bar at 100%', () => {
      const result = renderBar(100, 10);
      expect(result).toBe('██████████');
    });

    it('should render empty bar at 0%', () => {
      const result = renderBar(0, 10);
      expect(result).toBe('░░░░░░░░░░');
    });

    it('should render proportional bar at 50%', () => {
      const result = renderBar(50, 10);
      expect(result).toBe('█████░░░░░');
    });
  });

  describe('renderToolDistribution', () => {
    it('should show placeholder for empty calls', () => {
      const result = renderToolDistribution([], 60);
      expect(result).toEqual(['  (no tool calls)']);
    });

    it('should render entries with bars and percentages', () => {
      const entries = [
        { name: 'Edit', count: 3, pct: 60 },
        { name: 'Read', count: 2, pct: 40 },
      ];

      const result = renderToolDistribution(entries, 60);

      expect(result).toHaveLength(2);
      expect(result[0]).toContain('Edit');
      expect(result[0]).toContain('60%');
      expect(result[1]).toContain('Read');
      expect(result[1]).toContain('40%');
    });

    it('should limit to maxItems', () => {
      const entries = Array.from({ length: 20 }, (_, i) => ({
        name: `Tool${i}`,
        count: 20 - i,
        pct: 5,
      }));

      const result = renderToolDistribution(entries, 60, 3);
      expect(result).toHaveLength(3);
    });
  });

  describe('renderAgentTimeline', () => {
    it('should show placeholder for no agents', () => {
      expect(renderAgentTimeline([], 60)).toEqual(['  (no agents)']);
    });

    it('should render agent entries with status icons', () => {
      const entries = [
        { name: 'Architect', startedAt: 1000, durationMs: 5000, status: 'done' },
        { name: 'Security', startedAt: 2000, durationMs: 3000, status: 'running' },
      ];

      const result = renderAgentTimeline(entries, 60);

      expect(result).toHaveLength(2);
      expect(result[0]).toContain('✓');
      expect(result[0]).toContain('Architect');
      expect(result[0]).toContain('5s');
      expect(result[1]).toContain('●');
      expect(result[1]).toContain('Security');
    });
  });

  describe('renderTddStats', () => {
    it('should show placeholder for no activity', () => {
      expect(renderTddStats({ red: 0, green: 0, refactor: 0, cycles: 0 })).toEqual([
        '  (no TDD activity)',
      ]);
    });

    it('should render cycle count and phase breakdown', () => {
      const result = renderTddStats({ red: 3, green: 3, refactor: 2, cycles: 2 });

      expect(result).toHaveLength(2);
      expect(result[0]).toContain('2 complete');
      expect(result[1]).toContain('RED:');
      expect(result[1]).toContain('GREEN:');
      expect(result[1]).toContain('REFACTOR:');
    });
  });

  describe('renderFileChangeStats', () => {
    it('should show placeholder for no changes', () => {
      expect(renderFileChangeStats({ created: 0, modified: 0, deleted: 0 })).toBe(
        '  (no file changes)',
      );
    });

    it('should render all non-zero stats', () => {
      const result = renderFileChangeStats({ created: 3, modified: 5, deleted: 1 });
      expect(result).toContain('+3 created');
      expect(result).toContain('~5 modified');
      expect(result).toContain('-1 deleted');
    });

    it('should only show non-zero stats', () => {
      const result = renderFileChangeStats({ created: 2, modified: 0, deleted: 0 });
      expect(result).toContain('+2 created');
      expect(result).not.toContain('modified');
      expect(result).not.toContain('deleted');
    });
  });

  describe('renderModeTransitions', () => {
    it('should show placeholder for no transitions', () => {
      expect(renderModeTransitions([], 0)).toEqual(['  (no mode changes)']);
    });

    it('should render transitions with elapsed time', () => {
      const sessionStart = 0;
      const transitions: ModeTransition[] = [
        { from: null, to: 'PLAN', timestamp: 1000 },
        { from: 'PLAN', to: 'ACT', timestamp: 61000 },
      ];

      const result = renderModeTransitions(transitions, sessionStart);

      expect(result).toHaveLength(2);
      expect(result[0]).toContain('START');
      expect(result[0]).toContain('PLAN');
      expect(result[1]).toContain('PLAN');
      expect(result[1]).toContain('ACT');
      expect(result[1]).toContain('1m');
    });

    it('should limit to last 8 transitions', () => {
      const transitions: ModeTransition[] = Array.from({ length: 12 }, (_, i) => ({
        from: 'PLAN' as const,
        to: 'ACT' as const,
        timestamp: i * 1000,
      }));

      const result = renderModeTransitions(transitions, 0);
      expect(result).toHaveLength(8);
    });
  });

  describe('renderSessionDashboard', () => {
    it('should render complete dashboard in narrow mode', () => {
      const result = renderSessionDashboard({
        toolDistribution: [{ name: 'Edit', count: 5, pct: 100 }],
        agentTimeline: [],
        tddStats: { red: 1, green: 1, refactor: 1, cycles: 1 },
        fileChanges: { created: 2, modified: 3, deleted: 0 },
        modeTransitions: [{ from: null, to: 'PLAN', timestamp: 1000 }],
        sessionStartedAt: 0,
        sessionDuration: '5m 30s',
        totalToolCalls: 5,
        totalAgents: 1,
        width: 60,
        layoutMode: 'narrow',
      });

      expect(result.length).toBeGreaterThan(5);
      expect(result[0]).toContain('Session Analytics');
      expect(result[0]).toContain('5m 30s');
      // Check all sections present
      const joined = result.join('\n');
      expect(joined).toContain('Tools');
      expect(joined).toContain('TDD');
      expect(joined).toContain('Files');
      expect(joined).toContain('Modes');
    });

    it('should render complete dashboard in wide mode', () => {
      const result = renderSessionDashboard({
        toolDistribution: [{ name: 'Edit', count: 5, pct: 100 }],
        agentTimeline: [{ name: 'Arch', startedAt: 1000, durationMs: 5000, status: 'done' }],
        tddStats: { red: 0, green: 0, refactor: 0, cycles: 0 },
        fileChanges: { created: 0, modified: 0, deleted: 0 },
        modeTransitions: [],
        sessionStartedAt: 0,
        sessionDuration: '2m 10s',
        totalToolCalls: 5,
        totalAgents: 1,
        width: 120,
        layoutMode: 'wide',
      });

      const joined = result.join('\n');
      expect(joined).toContain('Tool Distribution');
      expect(joined).toContain('Agent Timeline');
      expect(joined).toContain('TDD Cycles');
      expect(joined).toContain('File Changes');
      expect(joined).toContain('Mode Transitions');
    });
  });
});
