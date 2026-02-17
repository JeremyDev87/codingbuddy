import { InstanceRegistry } from './instance-registry';
import { TuiIpcClient } from './ipc-client';
import { TuiEventBus } from '../events/event-bus';
import type { IpcInstance } from './ipc.types';
import { getSocketPath } from './ipc.types';

export interface ManagedSession {
  instance: IpcInstance;
  client: TuiIpcClient;
  eventBus: TuiEventBus;
  connected: boolean;
}

export interface MultiSessionManagerOptions {
  registryPath: string;
  refreshIntervalMs?: number;
}

type SessionAddedHandler = (session: ManagedSession) => void;
type SessionRemovedHandler = (pid: number) => void;

/** Maximum number of concurrent sessions to prevent resource exhaustion */
const MAX_SESSIONS = 10;

/**
 * Manages multiple TuiIpcClient instances, each connected to a running
 * MCP server via Unix Domain Socket. Provides per-session isolated EventBus
 * and lifecycle management (connect, poll, disconnect).
 */
export class MultiSessionManager {
  private readonly registry: InstanceRegistry;
  private readonly refreshIntervalMs: number;
  private readonly sessions = new Map<number, ManagedSession>();
  private readonly addedHandlers: SessionAddedHandler[] = [];
  private readonly removedHandlers: SessionRemovedHandler[] = [];
  private pollingTimer: ReturnType<typeof setInterval> | null = null;
  private polling = false;

  constructor(options: MultiSessionManagerOptions) {
    this.registry = new InstanceRegistry(options.registryPath);
    this.refreshIntervalMs = options.refreshIntervalMs ?? 5000;
  }

  async connectAll(): Promise<void> {
    this.registry.prune();
    const instances = this.registry.list();

    for (const instance of instances) {
      if (this.sessions.size >= MAX_SESSIONS) break;
      await this.connectInstance(instance);
    }
  }

  async poll(): Promise<void> {
    if (this.polling) return;
    this.polling = true;
    try {
      this.registry.prune();
      const instances = this.registry.list();

      const currentPids = new Set(this.sessions.keys());
      const livePids = new Set(instances.map(i => i.pid));

      // Connect new instances
      for (const instance of instances) {
        if (!currentPids.has(instance.pid) && this.sessions.size < MAX_SESSIONS) {
          await this.connectInstance(instance);
        }
      }

      // Remove terminated instances
      for (const pid of currentPids) {
        if (!livePids.has(pid)) {
          this.removeSession(pid);
        }
      }
    } finally {
      this.polling = false;
    }
  }

  startPolling(): void {
    if (this.pollingTimer) return;
    this.pollingTimer = setInterval(() => {
      void this.poll();
    }, this.refreshIntervalMs);
    this.pollingTimer.unref();
  }

  stopPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  getSessions(): ManagedSession[] {
    return [...this.sessions.values()];
  }

  getSession(pid: number): ManagedSession | undefined {
    return this.sessions.get(pid);
  }

  onSessionAdded(handler: SessionAddedHandler): void {
    this.addedHandlers.push(handler);
  }

  offSessionAdded(handler: SessionAddedHandler): void {
    const idx = this.addedHandlers.indexOf(handler);
    if (idx !== -1) this.addedHandlers.splice(idx, 1);
  }

  onSessionRemoved(handler: SessionRemovedHandler): void {
    this.removedHandlers.push(handler);
  }

  offSessionRemoved(handler: SessionRemovedHandler): void {
    const idx = this.removedHandlers.indexOf(handler);
    if (idx !== -1) this.removedHandlers.splice(idx, 1);
  }

  async disconnectAll(): Promise<void> {
    this.stopPolling();

    for (const session of this.sessions.values()) {
      session.client.disconnect();
    }

    this.sessions.clear();
    this.addedHandlers.length = 0;
    this.removedHandlers.length = 0;
  }

  private async connectInstance(instance: IpcInstance): Promise<void> {
    // Skip if already connected
    if (this.sessions.has(instance.pid)) return;

    // Validate socket path matches expected path for this pid
    const expectedPath = getSocketPath(instance.pid);
    if (instance.socketPath !== expectedPath) return;

    const client = new TuiIpcClient(instance.socketPath);
    const eventBus = new TuiEventBus();

    const session: ManagedSession = {
      instance,
      client,
      eventBus,
      connected: false,
    };

    // Wire client messages to per-session event bus
    client.onMessage(msg => {
      eventBus.emit(msg.type, msg.payload);
    });

    // Wire error handler to mark session disconnected
    client.onError(() => {
      session.connected = false;
    });

    try {
      await client.connect();
      session.connected = true;
      this.sessions.set(instance.pid, session);

      for (const handler of this.addedHandlers) {
        handler(session);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      process.stderr.write(`[codingbuddy] IPC connect failed (PID ${instance.pid}): ${msg}\n`);
      client.disconnect();
    }
  }

  private removeSession(pid: number): void {
    const session = this.sessions.get(pid);
    if (!session) return;

    session.client.disconnect();
    this.sessions.delete(pid);

    for (const handler of this.removedHandlers) {
      handler(pid);
    }
  }
}
