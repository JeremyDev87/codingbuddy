import { describe, it, expect, afterEach } from 'vitest';
import * as net from 'net';
import * as fs from 'fs';
import { TuiIpcServer } from './ipc-server';
import { deserializeIpcMessage } from './ipc.types';
import { uniqueSocketPath } from './test-utils';

describe('TuiIpcServer', () => {
  let server: TuiIpcServer;
  const testSocketPath = uniqueSocketPath('server-test');

  afterEach(async () => {
    if (server) await server.close();
    try {
      fs.unlinkSync(testSocketPath);
    } catch {
      /* ignore */
    }
  });

  it('should start listening on a Unix socket', async () => {
    server = new TuiIpcServer(testSocketPath);
    await server.listen();
    expect(fs.existsSync(testSocketPath)).toBe(true);
  });

  it('should accept client connections', async () => {
    server = new TuiIpcServer(testSocketPath);
    await server.listen();

    const client = net.createConnection(testSocketPath);
    await new Promise<void>(resolve => client.on('connect', resolve));
    expect(server.clientCount()).toBe(1);
    client.destroy();
  });

  it('should broadcast messages to all connected clients', async () => {
    server = new TuiIpcServer(testSocketPath);
    await server.listen();

    const client = net.createConnection(testSocketPath);
    await new Promise<void>(resolve => client.on('connect', resolve));

    const received: string[] = [];
    client.on('data', chunk => received.push(chunk.toString()));

    server.broadcast({
      type: 'mode:changed',
      payload: { from: null, to: 'PLAN' },
    });

    await new Promise(resolve => setTimeout(resolve, 50));
    expect(received.length).toBeGreaterThan(0);
    const msg = deserializeIpcMessage(received[0]);
    expect(msg?.type).toBe('mode:changed');

    client.destroy();
  });

  it('should send initial state snapshot to new clients', async () => {
    const initialState = {
      type: 'agents:loaded' as const,
      payload: {
        agents: [
          {
            id: 'arch',
            name: 'architecture',
            description: 'Architecture specialist',
            category: 'Architecture' as const,
            icon: 'A',
            expertise: ['system-design'],
          },
        ],
      },
    };
    server = new TuiIpcServer(testSocketPath, {
      getInitialState: () => [initialState],
    });
    await server.listen();

    const client = net.createConnection(testSocketPath);
    await new Promise<void>(resolve => client.on('connect', resolve));

    const received: string[] = [];
    client.on('data', chunk => received.push(chunk.toString()));

    await new Promise(resolve => setTimeout(resolve, 50));
    expect(received.length).toBeGreaterThan(0);
    const msg = deserializeIpcMessage(received[0]);
    expect(msg?.type).toBe('agents:loaded');

    client.destroy();
  });

  it('should clean up socket file on close', async () => {
    server = new TuiIpcServer(testSocketPath);
    await server.listen();
    await server.close();
    expect(fs.existsSync(testSocketPath)).toBe(false);
  });

  it('should remove disconnected clients', async () => {
    server = new TuiIpcServer(testSocketPath);
    await server.listen();

    const client = net.createConnection(testSocketPath);
    await new Promise<void>(resolve => client.on('connect', resolve));
    expect(server.clientCount()).toBe(1);

    client.destroy();
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(server.clientCount()).toBe(0);
  });
});
