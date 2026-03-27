import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { FlowMap } from './FlowMap';
import { createDefaultDashboardNode } from '../dashboard-types';
import type { Edge } from '../dashboard-types';
import { pulseIcon, formatElapsed } from './live.pure';

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

  describe('pulse icons + elapsed labels (tick/now props)', () => {
    it('should show pulse icon and elapsed label for running agents in narrow mode', () => {
      const now = 1710700000000;
      const agents = new Map();
      agents.set(
        'a1',
        createDefaultDashboardNode({
          id: 'a1',
          name: 'Architect',
          stage: 'PLAN',
          status: 'running',
          isPrimary: true,
          startedAt: now - 45_000, // 45 seconds ago
        }),
      );
      const { lastFrame } = render(
        <FlowMap
          agents={agents}
          edges={[]}
          layoutMode="narrow"
          width={60}
          height={10}
          tick={0}
          now={now}
        />,
      );
      const frame = lastFrame() ?? '';
      expect(frame).toContain(pulseIcon(0));
      expect(frame).toContain(formatElapsed(now - 45_000, now));
    });

    it('should show pulse icon for running agents in wide mode', () => {
      const now = 1710700000000;
      const agents = new Map();
      agents.set(
        'a1',
        createDefaultDashboardNode({
          id: 'a1',
          name: 'Architect',
          stage: 'PLAN',
          status: 'running',
          isPrimary: true,
          startedAt: now - 90_000,
        }),
      );
      const { lastFrame } = render(
        <FlowMap
          agents={agents}
          edges={makeEdges()}
          layoutMode="wide"
          width={120}
          height={20}
          tick={2}
          now={now}
        />,
      );
      const frame = lastFrame() ?? '';
      expect(frame).toContain(pulseIcon(2));
      expect(frame).toContain(formatElapsed(now - 90_000, now));
    });

    it('should show pulse icon and elapsed label for running agents in medium mode', () => {
      const now = 1710700000000;
      const agents = new Map();
      agents.set(
        'a1',
        createDefaultDashboardNode({
          id: 'a1',
          name: 'Architect',
          stage: 'PLAN',
          status: 'running',
          isPrimary: true,
          startedAt: now - 120_000, // 2 minutes ago
        }),
      );
      const { lastFrame } = render(
        <FlowMap
          agents={agents}
          edges={[]}
          layoutMode="medium"
          width={100}
          height={15}
          tick={1}
          now={now}
        />,
      );
      const frame = lastFrame() ?? '';
      expect(frame).toContain(pulseIcon(1));
      expect(frame).toContain(formatElapsed(now - 120_000, now));
    });

    it('should NOT show pulse icon when no agents are running', () => {
      const now = 1710700000000;
      const agents = new Map();
      agents.set(
        'a1',
        createDefaultDashboardNode({
          id: 'a1',
          name: 'Architect',
          stage: 'PLAN',
          status: 'idle',
          startedAt: now - 45_000,
        }),
      );
      const { lastFrame } = render(
        <FlowMap
          agents={agents}
          edges={[]}
          layoutMode="narrow"
          width={60}
          height={10}
          tick={3}
          now={now}
        />,
      );
      const frame = lastFrame() ?? '';
      // idle agent should NOT have pulse icons
      expect(frame).not.toContain(pulseIcon(3));
      expect(frame).not.toContain('45s');
    });

    it('should NOT show elapsed without tick/now props', () => {
      const agents = makeAgents();
      const { lastFrame } = render(
        <FlowMap agents={agents} edges={[]} layoutMode="narrow" width={60} height={10} />,
      );
      const frame = lastFrame() ?? '';
      // Without tick/now, no elapsed labels should appear
      expect(frame).not.toMatch(/\d+m \d+s/);
      expect(frame).not.toMatch(/\d+s$/m);
    });

    it('should alternate pulse icon between ticks', () => {
      const now = 1710700000000;
      const agents = new Map();
      agents.set(
        'a1',
        createDefaultDashboardNode({
          id: 'a1',
          name: 'Architect',
          stage: 'PLAN',
          status: 'running',
          startedAt: now - 10_000,
        }),
      );
      const { lastFrame: frame0 } = render(
        <FlowMap
          agents={agents}
          edges={[]}
          layoutMode="narrow"
          width={60}
          height={10}
          tick={0}
          now={now}
        />,
      );
      const { lastFrame: frame1 } = render(
        <FlowMap
          agents={agents}
          edges={[]}
          layoutMode="narrow"
          width={60}
          height={10}
          tick={1}
          now={now}
        />,
      );
      expect(frame0()).toContain('●');
      expect(frame1()).toContain('◉');
    });
  });
});
