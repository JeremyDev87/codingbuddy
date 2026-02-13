import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { AgentCard } from './AgentCard';
import { createDefaultAgentState } from '../types';

// Mock isNerdFontEnabled to return false (use fallback icons)
vi.mock('../utils/icons', async importOriginal => {
  const actual = await importOriginal<typeof import('../utils/icons')>();
  return {
    ...actual,
    isNerdFontEnabled: () => false,
  };
});

describe('tui/components/AgentCard', () => {
  it('should render agent icon', () => {
    const agent = createDefaultAgentState({
      id: '1',
      name: 'test-strategy-specialist',
      role: 'specialist',
    });
    const { lastFrame } = render(<AgentCard agent={agent} />);
    expect(lastFrame()).toContain('[Ts]');
  });

  it('should render idle state with empty progress bar', () => {
    const agent = createDefaultAgentState({
      id: '1',
      name: 'security-specialist',
      role: 'specialist',
      status: 'idle',
    });
    const { lastFrame } = render(<AgentCard agent={agent} />);
    expect(lastFrame()).toContain('░░░░░░░');
    expect(lastFrame()).toContain('Idle');
  });

  it('should render running state with progress bar', () => {
    const agent = createDefaultAgentState({
      id: '1',
      name: 'security-specialist',
      role: 'specialist',
      status: 'running',
      progress: 50,
    });
    const { lastFrame } = render(<AgentCard agent={agent} />);
    expect(lastFrame()).toContain('Running');
    expect(lastFrame()).toContain('███');
  });

  it('should render completed state with full progress bar', () => {
    const agent = createDefaultAgentState({
      id: '1',
      name: 'security-specialist',
      role: 'specialist',
      status: 'completed',
      progress: 60,
    });
    const { lastFrame } = render(<AgentCard agent={agent} />);
    expect(lastFrame()).toContain('███████');
    expect(lastFrame()).toContain('Done');
    expect(lastFrame()).toContain('✓');
  });

  it('should render failed state', () => {
    const agent = createDefaultAgentState({
      id: '1',
      name: 'security-specialist',
      role: 'specialist',
      status: 'failed',
      progress: 30,
    });
    const { lastFrame } = render(<AgentCard agent={agent} />);
    expect(lastFrame()).toContain('Failed');
    expect(lastFrame()).toContain('✗');
  });

  it('should render default icon for unknown agent name', () => {
    const agent = createDefaultAgentState({
      id: '1',
      name: 'unknown-agent',
      role: 'specialist',
    });
    const { lastFrame } = render(<AgentCard agent={agent} />);
    expect(lastFrame()).toContain('[?]');
  });

  it('should abbreviate long agent names', () => {
    const agent = createDefaultAgentState({
      id: '1',
      name: 'architecture-specialist',
      role: 'specialist',
    });
    const { lastFrame } = render(<AgentCard agent={agent} />);
    const frame = lastFrame() ?? '';
    // Name should be truncated, not full "architecture-specialist"
    expect(frame).not.toContain('architecture-specialist');
  });
});
