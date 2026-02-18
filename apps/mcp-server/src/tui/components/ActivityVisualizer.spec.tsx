import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { ActivityVisualizer } from './ActivityVisualizer';
import { createDefaultDashboardNode } from '../dashboard-types';
import type { DashboardNode, Edge } from '../dashboard-types';

function makeAgents(): Map<string, DashboardNode> {
  const agents = new Map<string, DashboardNode>();
  agents.set(
    'main-agent',
    createDefaultDashboardNode({
      id: 'main-agent',
      name: 'main-agent',
      stage: 'PLAN',
      status: 'running',
      isPrimary: true,
      progress: 50,
    }),
  );
  agents.set(
    'solution-architect',
    createDefaultDashboardNode({
      id: 'solution-architect',
      name: 'solution-architect',
      stage: 'PLAN',
      status: 'running',
      isPrimary: false,
      progress: 30,
    }),
  );
  return agents;
}

const focusedAgent = createDefaultDashboardNode({
  id: 'main-agent',
  name: 'main-agent',
  stage: 'PLAN',
  status: 'running',
  isPrimary: true,
  progress: 50,
});

const sampleEdges: Edge[] = [
  { from: 'main-agent', to: 'solution-architect', label: 'delegates', type: 'delegation' },
];

const defaultProps = {
  currentMode: 'PLAN' as const,
  focusedAgent,
  agents: makeAgents(),
  edges: sampleEdges,
  activeSkills: ['brainstorming'],
  objectives: ['Design Activity panels'],
  width: 80,
  height: 10,
};

describe('tui/components/ActivityVisualizer', () => {
  it('renders without crashing with data', () => {
    const { lastFrame } = render(<ActivityVisualizer {...defaultProps} />);
    expect(lastFrame()).toBeDefined();
  });

  it('renders without crashing with empty data', () => {
    const { lastFrame } = render(
      <ActivityVisualizer
        {...defaultProps}
        agents={new Map()}
        edges={[]}
        activeSkills={[]}
        objectives={[]}
        focusedAgent={null}
      />,
    );
    expect(lastFrame()).toBeDefined();
  });

  it('renders without crashing when width=0 or height=0', () => {
    expect(() => render(<ActivityVisualizer {...defaultProps} width={0} />)).not.toThrow();
    expect(() => render(<ActivityVisualizer {...defaultProps} height={0} />)).not.toThrow();
  });

  it('contains Activity header in left panel', () => {
    const { lastFrame } = render(<ActivityVisualizer {...defaultProps} />);
    expect(lastFrame() ?? '').toContain('Activity');
  });

  it('contains Live header in right panel', () => {
    const { lastFrame } = render(<ActivityVisualizer {...defaultProps} />);
    expect(lastFrame() ?? '').toContain('Live');
  });

  it('shows agent name in tree', () => {
    const { lastFrame } = render(<ActivityVisualizer {...defaultProps} />);
    expect(lastFrame() ?? '').toContain('main-agent');
  });

  it('shows current mode in status card', () => {
    const { lastFrame } = render(<ActivityVisualizer {...defaultProps} />);
    expect(lastFrame() ?? '').toContain('PLAN');
  });

  it('shows focused agent name in status card', () => {
    const { lastFrame } = render(<ActivityVisualizer {...defaultProps} />);
    expect(lastFrame() ?? '').toContain('main-agent');
  });

  it('does NOT contain old Agents roster header', () => {
    const { lastFrame } = render(<ActivityVisualizer {...defaultProps} />);
    expect(lastFrame() ?? '').not.toContain('🤖 Agents');
  });

  it('does NOT contain old Events header', () => {
    const { lastFrame } = render(<ActivityVisualizer {...defaultProps} />);
    expect(lastFrame() ?? '').not.toContain('📋 Events');
  });
});
