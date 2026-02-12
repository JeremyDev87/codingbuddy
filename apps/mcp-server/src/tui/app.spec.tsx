import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { App } from './app';
import { TuiEventBus } from './events';

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
});
