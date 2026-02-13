import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { App } from './app';
import { TuiEventBus, TUI_EVENTS } from './events';

vi.mock('./utils/icons', async importOriginal => {
  const actual = await importOriginal<typeof import('./utils/icons')>();
  return {
    ...actual,
    isNerdFontEnabled: () => false,
  };
});

const tick = () => new Promise(resolve => setTimeout(resolve, 0));

describe('tui/App', () => {
  it('should render the application title', () => {
    const { lastFrame } = render(<App />);
    expect(lastFrame()).toContain('CODINGBUDDY');
  });

  it('should render without errors', () => {
    expect(() => render(<App />)).not.toThrow();
  });

  it('should accept eventBus prop without errors', () => {
    const eventBus = new TuiEventBus();
    expect(() => render(<App eventBus={eventBus} />)).not.toThrow();
  });

  it('should display mode when eventBus emits MODE_CHANGED', async () => {
    const eventBus = new TuiEventBus();
    const { lastFrame } = render(<App eventBus={eventBus} />);

    eventBus.emit(TUI_EVENTS.MODE_CHANGED, { from: null, to: 'PLAN' });
    await tick();

    expect(lastFrame()).toContain('PLAN');
  });

  it('should render AgentTree when agents are activated', async () => {
    const eventBus = new TuiEventBus();
    const { lastFrame } = render(<App eventBus={eventBus} />);

    // Activate primary agent
    eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
      agentId: 'p1',
      name: 'solution-architect',
      role: 'primary',
      isPrimary: true,
    });
    await tick();

    // Activate parallel agents
    eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
      agentId: 's1',
      name: 'security-specialist',
      role: 'specialist',
      isPrimary: false,
    });
    eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
      agentId: 's2',
      name: 'test-strategy-specialist',
      role: 'specialist',
      isPrimary: false,
    });
    await tick();

    const frame = lastFrame() ?? '';
    // Primary agent card should be rendered
    expect(frame).toContain('soluti');
    // Parallel agent cards should be rendered
    expect(frame).toContain('securi');
    expect(frame).toContain('test-s');
  });
});
