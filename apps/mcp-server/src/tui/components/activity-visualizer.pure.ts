import type { DashboardNode, EventLogEntry } from '../dashboard-types';
import { STATUS_ICONS } from '../utils/theme';
import { truncateToDisplayWidth } from '../utils/display-width';

const AGENT_NAME_WIDTH = 18;
const AGENT_STAGE_WIDTH = 5;

const STATUS_PRIORITY: Record<string, number> = {
  running: 0,
  blocked: 1,
  idle: 2,
  error: 3,
  done: 4,
};

export function renderAgentRoster(
  agents: Map<string, DashboardNode>,
  width: number,
  height: number,
): string[] {
  if (height <= 0 || width <= 0) return [];

  const lines: string[] = [truncateToDisplayWidth('🤖 Agents', width)];
  if (height <= 1) return lines;

  if (agents.size === 0) {
    lines.push(truncateToDisplayWidth('  No agents', width));
    return lines.slice(0, height);
  }

  const sorted = [...agents.values()].sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
    return (STATUS_PRIORITY[a.status] ?? 5) - (STATUS_PRIORITY[b.status] ?? 5);
  });

  for (const agent of sorted) {
    if (lines.length >= height) break;
    const icon = STATUS_ICONS[agent.status] ?? '?';
    const name = truncateToDisplayWidth(agent.name, AGENT_NAME_WIDTH).padEnd(AGENT_NAME_WIDTH);
    const stage = agent.stage.padEnd(AGENT_STAGE_WIDTH);
    const pct = `${agent.progress}%`.padStart(4);
    lines.push(truncateToDisplayWidth(`${icon} ${name} ${stage} ${pct}`, width));
  }

  return lines.slice(0, height);
}

export function renderAgentEvents(
  eventLog: EventLogEntry[],
  width: number,
  height: number,
): string[] {
  if (height <= 0 || width <= 0) return [];

  const lines: string[] = [truncateToDisplayWidth('📋 Events', width)];
  if (height <= 1) return lines;

  if (eventLog.length === 0) {
    lines.push(truncateToDisplayWidth('  No events', width));
    return lines.slice(0, height);
  }

  const maxItems = height - 1;
  const tail = eventLog.slice(-maxItems);

  for (const entry of tail) {
    if (lines.length >= height) break;
    lines.push(truncateToDisplayWidth(`${entry.timestamp} ${entry.message}`, width));
  }

  return lines.slice(0, height);
}
