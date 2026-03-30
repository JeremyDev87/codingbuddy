import * as path from 'node:path';
import * as os from 'node:os';
import { getInstancesFilePath } from '../tui/ipc/ipc.types';
import { InstanceRegistry } from '../tui/ipc/instance-registry';
import { restartTui } from './restart-tui';

/** Forced-exit timeout for client-side shutdown (ms) */
const CLIENT_SHUTDOWN_TIMEOUT_MS = 3000;

/**
 * Run standalone TUI client that connects to running MCP server instances.
 * Uses MultiSessionManager to handle multiple concurrent sessions.
 *
 * @param options.restart - When true, kill existing TUI and spawn a fresh one instead of connecting
 */
export async function runTui(options: { restart?: boolean } = {}): Promise<void> {
  if (options.restart) {
    const result = await restartTui();
    if (result.success) {
      process.stderr.write(`TUI restarted successfully (pid: ${result.pid ?? 'unknown'}).\n`);
    } else {
      process.stderr.write(`Failed to restart TUI: ${result.reason}\n`);
      process.exitCode = 1;
    }
    return;
  }

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

  // HUD file bridge: watch hud-state.json and emit EventBus events (#1104)
  // This enables TUI updates in stdio mode where IPC may not deliver events.
  let hudBridge: { stop(): void } | null = null;
  try {
    const { HudFileBridge } = await import('../tui/events');
    const sessions = manager.getSessions();
    if (sessions.length > 0) {
      const hudStatePath = path.join(
        process.env.CODINGBUDDY_HUD_STATE_DIR ?? path.join(os.homedir(), '.codingbuddy'),
        'hud-state.json',
      );
      const bridge = new HudFileBridge(sessions[0].eventBus, hudStatePath);
      bridge.start();
      hudBridge = bridge;
    }
  } catch {
    // Non-critical — TUI still works via IPC if available
  }

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
    hudBridge?.stop();
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
