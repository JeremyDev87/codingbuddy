import { describe, it, expect } from 'vitest';
import {
  aggregateToolCalls,
  getDensityChar,
  renderHeatmap,
  renderLiveContext,
  type HeatmapData,
} from './activity-visualizer.pure';
import type { ToolCallRecord } from '../dashboard-types';
import { estimateDisplayWidth } from '../utils/display-width';

describe('aggregateToolCalls', () => {
  it('returns empty arrays for empty input', () => {
    const result = aggregateToolCalls([]);
    expect(result).toEqual({ agents: [], tools: [], matrix: [] });
  });

  it('generates correct matrix for simple input', () => {
    const calls: ToolCallRecord[] = [
      { agentId: 'a1', toolName: 'Read', timestamp: 1, status: 'completed' },
      { agentId: 'a1', toolName: 'Read', timestamp: 2, status: 'completed' },
      { agentId: 'a1', toolName: 'Bash', timestamp: 3, status: 'completed' },
      { agentId: 'a2', toolName: 'Read', timestamp: 4, status: 'completed' },
    ];
    const result = aggregateToolCalls(calls);
    expect(result.agents).toEqual(['a1', 'a2']);
    expect(result.tools).toEqual(['Read', 'Bash']);
    // a1: Read=2, Bash=1; a2: Read=1, Bash=0
    expect(result.matrix).toEqual([
      [2, 1],
      [1, 0],
    ]);
  });

  it('sorts agents by total calls descending', () => {
    const calls: ToolCallRecord[] = [
      { agentId: 'low', toolName: 'Read', timestamp: 1, status: 'completed' },
      { agentId: 'high', toolName: 'Read', timestamp: 2, status: 'completed' },
      { agentId: 'high', toolName: 'Read', timestamp: 3, status: 'completed' },
      { agentId: 'high', toolName: 'Read', timestamp: 4, status: 'completed' },
    ];
    const result = aggregateToolCalls(calls);
    expect(result.agents[0]).toBe('high');
    expect(result.agents[1]).toBe('low');
  });

  it('sorts tools by total calls descending', () => {
    const calls: ToolCallRecord[] = [
      { agentId: 'a1', toolName: 'rare', timestamp: 1, status: 'completed' },
      { agentId: 'a1', toolName: 'common', timestamp: 2, status: 'completed' },
      { agentId: 'a1', toolName: 'common', timestamp: 3, status: 'completed' },
      { agentId: 'a1', toolName: 'common', timestamp: 4, status: 'completed' },
    ];
    const result = aggregateToolCalls(calls);
    expect(result.tools[0]).toBe('common');
    expect(result.tools[1]).toBe('rare');
  });

  it('limits agents to maxAgents (default 7)', () => {
    const calls: ToolCallRecord[] = [];
    for (let i = 0; i < 10; i++) {
      calls.push({ agentId: `agent_${i}`, toolName: 'Read', timestamp: i, status: 'completed' });
    }
    const result = aggregateToolCalls(calls);
    expect(result.agents).toHaveLength(7);
    expect(result.matrix).toHaveLength(7);
  });

  it('limits tools to maxTools (default 8)', () => {
    const calls: ToolCallRecord[] = [];
    for (let i = 0; i < 12; i++) {
      calls.push({ agentId: 'a1', toolName: `tool_${i}`, timestamp: i, status: 'completed' });
    }
    const result = aggregateToolCalls(calls);
    expect(result.tools).toHaveLength(8);
    expect(result.matrix[0]).toHaveLength(8);
  });

  it('respects custom maxAgents and maxTools', () => {
    const calls: ToolCallRecord[] = [];
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 5; j++) {
        calls.push({
          agentId: `a${i}`,
          toolName: `t${j}`,
          timestamp: i * 5 + j,
          status: 'completed',
        });
      }
    }
    const result = aggregateToolCalls(calls, 3, 2);
    expect(result.agents).toHaveLength(3);
    expect(result.tools).toHaveLength(2);
    expect(result.matrix).toHaveLength(3);
    expect(result.matrix[0]).toHaveLength(2);
  });
});

describe('getDensityChar', () => {
  it('returns "··" for count 0', () => {
    expect(getDensityChar(0)).toBe('··');
  });

  it('returns "··" for negative count', () => {
    expect(getDensityChar(-1)).toBe('··');
  });

  it('returns "░░" for count 1-2', () => {
    expect(getDensityChar(1)).toBe('░░');
    expect(getDensityChar(2)).toBe('░░');
  });

  it('returns "▒▒" for count 3-5', () => {
    expect(getDensityChar(3)).toBe('▒▒');
    expect(getDensityChar(5)).toBe('▒▒');
  });

  it('returns "▓▓" for count 6-9', () => {
    expect(getDensityChar(6)).toBe('▓▓');
    expect(getDensityChar(9)).toBe('▓▓');
  });

  it('returns "██" for count >= 10', () => {
    expect(getDensityChar(10)).toBe('██');
    expect(getDensityChar(100)).toBe('██');
  });
});

describe('renderHeatmap', () => {
  const sampleData: HeatmapData = {
    agents: ['agent-1', 'agent-2'],
    tools: ['Read', 'Bash'],
    matrix: [
      [3, 1],
      [0, 10],
    ],
  };

  it('returns empty array for empty agents', () => {
    expect(renderHeatmap({ agents: [], tools: [], matrix: [] }, 80, 10)).toEqual([]);
  });

  it('returns empty array for height <= 0', () => {
    expect(renderHeatmap(sampleData, 80, 0)).toEqual([]);
  });

  it('returns empty array for width <= 0', () => {
    expect(renderHeatmap(sampleData, 0, 10)).toEqual([]);
    expect(renderHeatmap(sampleData, -1, 10)).toEqual([]);
  });

  it('includes Activity header as first line', () => {
    const lines = renderHeatmap(sampleData, 80, 10);
    expect(lines[0]).toContain('Activity');
  });

  it('includes tool names in header row', () => {
    const lines = renderHeatmap(sampleData, 80, 10);
    // Second line is the tool header row
    expect(lines[1]).toContain('Read');
    expect(lines[1]).toContain('Bash');
  });

  it('includes agent names in data rows', () => {
    const lines = renderHeatmap(sampleData, 80, 10);
    const content = lines.join('\n');
    expect(content).toContain('agent-1');
    expect(content).toContain('agent-2');
  });

  it('uses density chars in data rows', () => {
    const lines = renderHeatmap(sampleData, 80, 10);
    const content = lines.join('\n');
    // agent-1: Read=3 -> ▒▒, Bash=1 -> ░░
    expect(content).toContain('▒▒');
    expect(content).toContain('░░');
    // agent-2: Read=0 -> ··, Bash=10 -> ██
    expect(content).toContain('··');
    expect(content).toContain('██');
  });

  it('limits output to height lines', () => {
    const lines = renderHeatmap(sampleData, 80, 3);
    expect(lines.length).toBeLessThanOrEqual(3);
  });

  it('truncates lines to width', () => {
    const lines = renderHeatmap(sampleData, 20, 10);
    for (const line of lines) {
      expect(estimateDisplayWidth(line)).toBeLessThanOrEqual(20);
    }
  });
});

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
