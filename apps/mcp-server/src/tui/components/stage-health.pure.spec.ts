import { describe, it, expect } from 'vitest';
import { computeStageHealth, detectBottlenecks } from './stage-health.pure';
import type { DashboardNode, EventLogEntry } from '../dashboard-types';
import { createEmptyStageStats } from '../dashboard-types';
import type { Mode } from '../types';

function makeAgent(
  overrides: Partial<DashboardNode> & { id: string; name: string; stage: Mode },
): DashboardNode {
  return {
    status: 'idle',
    isPrimary: false,
    progress: 0,
    isParallel: false,
    ...overrides,
  };
}

describe('tui/components/stage-health.pure', () => {
  describe('computeStageHealth', () => {
    it('should count agents per stage and status', () => {
      const agents = new Map<string, DashboardNode>([
        ['a1', makeAgent({ id: 'a1', name: 'Arch', stage: 'PLAN', status: 'running' })],
        ['a2', makeAgent({ id: 'a2', name: 'Dev', stage: 'ACT', status: 'running' })],
        ['a3', makeAgent({ id: 'a3', name: 'Tester', stage: 'ACT', status: 'blocked' })],
        ['a4', makeAgent({ id: 'a4', name: 'Reviewer', stage: 'EVAL', status: 'done' })],
        ['a5', makeAgent({ id: 'a5', name: 'Linter', stage: 'ACT', status: 'error' })],
      ]);

      const result = computeStageHealth(agents);

      expect(result.PLAN.running).toBe(1);
      expect(result.ACT.running).toBe(1);
      expect(result.ACT.blocked).toBe(1);
      expect(result.ACT.error).toBe(1);
      expect(result.EVAL.done).toBe(1);
    });

    it('should handle empty map', () => {
      const agents = new Map<string, DashboardNode>();
      const result = computeStageHealth(agents);

      expect(result.PLAN).toEqual(createEmptyStageStats());
      expect(result.ACT).toEqual(createEmptyStageStats());
      expect(result.EVAL).toEqual(createEmptyStageStats());
      expect(result.AUTO).toEqual(createEmptyStageStats());
    });

    it('should count idle agents as waiting', () => {
      const agents = new Map<string, DashboardNode>([
        ['a1', makeAgent({ id: 'a1', name: 'Idle1', stage: 'PLAN', status: 'idle' })],
        ['a2', makeAgent({ id: 'a2', name: 'Idle2', stage: 'PLAN', status: 'idle' })],
      ]);

      const result = computeStageHealth(agents);
      expect(result.PLAN.waiting).toBe(2);
    });
  });

  describe('detectBottlenecks', () => {
    it('should detect test failures', () => {
      const log: EventLogEntry[] = [
        { timestamp: '10:00', message: 'test_run: FAIL (3)', level: 'error' },
      ];

      const result = detectBottlenecks(log);
      expect(result).toEqual(['tests failing(3)']);
    });

    it('should detect lint errors', () => {
      const log: EventLogEntry[] = [
        { timestamp: '10:00', message: 'lint(src/app.ts)', level: 'error' },
      ];

      const result = detectBottlenecks(log);
      expect(result).toEqual(['lint(src/app.ts)']);
    });

    it('should detect missing env', () => {
      const log: EventLogEntry[] = [
        { timestamp: '10:00', message: 'missing env(DATABASE_URL)', level: 'error' },
      ];

      const result = detectBottlenecks(log);
      expect(result).toEqual(['missing env(DATABASE_URL)']);
    });

    it('should return empty for clean logs', () => {
      const log: EventLogEntry[] = [
        { timestamp: '10:00', message: 'Build succeeded', level: 'info' },
        { timestamp: '10:01', message: 'Deploy complete', level: 'info' },
      ];

      const result = detectBottlenecks(log);
      expect(result).toEqual([]);
    });

    it('should deduplicate bottlenecks', () => {
      const log: EventLogEntry[] = [
        { timestamp: '10:00', message: 'test_run: FAIL (3)', level: 'error' },
        { timestamp: '10:01', message: 'test_run: FAIL (3)', level: 'error' },
      ];

      const result = detectBottlenecks(log);
      expect(result).toEqual(['tests failing(3)']);
    });

    it('should ignore non-error entries', () => {
      const log: EventLogEntry[] = [
        { timestamp: '10:00', message: 'test_run: FAIL (3)', level: 'warn' },
      ];

      const result = detectBottlenecks(log);
      expect(result).toEqual([]);
    });
  });
});
