import type { Mode } from '../types';
import type { LayoutMode, GlobalRunState } from '../dashboard-types';

export interface HeaderBarData {
  workspace: string;
  sessionId: string;
  currentMode: Mode | null;
  globalState: GlobalRunState;
}

const STATE_ICONS: Record<GlobalRunState, string> = {
  RUNNING: '●',
  IDLE: '○',
  ERROR: '!',
};

/**
 * Format time from Date object to HH:MM string.
 * (Moved from old header.pure.ts for use-clock.ts compatibility)
 */
export function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Format the header bar content based on layout mode.
 *
 * Wide/Medium: Two lines with full info
 * Narrow: Single line with title + mode + state only
 */
export function formatHeaderBar(
  data: HeaderBarData,
  width: number,
  layoutMode: LayoutMode,
): string {
  const title = 'Codingbuddy TUI / Agent Dashboard';
  const PROCESS_MODES: Mode[] = ['PLAN', 'ACT', 'EVAL'];
  const isAutoMode = data.currentMode === 'AUTO';

  const processFlow = PROCESS_MODES.map(m =>
    !isAutoMode && m === data.currentMode ? `[${m}]` : m,
  ).join(' → ');
  const modeStr = isAutoMode ? `${processFlow} [AUTO]` : processFlow;
  const stateStr = `${data.globalState} ${STATE_ICONS[data.globalState]}`;

  if (layoutMode === 'narrow') {
    // Narrow: title + mode + state (no workspace/session)
    const line = `${title}  ${modeStr}  ${stateStr}`;
    return line.length > width ? line.slice(0, width) : line;
  }

  // Wide/Medium: two lines
  const line1 = title;

  const sessionPart = `Session: ${data.sessionId}`;
  const modePart = `Mode: ${modeStr}`;
  const statePart = `State: ${stateStr}`;

  const separator = '   ';
  const fixedParts = `${sessionPart}${separator}${modePart}${separator}${statePart}`;
  const wsPrefix = 'Workspace: ';
  const fullLine2 = `${wsPrefix}${data.workspace}${separator}${fixedParts}`;

  let line2: string;
  if (fullLine2.length <= width) {
    line2 = fullLine2;
  } else {
    const maxWsLen = width - wsPrefix.length - separator.length - fixedParts.length;
    if (maxWsLen > 10) {
      const truncatedWs =
        data.workspace.length > maxWsLen
          ? data.workspace.slice(0, maxWsLen - 3) + '...'
          : data.workspace;
      line2 = `${wsPrefix}${truncatedWs}${separator}${fixedParts}`;
    } else {
      line2 = `${modePart}${separator}${statePart}`;
    }
  }

  // Final safety: hard truncate
  if (line2.length > width) {
    line2 = line2.slice(0, width);
  }

  return `${line1}\n${line2}`;
}
