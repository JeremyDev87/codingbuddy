import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { DashboardApp } from './dashboard-app';
import { TuiEventBus, TUI_EVENTS } from './events';

vi.mock('./utils/icons', async importOriginal => {
  const actual = await importOriginal<typeof import('./utils/icons')>();
  return { ...actual, isNerdFontEnabled: () => false };
});

const tick = () => new Promise(resolve => setTimeout(resolve, 0));

describe('DashboardApp', () => {
  it('renders without eventBus (idle state)', () => {
    const { lastFrame } = render(<DashboardApp />);
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Codingbuddy TUI');
    expect(frame).toContain('IDLE');
  });

  it('shows RUNNING state when agent is activated', async () => {
    const eventBus = new TuiEventBus();
    const { lastFrame } = render(<DashboardApp eventBus={eventBus} />);

    eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
      agentId: 'arch-1',
      name: 'solution-architect',
      role: 'primary',
      isPrimary: true,
    });
    await tick();

    const frame = lastFrame() ?? '';
    expect(frame).toContain('RUNNING');
    expect(frame).toContain('solution-architect');
  });

  it('shows IDLE after all agents deactivated', async () => {
    const eventBus = new TuiEventBus();
    const { lastFrame } = render(<DashboardApp eventBus={eventBus} />);

    eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
      agentId: 'a1',
      name: 'test-agent',
      role: 'primary',
      isPrimary: true,
    });
    await tick();
    expect(lastFrame()).toContain('RUNNING');

    eventBus.emit(TUI_EVENTS.AGENT_DEACTIVATED, {
      agentId: 'a1',
      reason: 'completed',
      durationMs: 100,
    });
    await tick();
    expect(lastFrame()).toContain('IDLE');
  });

  it('handles mode change events', async () => {
    const eventBus = new TuiEventBus();
    const { lastFrame } = render(<DashboardApp eventBus={eventBus} />);

    eventBus.emit(TUI_EVENTS.MODE_CHANGED, { from: null, to: 'PLAN' });
    await tick();

    const frame = lastFrame() ?? '';
    expect(frame).toBeTruthy();
    expect(frame).toContain('PLAN');
  });

  it('shows multiple agents in FlowMap', async () => {
    const eventBus = new TuiEventBus();
    const { lastFrame } = render(<DashboardApp eventBus={eventBus} />);

    eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
      agentId: 'p1',
      name: 'solution-architect',
      role: 'primary',
      isPrimary: true,
    });
    eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
      agentId: 's1',
      name: 'security-specialist',
      role: 'specialist',
      isPrimary: false,
    });
    await tick();

    const frame = lastFrame() ?? '';
    expect(frame).toContain('RUNNING');
    expect(frame).toContain('solution-architect');
    // FlowMap truncates non-focused agent names in 17-char-wide boxes
    expect(frame).toContain('security-');
  });

  it('focuses on primary running agent', async () => {
    const eventBus = new TuiEventBus();
    const { lastFrame } = render(<DashboardApp eventBus={eventBus} />);

    eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
      agentId: 'p1',
      name: 'solution-architect',
      role: 'primary',
      isPrimary: true,
    });
    await tick();

    const frame = lastFrame() ?? '';
    // FocusedAgentPanel should show the primary agent details
    expect(frame).toContain('solution-architect');
    expect(frame).toContain('Objective');
  });
});
