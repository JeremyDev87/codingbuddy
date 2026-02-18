import type { Mode } from '../types';
import type { DashboardNode, StageStats, EventLogEntry, LayoutMode } from '../dashboard-types';
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

/**
 * Format stage health bar with stats, bottlenecks, and tool count.
 */
export function formatStageHealthBar(
  health: Record<Mode, StageStats>,
  bottlenecks: string[],
  toolCount: number,
  width: number,
  layoutMode: LayoutMode,
): string {
  const countStr = toolCount >= 1000 ? `${Math.round(toolCount / 1000)}k` : String(toolCount);

  const formatStats = (mode: Mode, stats: StageStats): string => {
    if (layoutMode === 'narrow') {
      return `${mode}: r${stats.running}/b${stats.blocked}/d${stats.done}`;
    }
    const parts: string[] = [];
    if (stats.running > 0) parts.push(`running ${stats.running}`);
    if (stats.blocked > 0) parts.push(`blocked ${stats.blocked}`);
    if (stats.waiting > 0) parts.push(`waiting ${stats.waiting}`);
    if (stats.done > 0) parts.push(`done ${stats.done}`);
    if (stats.error > 0) parts.push(`err ${stats.error}`);
    return `${mode}: ${parts.join(' / ') || 'idle'}`;
  };

  const stages = (['PLAN', 'ACT', 'EVAL'] as Mode[])
    .map(m => formatStats(m, health[m]))
    .join('  |  ');

  let bottleneckStr = '';
  if (bottlenecks.length > 0) {
    bottleneckStr = `Bottlenecks: ${bottlenecks.join(' / ')}`;
    if (layoutMode === 'narrow' && bottleneckStr.length > width - 6) {
      bottleneckStr = bottleneckStr.slice(0, width - 9) + '...';
    }
  }

  if (layoutMode === 'narrow') {
    const line1 = stages;
    const line2Parts = [bottleneckStr, countStr].filter(Boolean);
    return [line1, line2Parts.join('  ')].filter(Boolean).join('\n');
  }

  const spacer = ' '.repeat(Math.max(1, width - stages.length - countStr.length - 2));
  const line1 = `${stages}${spacer}${countStr}`;
  return bottleneckStr ? `${line1}\n${bottleneckStr}` : line1;
}
