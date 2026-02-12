import React from 'react';
import { render } from 'ink';
import { App } from './app';

/**
 * Start the TUI Agent Monitor
 * Renders the Ink application to the terminal
 */
export function startTui(): void {
  render(<App />);
}

export { App } from './app';
export * from './types';
