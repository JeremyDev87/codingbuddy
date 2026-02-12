import type { Mode } from '../types';

export const MODE_INDICATOR = '●';

export function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function buildModeIndicator(mode: Mode): string {
  return `${MODE_INDICATOR} ${mode}`;
}
