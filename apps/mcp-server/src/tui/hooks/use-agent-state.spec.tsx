import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { Text } from 'ink';
import { useAgentState } from './use-agent-state';
import type { AgentState } from '../types';

function TestComponent({ agents }: { agents: AgentState[] }) {
  const { activeAgents, idleAgents, primaryAgent } = useAgentState(agents);
  return (
    <Text>
      {JSON.stringify({
        active: activeAgents.length,
        idle: idleAgents.length,
        primary: primaryAgent?.name ?? null,
        activeNames: activeAgents.map(a => a.name),
        idleNames: idleAgents.map(a => a.name),
      })}
    </Text>
  );
}

describe('useAgentState', () => {
  it('should return empty arrays when no agents', () => {
    const { lastFrame } = render(<TestComponent agents={[]} />);

    expect(lastFrame()).toContain('"active":0');
    expect(lastFrame()).toContain('"idle":0');
    expect(lastFrame()).toContain('"primary":null');
  });

  it('should classify running agents as active', () => {
    const agents: AgentState[] = [
      {
        id: 'a1',
        name: 'security',
        role: 'specialist',
        status: 'running',
        progress: 0,
        isPrimary: false,
      },
    ];
    const { lastFrame } = render(<TestComponent agents={agents} />);

    expect(lastFrame()).toContain('"active":1');
    expect(lastFrame()).toContain('"idle":0');
  });

  it('should classify completed agents as idle', () => {
    const agents: AgentState[] = [
      {
        id: 'a1',
        name: 'security',
        role: 'specialist',
        status: 'completed',
        progress: 100,
        isPrimary: false,
      },
    ];
    const { lastFrame } = render(<TestComponent agents={agents} />);

    expect(lastFrame()).toContain('"active":0');
    expect(lastFrame()).toContain('"idle":1');
  });

  it('should classify failed agents as idle', () => {
    const agents: AgentState[] = [
      {
        id: 'a1',
        name: 'security',
        role: 'specialist',
        status: 'failed',
        progress: 0,
        isPrimary: false,
      },
    ];
    const { lastFrame } = render(<TestComponent agents={agents} />);

    expect(lastFrame()).toContain('"active":0');
    expect(lastFrame()).toContain('"idle":1');
  });

  it('should classify idle-status agents as idle', () => {
    const agents: AgentState[] = [
      {
        id: 'a1',
        name: 'security',
        role: 'specialist',
        status: 'idle',
        progress: 0,
        isPrimary: false,
      },
    ];
    const { lastFrame } = render(<TestComponent agents={agents} />);

    expect(lastFrame()).toContain('"active":0');
    expect(lastFrame()).toContain('"idle":1');
  });

  it('should separate active and idle agents', () => {
    const agents: AgentState[] = [
      {
        id: 'a1',
        name: 'security',
        role: 'specialist',
        status: 'running',
        progress: 0,
        isPrimary: false,
      },
      {
        id: 'a2',
        name: 'perf',
        role: 'specialist',
        status: 'completed',
        progress: 100,
        isPrimary: false,
      },
      {
        id: 'a3',
        name: 'quality',
        role: 'specialist',
        status: 'idle',
        progress: 0,
        isPrimary: false,
      },
    ];
    const { lastFrame } = render(<TestComponent agents={agents} />);

    expect(lastFrame()).toContain('"active":1');
    expect(lastFrame()).toContain('"idle":2');
  });

  it('should track primary agent when running', () => {
    const agents: AgentState[] = [
      {
        id: 'a1',
        name: 'security',
        role: 'specialist',
        status: 'running',
        progress: 0,
        isPrimary: true,
      },
      {
        id: 'a2',
        name: 'perf',
        role: 'specialist',
        status: 'running',
        progress: 0,
        isPrimary: false,
      },
    ];
    const { lastFrame } = render(<TestComponent agents={agents} />);

    expect(lastFrame()).toContain('"primary":"security"');
  });

  it('should return null primary when primary agent is not running', () => {
    const agents: AgentState[] = [
      {
        id: 'a1',
        name: 'security',
        role: 'specialist',
        status: 'completed',
        progress: 100,
        isPrimary: true,
      },
    ];
    const { lastFrame } = render(<TestComponent agents={agents} />);

    expect(lastFrame()).toContain('"primary":null');
  });

  it('should return null primary when no agents have isPrimary', () => {
    const agents: AgentState[] = [
      {
        id: 'a1',
        name: 'security',
        role: 'specialist',
        status: 'running',
        progress: 0,
        isPrimary: false,
      },
    ];
    const { lastFrame } = render(<TestComponent agents={agents} />);

    expect(lastFrame()).toContain('"primary":null');
  });
});
