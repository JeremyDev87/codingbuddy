import type { TaskItem, EventLogEntry } from '../dashboard-types';

export function formatObjective(objectives: string[], maxLines = 3): string {
  const lines = objectives.slice(0, maxLines).map(o => `- ${o}`);
  if (objectives.length > maxLines) {
    lines.push(`  ... (+${objectives.length - maxLines} more)`);
  }
  return lines.join('\n');
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

/** Enhanced checklist with ✔/◻ icons and overflow indicator. */
export function formatEnhancedChecklist(tasks: TaskItem[], maxItems = 6): string {
  const visible = tasks.slice(0, maxItems);
  const lines = visible.map(t => (t.completed ? `  ✔ ${t.subject}` : `  ◻ ${t.subject}`));
  if (tasks.length > maxItems) {
    lines.push(`  ⋯ (+${tasks.length - maxItems} more)`);
  }
  return lines.join('\n');
}
