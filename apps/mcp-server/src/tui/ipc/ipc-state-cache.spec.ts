import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IpcStateCache } from './ipc-state-cache';
import type { StateCacheEventBus } from './ipc-state-cache';

function createMockEventBus(): StateCacheEventBus & {
  emit: (event: string, payload: unknown) => void;
} {
  const listeners = new Map<string, Set<(payload: unknown) => void>>();
  return {
    on(event: string, handler: (payload: unknown) => void): void {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(handler);
    },
    off(event: string, handler: (payload: unknown) => void): void {
      listeners.get(event)?.delete(handler);
    },
    emit(event: string, payload: unknown): void {
      for (const h of listeners.get(event) ?? []) h(payload);
    },
  };
}

describe('IpcStateCache', () => {
  let bus: ReturnType<typeof createMockEventBus>;
  let cache: IpcStateCache;

  beforeEach(() => {
    bus = createMockEventBus();
    cache = new IpcStateCache(bus);
  });

  describe('trackSimple', () => {
    it('should cache last payload for simple events', () => {
      cache.trackSimple('mode:changed');
      bus.emit('mode:changed', { from: null, to: 'PLAN' });

      const snapshot = cache.getSnapshot();
      expect(snapshot).toHaveLength(1);
      expect(snapshot[0].type).toBe('mode:changed');
      expect(snapshot[0].payload).toEqual({ from: null, to: 'PLAN' });
    });

    it('should overwrite with latest payload', () => {
      cache.trackSimple('mode:changed');
      bus.emit('mode:changed', { from: null, to: 'PLAN' });
      bus.emit('mode:changed', { from: 'PLAN', to: 'ACT' });

      const snapshot = cache.getSnapshot();
      expect(snapshot).toHaveLength(1);
      expect(snapshot[0].payload).toEqual({ from: 'PLAN', to: 'ACT' });
    });

    it('should track multiple simple events independently', () => {
      cache.trackSimple('mode:changed');
      cache.trackSimple('agents:loaded');
      bus.emit('mode:changed', { from: null, to: 'PLAN' });
      bus.emit('agents:loaded', { agents: [] });

      expect(cache.getSnapshot()).toHaveLength(2);
    });
  });

  describe('trackCompound', () => {
    const keyFn = (p: unknown) => (p as { agentId: string }).agentId;

    it('should cache per-entity with compound keys', () => {
      cache.trackCompound('agent:activated', 'agent:deactivated', keyFn);
      bus.emit('agent:activated', { agentId: 'arch', name: 'architecture' });
      bus.emit('agent:activated', { agentId: 'sec', name: 'security' });

      const snapshot = cache.getSnapshot();
      expect(snapshot).toHaveLength(2);
      expect(
        snapshot.map(m => (m.payload as { agentId: string }).agentId).sort(),
      ).toEqual(['arch', 'sec']);
    });

    it('should remove entity on deactivate event', () => {
      cache.trackCompound('agent:activated', 'agent:deactivated', keyFn);
      bus.emit('agent:activated', { agentId: 'arch', name: 'architecture' });
      bus.emit('agent:activated', { agentId: 'sec', name: 'security' });
      bus.emit('agent:deactivated', {
        agentId: 'arch',
        reason: 'done',
        durationMs: 100,
      });

      const snapshot = cache.getSnapshot();
      expect(snapshot).toHaveLength(1);
      expect((snapshot[0].payload as { agentId: string }).agentId).toBe('sec');
    });
  });

  describe('trackToggle', () => {
    it('should cache on start, clear on end', () => {
      cache.trackToggle('parallel:started', 'parallel:completed');
      bus.emit('parallel:started', {
        specialists: ['arch', 'sec'],
        mode: 'PLAN',
      });

      expect(cache.getSnapshot()).toHaveLength(1);
      expect(cache.getSnapshot()[0].type).toBe('parallel:started');

      bus.emit('parallel:completed', {
        specialists: ['arch', 'sec'],
        results: {},
      });
      expect(cache.getSnapshot()).toHaveLength(0);
    });

    it('should update cached value on repeated starts', () => {
      cache.trackToggle('parallel:started', 'parallel:completed');
      bus.emit('parallel:started', { specialists: ['arch'] });
      bus.emit('parallel:started', { specialists: ['arch', 'sec'] });

      const snapshot = cache.getSnapshot();
      expect(snapshot).toHaveLength(1);
      expect(
        (snapshot[0].payload as { specialists: string[] }).specialists,
      ).toEqual(['arch', 'sec']);
    });
  });

  describe('getSnapshot', () => {
    it('should return empty array when nothing is cached', () => {
      expect(cache.getSnapshot()).toEqual([]);
    });

    it('should return combined state from all tracking strategies', () => {
      const keyFn = (p: unknown) => (p as { agentId: string }).agentId;
      cache.trackSimple('mode:changed');
      cache.trackCompound('agent:activated', 'agent:deactivated', keyFn);
      cache.trackToggle('parallel:started', 'parallel:completed');

      bus.emit('mode:changed', { from: null, to: 'PLAN' });
      bus.emit('agent:activated', { agentId: 'arch' });
      bus.emit('parallel:started', { specialists: ['arch'] });

      expect(cache.getSnapshot()).toHaveLength(3);
    });
  });

  describe('destroy', () => {
    it('should remove all listeners and clear cache', () => {
      const offSpy = vi.spyOn(bus, 'off');
      cache.trackSimple('mode:changed');
      cache.trackCompound(
        'agent:activated',
        'agent:deactivated',
        (p: unknown) => (p as { agentId: string }).agentId,
      );
      cache.trackToggle('parallel:started', 'parallel:completed');

      bus.emit('mode:changed', { from: null, to: 'PLAN' });
      expect(cache.getSnapshot()).not.toHaveLength(0);

      cache.destroy();

      expect(cache.getSnapshot()).toEqual([]);
      // 1 simple + 2 compound + 2 toggle = 5 listeners removed
      expect(offSpy).toHaveBeenCalledTimes(5);

      // Events after destroy should not affect cache
      bus.emit('mode:changed', { from: 'PLAN', to: 'ACT' });
      expect(cache.getSnapshot()).toEqual([]);
    });
  });
});
