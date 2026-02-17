/**
 * Centralized Neon/Cyberpunk Theme for TUI Dashboard.
 *
 * All color mappings and style constants in one place for consistency.
 * Used by both ColorBuffer (FlowMap) and Ink-Native components.
 *
 * CellStyle is the single source of truth defined in color-buffer.ts
 * and re-exported here for convenience.
 */
import type { DashboardNodeStatus, GlobalRunState } from '../dashboard-types';
import type { Mode } from '../types';
import type { CellStyle } from './color-buffer';

export type { CellStyle };

/**
 * Core neon/cyberpunk color palette.
 */
export const NEON_COLORS = Object.freeze({
  primary: 'cyan',
  secondary: 'magenta',
  running: 'green',
  warning: 'yellow',
  error: 'red',
  done: 'green',
  inactive: 'gray',
  content: 'white',
} as const);

/**
 * Styles for agent/node status indicators.
 */
export const STATUS_STYLES: Readonly<Record<DashboardNodeStatus, CellStyle>> = Object.freeze({
  running: { fg: 'green', bold: true },
  idle: { fg: 'gray', dim: true },
  blocked: { fg: 'yellow' },
  error: { fg: 'red', bold: true },
  done: { fg: 'green' },
});

/**
 * Styles for mode labels in header pipeline (PLAN → ACT → EVAL → AUTO).
 */
export const MODE_LABEL_STYLES: Readonly<Record<Mode, CellStyle>> = Object.freeze({
  PLAN: { fg: 'cyan', bold: true },
  ACT: { fg: 'magenta', bold: true },
  EVAL: { fg: 'yellow', bold: true },
  AUTO: { fg: 'green', bold: true },
});

/**
 * Styles for stage labels in FlowMap columns.
 * Alias of MODE_LABEL_STYLES — stages use the same color scheme as modes.
 */
export const STAGE_LABEL_STYLES: Readonly<Record<Mode, CellStyle>> = MODE_LABEL_STYLES;

/**
 * Styles for edge rendering in FlowMap.
 */
export const EDGE_STYLES = Object.freeze({
  path: { fg: 'cyan', dim: true } as CellStyle,
  arrow: { fg: 'magenta', bold: true } as CellStyle,
  label: { fg: 'magenta' } as CellStyle,
});

/**
 * Style for section divider lines (─── Title ───).
 */
export const SECTION_DIVIDER_STYLE: CellStyle = Object.freeze({ fg: 'magenta' });

/**
 * Style for legend text at bottom of FlowMap.
 */
export const LEGEND_STYLE: CellStyle = Object.freeze({ fg: 'gray', dim: true });

/**
 * Styles for progress bar segments.
 */
export const PROGRESS_BAR_STYLES = Object.freeze({
  filled: { fg: 'magenta' } as CellStyle,
  empty: { fg: 'gray', dim: true } as CellStyle,
});

/**
 * Icons for agent/node status indicators.
 */
export const STATUS_ICONS: Readonly<Record<DashboardNodeStatus, string>> = Object.freeze({
  running: '●',
  idle: '○',
  blocked: '⏸',
  error: '!',
  done: '✓',
});

/**
 * Get style for a dashboard node status, with fallback.
 */
export function getStatusStyle(status: DashboardNodeStatus): CellStyle {
  return STATUS_STYLES[status] ?? STATUS_STYLES.idle;
}

/**
 * Get style for a mode label, optionally dimmed when inactive.
 */
export function getModeLabelStyle(mode: Mode, active?: boolean): CellStyle {
  const base = MODE_LABEL_STYLES[mode] ?? MODE_LABEL_STYLES.PLAN;
  if (active === false) {
    return { fg: base.fg, dim: true };
  }
  return base;
}

/**
 * Get style for a stage label in FlowMap.
 */
export function getStageLabelStyle(stage: Mode): CellStyle {
  return STAGE_LABEL_STYLES[stage] ?? STAGE_LABEL_STYLES.PLAN;
}

// ─── Ink-Native Component Helpers ──────────────────────────────
// These return plain strings for use with Ink <Text color={...}> props.

/**
 * Icons for global run state (RUNNING/IDLE/ERROR).
 */
export const GLOBAL_STATE_ICONS: Readonly<Record<GlobalRunState, string>> = Object.freeze({
  RUNNING: '●',
  IDLE: '○',
  ERROR: '!',
});

/**
 * Colors for global run state (RUNNING/IDLE/ERROR).
 */
export const GLOBAL_STATE_COLORS: Readonly<Record<GlobalRunState, string>> = Object.freeze({
  RUNNING: 'green',
  IDLE: 'gray',
  ERROR: 'red',
});

/**
 * Get plain color string for a dashboard node status.
 */
export function getNodeStatusColor(status: DashboardNodeStatus): string {
  return STATUS_STYLES[status]?.fg ?? 'gray';
}

/**
 * Get plain color string for a mode label.
 */
export function getModeColor(mode: Mode): string {
  return MODE_LABEL_STYLES[mode]?.fg ?? 'cyan';
}
