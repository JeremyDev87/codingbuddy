import type { GlobalRunState, LayoutMode } from '../dashboard-types';

/**
 * Represents a single session tab in the multi-session tab bar.
 */
export interface SessionTab {
  pid: number;
  /** 1-based index (used for keyboard shortcuts) */
  index: number;
  /** Last directory name extracted from projectRoot */
  projectName: string;
  globalState: GlobalRunState | 'DISCONNECTED';
  isActive: boolean;
}

const STATUS_ICONS: Record<GlobalRunState | 'DISCONNECTED', string> = {
  RUNNING: '●',
  IDLE: '○',
  ERROR: '✗',
  DISCONNECTED: '?',
};

/**
 * Format a single tab segment: `[index] name icon`
 */
function formatTab(tab: SessionTab, maxNameLen: number): string {
  let name = tab.projectName;
  const chars = Array.from(name);
  if (chars.length > maxNameLen && maxNameLen > 1) {
    name = chars.slice(0, maxNameLen - 1).join('') + '…';
  } else if (maxNameLen <= 1) {
    name = '…';
  }
  const icon = STATUS_ICONS[tab.globalState];
  return `[${tab.index}] ${name} ${icon}`;
}

/**
 * Calculate the overhead per tab (characters for `[i] ` prefix + ` X` suffix).
 * For index i: `[i] ` = i.toString().length + 3, ` X` = 2
 */
function tabOverhead(tab: SessionTab): number {
  return tab.index.toString().length + 3 + 2;
}

/**
 * Format session tabs as a string for the tab bar.
 *
 * - Returns empty string when tabs.length <= 1 (tab bar hidden for single session)
 * - In 'narrow' layout: shows compact counter like `(1/3)`
 * - In 'medium'/'wide' layout: shows full tabs like `[1] my-project ● [2] api-server ○`
 * - Truncates project names if they exceed available width
 */
export function formatSessionTabs(
  tabs: SessionTab[],
  maxWidth: number,
  layoutMode: LayoutMode,
): string {
  if (tabs.length <= 1) {
    return '';
  }

  if (layoutMode === 'narrow') {
    const active = tabs.find(t => t.isActive);
    const activeIndex = active ? active.index : 1;
    return `(${activeIndex}/${tabs.length})`;
  }

  // Wide/medium layout: full tab display
  // Calculate available space for project names
  const separatorWidth = tabs.length - 1; // spaces between tabs
  const totalOverhead = tabs.reduce((sum, t) => sum + tabOverhead(t), 0) + separatorWidth;
  const availableForNames = maxWidth - totalOverhead;
  const maxNameLen = Math.max(1, Math.floor(availableForNames / tabs.length));

  const segments = tabs.map(tab => formatTab(tab, maxNameLen));
  const result = segments.join(' ');

  // Final safety truncation
  if (result.length > maxWidth) {
    return result.slice(0, maxWidth);
  }

  return result;
}
