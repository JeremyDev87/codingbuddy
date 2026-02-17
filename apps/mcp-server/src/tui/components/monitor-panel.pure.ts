import type { EventLogEntry, DashboardNode, TaskItem } from '../dashboard-types';
import {
  estimateDisplayWidth,
  truncateToDisplayWidth,
  padEndDisplayWidth,
} from '../utils/display-width';

function truncate(text: string, maxWidth: number): string {
  if (maxWidth <= 0) return '';
  if (estimateDisplayWidth(text) <= maxWidth) return text;
  return truncateToDisplayWidth(text, maxWidth - 1) + '…';
}

export function renderEventLog(entries: EventLogEntry[], width: number, height: number): string[] {
  if (height <= 0) return [];
  const header = truncate('📋 Event Log', width);
  if (entries.length === 0) {
    return [header, truncate('  No events', width)].slice(0, height);
  }

  const maxLines = height - 1;
  const tail = entries.slice(-maxLines);
  const lines: string[] = [header];
  for (const e of tail) {
    lines.push(truncate(`${e.timestamp} ${e.message}`, width));
  }
  return lines.slice(0, height);
}

export function renderAgentTimeline(
  agents: Map<string, DashboardNode>,
  width: number,
  height: number,
): string[] {
  if (height <= 0) return [];
  const header = truncate('📊 Timeline', width);
  if (agents.size === 0) {
    return [header, truncate('  No agents', width)].slice(0, height);
  }

  // Determine name column width: longest agent name, capped to leave room for bar
  const maxNameLen = Math.min(
    Math.max(...[...agents.values()].map(a => estimateDisplayWidth(a.name))),
    width - 4, // leave at least space for " " + minimal bar
  );
  const nameCol = Math.max(1, maxNameLen);
  const barWidth = Math.max(1, width - nameCol - 2);
  const lines: string[] = [header];

  for (const agent of agents.values()) {
    if (lines.length >= height) break;
    const name = padEndDisplayWidth(truncateToDisplayWidth(agent.name, nameCol), nameCol);
    const clamped = Math.max(0, Math.min(100, agent.progress));
    const filled = Math.round((clamped / 100) * barWidth);
    const bar = '█'.repeat(filled) + '░'.repeat(barWidth - filled);
    lines.push(truncate(`${name} ${bar}`, width));
  }

  return lines.slice(0, height);
}

export function renderTaskProgress(tasks: TaskItem[], width: number, height: number): string[] {
  if (height <= 0) return [];
  const done = tasks.filter(t => t.completed).length;
  const header = truncate(`✅ Tasks ${done}/${tasks.length}`, width);
  if (tasks.length === 0) {
    return [header, truncate('  No tasks', width)].slice(0, height);
  }

  const maxLines = height - 1;
  const visible = tasks.slice(0, maxLines);
  const lines: string[] = [header];
  for (const t of visible) {
    const mark = t.completed ? '[x]' : '[ ]';
    lines.push(truncate(`${mark} ${t.subject}`, width));
  }

  return lines.slice(0, height);
}
