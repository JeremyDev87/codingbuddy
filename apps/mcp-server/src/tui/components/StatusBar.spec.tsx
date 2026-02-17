import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { StatusBar } from './StatusBar';
import type { AgentState } from '../types';
import { createDefaultAgentState } from '../types';
import type { SkillRecommendedEvent } from '../events';

function makeAgent(overrides: Partial<AgentState> = {}): AgentState {
  return {
    id: 'a1',
    name: 'test',
    role: 'tester',
    status: 'idle',
    progress: 0,
    isPrimary: false,
    ...overrides,
  };
}

describe('tui/components/StatusBar', () => {
  it('should render single-line status without border', () => {
    const agents = [
      createDefaultAgentState({
        id: '1',
        name: 'agent',
        role: 'r',
        status: 'running',
        progress: 50,
      }),
    ];
    const { lastFrame } = render(<StatusBar agents={agents} skills={[]} />);
    const output = lastFrame() ?? '';
    expect(output).toContain('───');
    expect(output).toContain('🤖 1 active');
    expect(output).toContain('50%');
    // No border characters
    expect(output).not.toContain('┌');
    expect(output).not.toContain('└');
  });

  it('should render active agent count', () => {
    const agents: AgentState[] = [
      makeAgent({ id: 'a1', status: 'running' }),
      makeAgent({ id: 'a2', status: 'running' }),
    ];
    const { lastFrame } = render(<StatusBar agents={agents} skills={[]} />);
    expect(lastFrame()).toContain('2 active');
  });

  it('should render 0 active when no agents running', () => {
    const { lastFrame } = render(<StatusBar agents={[]} skills={[]} />);
    expect(lastFrame()).toContain('0 active');
  });

  it('should render skills display', () => {
    const skills: SkillRecommendedEvent[] = [
      { skillName: 'brainstorming', reason: 'test' },
      { skillName: 'tdd', reason: 'test' },
    ];
    const { lastFrame } = render(<StatusBar agents={[]} skills={skills} />);
    expect(lastFrame()).toContain('brainstorming, tdd');
  });

  it('should render progress bar with ▓░ characters', () => {
    const agents: AgentState[] = [makeAgent({ id: 'a1', status: 'running', progress: 70 })];
    const { lastFrame } = render(<StatusBar agents={agents} skills={[]} />);
    const output = lastFrame() ?? '';
    expect(output).toContain('▓');
    expect(output).toContain('░');
  });

  it('should render progress percentage', () => {
    const agents: AgentState[] = [makeAgent({ id: 'a1', status: 'running', progress: 70 })];
    const { lastFrame } = render(<StatusBar agents={agents} skills={[]} />);
    expect(lastFrame()).toContain('70%');
  });

  it('should render Waiting phase when no agents running', () => {
    const { lastFrame } = render(<StatusBar agents={[]} skills={[]} />);
    expect(lastFrame()).toContain('Waiting');
  });

  it('should render Sequential phase for 1 running agent', () => {
    const agents: AgentState[] = [makeAgent({ id: 'a1', status: 'running' })];
    const { lastFrame } = render(<StatusBar agents={agents} skills={[]} />);
    expect(lastFrame()).toContain('Sequential');
  });

  it('should render Parallel phase for 2+ running agents', () => {
    const agents: AgentState[] = [
      makeAgent({ id: 'a1', status: 'running' }),
      makeAgent({ id: 'a2', status: 'running' }),
    ];
    const { lastFrame } = render(<StatusBar agents={agents} skills={[]} />);
    expect(lastFrame()).toContain('Parallel');
  });

  it('should render dash for empty skills', () => {
    const { lastFrame } = render(<StatusBar agents={[]} skills={[]} />);
    const frame = lastFrame() ?? '';
    expect(frame).toContain('-');
  });
});
