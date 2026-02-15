import { describe, it, expect, vi } from 'vitest';
import { ShutdownManager } from './shutdown-manager';

describe('ShutdownManager', () => {
  it('should execute all registered cleanup functions on shutdown', async () => {
    const manager = new ShutdownManager();
    const fn1 = vi.fn().mockResolvedValue(undefined);
    const fn2 = vi.fn().mockResolvedValue(undefined);
    manager.register(fn1);
    manager.register(fn2);

    await manager.shutdown();

    expect(fn1).toHaveBeenCalledOnce();
    expect(fn2).toHaveBeenCalledOnce();
  });

  it('should only execute shutdown once (idempotent)', async () => {
    const manager = new ShutdownManager();
    const fn = vi.fn().mockResolvedValue(undefined);
    manager.register(fn);

    await manager.shutdown();
    await manager.shutdown();

    expect(fn).toHaveBeenCalledOnce();
  });

  it('should continue other cleanups even if one fails', async () => {
    const manager = new ShutdownManager();
    const fn1 = vi.fn().mockRejectedValue(new Error('fail'));
    const fn2 = vi.fn().mockResolvedValue(undefined);
    manager.register(fn1);
    manager.register(fn2);

    await manager.shutdown();

    expect(fn1).toHaveBeenCalledOnce();
    expect(fn2).toHaveBeenCalledOnce();
  });

  it('should report isShuttingDown state', async () => {
    const manager = new ShutdownManager();
    expect(manager.isShuttingDown()).toBe(false);
    await manager.shutdown();
    expect(manager.isShuttingDown()).toBe(true);
  });
});
