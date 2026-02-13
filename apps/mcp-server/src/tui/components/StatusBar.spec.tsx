import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { StatusBar } from './StatusBar';
import type { AgentState } from '../types';
import type { SkillRecommendedEvent } from '../events/types';

const makeAgent = (overrides: Partial<AgentState> = {}): AgentState => ({
  id: 'a1',
  name: 'test-agent',
  role: 'specialist',
  status: 'running',
  progress: 50,
  isPrimary: false,
  ...overrides,
});

describe('tui/components/StatusBar', () => {
  it('should render without errors', () => {
    expect(() =>
      render(<StatusBar agents={[]} skills={[]} isParallelPhase={false} />),
    ).not.toThrow();
  });

  it('should display active agent count', () => {
    const agents = [
      makeAgent({ id: 'a1', status: 'running' }),
      makeAgent({ id: 'a2', status: 'running' }),
      makeAgent({ id: 'a3', status: 'completed' }),
    ];
    const { lastFrame } = render(
      <StatusBar agents={agents} skills={[]} isParallelPhase={false} />,
    );
    expect(lastFrame()).toContain('2 active');
  });

  it('should display active skill name', () => {
    const skills: SkillRecommendedEvent[] = [
      { skillName: 'brainstorming', reason: 'r1' },
    ];
    const { lastFrame } = render(
      <StatusBar agents={[]} skills={skills} isParallelPhase={false} />,
    );
    expect(lastFrame()).toContain('brainstorming');
  });

  it('should display overall progress bar', () => {
    const agents = [makeAgent({ id: 'a1', status: 'running', progress: 100 })];
    const { lastFrame } = render(
      <StatusBar agents={agents} skills={[]} isParallelPhase={false} />,
    );
    expect(lastFrame()).toContain('██████████');
    expect(lastFrame()).toContain('100%');
  });

  it('should display phase label', () => {
    const agents = [makeAgent({ id: 'a1', status: 'running' })];
    const { lastFrame } = render(
      <StatusBar agents={agents} skills={[]} isParallelPhase={true} />,
    );
    expect(lastFrame()).toContain('Parallel Phase');
  });

  it('should display Waiting phase when no agents active', () => {
    const { lastFrame } = render(
      <StatusBar agents={[]} skills={[]} isParallelPhase={false} />,
    );
    expect(lastFrame()).toContain('Waiting');
  });

  it('should display Sequential phase for non-parallel active agents', () => {
    const agents = [makeAgent({ id: 'a1', status: 'running' })];
    const { lastFrame } = render(
      <StatusBar agents={agents} skills={[]} isParallelPhase={false} />,
    );
    expect(lastFrame()).toContain('Sequential');
  });
});
