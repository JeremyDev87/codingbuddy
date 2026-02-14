import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { AgentTree } from './AgentTree';
import { createDefaultAgentState } from '../types';

vi.mock('../utils/icons', async importOriginal => {
  const actual = await importOriginal<typeof import('../utils/icons')>();
  return {
    ...actual,
    isNerdFontEnabled: () => false,
  };
});

describe('tui/components/AgentTree', () => {
  it('should render nothing when primaryAgent is null', () => {
    const { lastFrame } = render(
      <AgentTree primaryAgent={null} parallelAgents={[]} />,
    );
    expect(lastFrame()).toBe('');
  });

  it('should render compact tree with only primary agent', () => {
    const primary = createDefaultAgentState({
      id: 'p1',
      name: 'solution-architect',
      role: 'primary',
      isPrimary: true,
      status: 'running',
    });
    const { lastFrame } = render(
      <AgentTree primaryAgent={primary} parallelAgents={[]} />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('\u250c Primary');
    expect(frame).toContain('\u2514');
    expect(frame).toContain('solution-architect');
    expect(frame).toContain('Running');
    // No bordered box characters
    expect(frame).not.toContain('\u256d'); // ╭
    expect(frame).not.toContain('\u2570'); // ╰
  });

  it('should render compact tree with parallel agents', () => {
    const primary = createDefaultAgentState({
      id: 'p1',
      name: 'solution-architect',
      role: 'primary',
      isPrimary: true,
      status: 'running',
    });
    const parallel = [
      createDefaultAgentState({
        id: 's1',
        name: 'test-strategy-specialist',
        role: 'specialist',
        status: 'running',
        progress: 50,
      }),
      createDefaultAgentState({
        id: 's2',
        name: 'security-specialist',
        role: 'specialist',
        status: 'idle',
      }),
    ];
    const { lastFrame } = render(
      <AgentTree primaryAgent={primary} parallelAgents={parallel} />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('\u250c Primary');
    expect(frame).toContain('\u251c\u2500 Parallel');
    expect(frame).toContain('\u2514');
    // Check agent names are present
    expect(frame).toContain('solution-architect');
    expect(frame).toContain('test-strategy-special\u2026');
    expect(frame).toContain('security-specialist');
    // Check statuses
    expect(frame).toContain('Running');
    expect(frame).toContain('Idle');
  });

  it('should render completed agents with checkmark icon', () => {
    const primary = createDefaultAgentState({
      id: 'p1',
      name: 'solution-architect',
      role: 'primary',
      isPrimary: true,
      status: 'completed',
      progress: 100,
    });
    const { lastFrame } = render(
      <AgentTree primaryAgent={primary} parallelAgents={[]} />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('\u2713'); // checkmark
    expect(frame).toContain('Done');
    expect(frame).toContain('100%');
  });

  it('should re-render when parallel agents are added', () => {
    const primary = createDefaultAgentState({
      id: 'p1',
      name: 'solution-architect',
      role: 'primary',
      isPrimary: true,
      status: 'running',
    });
    const { lastFrame, rerender } = render(
      <AgentTree primaryAgent={primary} parallelAgents={[]} />,
    );

    // Initially no parallel agents - no Parallel section
    expect(lastFrame()).not.toContain('\u251c\u2500 Parallel');

    // Add parallel agents
    const parallel = [
      createDefaultAgentState({
        id: 's1',
        name: 'security-specialist',
        role: 'specialist',
        status: 'running',
      }),
      createDefaultAgentState({
        id: 's2',
        name: 'test-strategy-specialist',
        role: 'specialist',
        status: 'running',
      }),
    ];
    rerender(<AgentTree primaryAgent={primary} parallelAgents={parallel} />);

    const frame = lastFrame() ?? '';
    expect(frame).toContain('\u250c Primary');
    expect(frame).toContain('\u251c\u2500 Parallel');
    expect(frame).toContain('\u2514');
  });

  it('should re-render when parallel agents are removed', () => {
    const primary = createDefaultAgentState({
      id: 'p1',
      name: 'solution-architect',
      role: 'primary',
      isPrimary: true,
      status: 'running',
    });
    const parallel = [
      createDefaultAgentState({
        id: 's1',
        name: 'security-specialist',
        role: 'specialist',
        status: 'running',
      }),
      createDefaultAgentState({
        id: 's2',
        name: 'test-strategy-specialist',
        role: 'specialist',
        status: 'running',
      }),
    ];
    const { lastFrame, rerender } = render(
      <AgentTree primaryAgent={primary} parallelAgents={parallel} />,
    );

    expect(lastFrame()).toContain('\u251c\u2500 Parallel');

    // Remove all parallel agents
    rerender(<AgentTree primaryAgent={primary} parallelAgents={[]} />);

    const frame = lastFrame() ?? '';
    expect(frame).not.toContain('\u251c\u2500 Parallel');
    // Should still show primary
    expect(frame).toContain('\u250c Primary');
  });
});
