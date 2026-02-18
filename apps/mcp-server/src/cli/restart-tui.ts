import { spawnSync } from 'child_process';
import { getInstancesFilePath } from '../tui/ipc/ipc.types';
import { InstanceRegistry } from '../tui/ipc/instance-registry';
import { TuiAutoLauncher } from '../tui/ipc/tui-auto-launcher';

export interface RestartResult {
  success: boolean;
  reason: string;
  pid?: number;
}

export interface RestartOptions {
  codingbuddyBin?: string;
}

/**
 * Shared TUI restart logic used by both the MCP tool and CLI --restart flag.
 *
 * Algorithm:
 * 1. Kill existing TUI client process (SIGTERM via pkill)
 * 2. Prune stale MCP server entries from instance registry
 * 3. Validate at least one live MCP server instance exists
 * 4. Spawn fresh TUI client in new terminal window
 */
export async function restartTui(options: RestartOptions = {}): Promise<RestartResult> {
  // Step 1: Kill existing TUI client (ignore failures — process may not exist)
  spawnSync('pkill', ['-f', 'codingbuddy.*tui$'], { stdio: 'ignore' });

  // Step 2: Prune stale registry entries
  const registry = new InstanceRegistry(getInstancesFilePath());
  registry.prune();

  // Step 3: Validate live instances exist
  const instances = registry.list();
  if (instances.length === 0) {
    return {
      success: false,
      reason: 'No running MCP server found. Start your AI tool (Claude Code, Cursor, etc.) first.',
    };
  }

  // Step 4: Spawn fresh TUI client
  // Pass clientCount: () => 0 to bypass the "already connected" guard in TuiAutoLauncher,
  // ensuring a new terminal is always opened regardless of previous state.
  const launcher = new TuiAutoLauncher({
    enabled: true,
    delayMs: 0,
    codingbuddyBin: options.codingbuddyBin ?? 'codingbuddy',
  });

  const result = await launcher.launch({ clientCount: () => 0 });

  if (!result.launched) {
    return { success: false, reason: result.reason };
  }

  return { success: true, reason: result.reason, pid: result.pid };
}
