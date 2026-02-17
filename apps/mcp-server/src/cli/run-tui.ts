import { InstanceRegistry } from '../tui/ipc/instance-registry';
import { TuiIpcClient } from '../tui/ipc/ipc-client';
import { getInstancesFilePath, getSocketPath } from '../tui/ipc/ipc.types';
import type { IpcInstance } from '../tui/ipc/ipc.types';

/** Forced-exit timeout for client-side shutdown (ms) */
const CLIENT_SHUTDOWN_TIMEOUT_MS = 3000;

/**
 * Select which MCP server instance to connect to.
 * Returns null if no instances found.
 * Auto-selects if only one instance is running.
 * For multiple instances, selects the most recent by startedAt timestamp.
 */
export function selectInstance(instances: IpcInstance[]): IpcInstance | null {
  if (instances.length === 0) return null;
  if (instances.length === 1) return instances[0];

  // Multiple instances: select the most recent by startedAt timestamp
  return [...instances].sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
  )[0];
}

/**
 * Run standalone TUI client that connects to a running MCP server.
 */
export async function runTui(): Promise<void> {
  const registry = new InstanceRegistry(getInstancesFilePath());
  registry.prune();
  const instances = registry.list();
  const instance = selectInstance(instances);

  if (!instance) {
    process.stderr.write(
      'No running codingbuddy MCP server found.\n' +
        'Make sure your AI tool (Claude Code, Cursor, etc.) is running with codingbuddy MCP configured.\n',
    );
    process.exitCode = 1;
    return;
  }

  if (instances.length > 1) {
    const others = instances
      .filter(i => i.pid !== instance.pid)
      .map(i => `  PID ${i.pid} (${i.projectRoot})`)
      .join('\n');
    process.stderr.write(
      `Found ${instances.length} running instances. Connecting to most recent.\n` +
        `Skipped:\n${others}\n\n`,
    );
  }

  process.stderr.write(
    `Connecting to codingbuddy MCP server (PID: ${instance.pid})...\n` +
      `Project: ${instance.projectRoot}\n\n`,
  );

  // Validate socketPath matches expected pattern to prevent registry poisoning.
  // Note: if an attacker has write access to ~/.codingbuddy/instances.json, they
  // control both `pid` and `socketPath`. However, getSocketPath() only returns
  // paths under $XDG_RUNTIME_DIR or os.tmpdir(), so the attacker would also need
  // write access to those directories. This validation prevents path traversal
  // attacks (e.g., socketPath pointing to /etc/shadow) but does not defend against
  // an attacker who already controls the user's home directory and tmpdir.
  const expectedSocketPath = getSocketPath(instance.pid);
  if (instance.socketPath !== expectedSocketPath) {
    process.stderr.write(
      `Invalid socket path in registry: ${instance.socketPath}\n` +
        `Expected: ${expectedSocketPath}\n`,
    );
    registry.unregister(instance.pid);
    process.exitCode = 1;
    return;
  }

  const client = new TuiIpcClient(expectedSocketPath);

  try {
    await client.connect();
  } catch {
    process.stderr.write(
      `Failed to connect to MCP server at ${expectedSocketPath}\n` +
        'The server may have shut down. Try restarting your AI tool.\n',
    );
    registry.unregister(instance.pid);
    process.exitCode = 1;
    return;
  }

  // Track TUI instance for lifecycle management.
  // Declared before error handler so disconnect during dynamic imports is handled.
  let tuiInstance: { unmount: () => void } | null = null;

  // Graceful shutdown with forced-exit safety net.
  // Guard prevents re-entrant calls: disconnect() triggers socket 'close',
  // which fires error handlers, which would call shutdown() again.
  let shuttingDown = false;
  const shutdown = (): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    const timeout = setTimeout(() => {
      // Forced exit after timeout — use code 0 because reaching here during
      // a clean SIGTERM/server-disconnect is not an error, the process simply
      // took too long to tear down Ink/React rendering.
      process.stderr.write('TUI cleanup timed out, exiting.\n');
      process.exit(0);
    }, CLIENT_SHUTDOWN_TIMEOUT_MS);
    timeout.unref();
    client.disconnect();
    tuiInstance?.unmount();
    process.exitCode = 0;
  };

  // Register error handler immediately after connect, before any async work.
  // This prevents silent swallowing of server disconnection during TUI bundle loading.
  client.onError(() => {
    process.stderr.write('\nConnection to MCP server lost. Exiting.\n');
    shutdown();
  });

  // Note: signal handlers are registered with process.once() and are NOT removed
  // on the success path. This is intentional — the TUI is a short-lived monitoring
  // process where the handlers remain needed until exit. The shutdown closure
  // captures local variables but this is negligible for a short-lived process.
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  // Dynamic import for ESM TUI bundle
  const { esmImport } = await import('../shared/esm-import');
  const { getTuiBundlePath } = await import('../shared/tui-bundle-path');

  let TuiEventBus: typeof import('../tui/events').TuiEventBus;
  let startTui: (opts: { eventBus: InstanceType<typeof TuiEventBus> }) => {
    unmount: () => void;
  };
  try {
    const events = await import('../tui/events');
    TuiEventBus = events.TuiEventBus;
    const tuiBundle = await esmImport(getTuiBundlePath());
    if (typeof tuiBundle.startTui !== 'function') {
      throw new Error('TUI bundle does not export startTui function');
    }
    startTui = tuiBundle.startTui as typeof startTui;
  } catch (err) {
    process.removeListener('SIGINT', shutdown);
    process.removeListener('SIGTERM', shutdown);
    process.stderr.write(
      `Failed to load TUI components: ${err}\n` + 'Ensure the TUI bundle is built (yarn build).\n',
    );
    client.disconnect();
    process.exitCode = 1;
    return;
  }

  // Create local event bus and wire IPC messages to it.
  // Use bound emit to bypass TuiEventBus generic narrowing.
  // Safe: IPC messages are validated by deserializeIpcMessage type guard.
  const localEventBus = new TuiEventBus();
  const busEmit = localEventBus.emit.bind(localEventBus) as (
    event: string,
    payload: unknown,
  ) => void;
  client.onMessage(msg => {
    busEmit(msg.type, msg.payload);
  });

  // Render TUI
  tuiInstance = startTui({ eventBus: localEventBus });
}
