import { describe, it, expect } from 'vitest';
import {
  renderLiveContext,
  aggregateForBarChart,
  renderBarChart,
  type BarChartItem,
} from './activity-visualizer.pure';
import type { ToolCallRecord } from '../dashboard-types';
import { estimateDisplayWidth } from '../utils/display-width';

describe('renderLiveContext', () => {
  const NOW = 100_000;

  it('returns empty array for height <= 0', () => {
    const calls: ToolCallRecord[] = [
      { agentId: 'a1', toolName: 'Read', timestamp: NOW, status: 'completed' },
    ];
    expect(renderLiveContext(calls, null, 40, 0, NOW)).toEqual([]);
  });

  it('returns empty array for width <= 0', () => {
    const calls: ToolCallRecord[] = [
      { agentId: 'a1', toolName: 'Read', timestamp: NOW, status: 'completed' },
    ];
    expect(renderLiveContext(calls, null, 0, 5, NOW)).toEqual([]);
    expect(renderLiveContext(calls, null, -1, 5, NOW)).toEqual([]);
  });

  it('returns Live header only when no calls', () => {
    const lines = renderLiveContext([], null, 40, 5, NOW);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('Live');
  });

  it('always includes Live header', () => {
    const calls: ToolCallRecord[] = [
      { agentId: 'a1', toolName: 'Read', timestamp: NOW, status: 'completed' },
    ];
    const lines = renderLiveContext(calls, null, 40, 5, NOW);
    expect(lines[0]).toContain('Live');
  });

  it('shows current mode when provided', () => {
    const lines = renderLiveContext([], 'PLAN', 40, 5, NOW);
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain('Mode');
    expect(lines[1]).toContain('PLAN');
  });

  it('omits mode line when currentMode is null', () => {
    const calls: ToolCallRecord[] = [
      { agentId: 'a1', toolName: 'Read', timestamp: NOW, status: 'completed' },
    ];
    const lines = renderLiveContext(calls, null, 40, 5, NOW);
    const modeLines = lines.filter(l => l.includes('Mode'));
    expect(modeLines).toHaveLength(0);
  });

  it('shows unique tools newest first', () => {
    const calls: ToolCallRecord[] = [
      { agentId: 'a1', toolName: 'Read', timestamp: NOW - 10_000, status: 'completed' },
      { agentId: 'a1', toolName: 'Bash', timestamp: NOW - 5_000, status: 'completed' },
      { agentId: 'a1', toolName: 'Grep', timestamp: NOW, status: 'completed' },
    ];
    const lines = renderLiveContext(calls, null, 40, 10, NOW);
    expect(lines).toHaveLength(4);
    expect(lines[1]).toContain('Grep');
    expect(lines[2]).toContain('Bash');
    expect(lines[3]).toContain('Read');
  });

  it('deduplicates tool names (keeps most recent)', () => {
    const calls: ToolCallRecord[] = [
      { agentId: 'a1', toolName: 'Read', timestamp: NOW - 10_000, status: 'completed' },
      { agentId: 'a2', toolName: 'Read', timestamp: NOW, status: 'completed' },
    ];
    const lines = renderLiveContext(calls, null, 40, 10, NOW);
    const readLines = lines.filter(l => l.includes('Read'));
    expect(readLines).toHaveLength(1);
  });

  it('shows hot indicator for calls < 5s old', () => {
    const calls: ToolCallRecord[] = [
      { agentId: 'a1', toolName: 'Read', timestamp: NOW - 2_000, status: 'completed' },
    ];
    const lines = renderLiveContext(calls, null, 40, 5, NOW);
    expect(lines[1]).toContain('◉');
  });

  it('shows recent indicator for calls 5-30s old', () => {
    const calls: ToolCallRecord[] = [
      { agentId: 'a1', toolName: 'Read', timestamp: NOW - 10_000, status: 'completed' },
    ];
    const lines = renderLiveContext(calls, null, 40, 5, NOW);
    expect(lines[1]).toContain('○');
  });

  it('shows older indicator for calls >= 30s old', () => {
    const calls: ToolCallRecord[] = [
      { agentId: 'a1', toolName: 'Read', timestamp: NOW - 60_000, status: 'completed' },
    ];
    const lines = renderLiveContext(calls, null, 40, 5, NOW);
    expect(lines[1]).toContain('·');
  });

  it('shows agent context when agentId is not unknown', () => {
    const calls: ToolCallRecord[] = [
      { agentId: 'architect', toolName: 'Read', timestamp: NOW, status: 'completed' },
    ];
    const lines = renderLiveContext(calls, null, 40, 5, NOW);
    expect(lines[1]).toContain('architect');
    expect(lines[1]).toContain('Read');
  });

  it('omits agent context when agentId is unknown', () => {
    const calls: ToolCallRecord[] = [
      { agentId: 'unknown', toolName: 'Read', timestamp: NOW, status: 'completed' },
    ];
    const lines = renderLiveContext(calls, null, 40, 5, NOW);
    expect(lines[1]).not.toContain('unknown');
    expect(lines[1]).toContain('Read');
  });

  it('respects height limit', () => {
    const calls: ToolCallRecord[] = [
      { agentId: 'a1', toolName: 'tool1', timestamp: NOW, status: 'completed' },
      { agentId: 'a1', toolName: 'tool2', timestamp: NOW - 1_000, status: 'completed' },
      { agentId: 'a1', toolName: 'tool3', timestamp: NOW - 2_000, status: 'completed' },
    ];
    const lines = renderLiveContext(calls, 'PLAN', 40, 3, NOW);
    expect(lines).toHaveLength(3);
  });

  it('truncates lines to width', () => {
    const calls: ToolCallRecord[] = [
      {
        agentId: 'very-long-agent-name',
        toolName: 'VeryLongToolNameThatExceedsWidth',
        timestamp: NOW,
        status: 'completed',
      },
    ];
    const lines = renderLiveContext(calls, null, 15, 5, NOW);
    for (const line of lines) {
      expect(estimateDisplayWidth(line)).toBeLessThanOrEqual(15);
    }
  });

  it('does not filter by time window — old calls still visible', () => {
    const calls: ToolCallRecord[] = [
      { agentId: 'a1', toolName: 'Read', timestamp: NOW - 120_000, status: 'completed' },
    ];
    const lines = renderLiveContext(calls, null, 40, 5, NOW);
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain('Read');
  });

  it('ignores error-status calls', () => {
    const calls: ToolCallRecord[] = [
      { agentId: 'a1', toolName: 'Read', timestamp: NOW, status: 'error' },
    ];
    const lines = renderLiveContext(calls, null, 40, 5, NOW);
    expect(lines).toHaveLength(1);
  });
});

describe('aggregateForBarChart', () => {
  it('returns empty array for empty input', () => {
    expect(aggregateForBarChart([])).toEqual([]);
  });

  it('counts calls per tool and sorts descending', () => {
    const calls: ToolCallRecord[] = [
      { agentId: 'a1', toolName: 'Read', timestamp: 1, status: 'completed' },
      { agentId: 'a1', toolName: 'Read', timestamp: 2, status: 'completed' },
      { agentId: 'a2', toolName: 'Bash', timestamp: 3, status: 'completed' },
      { agentId: 'a1', toolName: 'Read', timestamp: 4, status: 'completed' },
      { agentId: 'a2', toolName: 'Grep', timestamp: 5, status: 'completed' },
      { agentId: 'a2', toolName: 'Grep', timestamp: 6, status: 'completed' },
    ];
    const result = aggregateForBarChart(calls);
    expect(result).toEqual([
      { tool: 'Read', count: 3 },
      { tool: 'Grep', count: 2 },
      { tool: 'Bash', count: 1 },
    ]);
  });

  it('limits results to maxTools (default 10)', () => {
    const calls: ToolCallRecord[] = [];
    for (let i = 0; i < 15; i++) {
      calls.push({ agentId: 'a1', toolName: `tool_${i}`, timestamp: i, status: 'completed' });
    }
    const result = aggregateForBarChart(calls);
    expect(result).toHaveLength(10);
  });

  it('respects custom maxTools', () => {
    const calls: ToolCallRecord[] = [
      { agentId: 'a1', toolName: 'Read', timestamp: 1, status: 'completed' },
      { agentId: 'a1', toolName: 'Bash', timestamp: 2, status: 'completed' },
      { agentId: 'a1', toolName: 'Grep', timestamp: 3, status: 'completed' },
    ];
    const result = aggregateForBarChart(calls, 2);
    expect(result).toHaveLength(2);
  });

  it('returns single tool correctly', () => {
    const calls: ToolCallRecord[] = [
      { agentId: 'a1', toolName: 'Read', timestamp: 1, status: 'completed' },
    ];
    expect(aggregateForBarChart(calls)).toEqual([{ tool: 'Read', count: 1 }]);
  });
});

describe('renderBarChart', () => {
  const sampleData: BarChartItem[] = [
    { tool: 'Read', count: 10 },
    { tool: 'Bash', count: 5 },
    { tool: 'Grep', count: 2 },
  ];

  it('returns empty array for empty data', () => {
    expect(renderBarChart([], 80, 10)).toEqual([]);
  });

  it('returns empty array for height <= 0', () => {
    expect(renderBarChart(sampleData, 80, 0)).toEqual([]);
  });

  it('returns empty array for width <= 0', () => {
    expect(renderBarChart(sampleData, 0, 10)).toEqual([]);
    expect(renderBarChart(sampleData, -1, 10)).toEqual([]);
  });

  it('includes Activity header as first line', () => {
    const lines = renderBarChart(sampleData, 80, 10);
    expect(lines[0]).toContain('Activity');
  });

  it('includes tool names in output', () => {
    const lines = renderBarChart(sampleData, 80, 10);
    const content = lines.join('\n');
    expect(content).toContain('Read');
    expect(content).toContain('Bash');
    expect(content).toContain('Grep');
  });

  it('includes counts in output', () => {
    const lines = renderBarChart(sampleData, 80, 10);
    const content = lines.join('\n');
    expect(content).toContain('10');
    expect(content).toContain('5');
    expect(content).toContain('2');
  });

  it('includes bar characters', () => {
    const lines = renderBarChart(sampleData, 80, 10);
    const content = lines.join('\n');
    expect(content).toContain('█');
    expect(content).toContain('░');
  });

  it('limits output to height lines', () => {
    const lines = renderBarChart(sampleData, 80, 3);
    expect(lines.length).toBeLessThanOrEqual(3);
  });

  it('truncates lines to width', () => {
    const lines = renderBarChart(sampleData, 30, 10);
    for (const line of lines) {
      expect(estimateDisplayWidth(line)).toBeLessThanOrEqual(30);
    }
  });

  it('highest count tool has full bar (no empty chars)', () => {
    const lines = renderBarChart(sampleData, 80, 10);
    const readLine = lines.find(l => l.includes('Read'));
    expect(readLine).toBeDefined();
    expect(readLine).not.toContain('░');
  });

  it('renders single item correctly', () => {
    const lines = renderBarChart([{ tool: 'Read', count: 5 }], 80, 5);
    expect(lines).toHaveLength(2); // header + 1 row
    expect(lines[1]).toContain('Read');
    expect(lines[1]).toContain('5');
  });

  it('renders correctly with very narrow width (width < BAR_FIXED_OVERHEAD)', () => {
    const lines = renderBarChart(sampleData, 15, 5);
    // barWidth = max(1, 15-20) = 1, should still render without error
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      expect(estimateDisplayWidth(line)).toBeLessThanOrEqual(15);
    }
  });

  it('renders safely when count is 0 (maxCount fallback to 1)', () => {
    const data: BarChartItem[] = [{ tool: 'Read', count: 0 }];
    const lines = renderBarChart(data, 80, 5);
    expect(lines).toHaveLength(2);
    // bar should be all empty (count=0, maxCount=1 → filled=0)
    expect(lines[1]).toContain('░');
    expect(lines[1]).not.toContain('█');
  });
});
