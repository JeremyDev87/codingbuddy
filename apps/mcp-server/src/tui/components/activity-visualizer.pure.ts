import type { ToolCallRecord } from '../dashboard-types';
import type { Mode } from '../types';
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

const LIVE_HOT_WINDOW_MS = 5_000;
const LIVE_RECENT_WINDOW_MS = 30_000;
const LIVE_HOT_SEC = LIVE_HOT_WINDOW_MS / 1000;
const LIVE_RECENT_SEC = LIVE_RECENT_WINDOW_MS / 1000;

export function renderLiveContext(
  calls: ToolCallRecord[],
  currentMode: Mode | null,
  width: number,
  height: number,
  now?: number,
): string[] {
  const currentTime = now ?? Date.now();
  if (height <= 0 || width <= 0) return [];

  const lines: string[] = [truncateToDisplayWidth('💬 Live', width)];

  if (currentMode) {
    lines.push(truncateToDisplayWidth(`⟫ Mode: ${currentMode}`, width));
  }

  const maxItems = height - lines.length;
  const seen = new Set<string>();

  for (let i = calls.length - 1; i >= 0 && seen.size < maxItems; i--) {
    const call = calls[i];
    if (call.status === 'error') continue;
    if (seen.has(call.toolName)) continue;
    seen.add(call.toolName);

    const ageSec = Math.floor((currentTime - call.timestamp) / 1000);
    const ageIndicator = ageSec < LIVE_HOT_SEC ? '◉' : ageSec < LIVE_RECENT_SEC ? '○' : '·';
    const agent =
      call.agentId !== 'unknown'
        ? truncateToDisplayWidth(call.agentId, AGENT_NAME_WIDTH) + ' '
        : '';
    lines.push(truncateToDisplayWidth(`${ageIndicator} ${agent}${call.toolName}`, width));
  }

  return lines.slice(0, height);
}
