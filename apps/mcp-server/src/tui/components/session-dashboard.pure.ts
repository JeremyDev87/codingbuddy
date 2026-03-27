/**
 * Session Analytics Dashboard - Pure Rendering Functions
 *
 * Computes session analytics data and renders terminal-friendly text lines.
 * All functions are pure (no side effects) and return string arrays for Ink rendering.
 */
import type { ToolCallRecord, TddStep, ModeTransition, FileChangeStats } from '../dashboard-types';
import type { DashboardNode } from '../dashboard-types';
import type { LayoutMode } from '../dashboard-types';

// ─── Data Computation ────────────────────────────────────────

export interface ToolDistributionEntry {
  name: string;
  count: number;
  pct: number;
}

/**
 * Compute tool call distribution sorted by count descending.
 */
export function computeToolDistribution(toolCalls: ToolCallRecord[]): ToolDistributionEntry[] {
  if (toolCalls.length === 0) return [];

  const counts = new Map<string, number>();
  for (const tc of toolCalls) {
    counts.set(tc.toolName, (counts.get(tc.toolName) ?? 0) + 1);
  }

  const total = toolCalls.length;
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count, pct: Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count);
}

export interface AgentTimelineEntry {
  name: string;
  startedAt: number;
  durationMs: number;
  status: string;
}

/**
 * Compute agent timeline entries with duration.
 */
export function computeAgentTimeline(
  agents: Map<string, DashboardNode>,
  now: number,
): AgentTimelineEntry[] {
  const entries: AgentTimelineEntry[] = [];
  for (const agent of agents.values()) {
    if (agent.startedAt === undefined) continue;
    const end = agent.completedAt ?? now;
    entries.push({
      name: agent.name,
      startedAt: agent.startedAt,
      durationMs: end - agent.startedAt,
      status: agent.status,
    });
  }
  return entries.sort((a, b) => a.startedAt - b.startedAt);
}

export interface TddCycleStats {
  red: number;
  green: number;
  refactor: number;
  cycles: number;
}

/**
 * Compute TDD cycle statistics from step history.
 */
export function computeTddCycleStats(tddSteps: TddStep[]): TddCycleStats {
  let red = 0;
  let green = 0;
  let refactor = 0;

  for (const step of tddSteps) {
    switch (step.phase) {
      case 'RED':
        red++;
        break;
      case 'GREEN':
        green++;
        break;
      case 'REFACTOR':
        refactor++;
        break;
    }
  }

  // A complete cycle = min(red, green, refactor)
  const cycles = Math.min(red, green, refactor);
  return { red, green, refactor, cycles };
}

// ─── Rendering Functions ─────────────────────────────────────

const BAR_CHARS = { filled: '█', empty: '░' };

/**
 * Render a horizontal bar of given width proportional to pct (0-100).
 */
export function renderBar(pct: number, maxWidth: number): string {
  const filled = Math.round((pct / 100) * maxWidth);
  const empty = maxWidth - filled;
  return BAR_CHARS.filled.repeat(filled) + BAR_CHARS.empty.repeat(empty);
}

/**
 * Render tool distribution as horizontal bar chart lines.
 * Returns lines like: "  Edit        ████████░░ 42  (56%)"
 */
export function renderToolDistribution(
  entries: ToolDistributionEntry[],
  width: number,
  maxItems: number = 8,
): string[] {
  if (entries.length === 0) return ['  (no tool calls)'];

  const visible = entries.slice(0, maxItems);
  const nameWidth = Math.min(14, Math.max(...visible.map(e => e.name.length)));
  const countWidth = String(visible[0].count).length;
  const barWidth = Math.max(6, width - nameWidth - countWidth - 12);

  return visible.map(e => {
    const name = e.name.padEnd(nameWidth).slice(0, nameWidth);
    const bar = renderBar(e.pct, barWidth);
    const count = String(e.count).padStart(countWidth);
    return `  ${name} ${bar} ${count} (${String(e.pct).padStart(2)}%)`;
  });
}

/**
 * Format duration in ms to human-readable "Xm Ys" or "Xs".
 */
export function formatDurationMs(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min > 0) return `${min}m ${sec}s`;
  return `${sec}s`;
}

/**
 * Render agent timeline as text lines.
 */
export function renderAgentTimeline(entries: AgentTimelineEntry[], _width: number): string[] {
  if (entries.length === 0) return ['  (no agents)'];

  const nameWidth = Math.min(20, Math.max(...entries.map(e => e.name.length)));
  const statusIcons: Record<string, string> = {
    running: '●',
    done: '✓',
    error: '!',
    idle: '○',
    blocked: '⏸',
  };

  return entries.slice(0, 10).map(e => {
    const icon = statusIcons[e.status] ?? '○';
    const name = e.name.padEnd(nameWidth).slice(0, nameWidth);
    const dur = formatDurationMs(e.durationMs);
    return `  ${icon} ${name} ${dur}`;
  });
}

/**
 * Render TDD cycle stats as a single summary line + phase bars.
 */
export function renderTddStats(stats: TddCycleStats): string[] {
  if (stats.red === 0 && stats.green === 0 && stats.refactor === 0) {
    return ['  (no TDD activity)'];
  }

  const total = stats.red + stats.green + stats.refactor;
  const redPct = total > 0 ? Math.round((stats.red / total) * 100) : 0;
  const greenPct = total > 0 ? Math.round((stats.green / total) * 100) : 0;
  const refactorPct = total > 0 ? Math.round((stats.refactor / total) * 100) : 0;

  return [
    `  Cycles: ${stats.cycles} complete`,
    `  RED:${String(stats.red).padStart(3)} (${String(redPct).padStart(2)}%)  GREEN:${String(stats.green).padStart(3)} (${String(greenPct).padStart(2)}%)  REFACTOR:${String(stats.refactor).padStart(3)} (${String(refactorPct).padStart(2)}%)`,
  ];
}

/**
 * Render file change stats as a compact line.
 */
export function renderFileChangeStats(stats: FileChangeStats): string {
  const parts: string[] = [];
  if (stats.created > 0) parts.push(`+${stats.created} created`);
  if (stats.modified > 0) parts.push(`~${stats.modified} modified`);
  if (stats.deleted > 0) parts.push(`-${stats.deleted} deleted`);
  if (parts.length === 0) return '  (no file changes)';
  return `  ${parts.join('  ')}`;
}

/**
 * Render mode transition history as timeline.
 */
export function renderModeTransitions(
  transitions: ModeTransition[],
  sessionStartedAt: number,
): string[] {
  if (transitions.length === 0) return ['  (no mode changes)'];

  return transitions.slice(-8).map(t => {
    const elapsed = formatDurationMs(t.timestamp - sessionStartedAt);
    const from = t.from ?? 'START';
    return `  ${elapsed.padStart(7)} ${from} → ${t.to}`;
  });
}

/**
 * Render the complete session dashboard as text lines.
 */
export function renderSessionDashboard(params: {
  toolDistribution: ToolDistributionEntry[];
  agentTimeline: AgentTimelineEntry[];
  tddStats: TddCycleStats;
  fileChanges: FileChangeStats;
  modeTransitions: ModeTransition[];
  sessionStartedAt: number;
  sessionDuration: string;
  totalToolCalls: number;
  totalAgents: number;
  width: number;
  layoutMode: LayoutMode;
}): string[] {
  const {
    toolDistribution,
    agentTimeline,
    tddStats,
    fileChanges,
    modeTransitions,
    sessionDuration,
    sessionStartedAt,
    totalToolCalls,
    totalAgents,
    width,
    layoutMode,
  } = params;

  const lines: string[] = [];
  const divider = (title: string) => {
    const pad = Math.max(0, width - title.length - 6);
    return `── ${title} ${'─'.repeat(pad)}`;
  };

  // Header
  lines.push(divider(`Session Analytics (${sessionDuration})`));
  lines.push(`  Tools: ${totalToolCalls}  Agents: ${totalAgents}`);
  lines.push('');

  if (layoutMode === 'narrow') {
    // Single column compact layout
    lines.push(divider('Tools'));
    lines.push(...renderToolDistribution(toolDistribution, width - 4, 5));
    lines.push('');
    lines.push(divider('TDD'));
    lines.push(...renderTddStats(tddStats));
    lines.push('');
    lines.push(divider('Files'));
    lines.push(renderFileChangeStats(fileChanges));
    lines.push('');
    lines.push(divider('Modes'));
    lines.push(...renderModeTransitions(modeTransitions, sessionStartedAt));
  } else {
    // Two-column layout for medium/wide
    lines.push(divider('Tool Distribution'));
    lines.push(...renderToolDistribution(toolDistribution, Math.floor(width / 2), 8));
    lines.push('');
    lines.push(divider('Agent Timeline'));
    lines.push(...renderAgentTimeline(agentTimeline, width));
    lines.push('');
    lines.push(divider('TDD Cycles'));
    lines.push(...renderTddStats(tddStats));
    lines.push('');
    lines.push(divider('File Changes'));
    lines.push(renderFileChangeStats(fileChanges));
    lines.push('');
    lines.push(divider('Mode Transitions'));
    lines.push(...renderModeTransitions(modeTransitions, sessionStartedAt));
  }

  return lines;
}
