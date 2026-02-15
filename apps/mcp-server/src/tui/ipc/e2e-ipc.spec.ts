import { describe, it, expect, afterEach } from 'vitest';
import { TuiEventBus } from '../events/event-bus';
import { TuiIpcServer } from './ipc-server';
import { TuiIpcBridge } from './ipc-bridge';
import { TuiIpcClient } from './ipc-client';
import { TUI_EVENTS } from '../events/types';
import type { IpcMessage } from './ipc.types';
import { waitFor, uniqueSocketPath } from './test-utils';

describe('E2E: MCP Server EventBus -> IPC -> TUI Client', () => {
  let server: TuiIpcServer;
  let bridge: TuiIpcBridge;
  let client: TuiIpcClient;
  let socketPath: string;

  afterEach(async () => {
    client?.disconnect();
    bridge?.destroy();
    await server?.close();
  });

  it('should deliver full event lifecycle from server to client', async () => {
    socketPath = uniqueSocketPath('e2e');

    // Server side
    const serverEventBus = new TuiEventBus();
    server = new TuiIpcServer(socketPath);
    await server.listen();
    bridge = new TuiIpcBridge(serverEventBus, server);

    // Client side
    client = new TuiIpcClient(socketPath);
    await client.connect();

    const received: IpcMessage[] = [];
    client.onMessage(msg => received.push(msg));

    // Simulate full lifecycle
    serverEventBus.emit(TUI_EVENTS.MODE_CHANGED, { from: null, to: 'PLAN' });
    serverEventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
      agentId: 'architect',
      name: 'architecture-specialist',
      role: 'specialist',
      isPrimary: true,
    });
    serverEventBus.emit(TUI_EVENTS.AGENT_DEACTIVATED, {
      agentId: 'architect',
      reason: 'completed',
      durationMs: 500,
    });

    await waitFor(() => received.length >= 3);

    expect(received).toHaveLength(3);
    expect(received[0].type).toBe('mode:changed');
    expect(received[1].type).toBe('agent:activated');
    expect(received[2].type).toBe('agent:deactivated');
  });

  it('should deliver initial state snapshot then live events', async () => {
    socketPath = uniqueSocketPath('e2e-snapshot');

    const serverEventBus = new TuiEventBus();
    server = new TuiIpcServer(socketPath, {
      getInitialState: () => [
        {
          type: 'agents:loaded' as const,
          payload: {
            agents: [
              {
                id: 'test',
                name: 'test-agent',
                description: 'Test agent for E2E',
                category: 'Architecture' as const,
                icon: 'T',
                expertise: ['testing'],
              },
            ],
          },
        },
      ],
    });
    await server.listen();
    bridge = new TuiIpcBridge(serverEventBus, server);

    client = new TuiIpcClient(socketPath);
    await client.connect();

    const received: IpcMessage[] = [];
    client.onMessage(msg => received.push(msg));

    // Wait for initial snapshot
    await waitFor(() => received.length >= 1);

    // Then emit a live event
    serverEventBus.emit(TUI_EVENTS.MODE_CHANGED, { from: null, to: 'ACT' });

    await waitFor(() => received.length >= 2);

    expect(received[0].type).toBe('agents:loaded');
    expect(received[1].type).toBe('mode:changed');
  });

  it('should handle client disconnect and reconnect', async () => {
    socketPath = uniqueSocketPath('e2e-reconnect');

    const serverEventBus = new TuiEventBus();
    server = new TuiIpcServer(socketPath);
    await server.listen();
    bridge = new TuiIpcBridge(serverEventBus, server);

    // First connection
    client = new TuiIpcClient(socketPath);
    await client.connect();
    expect(server.clientCount()).toBe(1);

    client.disconnect();
    await waitFor(() => server.clientCount() === 0);

    // Reconnect with new client
    client = new TuiIpcClient(socketPath);
    await client.connect();

    const received: IpcMessage[] = [];
    client.onMessage(msg => received.push(msg));

    serverEventBus.emit(TUI_EVENTS.MODE_CHANGED, { from: null, to: 'EVAL' });
    await waitFor(() => received.length >= 1);

    expect(received[0].type).toBe('mode:changed');
  });
});
