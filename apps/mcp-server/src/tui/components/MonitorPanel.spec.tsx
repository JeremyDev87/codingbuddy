import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { MonitorPanel } from './MonitorPanel';
import { createDefaultDashboardNode } from '../dashboard-types';
import type { EventLogEntry, DashboardNode, TaskItem } from '../dashboard-types';

function makeAgents(): Map<string, DashboardNode> {
  const agents = new Map<string, DashboardNode>();
  agents.set(
    'a1',
    createDefaultDashboardNode({
      id: 'a1',
      name: 'architect',
      stage: 'PLAN',
      status: 'running',
      isPrimary: true,
      progress: 75,
    }),
  );
  agents.set(
    'a2',
    createDefaultDashboardNode({
      id: 'a2',
      name: 'tester',
      stage: 'ACT',
      status: 'idle',
      progress: 30,
    }),
  );
  return agents;
}

function makeEventLog(): EventLogEntry[] {
  return [
    { timestamp: '10:01', message: 'Agent started', level: 'info' },
    { timestamp: '10:02', message: 'Tool called', level: 'info' },
    { timestamp: '10:03', message: 'Error occurred', level: 'error' },
  ];
}

function makeTasks(): TaskItem[] {
  return [
    { id: '1', subject: 'Write tests', completed: true },
    { id: '2', subject: 'Implement feature', completed: false },
    { id: '3', subject: 'Code review', completed: false },
  ];
}

describe('tui/components/MonitorPanel', () => {
  it('should render all three sub-panels with headers', () => {
    const { lastFrame } = render(
      <MonitorPanel
        eventLog={makeEventLog()}
        agents={makeAgents()}
        tasks={makeTasks()}
        width={90}
        height={10}
      />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Event Log');
    expect(frame).toContain('Timeline');
    expect(frame).toContain('Tasks');
  });

  it('should show empty-state messages when data is empty', () => {
    const { lastFrame } = render(
      <MonitorPanel eventLog={[]} agents={new Map()} tasks={[]} width={90} height={10} />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('No events');
    expect(frame).toContain('No agents');
    expect(frame).toContain('No tasks');
  });

  it('should render event log entries and agent names when data is present', () => {
    const { lastFrame } = render(
      <MonitorPanel
        eventLog={makeEventLog()}
        agents={makeAgents()}
        tasks={makeTasks()}
        width={90}
        height={10}
      />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Agent started');
    expect(frame).toContain('architect');
    expect(frame).toContain('Write tests');
  });

  it('should render without crashing when width=0 or height=0', () => {
    const renderZeroWidth = () =>
      render(
        <MonitorPanel
          eventLog={makeEventLog()}
          agents={makeAgents()}
          tasks={makeTasks()}
          width={0}
          height={10}
        />,
      );
    expect(renderZeroWidth).not.toThrow();

    const renderZeroHeight = () =>
      render(
        <MonitorPanel
          eventLog={makeEventLog()}
          agents={makeAgents()}
          tasks={makeTasks()}
          width={90}
          height={0}
        />,
      );
    expect(renderZeroHeight).not.toThrow();
  });
});
