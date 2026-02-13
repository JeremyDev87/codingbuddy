import type { AgentStatus } from '../types';
import { getStatusColor } from '../utils/colors';

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

export function abbreviateName(name: string, maxLength: number): string {
  if (maxLength <= 0) return '';
  if (name.length <= maxLength) return name;
  return name.slice(0, maxLength - 1) + ELLIPSIS;
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

export function getCardBorderColor(status: AgentStatus): string {
  return getStatusColor(status);
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
