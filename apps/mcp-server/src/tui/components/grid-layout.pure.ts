import type { LayoutMode, DashboardGrid } from '../dashboard-types';

/** Fixed heights for header and stageHealth sections (including borders). */
const HEADER_HEIGHT = 3;
const STAGE_HEALTH_HEIGHT = 3;

/** Fixed height for flowMap in narrow mode. */
const NARROW_FLOW_MAP_HEIGHT = 5;

/** Minimum terminal dimensions to prevent zero/negative regions. */
const MIN_ROWS = HEADER_HEIGHT + STAGE_HEALTH_HEIGHT + 2;
const MIN_COLUMNS = 20;

/** Fixed width for focusedAgent panel per layout mode (content-first right panel). */
const FOCUSED_AGENT_WIDTH: Record<Exclude<LayoutMode, 'narrow'>, number> = {
  wide: 63, // was 70 → -10% (FlowMap/Activity gains +7 cols)
  medium: 58, // was 64 → -9.4% (FlowMap/Activity gains +6 cols)
};

/**
 * Compute deterministic grid layout for all dashboard sections.
 *
 * Returns exact (x, y, width, height) for every section so that:
 * - No regions overlap
 * - No gaps (total area = sum of region areas)
 * - All regions have positive dimensions
 * - All regions fit within (columns x rows) bounds
 */
export function computeGridLayout(
  columns: number,
  rows: number,
  layoutMode: LayoutMode,
): DashboardGrid {
  const cols = Math.max(MIN_COLUMNS, columns);
  const r = Math.max(MIN_ROWS, rows);

  const header = { x: 0, y: 0, width: cols, height: HEADER_HEIGHT };
  const stageHealth = {
    x: 0,
    y: r - STAGE_HEALTH_HEIGHT,
    width: cols,
    height: STAGE_HEALTH_HEIGHT,
  };

  const mainY = HEADER_HEIGHT;
  const mainHeight = r - HEADER_HEIGHT - STAGE_HEALTH_HEIGHT;

  if (layoutMode === 'narrow') {
    const flowMapHeight = Math.min(NARROW_FLOW_MAP_HEIGHT, mainHeight - 1);
    const focusedHeight = mainHeight - flowMapHeight;

    return {
      header,
      focusedAgent: { x: 0, y: mainY, width: cols, height: focusedHeight },
      flowMap: { x: 0, y: mainY + focusedHeight, width: cols, height: flowMapHeight },
      monitorPanel: { x: 0, y: 0, width: 0, height: 0 },
      stageHealth,
      total: { width: cols, height: r },
    };
  }

  const focusedWidth = Math.min(FOCUSED_AGENT_WIDTH[layoutMode], cols - MIN_COLUMNS);
  const flowMapWidth = cols - focusedWidth;
  const flowMapHeight = Math.ceil(mainHeight / 2);
  const monitorHeight = mainHeight - flowMapHeight;

  return {
    header,
    flowMap: { x: 0, y: mainY, width: flowMapWidth, height: flowMapHeight },
    monitorPanel: { x: 0, y: mainY + flowMapHeight, width: flowMapWidth, height: monitorHeight },
    focusedAgent: { x: flowMapWidth, y: mainY, width: focusedWidth, height: mainHeight },
    stageHealth,
    total: { width: cols, height: r },
  };
}
