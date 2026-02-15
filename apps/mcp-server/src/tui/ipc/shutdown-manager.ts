import { createIpcDebugLogger } from './ipc-debug';

const shutdownDebug = createIpcDebugLogger('shutdown');

/**
 * Coordinates graceful shutdown across IPC server, TUI, and NestJS app.
 * Ensures all cleanup functions run even if one fails.
 * Prevents double-shutdown via idempotent guard.
 */
export class ShutdownManager {
  private readonly cleanupFns: Array<() => Promise<void>> = [];
  private shuttingDown = false;

  register(fn: () => Promise<void>): void {
    this.cleanupFns.push(fn);
  }

  isShuttingDown(): boolean {
    return this.shuttingDown;
  }

  async shutdown(): Promise<void> {
    if (this.shuttingDown) return;
    this.shuttingDown = true;
    // Run cleanup functions sequentially in registration order.
    // IPC cleanup → TUI unmount → app.close() ordering matters:
    // NestJS DI container must stay alive while IPC/TUI are shutting down.
    for (const fn of this.cleanupFns) {
      try {
        await fn();
      } catch (err) {
        shutdownDebug(`Cleanup step failed (continuing): ${err}`);
      }
    }
  }
}
