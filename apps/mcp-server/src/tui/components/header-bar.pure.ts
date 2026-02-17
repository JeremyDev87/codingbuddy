import type { Mode } from '../../keyword/keyword.types';
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
  const ALL_MODES: Mode[] = ['PLAN', 'ACT', 'EVAL', 'AUTO'];
  const modeStr = data.currentMode
    ? ALL_MODES.map(m => (m === data.currentMode ? `[${m}]` : m)).join(' → ')
    : ALL_MODES.slice(0, 3).join(' → ');
  const stateStr = `${data.globalState} ${STATE_ICONS[data.globalState]}`;

  if (layoutMode === 'narrow') {
    // Narrow: title + mode + state (no workspace/session)
    const line = `${title}  ${modeStr}  ${stateStr}`;
    return line.length > width ? line.slice(0, width) : line;
  }

  // Wide/Medium: two lines
  const line1 = title;

  const workspacePart = `Workspace: ${data.workspace}`;
  const sessionPart = `Session: ${data.sessionId}`;
  const modePart = `Mode: ${modeStr}`;
  const statePart = `State: ${stateStr}`;

  let line2 = `${workspacePart}   ${sessionPart}   ${modePart}   ${statePart}`;

  // Truncate workspace if line2 exceeds width
  if (line2.length > width) {
    const maxWorkspace = width - sessionPart.length - modePart.length - statePart.length - 15;
    if (maxWorkspace > 10) {
      const truncatedWs =
        data.workspace.length > maxWorkspace
          ? data.workspace.slice(0, maxWorkspace - 3) + '...'
          : data.workspace;
      line2 = `Workspace: ${truncatedWs}   ${sessionPart}   ${modePart}   ${statePart}`;
    } else {
      line2 = `${modePart}   ${statePart}`;
    }
  }

  return `${line1}\n${line2}`;
}
