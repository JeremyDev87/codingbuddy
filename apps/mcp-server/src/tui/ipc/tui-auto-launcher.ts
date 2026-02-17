import { spawn, execSync } from 'child_process';
import type { TuiIpcServer } from './ipc-server';

export interface AutoLaunchOptions {
  enabled: boolean;
  delayMs?: number;
  codingbuddyBin?: string;
}

export interface AutoLaunchResult {
  launched: boolean;
  reason: 'spawned' | 'client-already-connected' | 'disabled' | 'no-terminal' | 'spawn-failed';
  pid?: number;
}

interface SpawnArgs {
  command: string;
  args: string[];
}

const LINUX_TERMINAL_CANDIDATES = ['kitty', 'alacritty', 'gnome-terminal', 'xterm'];

/** Only allow safe characters in executable paths and terminal names */
const SAFE_PATH_PATTERN = /^[a-zA-Z0-9._\-/]+$/;

/** Escape special characters for safe embedding in AppleScript strings */
function escapeAppleScript(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t');
}

/**
 * Auto-launches a TUI client in a new terminal window when no client
 * is connected to the IPC server after a configurable delay.
 */
export class TuiAutoLauncher {
  private readonly enabled: boolean;
  private readonly delayMs: number;
  private readonly codingbuddyBin: string;

  constructor(options: AutoLaunchOptions) {
    this.enabled = options.enabled;
    this.delayMs = options.delayMs ?? 2000;
    this.codingbuddyBin = options.codingbuddyBin ?? 'codingbuddy';
  }

  async launch(ipcServer: Pick<TuiIpcServer, 'clientCount'>): Promise<AutoLaunchResult> {
    if (!this.enabled) {
      return { launched: false, reason: 'disabled' };
    }

    if (this.delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delayMs));
    }

    if (ipcServer.clientCount() >= 1) {
      return { launched: false, reason: 'client-already-connected' };
    }

    const spawnArgs = this.buildSpawnArgs();
    if (!spawnArgs) {
      return { launched: false, reason: 'no-terminal' };
    }

    try {
      const child = spawn(spawnArgs.command, spawnArgs.args, {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();
      return { launched: true, reason: 'spawned', pid: child.pid };
    } catch {
      return { launched: false, reason: 'spawn-failed' };
    }
  }

  private buildSpawnArgs(): SpawnArgs | null {
    const platform = process.platform;
    const bin = this.codingbuddyBin;

    if (!SAFE_PATH_PATTERN.test(bin)) {
      return null;
    }

    if (platform === 'darwin') {
      return this.buildDarwinSpawnArgs(bin);
    }

    if (platform === 'linux') {
      return this.buildLinuxSpawnArgs(bin);
    }

    return null;
  }

  private buildDarwinSpawnArgs(bin: string): SpawnArgs {
    const termProgram = process.env.TERM_PROGRAM;

    if (termProgram === 'iTerm.app') {
      return {
        command: 'osascript',
        args: [
          '-e',
          `tell application "iTerm2" to create window with default profile command "${escapeAppleScript(bin)} tui"`,
        ],
      };
    }

    if (termProgram === 'WezTerm') {
      return {
        command: 'wezterm',
        args: ['cli', 'spawn', '--', bin, 'tui'],
      };
    }

    // Default: macOS Terminal.app
    return {
      command: 'osascript',
      args: ['-e', `tell application "Terminal" to do script "${escapeAppleScript(bin)} tui"`],
    };
  }

  private buildLinuxSpawnArgs(bin: string): SpawnArgs | null {
    const envTerminal = process.env.TERMINAL;
    if (envTerminal && SAFE_PATH_PATTERN.test(envTerminal)) {
      return {
        command: envTerminal,
        args: ['-e', bin, 'tui'],
      };
    }

    const detected = this.detectLinuxTerminal();
    if (!detected) {
      return null;
    }

    return {
      command: detected,
      args: ['-e', bin, 'tui'],
    };
  }

  private detectLinuxTerminal(): string | null {
    for (const candidate of LINUX_TERMINAL_CANDIDATES) {
      try {
        execSync(`which ${candidate}`, { stdio: 'pipe' });
        return candidate;
      } catch {
        // Terminal not found, try next
      }
    }
    return null;
  }
}
