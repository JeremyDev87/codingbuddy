import React from 'react';
import { render } from 'ink';
import type { Instance, RenderOptions } from 'ink';
import { DashboardApp } from './dashboard-app';
import { MultiSessionApp } from './multi-session-app';
import type { TuiEventBus } from './events';
import type { MultiSessionManager } from './ipc/multi-session-manager';

export interface StartTuiOptions {
  eventBus: TuiEventBus;
  stdout?: NodeJS.WriteStream;
}

/**
 * Start the TUI Agent Monitor (single-session / embedded mode)
 * Returns Ink instance for lifecycle management (e.g. unmount on shutdown)
 */
export function startTui(options: StartTuiOptions): Instance {
  const renderOptions: RenderOptions = options.stdout ? { stdout: options.stdout } : {};
  return render(<DashboardApp eventBus={options.eventBus} />, renderOptions);
}

/**
 * Render multi-session TUI that manages multiple MCP server connections.
 * Returns Ink instance for lifecycle management (e.g. unmount on shutdown)
 */
export function renderMultiSession(options: { manager: MultiSessionManager }): Instance {
  return render(<MultiSessionApp manager={options.manager} />);
}

export { DashboardApp } from './dashboard-app';
export type { DashboardAppProps } from './dashboard-app';
export { MultiSessionApp } from './multi-session-app';
export type { MultiSessionAppProps } from './multi-session-app';
export * from './types';
export * from './dashboard-types';
export { useDashboardState } from './hooks';
export { useTerminalSize } from './hooks';
export { useClock } from './hooks';
