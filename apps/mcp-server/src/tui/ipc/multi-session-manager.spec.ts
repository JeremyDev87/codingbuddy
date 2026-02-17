import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { IpcInstance } from './ipc.types';

// Mock dependencies before importing the class under test
vi.mock('./instance-registry', () => ({
  InstanceRegistry: vi.fn().mockImplementation(() => ({
    list: vi.fn().mockReturnValue([]),
    prune: vi.fn().mockReturnValue(0),
    register: vi.fn(),
    unregister: vi.fn(),
  })),
}));

vi.mock('./ipc-client', () => ({
  TuiIpcClient: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn(),
    onMessage: vi.fn(),
    offMessage: vi.fn(),
    onError: vi.fn(),
    offError: vi.fn(),
    isConnected: vi.fn().mockReturnValue(true),
  })),
}));

vi.mock('../events/event-bus', () => ({
  TuiEventBus: vi.fn().mockImplementation(() => ({
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    once: vi.fn(),
    removeAllListeners: vi.fn(),
    listenerCount: vi.fn(),
  })),
}));

vi.mock('./ipc.types', async importOriginal => {
  const actual = await importOriginal<typeof import('./ipc.types')>();
  return {
    ...actual,
    getSocketPath: vi.fn((pid: number) => `/tmp/codingbuddy-${pid}.sock`),
  };
});

import { MultiSessionManager } from './multi-session-manager';
import { InstanceRegistry } from './instance-registry';
import { TuiIpcClient } from './ipc-client';
import { TuiEventBus } from '../events/event-bus';
import { getSocketPath } from './ipc.types';

function createMockInstance(pid: number, socketPath?: string): IpcInstance {
  return {
    pid,
    socketPath: socketPath ?? `/tmp/codingbuddy-${pid}.sock`,
    projectRoot: `/home/user/project-${pid}`,
    startedAt: new Date().toISOString(),
  };
}

function createMockRegistry(instances: IpcInstance[] = []) {
  const registry = {
    list: vi.fn().mockReturnValue(instances),
    prune: vi.fn().mockReturnValue(0),
    register: vi.fn(),
    unregister: vi.fn(),
  };
  vi.mocked(InstanceRegistry).mockImplementation(function () {
    return registry as unknown as InstanceRegistry;
  } as unknown as () => InstanceRegistry);
  return registry;
}

function createMockClient(shouldConnect = true) {
  return {
    connect: shouldConnect
      ? vi.fn().mockResolvedValue(undefined)
      : vi.fn().mockRejectedValue(new Error('Connection refused')),
    disconnect: vi.fn(),
    onMessage: vi.fn(),
    offMessage: vi.fn(),
    onError: vi.fn(),
    offError: vi.fn(),
    isConnected: vi.fn().mockReturnValue(shouldConnect),
  };
}

function setupClientMock(clients: Map<string, ReturnType<typeof createMockClient>>) {
  vi.mocked(TuiIpcClient).mockImplementation(function (socketPath: string) {
    const existing = clients.get(socketPath);
    if (existing) return existing as unknown as TuiIpcClient;
    const client = createMockClient();
    clients.set(socketPath, client);
    return client as unknown as TuiIpcClient;
  } as unknown as () => TuiIpcClient);
}

function setupEventBusMock() {
  vi.mocked(TuiEventBus).mockImplementation(function () {
    return {
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      once: vi.fn(),
      removeAllListeners: vi.fn(),
      listenerCount: vi.fn(),
    } as unknown as TuiEventBus;
  } as unknown as () => TuiEventBus);
}

describe('MultiSessionManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupEventBusMock();
    vi.mocked(getSocketPath).mockImplementation((pid: number) => `/tmp/codingbuddy-${pid}.sock`);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('connectAll', () => {
    it('should connect to all valid instances and return correct session count', async () => {
      const instances = [createMockInstance(100), createMockInstance(200)];
      createMockRegistry(instances);

      const clients = new Map<string, ReturnType<typeof createMockClient>>();
      setupClientMock(clients);

      const manager = new MultiSessionManager({ registryPath: '/tmp/instances.json' });
      await manager.connectAll();

      const sessions = manager.getSessions();
      expect(sessions).toHaveLength(2);
      expect(sessions[0].instance.pid).toBe(100);
      expect(sessions[1].instance.pid).toBe(200);
      expect(clients.size).toBe(2);
    });

    it('should skip instances that fail to connect', async () => {
      const instances = [createMockInstance(100), createMockInstance(200)];
      createMockRegistry(instances);

      const failClient = createMockClient(false);
      const okClient = createMockClient(true);

      vi.mocked(TuiIpcClient).mockImplementation(function (socketPath: string) {
        if (socketPath.includes('100')) return failClient as unknown as TuiIpcClient;
        return okClient as unknown as TuiIpcClient;
      } as unknown as () => TuiIpcClient);

      const manager = new MultiSessionManager({ registryPath: '/tmp/instances.json' });
      await manager.connectAll();

      const sessions = manager.getSessions();
      expect(sessions).toHaveLength(1);
      expect(sessions[0].instance.pid).toBe(200);
    });

    it('should reject instances with invalid socket paths', async () => {
      const invalidInstance = createMockInstance(100, '/tmp/wrong-path.sock');
      const validInstance = createMockInstance(200);
      createMockRegistry([invalidInstance, validInstance]);

      const clients = new Map<string, ReturnType<typeof createMockClient>>();
      setupClientMock(clients);

      const manager = new MultiSessionManager({ registryPath: '/tmp/instances.json' });
      await manager.connectAll();

      const sessions = manager.getSessions();
      expect(sessions).toHaveLength(1);
      expect(sessions[0].instance.pid).toBe(200);
    });

    it('should call prune before listing instances', async () => {
      const registry = createMockRegistry([]);
      const clients = new Map<string, ReturnType<typeof createMockClient>>();
      setupClientMock(clients);

      const manager = new MultiSessionManager({ registryPath: '/tmp/instances.json' });
      await manager.connectAll();

      expect(registry.prune).toHaveBeenCalled();
      expect(registry.list).toHaveBeenCalled();
      const pruneOrder = registry.prune.mock.invocationCallOrder[0];
      const listOrder = registry.list.mock.invocationCallOrder[0];
      expect(pruneOrder).toBeLessThan(listOrder);
    });

    it('should skip instances already connected', async () => {
      const instances = [createMockInstance(100)];
      const registry = createMockRegistry(instances);

      const clients = new Map<string, ReturnType<typeof createMockClient>>();
      setupClientMock(clients);

      const manager = new MultiSessionManager({ registryPath: '/tmp/instances.json' });
      await manager.connectAll();
      expect(manager.getSessions()).toHaveLength(1);

      // Connect again — should not create a second session for pid 100
      registry.list.mockReturnValue(instances);
      await manager.connectAll();
      expect(manager.getSessions()).toHaveLength(1);
      // TuiIpcClient should have been constructed only once for this socket path
      expect(vi.mocked(TuiIpcClient)).toHaveBeenCalledTimes(1);
    });

    it('should wire client.onMessage to eventBus.emit', async () => {
      const instances = [createMockInstance(100)];
      createMockRegistry(instances);

      const clients = new Map<string, ReturnType<typeof createMockClient>>();
      setupClientMock(clients);

      const manager = new MultiSessionManager({ registryPath: '/tmp/instances.json' });
      await manager.connectAll();

      const session = manager.getSession(100);
      expect(session).toBeDefined();

      const client = clients.get('/tmp/codingbuddy-100.sock')!;
      expect(client.onMessage).toHaveBeenCalledOnce();

      // Simulate a message from the client
      const messageHandler = client.onMessage.mock.calls[0][0];
      messageHandler({ type: 'mode:changed', payload: { from: null, to: 'PLAN' } });

      expect(session!.eventBus.emit).toHaveBeenCalledWith('mode:changed', {
        from: null,
        to: 'PLAN',
      });
    });

    it('should enforce MAX_SESSIONS limit of 10', async () => {
      // Create 12 instances — only the first 10 should be connected
      const instances = Array.from({ length: 12 }, (_, i) => createMockInstance(100 + i));
      createMockRegistry(instances);

      const clients = new Map<string, ReturnType<typeof createMockClient>>();
      setupClientMock(clients);

      const manager = new MultiSessionManager({ registryPath: '/tmp/instances.json' });
      await manager.connectAll();

      const sessions = manager.getSessions();
      expect(sessions).toHaveLength(10);
      // First 10 PIDs connected
      expect(sessions.map(s => s.instance.pid)).toEqual(
        Array.from({ length: 10 }, (_, i) => 100 + i),
      );
    });

    it('should not exceed MAX_SESSIONS during poll when new instances appear', async () => {
      // Start with 10 sessions (at limit)
      const initialInstances = Array.from({ length: 10 }, (_, i) => createMockInstance(100 + i));
      const registry = createMockRegistry(initialInstances);

      const clients = new Map<string, ReturnType<typeof createMockClient>>();
      setupClientMock(clients);

      const manager = new MultiSessionManager({ registryPath: '/tmp/instances.json' });
      await manager.connectAll();
      expect(manager.getSessions()).toHaveLength(10);

      // New instance appears during poll
      const allInstances = [...initialInstances, createMockInstance(999)];
      registry.list.mockReturnValue(allInstances);

      await manager.poll();

      // Still capped at 10
      expect(manager.getSessions()).toHaveLength(10);
      expect(manager.getSession(999)).toBeUndefined();
    });

    it('should wire client.onError to set session.connected = false', async () => {
      const instances = [createMockInstance(100)];
      createMockRegistry(instances);

      const clients = new Map<string, ReturnType<typeof createMockClient>>();
      setupClientMock(clients);

      const manager = new MultiSessionManager({ registryPath: '/tmp/instances.json' });
      await manager.connectAll();

      const session = manager.getSession(100);
      expect(session).toBeDefined();
      expect(session!.connected).toBe(true);

      const client = clients.get('/tmp/codingbuddy-100.sock')!;
      expect(client.onError).toHaveBeenCalledOnce();

      // Simulate an error
      const errorHandler = client.onError.mock.calls[0][0];
      errorHandler(new Error('socket error'));

      expect(session!.connected).toBe(false);
    });
  });

  describe('poll', () => {
    it('should detect and connect new instances, calling onSessionAdded', async () => {
      const registry = createMockRegistry([]);
      const clients = new Map<string, ReturnType<typeof createMockClient>>();
      setupClientMock(clients);

      const manager = new MultiSessionManager({ registryPath: '/tmp/instances.json' });
      await manager.connectAll();
      expect(manager.getSessions()).toHaveLength(0);

      // New instance appears
      const addedHandler = vi.fn();
      manager.onSessionAdded(addedHandler);

      const newInstance = createMockInstance(300);
      registry.list.mockReturnValue([newInstance]);

      await manager.poll();

      expect(manager.getSessions()).toHaveLength(1);
      expect(addedHandler).toHaveBeenCalledOnce();
      expect(addedHandler.mock.calls[0][0].instance.pid).toBe(300);
    });

    it('should remove terminated instances and call onSessionRemoved', async () => {
      const instance = createMockInstance(100);
      const registry = createMockRegistry([instance]);
      const clients = new Map<string, ReturnType<typeof createMockClient>>();
      setupClientMock(clients);

      const manager = new MultiSessionManager({ registryPath: '/tmp/instances.json' });
      await manager.connectAll();
      expect(manager.getSessions()).toHaveLength(1);

      const removedHandler = vi.fn();
      manager.onSessionRemoved(removedHandler);

      // Instance disappears from registry
      registry.list.mockReturnValue([]);

      await manager.poll();

      expect(manager.getSessions()).toHaveLength(0);
      expect(removedHandler).toHaveBeenCalledOnce();
      expect(removedHandler).toHaveBeenCalledWith(100);

      // Client should have been disconnected
      const client = clients.get('/tmp/codingbuddy-100.sock')!;
      expect(client.disconnect).toHaveBeenCalled();
    });
  });

  describe('getSession', () => {
    it('should return session by pid', async () => {
      const instances = [createMockInstance(100), createMockInstance(200)];
      createMockRegistry(instances);
      const clients = new Map<string, ReturnType<typeof createMockClient>>();
      setupClientMock(clients);

      const manager = new MultiSessionManager({ registryPath: '/tmp/instances.json' });
      await manager.connectAll();

      const session = manager.getSession(100);
      expect(session).toBeDefined();
      expect(session!.instance.pid).toBe(100);
    });

    it('should return undefined for unknown pid', async () => {
      createMockRegistry([]);
      const clients = new Map<string, ReturnType<typeof createMockClient>>();
      setupClientMock(clients);

      const manager = new MultiSessionManager({ registryPath: '/tmp/instances.json' });
      await manager.connectAll();

      expect(manager.getSession(999)).toBeUndefined();
    });
  });

  describe('startPolling / stopPolling', () => {
    it('should start and stop interval polling', () => {
      createMockRegistry([]);
      const clients = new Map<string, ReturnType<typeof createMockClient>>();
      setupClientMock(clients);

      vi.useFakeTimers();
      const manager = new MultiSessionManager({
        registryPath: '/tmp/instances.json',
        refreshIntervalMs: 1000,
      });

      const pollSpy = vi.spyOn(manager, 'poll').mockResolvedValue(undefined);

      manager.startPolling();

      vi.advanceTimersByTime(3000);
      expect(pollSpy).toHaveBeenCalledTimes(3);

      manager.stopPolling();
      vi.advanceTimersByTime(3000);
      expect(pollSpy).toHaveBeenCalledTimes(3); // no more calls

      vi.useRealTimers();
    });
  });

  describe('disconnectAll', () => {
    it('should disconnect all clients, clear sessions and handlers', async () => {
      const instances = [createMockInstance(100), createMockInstance(200)];
      createMockRegistry(instances);
      const clients = new Map<string, ReturnType<typeof createMockClient>>();
      setupClientMock(clients);

      const manager = new MultiSessionManager({ registryPath: '/tmp/instances.json' });
      await manager.connectAll();
      expect(manager.getSessions()).toHaveLength(2);

      const addedHandler = vi.fn();
      const removedHandler = vi.fn();
      manager.onSessionAdded(addedHandler);
      manager.onSessionRemoved(removedHandler);

      await manager.disconnectAll();

      expect(manager.getSessions()).toHaveLength(0);

      // All clients should be disconnected
      for (const client of clients.values()) {
        expect(client.disconnect).toHaveBeenCalled();
      }
    });

    it('should stop polling when disconnecting', async () => {
      createMockRegistry([]);
      const clients = new Map<string, ReturnType<typeof createMockClient>>();
      setupClientMock(clients);

      vi.useFakeTimers();
      const manager = new MultiSessionManager({
        registryPath: '/tmp/instances.json',
        refreshIntervalMs: 1000,
      });

      const pollSpy = vi.spyOn(manager, 'poll').mockResolvedValue(undefined);
      manager.startPolling();
      vi.advanceTimersByTime(1000);
      expect(pollSpy).toHaveBeenCalledTimes(1);

      await manager.disconnectAll();

      vi.advanceTimersByTime(5000);
      expect(pollSpy).toHaveBeenCalledTimes(1); // no more calls after disconnect

      vi.useRealTimers();
    });
  });
});
