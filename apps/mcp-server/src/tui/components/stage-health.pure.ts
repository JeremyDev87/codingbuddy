import type { Mode } from '../types';
import type { DashboardNode, StageStats, EventLogEntry } from '../dashboard-types';
import { createEmptyStageStats } from '../dashboard-types';

/**
 * Count agents per stage and status.
 */
export function computeStageHealth(agents: Map<string, DashboardNode>): Record<Mode, StageStats> {
  const health: Record<Mode, StageStats> = {
    PLAN: createEmptyStageStats(),
    ACT: createEmptyStageStats(),
    EVAL: createEmptyStageStats(),
    AUTO: createEmptyStageStats(),
  };

  for (const agent of agents.values()) {
    const stage = health[agent.stage];
    if (!stage) continue;

    switch (agent.status) {
      case 'running':
        stage.running++;
        break;
      case 'blocked':
        stage.blocked++;
        break;
      case 'idle':
        stage.waiting++;
        break;
      case 'done':
        stage.done++;
        break;
      case 'error':
        stage.error++;
        break;
    }
  }

  return health;
}

/**
 * Detect bottleneck patterns from event log.
 */
export function detectBottlenecks(eventLog: EventLogEntry[]): string[] {
  const bottlenecks = new Set<string>();

  for (const entry of eventLog) {
    if (entry.level === 'error') {
      // Match test failure pattern
      const testMatch = entry.message.match(/(?:test_run|tests?):\s*FAIL\s*\((\d+)\)/i);
      if (testMatch) {
        bottlenecks.add(`tests failing(${testMatch[1]})`);
        continue;
      }

      // Match lint error pattern
      const lintMatch = entry.message.match(/lint\(([^)]+)\)/i);
      if (lintMatch) {
        bottlenecks.add(`lint(${lintMatch[1]})`);
        continue;
      }

      // Match missing env pattern
      const envMatch = entry.message.match(/missing\s+env\(([^)]+)\)/i);
      if (envMatch) {
        bottlenecks.add(`missing env(${envMatch[1]})`);
      }
    }
  }

  return [...bottlenecks];
}
