import * as net from 'net';
import type { IpcMessage } from './ipc.types';
import { deserializeIpcMessage } from './ipc.types';

type MessageHandler = (msg: IpcMessage) => void;
type ErrorHandler = (err: Error) => void;

/**
 * IPC client that connects to a running MCP server's Unix Domain Socket
 * and receives TUI events for rendering.
 * Handles NDJSON buffering for partial lines and multi-message chunks.
 */
export class TuiIpcClient {
  /** Maximum buffer size (1MB) to prevent DoS via unbounded growth */
  private static readonly MAX_BUFFER_SIZE = 1024 * 1024;

  private socket: net.Socket | null = null;
  private connected = false;
  private buffer = '';
  private readonly handlers: MessageHandler[] = [];
  private readonly errorHandlers: ErrorHandler[] = [];

  constructor(private readonly socketPath: string) {}

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = net.createConnection(this.socketPath, () => {
        this.connected = true;
        resolve();
      });

      this.socket.on('error', err => {
        if (!this.connected) {
          reject(err);
          return;
        }
        // Post-connection errors: mark disconnected and notify handlers
        this.connected = false;
        for (const handler of this.errorHandlers) {
          handler(err);
        }
      });

      this.socket.on('data', chunk => {
        this.buffer += chunk.toString();

        // Prevent DoS via unbounded buffer growth.
        // Salvage complete lines before discarding the oversized remainder.
        if (this.buffer.length > TuiIpcClient.MAX_BUFFER_SIZE) {
          const lastNewline = this.buffer.lastIndexOf('\n');
          if (lastNewline === -1) {
            // No complete line at all — discard entire buffer
            this.buffer = '';
            return;
          }
          // Process complete lines, discard oversized incomplete tail
          const processable = this.buffer.slice(0, lastNewline);
          this.buffer = '';
          for (const line of processable.split('\n')) {
            const msg = deserializeIpcMessage(line + '\n');
            if (msg) {
              for (const handler of this.handlers) handler(msg);
            }
          }
          return;
        }

        const lines = this.buffer.split('\n');
        // Keep incomplete last line in buffer
        this.buffer = lines.pop() ?? '';

        for (const line of lines) {
          const msg = deserializeIpcMessage(line + '\n');
          if (msg) {
            for (const handler of this.handlers) {
              handler(msg);
            }
          }
        }
      });

      // Handle clean server-side close (FIN without preceding error).
      // When an error occurs first, the 'error' handler above sets connected=false,
      // so wasConnected will be false here and error handlers won't double-fire.
      // This only invokes error handlers for unexpected server-initiated disconnects.
      this.socket.on('close', () => {
        const wasConnected = this.connected;
        this.connected = false;
        if (wasConnected) {
          const err = new Error('Connection closed by server');
          for (const handler of this.errorHandlers) {
            handler(err);
          }
        }
      });
    });
  }

  onMessage(handler: MessageHandler): void {
    this.handlers.push(handler);
  }

  offMessage(handler: MessageHandler): void {
    const idx = this.handlers.indexOf(handler);
    if (idx !== -1) this.handlers.splice(idx, 1);
  }

  onError(handler: ErrorHandler): void {
    this.errorHandlers.push(handler);
  }

  offError(handler: ErrorHandler): void {
    const idx = this.errorHandlers.indexOf(handler);
    if (idx !== -1) this.errorHandlers.splice(idx, 1);
  }

  isConnected(): boolean {
    return this.connected;
  }

  disconnect(): void {
    this.socket?.destroy();
    this.socket = null;
    this.connected = false;
    this.handlers.length = 0;
    this.errorHandlers.length = 0;
  }
}
