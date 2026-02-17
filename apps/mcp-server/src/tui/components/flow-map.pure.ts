import { CharBuffer } from '../utils/char-buffer';
import { computeEdgePath, computeLabelPosition, type Point } from '../utils/edge-router';
import type { DashboardNode, DashboardNodeStatus, Edge } from '../dashboard-types';
import type { Mode } from '../../keyword/keyword.types';

const NODE_WIDTH = 17;
const NODE_HEIGHT = 3;
const STAGE_ORDER: Mode[] = ['PLAN', 'ACT', 'EVAL', 'AUTO'];

const STATUS_ICONS: Record<DashboardNodeStatus, string> = {
  running: '●',
  idle: '○',
  blocked: '⏸',
  error: '!',
  done: '✓',
};

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
 * Reusable across all rendering modes.
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
 * Spread + sort is acceptable: agent count per stage is small (< 10 in practice).
 */
function sortAgents(agents: DashboardNode[]): DashboardNode[] {
  return [...agents].sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Divide total width into stage columns.
 * Uses 4 columns when AUTO agents are present, 3 otherwise.
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
 * Primary agents are placed first.
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
    const startY = 2; // Leave room for stage label
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
 * Wide mode (120+): Full boxes + arrows + labels + legend
 */
export function renderFlowMap(
  agents: Map<string, DashboardNode>,
  edges: Edge[],
  width: number,
  height: number,
): string {
  let hasAutoAgents = false;
  for (const a of agents.values()) {
    if (a.stage === 'AUTO') {
      hasAutoAgents = true;
      break;
    }
  }
  const buf = new CharBuffer(width, height);
  const columns = layoutStageColumns(width, hasAutoAgents);
  const positions = layoutAgentNodes(agents, columns);

  // Draw stage labels (skip AUTO in 3-column mode to avoid overwriting PLAN)
  const stagesToDraw = hasAutoAgents ? STAGE_ORDER : STAGE_ORDER.filter(s => s !== 'AUTO');
  for (const stage of stagesToDraw) {
    const col = columns[stage];
    buf.writeText(col.startX + 1, 0, stage);
  }

  // Draw agent boxes
  for (const [id, pos] of positions) {
    const agent = agents.get(id);
    if (!agent) continue;

    buf.drawBox(pos.x, pos.y, pos.width, pos.height);
    const icon = STATUS_ICONS[agent.status];
    const nameStr =
      agent.name.length > pos.width - 5 ? agent.name.slice(0, pos.width - 8) + '...' : agent.name;
    buf.writeText(pos.x + 2, pos.y + 1, `${nameStr} ${icon}`);
  }

  // Draw edges
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
      buf.setChar(seg.x, seg.y, seg.char);
    }

    // Label
    const labelPos = computeLabelPosition(path, edge.label);
    if (labelPos) {
      buf.writeText(labelPos.x, labelPos.y - 1, edge.label);
    }
  }

  // Legend at bottom
  const legendY = height - 1;
  buf.writeText(1, legendY, 'Legend: ● running  ○ idle  ⏸ blocked  ! error  ✓ done');

  return buf.toString();
}

/**
 * Medium mode (80-119): Boxes grouped by stage, no arrows.
 */
export function renderFlowMapSimplified(
  agents: Map<string, DashboardNode>,
  width: number,
  height: number,
): string {
  const buf = new CharBuffer(width, height);
  const byStage = groupByStage(agents);

  let y = 0;
  for (const stage of STAGE_ORDER) {
    const stageAgents = byStage.get(stage);
    if (!stageAgents || stageAgents.length === 0) continue;

    buf.writeText(1, y, stage);
    y++;

    for (const agent of stageAgents) {
      if (y >= height - 1) break;
      const boxW = Math.min(width - 2, NODE_WIDTH);
      buf.drawBox(1, y, boxW, NODE_HEIGHT);
      const icon = STATUS_ICONS[agent.status];
      const nameStr =
        agent.name.length > boxW - 5 ? agent.name.slice(0, boxW - 8) + '...' : agent.name;
      buf.writeText(3, y + 1, `${nameStr} ${icon}`);
      y += NODE_HEIGHT + 1;
    }
  }

  return buf.toString();
}

/**
 * Narrow mode (<80): Flat list: "● AgentName (STAGE)"
 * Uses single-pass grouping instead of per-stage filtering.
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
