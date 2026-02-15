import { describe, it, expect, afterEach } from 'vitest';
import * as net from 'net';
import * as fs from 'fs';
import * as os from 'os';
import { TuiIpcClient } from './ipc-client';
import { serializeIpcMessage, type IpcMessage } from './ipc.types';
import type { TuiEventName } from '../events/types';

describe('TuiIpcClient', () => {
  let mockServer: net.Server;
  let client: TuiIpcClient;
  const socketPath = `${os.tmpdir()}/codingbuddy-client-test-${process.pid}.sock`;

  afterEach(async () => {
    client?.disconnect();
    await new Promise<void>(resolve => {
      if (mockServer) mockServer.close(() => resolve());
      else resolve();
    });
    try {
      fs.unlinkSync(socketPath);
    } catch {
      /* ignore */
    }
  });

  it('should connect to a Unix socket', async () => {
    mockServer = net.createServer();
    await new Promise<void>(resolve => mockServer.listen(socketPath, resolve));

    client = new TuiIpcClient(socketPath);
    await client.connect();
    expect(client.isConnected()).toBe(true);
  });

  it('should emit parsed IPC messages as events', async () => {
    let serverSocket: net.Socket;
    mockServer = net.createServer(s => {
      serverSocket = s;
    });
    await new Promise<void>(resolve => mockServer.listen(socketPath, resolve));

    client = new TuiIpcClient(socketPath);
    await client.connect();

    const received: IpcMessage[] = [];
    client.onMessage(msg => received.push(msg));

    const msg: IpcMessage = {
      type: 'mode:changed' as TuiEventName,
      payload: { from: null, to: 'ACT' },
    };
    serverSocket!.write(serializeIpcMessage(msg));

    await new Promise(resolve => setTimeout(resolve, 50));
    expect(received).toHaveLength(1);
    expect(received[0].type).toBe('mode:changed');
  });

  it('should handle NDJSON partial line buffering', async () => {
    let serverSocket: net.Socket;
    mockServer = net.createServer(s => {
      serverSocket = s;
    });
    await new Promise<void>(resolve => mockServer.listen(socketPath, resolve));

    client = new TuiIpcClient(socketPath);
    await client.connect();

    const received: IpcMessage[] = [];
    client.onMessage(msg => received.push(msg));

    // Send a message in two chunks (partial line)
    const fullLine = JSON.stringify({
      type: 'agent:activated',
      payload: { agentId: 'a', name: 'n', role: 'r', isPrimary: true },
    });
    const mid = Math.floor(fullLine.length / 2);
    serverSocket!.write(fullLine.slice(0, mid));
    await new Promise(resolve => setTimeout(resolve, 20));
    serverSocket!.write(fullLine.slice(mid) + '\n');

    await new Promise(resolve => setTimeout(resolve, 50));
    expect(received).toHaveLength(1);
    expect(received[0].type).toBe('agent:activated');
  });

  it('should handle multiple messages in one chunk', async () => {
    let serverSocket: net.Socket;
    mockServer = net.createServer(s => {
      serverSocket = s;
    });
    await new Promise<void>(resolve => mockServer.listen(socketPath, resolve));

    client = new TuiIpcClient(socketPath);
    await client.connect();

    const received: IpcMessage[] = [];
    client.onMessage(msg => received.push(msg));

    // Send two messages in a single write
    const msg1 = serializeIpcMessage({
      type: 'mode:changed' as TuiEventName,
      payload: { from: null, to: 'PLAN' },
    });
    const msg2 = serializeIpcMessage({
      type: 'mode:changed' as TuiEventName,
      payload: { from: 'PLAN', to: 'ACT' },
    });
    serverSocket!.write(msg1 + msg2);

    await new Promise(resolve => setTimeout(resolve, 50));
    expect(received).toHaveLength(2);
  });

  it('should handle connection refused gracefully', async () => {
    client = new TuiIpcClient(`${os.tmpdir()}/codingbuddy-nonexistent.sock`);
    await expect(client.connect()).rejects.toThrow();
  });

  it('should clear buffer when MAX_BUFFER_SIZE exceeded', async () => {
    let serverSocket: net.Socket;
    mockServer = net.createServer(s => {
      serverSocket = s;
    });
    await new Promise<void>(resolve => mockServer.listen(socketPath, resolve));

    client = new TuiIpcClient(socketPath);
    await client.connect();

    const received: IpcMessage[] = [];
    client.onMessage(msg => received.push(msg));

    // Send data exceeding 1MB without newlines to trigger buffer overflow protection
    const hugeData = 'x'.repeat(1024 * 1024 + 100);
    serverSocket!.write(hugeData);
    await new Promise(resolve => setTimeout(resolve, 50));

    // Buffer should be cleared; no messages parsed from garbage data
    expect(received).toHaveLength(0);

    // Subsequent valid messages should still parse correctly
    const msg: IpcMessage = {
      type: 'mode:changed' as TuiEventName,
      payload: { from: null, to: 'PLAN' },
    };
    serverSocket!.write(serializeIpcMessage(msg));
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(received).toHaveLength(1);
    expect(received[0].type).toBe('mode:changed');
  });
});
