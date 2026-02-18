import type { ToolCallRecord } from '../dashboard-types';
import type { Mode } from '../types';
import { truncateToDisplayWidth, padEndDisplayWidth } from '../utils/display-width';

export interface BarChartItem {
  tool: string;
  count: number;
}

export function aggregateForBarChart(calls: ToolCallRecord[], maxTools = 10): BarChartItem[] {
  if (calls.length === 0) return [];

  const toolCounts = new Map<string, number>();
  for (const call of calls) {
    toolCounts.set(call.toolName, (toolCounts.get(call.toolName) ?? 0) + 1);
  }

  return [...toolCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxTools)
    .map(([tool, count]) => ({ tool, count }));
}

const TOOL_NAME_WIDTH = 12;
const BAR_FIXED_OVERHEAD = TOOL_NAME_WIDTH + 2 + 2 + 4; // "name [bar] cnt"

export function renderBarChart(data: BarChartItem[], width: number, height: number): string[] {
  if (data.length === 0 || height <= 0 || width <= 0) return [];

  const lines: string[] = [truncateToDisplayWidth('📊 Activity', width)];

  const barWidth = Math.max(1, width - BAR_FIXED_OVERHEAD);
  const maxCount = data[0]?.count || 1;

  for (const item of data) {
    if (lines.length >= height) break;

    const name = padEndDisplayWidth(
      truncateToDisplayWidth(item.tool, TOOL_NAME_WIDTH),
      TOOL_NAME_WIDTH,
    );
    const filled = Math.round((item.count / maxCount) * barWidth);
    const empty = barWidth - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    const countStr = String(item.count).padStart(4);

    lines.push(truncateToDisplayWidth(`${name} [${bar}] ${countStr}`, width));
  }

  return lines.slice(0, height);
}

const LIVE_AGENT_NAME_WIDTH = 15;
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
        ? truncateToDisplayWidth(call.agentId, LIVE_AGENT_NAME_WIDTH) + ' '
        : '';
    lines.push(truncateToDisplayWidth(`${ageIndicator} ${agent}${call.toolName}`, width));
  }

  return lines.slice(0, height);
}
