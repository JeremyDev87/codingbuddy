import { getInstancesFilePath } from '../tui/ipc/ipc.types';
import { InstanceRegistry } from '../tui/ipc/instance-registry';

/** Forced-exit timeout for client-side shutdown (ms) */
const CLIENT_SHUTDOWN_TIMEOUT_MS = 3000;

/**
 * Run standalone TUI client that connects to running MCP server instances.
 * Uses MultiSessionManager to handle multiple concurrent sessions.
 */
export async function runTui(): Promise<void> {
  const registry = new InstanceRegistry(getInstancesFilePath());
  registry.prune();
  const instances = registry.list();

  if (instances.length === 0) {
    process.stderr.write(
      'No running codingbuddy MCP server found.\n' +
        'Make sure your AI tool (Claude Code, Cursor, etc.) is running with codingbuddy MCP configured.\n',
    );
    process.exitCode = 1;
    return;
  }

  process.stderr.write(`Found ${instances.length} running instance(s). Connecting...\n\n`);

  const { MultiSessionManager } = await import('../tui/ipc');
  const manager = new MultiSessionManager({
    registryPath: getInstancesFilePath(),
  });
  await manager.connectAll();

  if (manager.getSessions().length === 0) {
    process.stderr.write(
      'Failed to connect to any MCP server instance.\n' +
        'The servers may have shut down. Try restarting your AI tool.\n',
    );
    process.exitCode = 1;
    return;
  }

  manager.startPolling();

  let tuiInstance: { unmount: () => void } | null = null;

  let shuttingDown = false;
  const shutdown = (): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    const timeout = setTimeout(() => {
      process.stderr.write('TUI cleanup timed out, exiting.\n');
      process.exit(0);
    }, CLIENT_SHUTDOWN_TIMEOUT_MS);
    timeout.unref();
    void manager.disconnectAll();
    tuiInstance?.unmount();
    process.exitCode = 0;
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  // Dynamic import for ESM TUI bundle
  const { esmImport } = await import('../shared/esm-import');
  const { getTuiBundlePath } = await import('../shared/tui-bundle-path');

  try {
    const tuiBundle = await esmImport(getTuiBundlePath());
    if (typeof tuiBundle.renderMultiSession === 'function') {
      tuiInstance = tuiBundle.renderMultiSession({ manager });
    } else {
      throw new Error('TUI bundle does not export renderMultiSession');
    }
  } catch (err) {
    process.removeListener('SIGINT', shutdown);
    process.removeListener('SIGTERM', shutdown);
    process.stderr.write(
      `Failed to load TUI components: ${err}\n` + 'Ensure the TUI bundle is built (yarn build).\n',
    );
    void manager.disconnectAll();
    process.exitCode = 1;
    return;
  }
}
