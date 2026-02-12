import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { App } from './app';
import { TuiEventBus, TUI_EVENTS } from './events';

const tick = () => new Promise(resolve => setTimeout(resolve, 0));

describe('tui/App', () => {
  it('should render the application title', () => {
    const { lastFrame } = render(<App />);
    expect(lastFrame()).toContain('Codingbuddy TUI Agent Monitor');
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

  it('should display active agent name when activated', async () => {
    const eventBus = new TuiEventBus();
    const { lastFrame } = render(<App eventBus={eventBus} />);

    eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
      agentId: 'a1',
      name: 'security-specialist',
      role: 'specialist',
      isPrimary: true,
    });
    await tick();

    expect(lastFrame()).toContain('security-specialist');
  });
});
