import React from 'react';
import { render } from 'ink';
import type { Instance, RenderOptions } from 'ink';
import { DashboardApp } from './dashboard-app';
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
  return render(<DashboardApp eventBus={options.eventBus} />, renderOptions);
}

export { DashboardApp } from './dashboard-app';
export type { DashboardAppProps } from './dashboard-app';
export * from './types';
export * from './dashboard-types';
export { useDashboardState } from './hooks';
export { useTerminalSize } from './hooks';
export { useClock } from './hooks';
