import * as path from 'path';
import * as os from 'os';
import { TUI_EVENTS } from '../events/types';
import type { TuiEventName, TuiEventMap } from '../events/types';

/**
 * IPC message envelope sent over Unix Domain Socket (NDJSON format)
 */
export interface IpcMessage<K extends TuiEventName = TuiEventName> {
  type: K;
  payload: TuiEventMap[K];
}

/**
 * Instance discovery record written to ~/.codingbuddy/instances.json
 */
export interface IpcInstance {
  pid: number;
  socketPath: string;
  projectRoot: string;
  startedAt: string;
}

export interface IpcInstancesFile {
  instances: IpcInstance[];
}

/**
 * Prefer $XDG_RUNTIME_DIR (typically /run/user/<uid>/, mode 0700) for socket
 * files on Linux to avoid TOCTOU permission gaps in world-writable /tmp.
 * Falls back to os.tmpdir() (macOS returns per-user /var/folders/...).
 *
 * SECURITY: XDG_RUNTIME_DIR is trusted input — it is set by the OS login
 * system (e.g. systemd-logind) and inherently controlled by the same user
 * session. An attacker who can modify this env var already has the user's
 * session privileges, so no additional path validation is applied here.
 *
 * Lazy-evaluated function so environment changes after module load are respected,
 * and tests can override XDG_RUNTIME_DIR without module mocking.
 */
export function getSocketDir(): string {
  return process.env.XDG_RUNTIME_DIR || os.tmpdir();
}

export function getSocketPath(pid: number): string {
  return path.join(getSocketDir(), `codingbuddy-${pid}.sock`);
}

export function getInstancesFilePath(): string {
  return path.join(os.homedir(), '.codingbuddy', 'instances.json');
}

export function serializeIpcMessage(msg: IpcMessage): string {
  return JSON.stringify(msg) + '\n';
}

/** Known event names for validation */
const VALID_EVENT_NAMES: ReadonlySet<string> = new Set(
  Object.values(TUI_EVENTS),
);

/**
 * Type guard: validates that a parsed object has the required IpcMessage shape
 * and that the type is a known TUI event name.
 *
 * Note: payload shape is intentionally not validated at runtime. Both endpoints
 * (MCP server and TUI client) are codingbuddy processes, so compile-time
 * IpcMessage<K> generics provide sufficient safety. The socket is restricted
 * to owner-only access (chmod 0o600), limiting the trust boundary.
 */
function isIpcMessage(value: unknown): value is IpcMessage {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.type === 'string' &&
    VALID_EVENT_NAMES.has(obj.type) &&
    'payload' in obj
  );
}

/** Maximum allowed line length (64KB) to prevent excessive memory/CPU during JSON.parse */
const MAX_MESSAGE_SIZE = 65536;

export function deserializeIpcMessage(line: string): IpcMessage | null {
  try {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length > MAX_MESSAGE_SIZE) return null;
    const parsed: unknown = JSON.parse(trimmed);
    if (!isIpcMessage(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}
