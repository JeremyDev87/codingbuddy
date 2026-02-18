import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { ActivityVisualizer } from './ActivityVisualizer';
import { createDefaultDashboardNode } from '../dashboard-types';
import type { DashboardNode, EventLogEntry } from '../dashboard-types';

function makeAgents(): Map<string, DashboardNode> {
  const agents = new Map<string, DashboardNode>();
  agents.set(
    'plan-mode',
    createDefaultDashboardNode({
      id: 'plan-mode',
      name: 'plan-mode',
      stage: 'PLAN',
      status: 'running',
      isPrimary: true,
      progress: 50,
    }),
  );
  agents.set(
    'security',
    createDefaultDashboardNode({
      id: 'security',
      name: 'security',
      stage: 'EVAL',
      status: 'idle',
      isPrimary: false,
      progress: 0,
    }),
  );
  return agents;
}

const sampleEvents: EventLogEntry[] = [
  { timestamp: '10:00:01', message: 'agent: plan-mode activated', level: 'info' },
  { timestamp: '10:00:05', message: 'agent: security started', level: 'info' },
];

describe('tui/components/ActivityVisualizer', () => {
  it('renders without crashing with data', () => {
    const { lastFrame } = render(
      <ActivityVisualizer agents={makeAgents()} eventLog={sampleEvents} width={80} height={10} />,
    );
    expect(lastFrame()).toBeDefined();
  });

  it('renders without crashing with empty data', () => {
    const { lastFrame } = render(
      <ActivityVisualizer agents={new Map()} eventLog={[]} width={80} height={10} />,
    );
    expect(lastFrame()).toBeDefined();
  });

  it('renders without crashing when width=0 or height=0', () => {
    expect(() =>
      render(<ActivityVisualizer agents={new Map()} eventLog={[]} width={0} height={10} />),
    ).not.toThrow();
    expect(() =>
      render(<ActivityVisualizer agents={new Map()} eventLog={[]} width={80} height={0} />),
    ).not.toThrow();
  });

  it('contains Agents header in left panel', () => {
    const { lastFrame } = render(
      <ActivityVisualizer agents={makeAgents()} eventLog={sampleEvents} width={80} height={10} />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Agents');
  });

  it('contains Events header in right panel', () => {
    const { lastFrame } = render(
      <ActivityVisualizer agents={makeAgents()} eventLog={sampleEvents} width={80} height={10} />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Events');
  });

  it('shows agent names in roster', () => {
    const { lastFrame } = render(
      <ActivityVisualizer agents={makeAgents()} eventLog={sampleEvents} width={80} height={10} />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('plan-mode');
  });

  it('shows event messages', () => {
    const shortEvents: EventLogEntry[] = [
      { timestamp: '10:00:01', message: 'plan-mode ok', level: 'info' },
    ];
    const { lastFrame } = render(
      <ActivityVisualizer agents={makeAgents()} eventLog={shortEvents} width={80} height={10} />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('plan-mode ok');
  });

  it('does NOT contain old Activity bar chart header', () => {
    const { lastFrame } = render(
      <ActivityVisualizer agents={makeAgents()} eventLog={sampleEvents} width={80} height={10} />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).not.toContain('📊 Activity');
  });

  it('does NOT contain old Live header', () => {
    const { lastFrame } = render(
      <ActivityVisualizer agents={makeAgents()} eventLog={sampleEvents} width={80} height={10} />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).not.toContain('💬 Live');
  });
});
