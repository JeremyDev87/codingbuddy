import type { DashboardNodeStatus, TaskItem, EventLogEntry } from '../dashboard-types';
import type { Mode } from '../../keyword/keyword.types';

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
