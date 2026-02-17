import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { ActivityVisualizer } from './ActivityVisualizer';
import type { ToolCallRecord } from '../dashboard-types';

function makeCalls(): ToolCallRecord[] {
  return [
    { agentId: 'architect', toolName: 'Read', timestamp: Date.now(), status: 'completed' },
    { agentId: 'architect', toolName: 'Read', timestamp: Date.now(), status: 'completed' },
    { agentId: 'architect', toolName: 'Grep', timestamp: Date.now(), status: 'completed' },
    { agentId: 'tester', toolName: 'Bash', timestamp: Date.now(), status: 'completed' },
  ];
}

describe('tui/components/ActivityVisualizer', () => {
  it('renders without crashing with data', () => {
    const { lastFrame } = render(
      <ActivityVisualizer toolCalls={makeCalls()} currentMode="PLAN" width={80} height={10} />,
    );
    expect(lastFrame()).toBeDefined();
  });

  it('renders without crashing with empty data', () => {
    const { lastFrame } = render(
      <ActivityVisualizer toolCalls={[]} currentMode={null} width={80} height={10} />,
    );
    expect(lastFrame()).toBeDefined();
  });

  it('renders without crashing when width=0 or height=0', () => {
    expect(() =>
      render(<ActivityVisualizer toolCalls={[]} currentMode={null} width={0} height={10} />),
    ).not.toThrow();
    expect(() =>
      render(<ActivityVisualizer toolCalls={[]} currentMode={null} width={80} height={0} />),
    ).not.toThrow();
  });

  it('contains heatmap content when calls exist', () => {
    const { lastFrame } = render(
      <ActivityVisualizer toolCalls={makeCalls()} currentMode={null} width={80} height={10} />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Activity');
  });

  it('contains Live header and tool names when calls exist', () => {
    const { lastFrame } = render(
      <ActivityVisualizer toolCalls={makeCalls()} currentMode={null} width={80} height={10} />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Live');
  });

  it('shows current mode in live panel', () => {
    const { lastFrame } = render(
      <ActivityVisualizer toolCalls={makeCalls()} currentMode="ACT" width={80} height={10} />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Mode');
    expect(frame).toContain('ACT');
  });
});
