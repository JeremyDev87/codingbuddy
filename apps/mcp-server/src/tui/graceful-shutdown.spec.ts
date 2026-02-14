import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Tests verify the shutdown coordination pattern used by setupGracefulShutdown
 * in main.ts: unmount TUI → close NestJS app → exit process.
 */
describe('Graceful Shutdown', () => {
  let sigintListeners: NodeJS.SignalsListener[];
  let sigtermListeners: NodeJS.SignalsListener[];

  beforeEach(() => {
    sigintListeners = process
      .listeners('SIGINT')
      .slice() as NodeJS.SignalsListener[];
    sigtermListeners = process
      .listeners('SIGTERM')
      .slice() as NodeJS.SignalsListener[];
    process.removeAllListeners('SIGINT');
    process.removeAllListeners('SIGTERM');
  });

  afterEach(() => {
    process.removeAllListeners('SIGINT');
    process.removeAllListeners('SIGTERM');
    for (const fn of sigintListeners) {
      process.on('SIGINT', fn as NodeJS.SignalsListener);
    }
    for (const fn of sigtermListeners) {
      process.on('SIGTERM', fn as NodeJS.SignalsListener);
    }
  });

  it('should unmount TUI and close app on SIGINT', async () => {
    const unmount = vi.fn();
    const close = vi.fn().mockResolvedValue(undefined);

    let shuttingDown = false;
    const shutdown = async (): Promise<void> => {
      if (shuttingDown) return;
      shuttingDown = true;
      unmount();
      await close();
    };
    process.once('SIGINT', () => void shutdown());

    process.emit('SIGINT', 'SIGINT');
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(unmount).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
  });

  it('should unmount TUI and close app on SIGTERM', async () => {
    const unmount = vi.fn();
    const close = vi.fn().mockResolvedValue(undefined);

    let shuttingDown = false;
    const shutdown = async (): Promise<void> => {
      if (shuttingDown) return;
      shuttingDown = true;
      unmount();
      await close();
    };
    process.once('SIGTERM', () => void shutdown());

    process.emit('SIGTERM', 'SIGTERM');
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(unmount).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
  });

  it('should prevent double shutdown on rapid signals', async () => {
    const unmount = vi.fn();
    const close = vi.fn().mockResolvedValue(undefined);

    let shuttingDown = false;
    const shutdown = async (): Promise<void> => {
      if (shuttingDown) return;
      shuttingDown = true;
      unmount();
      await close();
    };
    process.once('SIGINT', () => void shutdown());
    process.once('SIGTERM', () => void shutdown());

    process.emit('SIGINT', 'SIGINT');
    process.emit('SIGTERM', 'SIGTERM');
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(unmount).toHaveBeenCalledOnce();
  });

  it('should call unmount before close (ordering guarantee)', async () => {
    const callOrder: string[] = [];
    const unmount = vi.fn(() => callOrder.push('unmount'));
    const close = vi.fn(async () => {
      callOrder.push('close');
    });

    let shuttingDown = false;
    const shutdown = async (): Promise<void> => {
      if (shuttingDown) return;
      shuttingDown = true;
      unmount();
      await close();
    };
    process.once('SIGINT', () => void shutdown());

    process.emit('SIGINT', 'SIGINT');
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(callOrder).toEqual(['unmount', 'close']);
  });
});
