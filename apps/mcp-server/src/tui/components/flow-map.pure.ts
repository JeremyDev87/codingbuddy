import { ColorBuffer, type CellStyle } from '../utils/color-buffer';
import { computeEdgePath, computeLabelPosition, type Point } from '../utils/edge-router';
import {
  STAGE_LABEL_STYLES,
  STATUS_STYLES,
  STATUS_ICONS,
  EDGE_STYLES,
  LEGEND_STYLE,
} from '../utils/theme';
import type { DashboardNode, DashboardNodeStatus, Edge } from '../dashboard-types';
import type { Mode } from '../types';

const NODE_WIDTH = 17;
const NODE_HEIGHT = 3;
const STAGE_ORDER: Mode[] = ['PLAN', 'ACT', 'EVAL', 'AUTO'];

export interface StageColumn {
  startX: number;
  width: number;
  label: Mode;
}

export interface NodePosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Group agents by stage, returning a Map sorted by STAGE_ORDER.
 */
function groupByStage(agents: Map<string, DashboardNode>): Map<Mode, DashboardNode[]> {
  const byStage = new Map<Mode, DashboardNode[]>();
  for (const agent of agents.values()) {
    const list = byStage.get(agent.stage) ?? [];
    list.push(agent);
    byStage.set(agent.stage, list);
  }
  return byStage;
}

/**
 * Sort agents: primary first, then by name.
 */
function sortAgents(agents: DashboardNode[]): DashboardNode[] {
  return [...agents].sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Divide total width into stage columns.
 */
export function layoutStageColumns(
  totalWidth: number,
  hasAutoAgents = false,
): Record<Mode, StageColumn> {
  if (hasAutoAgents) {
    const colWidth = Math.floor(totalWidth / 4);
    return {
      PLAN: { startX: 0, width: colWidth, label: 'PLAN' },
      ACT: { startX: colWidth, width: colWidth, label: 'ACT' },
      EVAL: { startX: colWidth * 2, width: colWidth, label: 'EVAL' },
      AUTO: { startX: colWidth * 3, width: totalWidth - colWidth * 3, label: 'AUTO' },
    };
  }
  const colWidth = Math.floor(totalWidth / 3);
  return {
    PLAN: { startX: 0, width: colWidth, label: 'PLAN' },
    ACT: { startX: colWidth, width: colWidth, label: 'ACT' },
    EVAL: {
      startX: colWidth * 2,
      width: totalWidth - colWidth * 2,
      label: 'EVAL',
    },
    AUTO: { startX: 0, width: totalWidth, label: 'AUTO' },
  };
}

/**
 * Position agents vertically within their stage column.
 */
export function layoutAgentNodes(
  agents: Map<string, DashboardNode>,
  columns: Record<Mode, StageColumn>,
): Map<string, NodePosition> {
  const positions = new Map<string, NodePosition>();
  const byStage = groupByStage(agents);

  for (const [stage, stageAgents] of byStage) {
    const col = columns[stage];
    if (!col) continue;

    const sorted = sortAgents(stageAgents);
    const startY = 2;
    sorted.forEach((agent, idx) => {
      positions.set(agent.id, {
        x: col.startX + Math.floor((col.width - NODE_WIDTH) / 2),
        y: startY + idx * (NODE_HEIGHT + 1),
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      });
    });
  }

  return positions;
}

/**
 * Get the node border style based on agent status.
 */
function getNodeBorderStyle(status: DashboardNodeStatus): CellStyle {
  return STATUS_STYLES[status] ?? STATUS_STYLES.idle;
}

/**
 * Get the node text style based on agent status.
 */
function getNodeTextStyle(status: DashboardNodeStatus): CellStyle {
  if (status === 'running') return { fg: 'white', bold: true };
  return { dim: true };
}

/**
 * Wide mode (120+): Full boxes + arrows + labels + legend.
 * Returns ColorBuffer for colored rendering.
 */
export function renderFlowMap(
  agents: Map<string, DashboardNode>,
  edges: Edge[],
  width: number,
  height: number,
): ColorBuffer {
  let hasAutoAgents = false;
  for (const a of agents.values()) {
    if (a.stage === 'AUTO') {
      hasAutoAgents = true;
      break;
    }
  }
  const buf = new ColorBuffer(width, height);
  const columns = layoutStageColumns(width, hasAutoAgents);
  const positions = layoutAgentNodes(agents, columns);

  // Draw stage labels with neon colors
  const stagesToDraw = hasAutoAgents ? STAGE_ORDER : STAGE_ORDER.filter(s => s !== 'AUTO');
  for (const stage of stagesToDraw) {
    const col = columns[stage];
    const style = STAGE_LABEL_STYLES[stage];
    buf.writeText(col.startX + 1, 0, stage, style);
  }

  // Draw agent boxes with status-colored borders
  for (const [id, pos] of positions) {
    const agent = agents.get(id);
    if (!agent) continue;

    const borderStyle = getNodeBorderStyle(agent.status);
    buf.drawBox(pos.x, pos.y, pos.width, pos.height, borderStyle);

    const icon = STATUS_ICONS[agent.status];
    const nameStr =
      agent.name.length > pos.width - 5 ? agent.name.slice(0, pos.width - 8) + '...' : agent.name;
    const textStyle = getNodeTextStyle(agent.status);
    buf.writeText(pos.x + 2, pos.y + 1, nameStr, textStyle);
    buf.writeText(pos.x + 2 + nameStr.length + 1, pos.y + 1, icon, STATUS_STYLES[agent.status]);
  }

  // Draw edges with neon colors
  for (const edge of edges) {
    const fromPos = positions.get(edge.from);
    const toPos = positions.get(edge.to);
    if (!fromPos || !toPos) continue;

    const fromPoint: Point = {
      x: fromPos.x + fromPos.width,
      y: fromPos.y + Math.floor(fromPos.height / 2),
    };
    const toPoint: Point = {
      x: toPos.x - 1,
      y: toPos.y + Math.floor(toPos.height / 2),
    };

    const path = computeEdgePath(fromPoint, toPoint);
    for (const seg of path) {
      const isArrow = seg.char === '>' || seg.char === '<';
      buf.setChar(seg.x, seg.y, seg.char, isArrow ? EDGE_STYLES.arrow : EDGE_STYLES.path);
    }

    // Edge label
    const labelPos = computeLabelPosition(path, edge.label);
    if (labelPos) {
      buf.writeText(labelPos.x, labelPos.y - 1, edge.label, EDGE_STYLES.label);
    }
  }

  // Legend at bottom
  const legendY = height - 1;
  buf.writeText(1, legendY, 'Legend: ● running  ○ idle  ⏸ blocked  ! error  ✓ done', LEGEND_STYLE);

  return buf;
}

/**
 * Medium mode (80-119): Boxes grouped by stage, no arrows.
 * Returns ColorBuffer.
 */
export function renderFlowMapSimplified(
  agents: Map<string, DashboardNode>,
  width: number,
  height: number,
): ColorBuffer {
  const buf = new ColorBuffer(width, height);
  const byStage = groupByStage(agents);

  let y = 0;
  for (const stage of STAGE_ORDER) {
    const stageAgents = byStage.get(stage);
    if (!stageAgents || stageAgents.length === 0) continue;

    buf.writeText(1, y, stage, STAGE_LABEL_STYLES[stage]);
    y++;

    for (const agent of stageAgents) {
      if (y >= height - 1) break;
      const boxW = Math.min(width - 2, NODE_WIDTH);
      const borderStyle = getNodeBorderStyle(agent.status);
      buf.drawBox(1, y, boxW, NODE_HEIGHT, borderStyle);
      const icon = STATUS_ICONS[agent.status];
      const nameStr =
        agent.name.length > boxW - 5 ? agent.name.slice(0, boxW - 8) + '...' : agent.name;
      buf.writeText(3, y + 1, nameStr, getNodeTextStyle(agent.status));
      buf.writeText(3 + nameStr.length + 1, y + 1, icon, STATUS_STYLES[agent.status]);
      y += NODE_HEIGHT + 1;
    }
  }

  return buf;
}

/**
 * Narrow mode (<80): Flat list: "● AgentName (STAGE)"
 * Returns plain string (no buffer needed).
 */
export function renderFlowMapCompact(agents: Map<string, DashboardNode>): string {
  const lines: string[] = [];
  const byStage = groupByStage(agents);

  for (const stage of STAGE_ORDER) {
    const stageAgents = byStage.get(stage);
    if (!stageAgents) continue;

    const sorted = sortAgents(stageAgents);
    for (const agent of sorted) {
      const icon = STATUS_ICONS[agent.status];
      lines.push(`${icon} ${agent.name} (${stage})`);
    }
  }

  return lines.join('\n');
}
