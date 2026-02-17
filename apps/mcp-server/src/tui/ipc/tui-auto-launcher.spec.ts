import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { AutoLaunchResult } from './tui-auto-launcher';

// Mock child_process before importing the module under test
vi.mock('child_process', () => ({
  spawn: vi.fn(),
  execSync: vi.fn(),
}));

import { spawn, execSync } from 'child_process';
import type { ChildProcess } from 'child_process';
import { TuiAutoLauncher } from './tui-auto-launcher';

const mockSpawn = vi.mocked(spawn);
const mockExecSync = vi.mocked(execSync);

function createMockIpcServer(count: number) {
  return { clientCount: () => count };
}

function createMockChildProcess(pid: number) {
  const child = {
    pid,
    unref: vi.fn(),
    on: vi.fn(),
  };
  mockSpawn.mockReturnValue(child as unknown as ChildProcess);
  return child;
}

describe('TuiAutoLauncher', () => {
  const originalPlatform = process.platform;
  const originalEnv = { ...process.env };

  function setPlatform(platform: string): void {
    Object.defineProperty(process, 'platform', { value: platform, configurable: true });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset env vars relevant to terminal detection
    delete process.env.TERM_PROGRAM;
    delete process.env.TERMINAL;
  });

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
    process.env = { ...originalEnv };
  });

  it('should return disabled when enabled is false', async () => {
    const launcher = new TuiAutoLauncher({ enabled: false });
    const ipcServer = createMockIpcServer(0);

    const result = await launcher.launch(ipcServer);

    expect(result).toEqual<AutoLaunchResult>({
      launched: false,
      reason: 'disabled',
    });
  });

  it('should return client-already-connected when clientCount > 0', async () => {
    const launcher = new TuiAutoLauncher({ enabled: true, delayMs: 0 });
    const ipcServer = createMockIpcServer(1);

    const result = await launcher.launch(ipcServer);

    expect(result).toEqual<AutoLaunchResult>({
      launched: false,
      reason: 'client-already-connected',
    });
  });

  describe('macOS (darwin)', () => {
    beforeEach(() => {
      setPlatform('darwin');
    });

    it('should spawn with iTerm2 when TERM_PROGRAM is iTerm.app', async () => {
      process.env.TERM_PROGRAM = 'iTerm.app';
      const mockChild = createMockChildProcess(1234);

      const launcher = new TuiAutoLauncher({ enabled: true, delayMs: 0 });
      const ipcServer = createMockIpcServer(0);

      const result = await launcher.launch(ipcServer);

      expect(result).toEqual<AutoLaunchResult>({
        launched: true,
        reason: 'spawned',
        pid: 1234,
      });
      expect(mockSpawn).toHaveBeenCalledWith(
        'osascript',
        [
          '-e',
          'tell application "iTerm2" to create window with default profile command "codingbuddy tui"',
        ],
        { detached: true, stdio: 'ignore' },
      );
      expect(mockChild.unref).toHaveBeenCalled();
    });

    it('should spawn with WezTerm when TERM_PROGRAM is WezTerm', async () => {
      process.env.TERM_PROGRAM = 'WezTerm';
      const mockChild = createMockChildProcess(5678);

      const launcher = new TuiAutoLauncher({ enabled: true, delayMs: 0 });
      const ipcServer = createMockIpcServer(0);

      const result = await launcher.launch(ipcServer);

      expect(result).toEqual<AutoLaunchResult>({
        launched: true,
        reason: 'spawned',
        pid: 5678,
      });
      expect(mockSpawn).toHaveBeenCalledWith(
        'wezterm',
        ['cli', 'spawn', '--', 'codingbuddy', 'tui'],
        { detached: true, stdio: 'ignore' },
      );
      expect(mockChild.unref).toHaveBeenCalled();
    });

    it('should spawn with Terminal.app as fallback', async () => {
      process.env.TERM_PROGRAM = 'Apple_Terminal';
      const mockChild = createMockChildProcess(9999);

      const launcher = new TuiAutoLauncher({ enabled: true, delayMs: 0 });
      const ipcServer = createMockIpcServer(0);

      const result = await launcher.launch(ipcServer);

      expect(result).toEqual<AutoLaunchResult>({
        launched: true,
        reason: 'spawned',
        pid: 9999,
      });
      expect(mockSpawn).toHaveBeenCalledWith(
        'osascript',
        ['-e', 'tell application "Terminal" to do script "codingbuddy tui"'],
        { detached: true, stdio: 'ignore' },
      );
      expect(mockChild.unref).toHaveBeenCalled();
    });

    it('should use custom codingbuddyBin in spawn args', async () => {
      process.env.TERM_PROGRAM = 'iTerm.app';
      const mockChild = createMockChildProcess(1111);

      const launcher = new TuiAutoLauncher({
        enabled: true,
        delayMs: 0,
        codingbuddyBin: '/usr/local/bin/codingbuddy',
      });
      const ipcServer = createMockIpcServer(0);

      const result = await launcher.launch(ipcServer);

      expect(result.launched).toBe(true);
      expect(mockSpawn).toHaveBeenCalledWith(
        'osascript',
        [
          '-e',
          'tell application "iTerm2" to create window with default profile command "/usr/local/bin/codingbuddy tui"',
        ],
        { detached: true, stdio: 'ignore' },
      );
    });
  });

  describe('Linux', () => {
    beforeEach(() => {
      setPlatform('linux');
    });

    it('should spawn with TERMINAL env var when set', async () => {
      process.env.TERMINAL = 'alacritty';
      const mockChild = createMockChildProcess(2222);

      const launcher = new TuiAutoLauncher({ enabled: true, delayMs: 0 });
      const ipcServer = createMockIpcServer(0);

      const result = await launcher.launch(ipcServer);

      expect(result).toEqual<AutoLaunchResult>({
        launched: true,
        reason: 'spawned',
        pid: 2222,
      });
      expect(mockSpawn).toHaveBeenCalledWith('alacritty', ['-e', 'codingbuddy', 'tui'], {
        detached: true,
        stdio: 'ignore',
      });
      expect(mockChild.unref).toHaveBeenCalled();
    });

    it('should detect terminal via which lookup when TERMINAL is not set', async () => {
      delete process.env.TERMINAL;
      // First "which kitty" fails, second "which alacritty" succeeds
      mockExecSync
        .mockImplementationOnce(() => {
          throw new Error('not found');
        })
        .mockImplementationOnce(() => Buffer.from('/usr/bin/alacritty\n'));

      const mockChild = createMockChildProcess(3333);

      const launcher = new TuiAutoLauncher({ enabled: true, delayMs: 0 });
      const ipcServer = createMockIpcServer(0);

      const result = await launcher.launch(ipcServer);

      expect(result).toEqual<AutoLaunchResult>({
        launched: true,
        reason: 'spawned',
        pid: 3333,
      });
      expect(mockExecSync).toHaveBeenCalledWith('which kitty', { stdio: 'pipe' });
      expect(mockExecSync).toHaveBeenCalledWith('which alacritty', { stdio: 'pipe' });
      expect(mockSpawn).toHaveBeenCalledWith('alacritty', ['-e', 'codingbuddy', 'tui'], {
        detached: true,
        stdio: 'ignore',
      });
    });

    it('should return no-terminal when no Linux terminal is found', async () => {
      delete process.env.TERMINAL;
      mockExecSync.mockImplementation(() => {
        throw new Error('not found');
      });

      const launcher = new TuiAutoLauncher({ enabled: true, delayMs: 0 });
      const ipcServer = createMockIpcServer(0);

      const result = await launcher.launch(ipcServer);

      expect(result).toEqual<AutoLaunchResult>({
        launched: false,
        reason: 'no-terminal',
      });
    });
  });

  it('should return no-terminal on unsupported platform', async () => {
    setPlatform('win32');

    const launcher = new TuiAutoLauncher({ enabled: true, delayMs: 0 });
    const ipcServer = createMockIpcServer(0);

    const result = await launcher.launch(ipcServer);

    expect(result).toEqual<AutoLaunchResult>({
      launched: false,
      reason: 'no-terminal',
    });
  });

  it('should use detached and stdio ignore in spawn options', async () => {
    setPlatform('darwin');
    process.env.TERM_PROGRAM = 'Apple_Terminal';
    const mockChild = createMockChildProcess(4444);

    const launcher = new TuiAutoLauncher({ enabled: true, delayMs: 0 });
    const ipcServer = createMockIpcServer(0);

    await launcher.launch(ipcServer);

    expect(mockSpawn).toHaveBeenCalledWith(expect.any(String), expect.any(Array), {
      detached: true,
      stdio: 'ignore',
    });
    expect(mockChild.unref).toHaveBeenCalled();
  });

  it('should return spawn-failed when spawn throws', async () => {
    setPlatform('darwin');
    process.env.TERM_PROGRAM = 'Apple_Terminal';
    mockSpawn.mockImplementation(() => {
      throw new Error('spawn ENOENT');
    });

    const launcher = new TuiAutoLauncher({ enabled: true, delayMs: 0 });
    const ipcServer = createMockIpcServer(0);

    const result = await launcher.launch(ipcServer);

    expect(result).toEqual<AutoLaunchResult>({
      launched: false,
      reason: 'spawn-failed',
    });
  });

  it('should apply default delayMs of 2000', () => {
    const launcher = new TuiAutoLauncher({ enabled: true });
    // Access internal state via type assertion to verify defaults
    expect((launcher as unknown as { delayMs: number }).delayMs).toBe(2000);
  });

  it('should apply default codingbuddyBin of "codingbuddy"', () => {
    const launcher = new TuiAutoLauncher({ enabled: true });
    expect((launcher as unknown as { codingbuddyBin: string }).codingbuddyBin).toBe('codingbuddy');
  });

  describe('SAFE_PATH_PATTERN rejection', () => {
    beforeEach(() => {
      setPlatform('darwin');
    });

    it.each([
      ['space in path', '/usr/local/my bin'],
      ['semicolon injection', 'codingbuddy; rm -rf /'],
      ['backtick injection', 'codingbuddy`whoami`'],
      ['double-quote injection', 'coding"buddy'],
      ['newline injection', 'codingbuddy\ntui'],
      ['pipe injection', 'codingbuddy | cat /etc/passwd'],
      ['dollar substitution', 'codingbuddy$(whoami)'],
    ])('should reject codingbuddyBin with %s', async (_label, unsafeBin) => {
      const launcher = new TuiAutoLauncher({
        enabled: true,
        delayMs: 0,
        codingbuddyBin: unsafeBin,
      });
      const ipcServer = createMockIpcServer(0);

      const result = await launcher.launch(ipcServer);

      expect(result).toEqual<AutoLaunchResult>({ launched: false, reason: 'no-terminal' });
      expect(mockSpawn).not.toHaveBeenCalled();
    });

    it('should reject unsafe TERMINAL env var on Linux and return no-terminal when no fallback found', async () => {
      setPlatform('linux');
      process.env.TERMINAL = 'xterm; rm -rf /';
      // TERMINAL is rejected by SAFE_PATH_PATTERN; detectLinuxTerminal then runs.
      // Make all which-lookups fail so there is no fallback terminal.
      mockExecSync.mockImplementation(() => {
        throw new Error('not found');
      });

      const launcher = new TuiAutoLauncher({ enabled: true, delayMs: 0 });
      const ipcServer = createMockIpcServer(0);

      const result = await launcher.launch(ipcServer);

      expect(result).toEqual<AutoLaunchResult>({ launched: false, reason: 'no-terminal' });
      expect(mockSpawn).not.toHaveBeenCalled();
    });
  });
});
