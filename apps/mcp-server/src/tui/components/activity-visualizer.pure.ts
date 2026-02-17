import type { ToolCallRecord } from '../dashboard-types';
import { truncateToDisplayWidth, padEndDisplayWidth } from '../utils/display-width';

export interface HeatmapData {
  agents: string[];
  tools: string[];
  matrix: number[][];
}

export function aggregateToolCalls(
  calls: ToolCallRecord[],
  maxAgents = 7,
  maxTools = 8,
): HeatmapData {
  if (calls.length === 0) return { agents: [], tools: [], matrix: [] };

  const agentToolMap = new Map<string, Map<string, number>>();
  const toolTotals = new Map<string, number>();
  const agentTotals = new Map<string, number>();

  for (const call of calls) {
    const agentMap = agentToolMap.get(call.agentId) ?? new Map<string, number>();
    agentMap.set(call.toolName, (agentMap.get(call.toolName) ?? 0) + 1);
    agentToolMap.set(call.agentId, agentMap);
    toolTotals.set(call.toolName, (toolTotals.get(call.toolName) ?? 0) + 1);
    agentTotals.set(call.agentId, (agentTotals.get(call.agentId) ?? 0) + 1);
  }

  const agents = [...agentTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxAgents)
    .map(e => e[0]);

  const tools = [...toolTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxTools)
    .map(e => e[0]);

  const matrix = agents.map(agent => {
    const agentMap = agentToolMap.get(agent)!;
    return tools.map(tool => agentMap.get(tool) ?? 0);
  });

  return { agents, tools, matrix };
}

const AGENT_NAME_WIDTH = 10;

export function getDensityChar(count: number): string {
  if (count <= 0) return '··';
  if (count <= 2) return '░░';
  if (count <= 5) return '▒▒';
  if (count <= 9) return '▓▓';
  return '██';
}

export function renderHeatmap(data: HeatmapData, width: number, height: number): string[] {
  if (data.agents.length === 0 || height <= 0 || width <= 0) return [];

  const header = truncateToDisplayWidth('🔥 Activity', width);
  const lines: string[] = [header];

  // Tool header row - fixed agent name col + tool columns
  const nameCol = padEndDisplayWidth('', AGENT_NAME_WIDTH);
  const toolHeaders = data.tools
    .map(t => padEndDisplayWidth(truncateToDisplayWidth(t, 6), 6))
    .join(' ');
  lines.push(truncateToDisplayWidth(`${nameCol} ${toolHeaders}`, width));

  for (const [i, agent] of data.agents.entries()) {
    if (lines.length >= height) break;
    const name = padEndDisplayWidth(
      truncateToDisplayWidth(agent, AGENT_NAME_WIDTH),
      AGENT_NAME_WIDTH,
    );
    const cells = data.matrix[i].map(c => getDensityChar(c)).join(' ');
    lines.push(truncateToDisplayWidth(`${name} ${cells}`, width));
  }

  return lines.slice(0, height);
}

const BUBBLE_ACTIVE_WINDOW_MS = 30_000;
const BUBBLE_HOT_WINDOW_MS = 5_000;
const MAX_BUBBLES = 5;

export function renderBubbles(
  calls: ToolCallRecord[],
  width: number,
  height: number,
  now?: number,
): string[] {
  const currentTime = now ?? Date.now();
  if (height <= 0 || width <= 0) return [];

  const toolGroups = new Map<string, { active: number; recent: boolean }>();
  for (const call of calls) {
    const isActive = call.status === 'active';
    // Treat recently completed calls (within 5s) as "hot" → shown like active
    const isHot =
      call.status === 'completed' && currentTime - call.timestamp < BUBBLE_HOT_WINDOW_MS;
    const isRecent =
      call.status === 'completed' &&
      currentTime - call.timestamp >= BUBBLE_HOT_WINDOW_MS &&
      currentTime - call.timestamp < BUBBLE_ACTIVE_WINDOW_MS;
    if (!isActive && !isHot && !isRecent) continue;

    const existing = toolGroups.get(call.toolName) ?? { active: 0, recent: false };
    if (isActive || isHot) existing.active++;
    if (isRecent) existing.recent = true;
    toolGroups.set(call.toolName, existing);
  }

  if (toolGroups.size === 0) return [];

  const sorted = [...toolGroups.entries()].sort((a, b) => b[1].active - a[1].active);

  const header = truncateToDisplayWidth('💬 Live', width);
  const lines: string[] = [header];
  for (const [toolName, info] of sorted) {
    if (lines.length >= height) break;
    const bubbleCount = Math.min(info.active, MAX_BUBBLES);
    const indicator = bubbleCount > 0 ? '◉'.repeat(bubbleCount) : '○';
    lines.push(truncateToDisplayWidth(`${indicator} ${toolName}`, width));
  }

  return lines.slice(0, height);
}
