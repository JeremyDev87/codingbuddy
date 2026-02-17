import chalk from 'chalk';
import type { AgentStatus } from '../types';

export type ColorDepth = 'none' | 'basic' | '256' | 'truecolor';

/**
 * Status colors for AgentStatus domain (idle/running/completed/failed).
 * Note: theme.ts has a separate getNodeStatusColor() for DashboardNodeStatus domain
 * (running/idle/blocked/error/done) with different color mappings.
 */
export const STATUS_COLORS: Readonly<Record<AgentStatus, string>> = Object.freeze({
  idle: 'gray',
  running: 'cyan',
  completed: 'green',
  failed: 'red',
});

const DEFAULT_COLOR = 'gray';

/**
 * Get color for AgentStatus. For DashboardNodeStatus, use theme.ts getNodeStatusColor().
 */
export function getStatusColor(status: AgentStatus): string {
  return STATUS_COLORS[status] ?? DEFAULT_COLOR;
}

export function getColorDepth(): ColorDepth {
  if (process.env.NO_COLOR !== undefined) {
    return 'none';
  }

  const level = chalk.level;
  switch (level) {
    case 0:
      return 'none';
    case 1:
      return 'basic';
    case 2:
      return '256';
    case 3:
      return 'truecolor';
    default:
      return 'basic';
  }
}
