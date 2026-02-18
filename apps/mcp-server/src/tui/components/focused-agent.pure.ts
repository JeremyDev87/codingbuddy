import type { DashboardNodeStatus, TaskItem, EventLogEntry } from '../dashboard-types';
import type { Mode } from '../types';

const STATUS_LABELS: Record<DashboardNodeStatus, string> = {
  running: 'RUNNING ●',
  idle: 'IDLE ○',
  blocked: 'BLOCKED ⏸',
  error: 'ERROR !',
  done: 'DONE ✓',
};

export function formatAgentHeader(
  name: string,
  id: string,
  status: DashboardNodeStatus,
  stage: Mode,
  progress: number,
): string {
  const statusLabel = STATUS_LABELS[status] ?? status.toUpperCase();
  return `Agent: ${name} (${id})   ${statusLabel}   Stage: ${stage}   [${progress}%]`;
}

export function formatObjective(objectives: string[], maxLines = 3): string {
  const lines = objectives.slice(0, maxLines).map(o => `- ${o}`);
  if (objectives.length > maxLines) {
    lines.push(`  ... (+${objectives.length - maxLines} more)`);
  }
  return lines.join('\n');
}

/** @deprecated Use formatEnhancedChecklist instead (supports ✔/◻ icons). */
export function formatChecklist(tasks: TaskItem[], maxItems = 6): string {
  const visible = tasks.slice(0, maxItems);
  const lines = visible.map(t => (t.completed ? `[x] ${t.subject}` : `[ ] ${t.subject}`));
  if (tasks.length > maxItems) {
    lines.push(`(+${tasks.length - maxItems} more)`);
  }
  return lines.join('\n');
}

export interface ToolIOData {
  files?: number;
  commits?: number;
  [key: string]: number | undefined;
}

export function formatToolIO(tools: string[], inputs: string[], outputs: ToolIOData): string {
  const toolLine = `Tools: ${tools.join(' / ') || 'none'}`;
  const inLine = `IN : ${inputs.join(', ') || 'none'}`;
  const outParts = Object.entries(outputs)
    .filter(([, v]) => v !== undefined && v > 0)
    .map(([k, v]) => `${k}(${v})`);
  const outLine = `OUT: ${outParts.join(' / ') || 'none'}`;
  return `${toolLine}\n${inLine}\n${outLine}`;
}

export function formatLogTail(events: EventLogEntry[], maxLines = 10): string {
  const tail = events.slice(-maxLines);
  return tail.map(e => `${e.timestamp} ${e.message}`).join('\n');
}

/**
 * Format a section divider line: ─── Title ───────
 */
export function formatSectionDivider(title: string, width = 50): string {
  const prefix = '─── ';
  const suffix = ' ';
  const remaining = Math.max(0, width - prefix.length - title.length - suffix.length);
  return `${prefix}${title}${suffix}${'─'.repeat(remaining)}`;
}

/**
 * Format a progress bar with filled and empty segments.
 * Returns [filledStr, emptyStr] for separate styling.
 * @deprecated Use formatEnhancedProgressBar instead (supports braille chars + label).
 */
export function formatProgressBar(progress: number, width = 40): { filled: string; empty: string } {
  const clamped = Math.max(0, Math.min(100, progress));
  const filledCount = Math.round((clamped / 100) * width);
  const emptyCount = width - filledCount;
  return {
    filled: '█'.repeat(filledCount),
    empty: '░'.repeat(emptyCount),
  };
}

/** Enhanced progress bar using braille characters for finer granularity. */
export function formatEnhancedProgressBar(
  progress: number,
  width = 30,
): { bar: string; label: string } {
  const clamped = Math.max(0, Math.min(100, progress));
  const filledCount = Math.round((clamped / 100) * width);
  const emptyCount = width - filledCount;
  return {
    bar: '⣿'.repeat(filledCount) + '░'.repeat(emptyCount),
    label: `${clamped}%`,
  };
}

const SPARK_CHARS = '▁▂▃▄▅▆▇█';

/**
 * Generate a sparkline showing tool call frequency over the last N seconds.
 * Each character represents one time bucket; height = relative call count.
 */
export function formatActivitySparkline(
  toolCalls: Array<{ timestamp: number }>,
  bucketCount = 20,
  windowMs = 60_000,
  now?: number,
): string {
  const currentTime = now ?? Date.now();
  const bucketSize = windowMs / bucketCount;
  const buckets = new Array<number>(bucketCount).fill(0);

  for (const call of toolCalls) {
    const age = currentTime - call.timestamp;
    if (age < 0 || age >= windowMs) continue;
    const idx = Math.min(bucketCount - 1, Math.floor(age / bucketSize));
    buckets[bucketCount - 1 - idx]++;
  }

  const max = Math.max(1, ...buckets);
  return buckets.map(b => SPARK_CHARS[Math.round((b / max) * (SPARK_CHARS.length - 1))]).join('');
}

/** Enhanced checklist with ✔/◻ icons and overflow indicator. */
export function formatEnhancedChecklist(tasks: TaskItem[], maxItems = 6): string {
  const visible = tasks.slice(0, maxItems);
  const lines = visible.map(t => (t.completed ? `  ✔ ${t.subject}` : `  ◻ ${t.subject}`));
  if (tasks.length > maxItems) {
    lines.push(`  ⋯ (+${tasks.length - maxItems} more)`);
  }
  return lines.join('\n');
}
