import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { DashboardApp } from './dashboard-app';
import { TuiEventBus, TUI_EVENTS } from './events';
import { createInitialDashboardState } from './hooks/use-dashboard-state';

vi.mock('./utils/icons', async importOriginal => {
  const actual = await importOriginal<typeof import('./utils/icons')>();
  return { ...actual, isNerdFontEnabled: () => false };
});

vi.mock('./hooks/use-tick', () => ({
  useTick: () => 0,
}));

const tick = () => new Promise(resolve => setTimeout(resolve, 0));

describe('DashboardApp', () => {
  it('renders without eventBus (idle state)', () => {
    const { lastFrame } = render(<DashboardApp />);
    const frame = lastFrame() ?? '';
    expect(frame).toContain('CODINGBUDDY');
    expect(frame).toContain('IDLE');
  });

  it('shows RUNNING state when agent is activated', async () => {
    const eventBus = new TuiEventBus();
    const { lastFrame } = render(<DashboardApp eventBus={eventBus} />);
    await tick(); // ensure useEffect subscribes before emitting

    eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
      agentId: 'arch-1',
      name: 'solution-architect',
      role: 'primary',
      isPrimary: true,
    });
    await tick();

    const frame = lastFrame() ?? '';
    expect(frame).toContain('RUNNING');
    expect(frame).toContain('solution-arch');
  });

  it('shows IDLE after all agents deactivated', async () => {
    const eventBus = new TuiEventBus();
    const { lastFrame } = render(<DashboardApp eventBus={eventBus} />);
    await tick(); // ensure useEffect subscribes before emitting

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
    await tick(); // ensure useEffect subscribes before emitting

    eventBus.emit(TUI_EVENTS.MODE_CHANGED, { from: null, to: 'PLAN' });
    await tick();

    const frame = lastFrame() ?? '';
    expect(frame).toBeTruthy();
    expect(frame).toContain('PLAN');
  });

  it('shows multiple agents in FlowMap', async () => {
    const eventBus = new TuiEventBus();
    const { lastFrame } = render(<DashboardApp eventBus={eventBus} />);
    await tick(); // ensure useEffect subscribes before emitting

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
    expect(frame).toContain('solution-arch');
    // FlowMap truncates non-focused agent names in 17-char-wide boxes
    expect(frame).toContain('security-');
  });

  it('shows focused agent in FocusedAgentPanel without Tools/IO section', async () => {
    const eventBus = new TuiEventBus();
    const { lastFrame } = render(<DashboardApp eventBus={eventBus} />);
    await tick();

    eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
      agentId: 'a1',
      name: 'test-agent',
      role: 'primary',
      isPrimary: true,
    });
    await tick();

    eventBus.emit(TUI_EVENTS.TOOL_INVOKED, {
      toolName: 'file_edit',
      agentId: 'a1',
      timestamp: Date.now(),
    });
    await tick();

    const frame = lastFrame() ?? '';
    // Tools/IO section should not be visible
    expect(frame).not.toContain('IN :');
    expect(frame).not.toContain('─── Tools / IO');
  });

  it('focuses on primary running agent', async () => {
    const eventBus = new TuiEventBus();
    const { lastFrame } = render(<DashboardApp eventBus={eventBus} />);
    await tick(); // ensure useEffect subscribes before emitting

    eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
      agentId: 'p1',
      name: 'solution-architect',
      role: 'primary',
      isPrimary: true,
    });
    await tick();

    const frame = lastFrame() ?? '';
    // FocusedAgentPanel should show the primary agent details
    expect(frame).toContain('solution-arch');
    expect(frame).toContain('Objective');
  });

  it('should use workspace prop over state.workspace when provided', () => {
    const mockState = createInitialDashboardState();
    mockState.workspace = '/from-state';

    const { lastFrame } = render(<DashboardApp externalState={mockState} workspace="/from-prop" />);
    const frame = lastFrame() ?? '';
    expect(frame).toContain('/from-prop');
    expect(frame).not.toContain('/from-state');
  });

  it('memoizes now based on tick to avoid non-deterministic re-renders', () => {
    const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(1700000000000);

    const state = createInitialDashboardState();
    const { lastFrame, rerender } = render(<DashboardApp externalState={state} />);
    const frame1 = lastFrame() ?? '';

    // Advance Date.now() by 1 minute — but tick has NOT changed (still 0 from mock)
    dateNowSpy.mockReturnValue(1700000060000);
    rerender(<DashboardApp externalState={state} />);
    const frame2 = lastFrame() ?? '';

    // With useMemo([tick]): now stays cached → frames identical
    // Without useMemo: now = Date.now() changes → time display differs
    expect(frame1).toBe(frame2);

    dateNowSpy.mockRestore();
  });

  it('should use externalState when provided (multi-session mode)', () => {
    const mockState = createInitialDashboardState();
    // Modify some fields to verify they propagate
    mockState.workspace = '/ext';
    mockState.globalState = 'RUNNING';
    mockState.currentMode = 'ACT';

    const { lastFrame } = render(<DashboardApp externalState={mockState} />);
    const frame = lastFrame() ?? '';
    // Verify externalState fields are rendered (workspace, globalState, currentMode)
    expect(frame).toContain('/ext');
    expect(frame).toContain('RUNNING');
    expect(frame).toContain('ACT');
  });
});
