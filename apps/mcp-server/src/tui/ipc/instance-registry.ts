import * as fs from 'fs';
import * as path from 'path';
import type { IpcInstance, IpcInstancesFile } from './ipc.types';
import { createIpcDebugLogger } from './ipc-debug';

const registryDebug = createIpcDebugLogger('registry');

/**
 * Manages instance discovery file for TUI clients to find running MCP servers.
 * File location: ~/.codingbuddy/instances.json
 * Uses atomic write (tmp + rename) to prevent corruption.
 *
 * Known limitation: read-modify-write operations are not protected by file
 * locking. Concurrent MCP server starts within the same millisecond window
 * may cause one registration to be silently dropped. In practice this is
 * extremely rare since MCP servers are started sequentially by AI tools.
 */
export class InstanceRegistry {
  constructor(private readonly filePath: string) {}

  register(instance: IpcInstance): void {
    const instances = this.read();
    const filtered = instances.filter(i => i.pid !== instance.pid);
    filtered.push(instance);
    this.write(filtered);
  }

  unregister(pid: number): void {
    const instances = this.read();
    this.write(instances.filter(i => i.pid !== pid));
  }

  list(): IpcInstance[] {
    return this.read();
  }

  /**
   * Remove instances whose process is no longer running or whose socket
   * file no longer exists (guards against PID reuse false-positives).
   */
  prune(): number {
    const instances = this.read();
    const alive = instances.filter(i => this.isInstanceAlive(i));
    const pruned = instances.length - alive.length;
    if (pruned > 0) this.write(alive);
    return pruned;
  }

  /**
   * Check if an instance is still alive via process signal + socket file existence.
   *
   * Known limitation (PID reuse): If a codingbuddy process crashes without
   * graceful shutdown, its socket file remains in /tmp. If the OS subsequently
   * assigns the same PID to an unrelated process, both checks pass incorrectly.
   * This is mitigated by:
   *   1. Socket paths include PID, so collision requires exact PID reuse
   *   2. OS PID spaces are large (typically 32768+ on Linux, 99998 on macOS)
   *   3. prune() runs at startup, narrowing the window
   *
   * Future hardening: connect to the socket and verify a codingbuddy-specific
   * handshake response before considering the instance alive.
   */
  private isInstanceAlive(instance: IpcInstance): boolean {
    if (!Number.isInteger(instance.pid) || instance.pid <= 0) return false;
    try {
      process.kill(instance.pid, 0);
    } catch (err) {
      registryDebug(`Process ${instance.pid} not alive: ${err}`);
      return false;
    }
    // Secondary check: verify socket file still exists to guard against
    // PID reuse where a different process was assigned the same PID.
    if (!fs.existsSync(instance.socketPath)) {
      registryDebug(`Process ${instance.pid} alive but socket missing: ${instance.socketPath}`);
      return false;
    }
    return true;
  }

  private read(): IpcInstance[] {
    try {
      const content = fs.readFileSync(this.filePath, 'utf-8');
      const data = JSON.parse(content) as IpcInstancesFile;
      // Validate each entry has required fields to guard against malformed files
      return (data.instances ?? []).filter(
        (i): i is IpcInstance =>
          typeof i === 'object' &&
          i !== null &&
          typeof i.pid === 'number' &&
          typeof i.socketPath === 'string' &&
          typeof i.projectRoot === 'string' &&
          typeof i.startedAt === 'string',
      );
    } catch (err) {
      registryDebug(`Failed to read instances file: ${err}`);
      return [];
    }
  }

  /** Atomic write: write to tmp file then rename. Restricts permissions to owner. */
  private write(instances: IpcInstance[]): void {
    const dir = path.dirname(this.filePath);
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    // SECURITY: Verify the directory is not a symlink to prevent a local attacker
    // from redirecting writes to an arbitrary location via symlink on ~/.codingbuddy.
    const dirStat = fs.lstatSync(dir);
    if (!dirStat.isDirectory()) {
      throw new Error(`Instance registry directory is not a real directory: ${dir}`);
    }
    const data: IpcInstancesFile = { instances };
    const tmpPath = this.filePath + `.tmp.${process.pid}`;
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2) + '\n', {
      mode: 0o600,
    });
    fs.renameSync(tmpPath, this.filePath);
  }
}
