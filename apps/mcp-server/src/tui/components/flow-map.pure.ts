import { ColorBuffer, type CellStyle } from '../utils/color-buffer';
import { computeEdgePath, computeLabelPosition, type Point } from '../utils/edge-router';
import {
  STAGE_LABEL_STYLES,
  STATUS_STYLES,
  STATUS_ICONS,
  EDGE_STYLES,
  PIPELINE_STYLES,
  PROGRESS_BAR_CHARS,
  PROGRESS_BAR_STYLES,
  GLOW_STYLE,
  getStatusStyle,
} from '../utils/theme';
import type { DashboardNode, DashboardNodeStatus, Edge } from '../dashboard-types';
import type { Mode } from '../types';

const NODE_WIDTH = 17;
const NODE_HEIGHT = 4;

const PARALLEL_STYLES = {
  parallel: { fg: 'cyan' as const }, // 파랑 — 병렬 실행
  single: { fg: 'gray' as const }, // 회색 — 단일 실행
} as const;
const STAGE_ORDER: Mode[] = ['PLAN', 'ACT', 'EVAL', 'AUTO'];
// ▸ (2) + label (4) + stats " (99↑ 99✓)" (11) + spacing (1) = 18
const STAGE_SLOT_WIDTH = 18;
const PIPELINE_RIGHT_MARGIN = 10;

/** Shared dim style for inactive stage rendering. */
const DIMMED_STYLE: CellStyle = { dim: true };

interface StageColumn {
  startX: number;
  width: number;
  label: Mode;
}

interface NodePosition {
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
    const startY = 3; // accounts for 2-row pipeline header
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
 * Get the node text style based on agent status.
 */
function getNodeTextStyle(status: DashboardNodeStatus): CellStyle {
  if (status === 'running') return { fg: 'white', bold: true };
  return { dim: true };
}

/**
 * Draw an agent node box with name, status icon, and progress bar.
 * @param dimmed - When true, renders the node with dim style (inactive stage column)
 */
function drawAgentNode(
  buf: ColorBuffer,
  x: number,
  y: number,
  boxW: number,
  agent: DashboardNode,
  dimmed = false,
): void {
  const borderStyle = dimmed ? DIMMED_STYLE : getStatusStyle(agent.status);

  if (agent.isPrimary) {
    buf.drawDoubleBox(x, y, boxW, NODE_HEIGHT, borderStyle);
  } else {
    buf.drawRoundBox(x, y, boxW, NODE_HEIGHT, borderStyle);
  }

  // Agent name + status icon (row 1)
  const icon = STATUS_ICONS[agent.status];
  const maxNameLen = Math.max(1, boxW - 5);
  const nameStr =
    agent.name.length > maxNameLen ? agent.name.slice(0, maxNameLen - 3) + '...' : agent.name;
  const textStyle = dimmed ? DIMMED_STYLE : getNodeTextStyle(agent.status);
  const iconStyle = dimmed ? DIMMED_STYLE : STATUS_STYLES[agent.status];
  buf.writeText(x + 2, y + 1, nameStr, textStyle);
  buf.writeText(x + 2 + nameStr.length + 1, y + 1, icon, iconStyle);

  // Row 2: progress bar (Primary) OR execution mode indicator (Specialist)
  if (agent.isPrimary) {
    // Primary: progress bar 유지
    const barWidth = boxW - 4;
    const bar = buildProgressBar(agent.progress, barWidth);
    const filledStr = PROGRESS_BAR_CHARS.filled.repeat(bar.filled);
    const emptyStr = PROGRESS_BAR_CHARS.empty.repeat(bar.empty);
    const filledStyle = dimmed ? DIMMED_STYLE : PROGRESS_BAR_STYLES.filled;
    const emptyStyle = dimmed ? DIMMED_STYLE : PROGRESS_BAR_STYLES.empty;
    buf.writeText(x + 2, y + 2, filledStr, filledStyle);
    if (bar.empty > 0) {
      buf.writeText(x + 2 + bar.filled, y + 2, emptyStr, emptyStyle);
    }
  } else if (agent.isParallel) {
    // Parallel Specialist: ⫸ parallel 표시
    buf.writeText(x + 2, y + 2, '⫸ parallel', dimmed ? DIMMED_STYLE : PARALLEL_STYLES.parallel);
  } else {
    // Single Specialist: → single 표시
    buf.writeText(x + 2, y + 2, '→ single', dimmed ? DIMMED_STYLE : PARALLEL_STYLES.single);
  }
}

/**
 * Compute progress bar segments.
 */
export function buildProgressBar(
  value: number,
  barWidth: number,
): { filled: number; empty: number; label: string } {
  const clamped = Math.max(0, Math.min(100, value));
  const filled = Math.round((clamped / 100) * barWidth);
  const empty = barWidth - filled;
  const label = clamped === 100 ? '100' : clamped.toString().padStart(2, ' ') + '%';
  return { filled, empty, label };
}

/**
 * Draw glow effect (░ border) around a region.
 */
function drawGlow(
  buf: ColorBuffer,
  x: number,
  y: number,
  w: number,
  h: number,
  style: CellStyle,
): void {
  // Top glow row
  for (let i = x - 1; i <= x + w; i++) {
    buf.setChar(i, y - 1, '░', style);
  }
  // Bottom glow row
  for (let i = x - 1; i <= x + w; i++) {
    buf.setChar(i, y + h, '░', style);
  }
  // Left and right glow columns
  for (let j = y - 1; j <= y + h; j++) {
    buf.setChar(x - 1, j, '░', style);
    buf.setChar(x + w, j, '░', style);
  }
}

/**
 * Count agents by status for the counter legend.
 */
function countByStatus(agents: Map<string, DashboardNode>): Record<DashboardNodeStatus, number> {
  const counts: Record<DashboardNodeStatus, number> = {
    running: 0,
    idle: 0,
    blocked: 0,
    error: 0,
    done: 0,
  };
  for (const agent of agents.values()) {
    counts[agent.status]++;
  }
  return counts;
}

/**
 * Count running and done agents for a specific stage.
 */
function countStageRunningDone(
  agents: Map<string, DashboardNode>,
  stage: Mode,
): { running: number; done: number } {
  let running = 0;
  let done = 0;
  for (const agent of agents.values()) {
    if (agent.stage !== stage) continue;
    if (agent.status === 'running') running++;
    else if (agent.status === 'done') done++;
  }
  return { running, done };
}

/**
 * Render pipeline header: ▸ PLAN ═══▸ ACT ═══▸ EVAL [═══▸ AUTO]
 */
export function renderPipelineHeader(
  buf: ColorBuffer,
  width: number,
  activeStage: Mode | null,
  hasAutoAgents = false,
  agents?: Map<string, DashboardNode>,
): void {
  const stages = hasAutoAgents ? STAGE_ORDER : STAGE_ORDER.filter(s => s !== 'AUTO');

  let x = 1;
  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    const isActive = stage === activeStage;
    const stageStyle: CellStyle = isActive
      ? STAGE_LABEL_STYLES[stage]
      : { fg: STAGE_LABEL_STYLES[stage].fg, dim: true };

    // Arrow before stage name
    buf.setChar(x, 0, '▸', isActive ? PIPELINE_STYLES.arrow : PIPELINE_STYLES.connector);
    x += 2;

    // Stage name
    buf.writeText(x, 0, stage, stageStyle);
    x += stage.length;

    // Per-stage stats
    if (agents && agents.size > 0) {
      const { running, done } = countStageRunningDone(agents, stage);
      if (running > 0 || done > 0) {
        const parts: string[] = [];
        if (running > 0) parts.push(`${running}↑`);
        if (done > 0) parts.push(`${done}✓`);
        const statsStr = ` (${parts.join(' ')})`;
        buf.writeText(x, 0, statsStr, { fg: 'gray', dim: !isActive });
        x += statsStr.length;
      }
    }

    // Connector to next stage
    if (i < stages.length - 1) {
      x += 1;
      const connLen = Math.max(
        3,
        Math.floor((width - stages.length * STAGE_SLOT_WIDTH) / (stages.length - 1)),
      );
      const safeLen = Math.max(0, Math.min(connLen, width - x - PIPELINE_RIGHT_MARGIN));
      for (let j = 0; j < safeLen; j++) {
        buf.setChar(x + j, 0, '═', PIPELINE_STYLES.connector);
      }
      x += safeLen;
    }
  }

  // Decorative underline
  buf.drawHLine(1, 1, width - 2, '┄', { fg: 'gray', dim: true });
}

/**
 * Wide mode (120+): Full enhanced visualization.
 * Features: pipeline header, visual hierarchy, progress bars,
 * glow effects, smooth edges, counter legend.
 */
export function renderFlowMap(
  agents: Map<string, DashboardNode>,
  edges: Edge[],
  width: number,
  height: number,
  activeStage: Mode | null = null,
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

  // 1. Pipeline header (replaces flat stage labels)
  renderPipelineHeader(buf, width, activeStage, hasAutoAgents, agents);

  // Pre-compute inactive agent IDs (avoids repeated checks in each loop)
  const inactiveIds =
    activeStage !== null
      ? new Set([...agents.values()].filter(a => a.stage !== activeStage).map(a => a.id))
      : new Set<string>();

  // 2. Draw glow effect for running primary agents (before boxes, so boxes draw on top)
  for (const [id, pos] of positions) {
    const agent = agents.get(id);
    if (!agent) continue;
    if (agent.status === 'running' && agent.isPrimary && !inactiveIds.has(id)) {
      drawGlow(buf, pos.x, pos.y, pos.width, pos.height, GLOW_STYLE);
    }
  }

  // 3. Draw agent boxes with visual hierarchy
  for (const [id, pos] of positions) {
    const agent = agents.get(id);
    if (!agent) continue;
    drawAgentNode(buf, pos.x, pos.y, pos.width, agent, inactiveIds.has(id));
  }

  // 4. Draw edges with smooth curves
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
    const edgeDimmed = inactiveIds.has(edge.from) && inactiveIds.has(edge.to);
    for (const seg of path) {
      const isArrow = seg.char === '▸' || seg.char === '◂' || seg.char === '▾' || seg.char === '▴';
      const segStyle = edgeDimmed ? DIMMED_STYLE : isArrow ? EDGE_STYLES.arrow : EDGE_STYLES.path;
      buf.setChar(seg.x, seg.y, seg.char, segStyle);
    }

    // Edge label
    const labelPos = computeLabelPosition(path, edge.label);
    if (labelPos) {
      buf.writeText(
        labelPos.x,
        labelPos.y - 1,
        edge.label,
        edgeDimmed ? DIMMED_STYLE : EDGE_STYLES.label,
      );
    }
  }

  // 5. Real-time counter legend
  const counts = countByStatus(agents);
  const legendY = height - 1;
  let lx = 1;
  const legendParts: Array<{ text: string; style: CellStyle }> = [
    { text: `● ${counts.running} active`, style: STATUS_STYLES.running },
    { text: `  ○ ${counts.idle} idle`, style: STATUS_STYLES.idle },
    { text: `  ⏸ ${counts.blocked} blocked`, style: STATUS_STYLES.blocked },
    { text: `  ! ${counts.error} error`, style: STATUS_STYLES.error },
    { text: `  ✓ ${counts.done} done`, style: STATUS_STYLES.done },
  ];
  for (const part of legendParts) {
    buf.writeText(lx, legendY, part.text, part.style);
    lx += part.text.length;
  }

  return buf;
}

/**
 * Medium mode (80-119): Boxes grouped by stage, no arrows.
 * Returns ColorBuffer with visual hierarchy and progress bars.
 */
export function renderFlowMapSimplified(
  agents: Map<string, DashboardNode>,
  width: number,
  height: number,
  activeStage: Mode | null = null,
): ColorBuffer {
  const buf = new ColorBuffer(width, height);
  const byStage = groupByStage(agents);

  let y = 0;
  for (const stage of STAGE_ORDER) {
    const stageAgents = byStage.get(stage);
    if (!stageAgents || stageAgents.length === 0) continue;

    const isInactiveStage = activeStage !== null && stage !== activeStage;
    const stageLabelStyle = isInactiveStage
      ? { fg: STAGE_LABEL_STYLES[stage].fg, dim: true }
      : STAGE_LABEL_STYLES[stage];
    buf.writeText(1, y, stage, stageLabelStyle);
    y++;

    const sorted = sortAgents(stageAgents);
    for (const agent of sorted) {
      if (y >= height - 1) break;
      const boxW = Math.min(width - 2, NODE_WIDTH);
      drawAgentNode(buf, 1, y, boxW, agent, isInactiveStage);
      y += NODE_HEIGHT + 1;
    }
  }

  return buf;
}

/**
 * Narrow mode (<80): Enhanced flat list with primary markers and progress.
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
      const star = agent.isPrimary ? '★ ' : '';
      const progress = agent.progress > 0 ? ` ${agent.progress}%` : '';
      lines.push(`${icon} ${star}${agent.name} (${stage})${progress}`);
    }
  }

  return lines.join('\n');
}
