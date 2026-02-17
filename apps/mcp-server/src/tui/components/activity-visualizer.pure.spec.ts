import { describe, it, expect } from 'vitest';
import {
  aggregateToolCalls,
  getDensityChar,
  renderHeatmap,
  renderBubbles,
  type HeatmapData,
} from './activity-visualizer.pure';
import type { ToolCallRecord } from '../dashboard-types';

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
      // estimateDisplayWidth handles wide chars; length check is a reasonable proxy for ASCII
      expect(line.length).toBeLessThanOrEqual(25); // tightened allowance for multi-byte
    }
  });
});

describe('renderBubbles', () => {
  const NOW = 100_000;

  it('returns empty array for height <= 0', () => {
    const calls: ToolCallRecord[] = [
      { agentId: 'a1', toolName: 'Read', timestamp: NOW, status: 'active' },
    ];
    expect(renderBubbles(calls, 40, 0, NOW)).toEqual([]);
  });

  it('returns empty array for width <= 0', () => {
    const calls: ToolCallRecord[] = [
      { agentId: 'a1', toolName: 'Read', timestamp: NOW, status: 'active' },
    ];
    expect(renderBubbles(calls, 0, 5, NOW)).toEqual([]);
    expect(renderBubbles(calls, -1, 5, NOW)).toEqual([]);
  });

  it('returns empty array when no active or recent calls', () => {
    const calls: ToolCallRecord[] = [
      { agentId: 'a1', toolName: 'Read', timestamp: 1000, status: 'completed' },
    ];
    expect(renderBubbles(calls, 40, 5, NOW)).toEqual([]);
  });

  it('includes Live header when active calls exist', () => {
    const calls: ToolCallRecord[] = [
      { agentId: 'a1', toolName: 'Read', timestamp: NOW, status: 'active' },
    ];
    const lines = renderBubbles(calls, 40, 5, NOW);
    expect(lines[0]).toContain('Live');
  });

  it('shows active tools with filled circles', () => {
    const calls: ToolCallRecord[] = [
      { agentId: 'a1', toolName: 'Read', timestamp: NOW, status: 'active' },
    ];
    const lines = renderBubbles(calls, 40, 5, NOW);
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain('◉');
    expect(lines[1]).toContain('Read');
  });

  it('shows multiple active calls with multiple circles', () => {
    const calls: ToolCallRecord[] = [
      { agentId: 'a1', toolName: 'Read', timestamp: NOW, status: 'active' },
      { agentId: 'a2', toolName: 'Read', timestamp: NOW, status: 'active' },
      { agentId: 'a3', toolName: 'Read', timestamp: NOW, status: 'active' },
    ];
    const lines = renderBubbles(calls, 40, 5, NOW);
    expect(lines[1]).toContain('◉◉◉');
  });

  it('caps bubbles at MAX_BUBBLES (5)', () => {
    const calls: ToolCallRecord[] = Array.from({ length: 8 }, (_, i) => ({
      agentId: `a${i}`,
      toolName: 'Read',
      timestamp: NOW,
      status: 'active' as const,
    }));
    const lines = renderBubbles(calls, 40, 5, NOW);
    expect(lines[1]).toContain('◉◉◉◉◉');
    expect(lines[1]).not.toContain('◉◉◉◉◉◉');
  });

  it('treats completed calls within 5s as active (hot window)', () => {
    const calls: ToolCallRecord[] = [
      { agentId: 'a1', toolName: 'Read', timestamp: NOW - 3_000, status: 'completed' },
    ];
    const lines = renderBubbles(calls, 40, 5, NOW);
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain('◉');
    expect(lines[1]).toContain('Read');
  });

  it('shows recently completed tools (5-30s) with open circle', () => {
    const calls: ToolCallRecord[] = [
      { agentId: 'a1', toolName: 'Bash', timestamp: NOW - 10_000, status: 'completed' },
    ];
    const lines = renderBubbles(calls, 40, 5, NOW);
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain('○');
    expect(lines[1]).toContain('Bash');
  });

  it('treats exactly 5000ms as recent (not hot)', () => {
    const calls: ToolCallRecord[] = [
      { agentId: 'a1', toolName: 'Read', timestamp: NOW - 5_000, status: 'completed' },
    ];
    const lines = renderBubbles(calls, 40, 5, NOW);
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain('○');
  });

  it('treats exactly 30000ms as excluded', () => {
    const calls: ToolCallRecord[] = [
      { agentId: 'a1', toolName: 'Read', timestamp: NOW - 30_000, status: 'completed' },
    ];
    const lines = renderBubbles(calls, 40, 5, NOW);
    expect(lines).toEqual([]);
  });

  it('excludes completed calls older than 30s', () => {
    const calls: ToolCallRecord[] = [
      { agentId: 'a1', toolName: 'Bash', timestamp: NOW - 31_000, status: 'completed' },
    ];
    const lines = renderBubbles(calls, 40, 5, NOW);
    expect(lines).toEqual([]);
  });

  it('sorts tools by active count descending', () => {
    const calls: ToolCallRecord[] = [
      { agentId: 'a1', toolName: 'Bash', timestamp: NOW, status: 'active' },
      { agentId: 'a1', toolName: 'Read', timestamp: NOW, status: 'active' },
      { agentId: 'a2', toolName: 'Read', timestamp: NOW, status: 'active' },
    ];
    const lines = renderBubbles(calls, 40, 5, NOW);
    expect(lines[1]).toContain('Read');
    expect(lines[2]).toContain('Bash');
  });

  it('limits output to height lines', () => {
    const calls: ToolCallRecord[] = [
      { agentId: 'a1', toolName: 'tool1', timestamp: NOW, status: 'active' },
      { agentId: 'a1', toolName: 'tool2', timestamp: NOW, status: 'active' },
      { agentId: 'a1', toolName: 'tool3', timestamp: NOW, status: 'active' },
    ];
    const lines = renderBubbles(calls, 40, 2, NOW);
    expect(lines).toHaveLength(2);
  });

  it('truncates lines to width', () => {
    const calls: ToolCallRecord[] = [
      {
        agentId: 'a1',
        toolName: 'VeryLongToolNameThatExceedsWidth',
        timestamp: NOW,
        status: 'active',
      },
    ];
    const lines = renderBubbles(calls, 15, 5, NOW);
    expect(lines).toHaveLength(2);
    for (const line of lines) {
      expect(line.length).toBeLessThanOrEqual(15);
    }
  });

  it('ignores error-status calls', () => {
    const calls: ToolCallRecord[] = [
      { agentId: 'a1', toolName: 'Read', timestamp: NOW, status: 'error' },
    ];
    const lines = renderBubbles(calls, 40, 5, NOW);
    expect(lines).toEqual([]);
  });
});
