import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { FlowMap } from './FlowMap';
import { createDefaultDashboardNode } from '../dashboard-types';
import type { Edge } from '../dashboard-types';

function makeAgents() {
  const agents = new Map();
  agents.set(
    'a1',
    createDefaultDashboardNode({
      id: 'a1',
      name: 'Architect',
      stage: 'PLAN',
      status: 'running',
      isPrimary: true,
    }),
  );
  agents.set(
    'a2',
    createDefaultDashboardNode({
      id: 'a2',
      name: 'BackendDev',
      stage: 'ACT',
      status: 'running',
    }),
  );
  return agents;
}

function makeEdges(): Edge[] {
  return [{ from: 'a1', to: 'a2', label: 'assign', type: 'delegation' }];
}

describe('tui/components/FlowMap', () => {
  it('should render in wide mode with boxes and arrows', () => {
    const { lastFrame } = render(
      <FlowMap
        agents={makeAgents()}
        edges={makeEdges()}
        layoutMode="wide"
        width={120}
        height={20}
      />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('FLOW MAP');
    expect(frame).toContain('Architect');
    expect(frame).toContain('BackendDev');
  });

  it('should render in medium mode with simplified boxes', () => {
    const { lastFrame } = render(
      <FlowMap
        agents={makeAgents()}
        edges={makeEdges()}
        layoutMode="medium"
        width={100}
        height={15}
      />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('FLOW MAP');
    expect(frame).toContain('Architect');
  });

  it('should render in narrow mode with compact list', () => {
    const { lastFrame } = render(
      <FlowMap
        agents={makeAgents()}
        edges={makeEdges()}
        layoutMode="narrow"
        width={60}
        height={10}
      />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('FLOW MAP');
    expect(frame).toContain('Architect');
  });

  it('should render with empty agents', () => {
    const { lastFrame } = render(
      <FlowMap agents={new Map()} edges={[]} layoutMode="wide" width={120} height={20} />,
    );
    expect(lastFrame()).toContain('FLOW MAP');
  });

  it('should render status icons', () => {
    const agents = makeAgents();
    const { lastFrame } = render(
      <FlowMap agents={agents} edges={[]} layoutMode="narrow" width={60} height={10} />,
    );
    const frame = lastFrame() ?? '';
    // Running agents should have the running icon
    expect(frame).toContain('\u25CF');
  });
});
