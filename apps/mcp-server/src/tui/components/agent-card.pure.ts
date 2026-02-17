import type { AgentStatus } from '../types';
import { buildProgressBar } from './progress-bar.pure';
import {
  estimateDisplayWidth,
  truncateToDisplayWidth,
  padEndDisplayWidth,
} from '../utils/display-width';

export const INLINE_NAME_COL_WIDTH = 22;
const INLINE_BAR_WIDTH = 10;
const INLINE_FILLED = '\u2593';
const INLINE_EMPTY = '\u2591';

const RUNNING_MIN_PROGRESS = 10;
const ELLIPSIS = '\u2026';

export function resolveProgress(status: AgentStatus, progress: number): number {
  const safeProgress = Number.isNaN(progress) ? 0 : progress;
  switch (status) {
    case 'idle':
      return 0;
    case 'running':
      return Math.max(safeProgress, RUNNING_MIN_PROGRESS);
    case 'completed':
      return 100;
    case 'failed':
      return safeProgress;
  }
}

export function abbreviateName(name: string, maxWidth: number): string {
  if (maxWidth <= 0) return '';
  if (estimateDisplayWidth(name) <= maxWidth) return name;
  return truncateToDisplayWidth(name, maxWidth - 1) + ELLIPSIS;
}

const STATUS_LABELS: Readonly<Record<AgentStatus, string>> = {
  idle: 'Idle',
  running: 'Running',
  completed: 'Done',
  failed: 'Failed',
};

export function buildStatusLabel(status: AgentStatus): string {
  return STATUS_LABELS[status];
}

const COMPLETED_ICON = '\u2713';
const FAILED_ICON = '\u2717';

export function resolveIcon(status: AgentStatus, icon: string): string {
  switch (status) {
    case 'completed':
      return COMPLETED_ICON;
    case 'failed':
      return FAILED_ICON;
    case 'idle':
    case 'running':
      return icon;
  }
}

export function buildInlineCard(
  icon: string,
  name: string,
  progress: number,
  statusLabel: string,
): string {
  const displayName = padEndDisplayWidth(
    abbreviateName(name, INLINE_NAME_COL_WIDTH),
    INLINE_NAME_COL_WIDTH,
  );
  const bar = buildProgressBar(progress, INLINE_BAR_WIDTH, INLINE_FILLED, INLINE_EMPTY);
  const pct = `${progress}%`.padStart(4); // Safe: ASCII-only content
  return `${icon} ${displayName} ${bar} ${pct}  ${statusLabel}`;
}
