import React from 'react';
import { render } from 'ink';
import type { Instance, RenderOptions } from 'ink';
import { App } from './app';
import type { TuiEventBus } from './events';

export interface StartTuiOptions {
  eventBus: TuiEventBus;
  stdout?: NodeJS.WriteStream;
}

/**
 * Start the TUI Agent Monitor
 * Returns Ink instance for lifecycle management (e.g. unmount on shutdown)
 */
export function startTui(options: StartTuiOptions): Instance {
  const renderOptions: RenderOptions = options.stdout ? { stdout: options.stdout } : {};
  return render(<App eventBus={options.eventBus} />, renderOptions);
}

export { App } from './app';
export type { AppProps } from './app';
export * from './types';
export { useEventBus, useAgentState } from './hooks';
export type { EventBusState, AgentStateView } from './hooks';
