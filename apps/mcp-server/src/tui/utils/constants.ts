import type { Mode } from '../types';

export const MODE_COLORS: Readonly<Record<Mode, string>> = Object.freeze({
  PLAN: 'blue',
  ACT: 'green',
  EVAL: 'yellow',
  AUTO: 'magenta',
});

const DEFAULT_MODE_COLOR = 'blue';

export function getModeColor(mode: string): string {
  return MODE_COLORS[mode as Mode] ?? DEFAULT_MODE_COLOR;
}
