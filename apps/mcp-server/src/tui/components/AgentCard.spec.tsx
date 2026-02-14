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
  it('should render inline format with name, percentage, and status', () => {
    const agent = createDefaultAgentState({
      id: '1',
      name: 'test-agent',
      role: 'specialist',
      status: 'running',
      progress: 50,
    });
    const { lastFrame } = render(<AgentCard agent={agent} />);
    const output = lastFrame() ?? '';
    // Single line with name, progress bar, percentage, status
    expect(output).toContain('test-agent');
    expect(output).toContain('50%');
    expect(output).toContain('Running');
    // No border characters
    expect(output).not.toContain('\u256D'); // ╭
    expect(output).not.toContain('\u2570'); // ╰
  });

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
    const output = lastFrame() ?? '';
    expect(output).toContain(
      '\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591',
    ); // 10 empty chars
    expect(output).toContain('Idle');
    expect(output).toContain('0%');
  });

  it('should render running state with progress bar and percentage', () => {
    const agent = createDefaultAgentState({
      id: '1',
      name: 'security-specialist',
      role: 'specialist',
      status: 'running',
      progress: 50,
    });
    const { lastFrame } = render(<AgentCard agent={agent} />);
    const output = lastFrame() ?? '';
    expect(output).toContain('Running');
    expect(output).toContain('50%');
    expect(output).toContain('\u2593'); // filled chars
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
    const output = lastFrame() ?? '';
    expect(output).toContain(
      '\u2593\u2593\u2593\u2593\u2593\u2593\u2593\u2593\u2593\u2593',
    ); // 10 filled chars
    expect(output).toContain('Done');
    expect(output).toContain('100%');
    expect(output).toContain('\u2713'); // checkmark
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
    const output = lastFrame() ?? '';
    expect(output).toContain('Failed');
    expect(output).toContain('\u2717'); // X mark
    expect(output).toContain('30%');
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

  it('should abbreviate long agent names with ellipsis', () => {
    const agent = createDefaultAgentState({
      id: '1',
      name: 'a-very-long-agent-name-that-exceeds-column-width',
      role: 'specialist',
    });
    const { lastFrame } = render(<AgentCard agent={agent} />);
    const frame = lastFrame() ?? '';
    expect(frame).toContain('\u2026'); // ellipsis
    expect(frame).not.toContain(
      'a-very-long-agent-name-that-exceeds-column-width',
    );
  });
});
