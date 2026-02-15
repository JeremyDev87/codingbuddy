import * as net from 'net';
import * as fs from 'fs';
import type { IpcMessage } from './ipc.types';
import { serializeIpcMessage } from './ipc.types';
import { createIpcDebugLogger } from './ipc-debug';

const ipcDebug = createIpcDebugLogger('ipc');

export interface TuiIpcServerOptions {
  /** Callback to provide initial state snapshot for newly connected clients */
  getInitialState?: () => IpcMessage[];
}

/**
 * Unix Domain Socket server that broadcasts TUI events to connected clients.
 * Runs inside the MCP server process.
 */
export class TuiIpcServer {
  private server: net.Server | null = null;
  private readonly clients = new Set<net.Socket>();

  constructor(
    private readonly socketPath: string,
    private readonly options: TuiIpcServerOptions = {},
  ) {}

  async listen(): Promise<void> {
    // Clean up stale socket file from a previous process
    try {
      fs.unlinkSync(this.socketPath);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT') {
        ipcDebug(`Stale socket cleanup failed: ${err}`);
      }
    }

    const server = net.createServer(socket => {
      this.clients.add(socket);
      socket.on('close', () => this.clients.delete(socket));
      socket.on('error', () => this.clients.delete(socket));

      // Send initial state snapshot to new client
      if (this.options.getInitialState) {
        const messages = this.options.getInitialState();
        for (const msg of messages) {
          if (!socket.destroyed) {
            socket.write(serializeIpcMessage(msg));
          }
        }
      }
    });
    this.server = server;

    return new Promise((resolve, reject) => {
      const onListenError = (err: Error): void => {
        this.server = null;
        reject(err);
      };
      server.on('error', onListenError);
      server.listen(this.socketPath, () => {
        // Restrict socket permissions to owner-only (rw-------).
        // Post-creation chmod has a brief TOCTOU window, but for a Unix Domain
        // Socket in a per-user tmpdir (or XDG_RUNTIME_DIR) this is negligible.
        // Avoids process.umask() which is process-global and would affect
        // all concurrent I/O between listen() and the async callback.
        try {
          fs.chmodSync(this.socketPath, 0o600);
        } catch {
          /* best effort: some OS may not support chmod on sockets */
        }
        // Replace startup error handler with persistent one
        server.removeListener('error', onListenError);
        server.on('error', err => {
          ipcDebug(`Post-listen server error: ${err}`);
        });
        resolve();
      });
    });
  }

  broadcast(message: IpcMessage): void {
    const data = serializeIpcMessage(message);
    // Snapshot: client.destroy() triggers 'close' which deletes from this.clients.
    // Iterating over a copy prevents skipping entries during Set mutation.
    for (const client of [...this.clients]) {
      if (!client.destroyed && client.writable) {
        const ok = client.write(data);
        if (!ok) {
          // Client buffer full (backpressure). For a monitoring TUI,
          // dropping events on slow clients is acceptable.
          // Destroy to prevent unbounded server memory growth.
          client.destroy();
        }
      }
    }
  }

  clientCount(): number {
    return this.clients.size;
  }

  async close(): Promise<void> {
    for (const client of this.clients) {
      client.destroy();
    }
    this.clients.clear();

    return new Promise(resolve => {
      if (!this.server) return resolve();
      this.server.close(err => {
        if (err) {
          ipcDebug(`Server close error: ${err}`);
        }
        try {
          fs.unlinkSync(this.socketPath);
        } catch (unlinkErr) {
          ipcDebug(`Socket file cleanup on close: ${unlinkErr}`);
        }
        resolve();
      });
    });
  }
}
