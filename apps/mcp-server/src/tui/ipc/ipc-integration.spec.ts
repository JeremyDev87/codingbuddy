import { describe, it, expect, afterEach } from 'vitest';
import * as net from 'net';
import { TuiEventBus } from '../events/event-bus';
import { TuiIpcServer } from './ipc-server';
import { TuiIpcBridge } from './ipc-bridge';
import { TUI_EVENTS } from '../events/types';
import { deserializeIpcMessage } from './ipc.types';
import { uniqueSocketPath } from './test-utils';

describe('IPC Integration (EventBus -> Socket -> Client)', () => {
  let server: TuiIpcServer;
  let bridge: TuiIpcBridge;
  const socketPath = uniqueSocketPath('integration-test');

  afterEach(async () => {
    bridge?.destroy();
    await server?.close();
  });

  it('should deliver EventBus events to a connected socket client', async () => {
    const eventBus = new TuiEventBus();
    server = new TuiIpcServer(socketPath);
    await server.listen();
    bridge = new TuiIpcBridge(eventBus, server);

    // Connect client
    const client = net.createConnection(socketPath);
    await new Promise<void>(resolve => client.on('connect', resolve));

    // Collect data
    const chunks: string[] = [];
    client.on('data', chunk => chunks.push(chunk.toString()));

    // Emit event on server-side EventBus
    eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
      agentId: 'test-agent',
      name: 'test',
      role: 'specialist',
      isPrimary: true,
    });

    await new Promise(resolve => setTimeout(resolve, 50));

    const msg = deserializeIpcMessage(chunks.join(''));
    expect(msg).not.toBeNull();
    expect(msg!.type).toBe('agent:activated');

    client.destroy();
  });
});
