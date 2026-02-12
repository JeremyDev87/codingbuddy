import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { App } from './app';

describe('tui/App', () => {
  it('should render the application title', () => {
    const { lastFrame } = render(<App />);
    expect(lastFrame()).toContain('Codingbuddy TUI Agent Monitor');
  });

  it('should render without errors', () => {
    expect(() => render(<App />)).not.toThrow();
  });
});
