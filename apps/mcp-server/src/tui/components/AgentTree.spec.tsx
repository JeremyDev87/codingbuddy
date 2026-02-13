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

  it('should render only primary AgentCard when no parallel agents', () => {
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
    expect(frame).toContain('soluti…');
    expect(frame).toContain('Running');
    // Should NOT contain tree connectors
    expect(frame).not.toContain('┌');
  });

  it('should render tree with single parallel agent', () => {
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
    ];
    const { lastFrame } = render(
      <AgentTree primaryAgent={primary} parallelAgents={parallel} />,
    );
    const frame = lastFrame() ?? '';
    // Primary card should be present
    expect(frame).toContain('Running');
    // Vertical connector between primary and parallel
    expect(frame).toContain('│');
    // Parallel card name (abbreviateName with maxLength=7: 'test-s…')
    // Use a substring that will definitely appear in the frame
    expect(frame).toContain('test-s');
  });

  it('should render tree with multiple parallel agents', () => {
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
      }),
      createDefaultAgentState({
        id: 's2',
        name: 'security-specialist',
        role: 'specialist',
        status: 'idle',
      }),
      createDefaultAgentState({
        id: 's3',
        name: 'performance-specialist',
        role: 'specialist',
        status: 'completed',
      }),
    ];
    const { lastFrame } = render(
      <AgentTree primaryAgent={primary} parallelAgents={parallel} />,
    );
    const frame = lastFrame() ?? '';
    // Branch line characters (only shown for 2+ parallel agents)
    expect(frame).toContain('┌');
    expect(frame).toContain('┬');
    expect(frame).toContain('┐');
    expect(frame).toContain('─');
    // All parallel cards should be rendered (check unique substrings)
    expect(frame).toContain('Idle');
    expect(frame).toContain('Done');
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

    // Initially no parallel agents - no branch characters
    expect(lastFrame()).not.toContain('┌');

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
    expect(frame).toContain('┌');
    expect(frame).toContain('┐');
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

    expect(lastFrame()).toContain('┌');

    // Remove all parallel agents
    rerender(<AgentTree primaryAgent={primary} parallelAgents={[]} />);

    const frame = lastFrame() ?? '';
    expect(frame).not.toContain('┌');
  });
});
