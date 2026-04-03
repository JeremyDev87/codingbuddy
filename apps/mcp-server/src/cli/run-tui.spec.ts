import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as os from 'node:os';
import * as path from 'node:path';
import type { IpcInstance } from '../tui/ipc/ipc.types';

// --- runTui integration tests with module mocks ---

const mockRestartTui = vi.fn();
vi.mock('./restart-tui', () => ({
  restartTui: mockRestartTui,
}));

const mockPrune = vi.fn().mockReturnValue(0);
const mockList = vi.fn<() => IpcInstance[]>().mockReturnValue([]);

vi.mock('../tui/ipc/instance-registry', () => ({
  InstanceRegistry: class {
    prune = mockPrune;
    list = mockList;
  },
}));

const mockConnectAll = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
const mockDisconnectAll = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
const mockStartPolling = vi.fn();
const mockGetSessions = vi.fn().mockReturnValue([]);

vi.mock('../tui/ipc', () => ({
  MultiSessionManager: class {
    connectAll = mockConnectAll;
    disconnectAll = mockDisconnectAll;
    startPolling = mockStartPolling;
    getSessions = mockGetSessions;
  },
}));

describe('resolveHudStateDir', () => {
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    savedEnv.CODINGBUDDY_HUD_STATE_DIR = process.env.CODINGBUDDY_HUD_STATE_DIR;
    savedEnv.CLAUDE_PLUGIN_DATA = process.env.CLAUDE_PLUGIN_DATA;
    delete process.env.CODINGBUDDY_HUD_STATE_DIR;
    delete process.env.CLAUDE_PLUGIN_DATA;
  });

  afterEach(() => {
    if (savedEnv.CODINGBUDDY_HUD_STATE_DIR !== undefined) {
      process.env.CODINGBUDDY_HUD_STATE_DIR = savedEnv.CODINGBUDDY_HUD_STATE_DIR;
    } else {
      delete process.env.CODINGBUDDY_HUD_STATE_DIR;
    }
    if (savedEnv.CLAUDE_PLUGIN_DATA !== undefined) {
      process.env.CLAUDE_PLUGIN_DATA = savedEnv.CLAUDE_PLUGIN_DATA;
    } else {
      delete process.env.CLAUDE_PLUGIN_DATA;
    }
  });

  it('returns CODINGBUDDY_HUD_STATE_DIR when set', async () => {
    process.env.CODINGBUDDY_HUD_STATE_DIR = '/custom/hud-dir';
    const { resolveHudStateDir } = await import('./run-tui');
    expect(resolveHudStateDir()).toBe('/custom/hud-dir');
  });

  it('returns CLAUDE_PLUGIN_DATA when CODINGBUDDY_HUD_STATE_DIR is unset', async () => {
    process.env.CLAUDE_PLUGIN_DATA = '/plugin/data';
    const { resolveHudStateDir } = await import('./run-tui');
    expect(resolveHudStateDir()).toBe('/plugin/data');
  });

  it('returns ~/.codingbuddy as default fallback', async () => {
    const { resolveHudStateDir } = await import('./run-tui');
    expect(resolveHudStateDir()).toBe(path.join(os.homedir(), '.codingbuddy'));
  });

  it('CODINGBUDDY_HUD_STATE_DIR takes priority over CLAUDE_PLUGIN_DATA', async () => {
    process.env.CODINGBUDDY_HUD_STATE_DIR = '/explicit-override';
    process.env.CLAUDE_PLUGIN_DATA = '/plugin/data';
    const { resolveHudStateDir } = await import('./run-tui');
    expect(resolveHudStateDir()).toBe('/explicit-override');
  });
});

describe('runTui', () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  let savedExitCode: typeof process.exitCode;

  beforeEach(() => {
    stderrSpy = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    savedExitCode = process.exitCode;
    process.exitCode = undefined;
    vi.clearAllMocks();
    // Default: getSessions returns empty (no connected sessions)
    mockGetSessions.mockReturnValue([]);
  });

  afterEach(() => {
    process.exitCode = savedExitCode;
    stderrSpy.mockRestore();
  });

  it('should set exitCode=1 when no instances found', async () => {
    mockList.mockReturnValue([]);

    const { runTui } = await import('./run-tui');
    await runTui();

    expect(process.exitCode).toBe(1);
    expect(stderrSpy).toHaveBeenCalledWith(
      expect.stringContaining('No running codingbuddy MCP server found'),
    );
  });

  it('should call connectAll and set exitCode=1 when no sessions connect', async () => {
    mockList.mockReturnValue([
      {
        pid: 1234,
        socketPath: '/tmp/codingbuddy-1234.sock',
        projectRoot: '/home/user/project',
        startedAt: '2026-02-15T10:00:00Z',
      },
    ]);
    mockGetSessions.mockReturnValue([]);

    const { runTui } = await import('./run-tui');
    await runTui();

    expect(mockConnectAll).toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
    expect(stderrSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to connect to any MCP server instance'),
    );
  });

  it('should start polling and render TUI when sessions connect', async () => {
    const fakeSession = {
      instance: {
        pid: 5555,
        socketPath: '/tmp/codingbuddy-5555.sock',
        projectRoot: '/project',
        startedAt: '2026-02-15T10:00:00Z',
      },
      connected: true,
    };
    mockList.mockReturnValue([fakeSession.instance]);
    mockGetSessions.mockReturnValue([fakeSession]);

    const mockUnmount = vi.fn();
    const mockRenderMultiSession = vi.fn().mockReturnValue({ unmount: mockUnmount });

    vi.doMock('../shared/esm-import', () => ({
      esmImport: vi.fn().mockResolvedValue({
        renderMultiSession: mockRenderMultiSession,
      }),
    }));
    vi.doMock('../shared/tui-bundle-path', () => ({
      getTuiBundlePath: vi.fn().mockReturnValue('/fake/bundle.mjs'),
    }));

    const { runTui } = await import('./run-tui');
    await runTui();

    expect(mockConnectAll).toHaveBeenCalled();
    expect(mockStartPolling).toHaveBeenCalled();
    expect(mockRenderMultiSession).toHaveBeenCalledWith(
      expect.objectContaining({ manager: expect.any(Object) }),
    );
    // exitCode should NOT be 1 (no error)
    expect(process.exitCode).toBeUndefined();

    vi.doUnmock('../shared/esm-import');
    vi.doUnmock('../shared/tui-bundle-path');
  });

  it('should set exitCode=1 when TUI bundle load fails', async () => {
    const fakeSession = {
      instance: {
        pid: 6666,
        socketPath: '/tmp/codingbuddy-6666.sock',
        projectRoot: '/project',
        startedAt: '2026-02-15T10:00:00Z',
      },
      connected: true,
    };
    mockList.mockReturnValue([fakeSession.instance]);
    mockGetSessions.mockReturnValue([fakeSession]);

    vi.doMock('../shared/esm-import', () => ({
      esmImport: vi.fn().mockRejectedValue(new Error('bundle not found')),
    }));
    vi.doMock('../shared/tui-bundle-path', () => ({
      getTuiBundlePath: vi.fn().mockReturnValue('/fake/bundle.mjs'),
    }));

    const { runTui } = await import('./run-tui');
    await runTui();

    expect(process.exitCode).toBe(1);
    expect(stderrSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to load TUI components'),
    );
    expect(mockDisconnectAll).toHaveBeenCalled();

    vi.doUnmock('../shared/esm-import');
    vi.doUnmock('../shared/tui-bundle-path');
  });

  it('should set exitCode=1 when bundle lacks renderMultiSession', async () => {
    const fakeSession = {
      instance: {
        pid: 7777,
        socketPath: '/tmp/codingbuddy-7777.sock',
        projectRoot: '/project',
        startedAt: '2026-02-15T10:00:00Z',
      },
      connected: true,
    };
    mockList.mockReturnValue([fakeSession.instance]);
    mockGetSessions.mockReturnValue([fakeSession]);

    vi.doMock('../shared/esm-import', () => ({
      esmImport: vi.fn().mockResolvedValue({ startTui: vi.fn() }),
    }));
    vi.doMock('../shared/tui-bundle-path', () => ({
      getTuiBundlePath: vi.fn().mockReturnValue('/fake/bundle.mjs'),
    }));

    const { runTui } = await import('./run-tui');
    await runTui();

    expect(process.exitCode).toBe(1);
    expect(stderrSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to load TUI components'),
    );
    expect(mockDisconnectAll).toHaveBeenCalled();

    vi.doUnmock('../shared/esm-import');
    vi.doUnmock('../shared/tui-bundle-path');
  });
});

describe('runTui with restart=true', () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  let savedExitCode: typeof process.exitCode;

  beforeEach(() => {
    stderrSpy = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    savedExitCode = process.exitCode;
    process.exitCode = undefined;
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.exitCode = savedExitCode;
    stderrSpy.mockRestore();
  });

  it('should call restartTui and print success message', async () => {
    mockRestartTui.mockResolvedValue({ success: true, reason: 'spawned', pid: 9999 });

    const { runTui } = await import('./run-tui');
    await runTui({ restart: true });

    expect(mockRestartTui).toHaveBeenCalled();
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('TUI restarted'));
  });

  it('should print error and set exitCode=1 when restart fails', async () => {
    mockRestartTui.mockResolvedValue({
      success: false,
      reason: 'No running MCP server found.',
    });

    const { runTui } = await import('./run-tui');
    await runTui({ restart: true });

    expect(process.exitCode).toBe(1);
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('No running MCP server found'));
  });

  it('should not proceed to normal TUI flow when restart=true', async () => {
    mockRestartTui.mockResolvedValue({ success: true, reason: 'spawned', pid: 1 });

    const { runTui } = await import('./run-tui');
    await runTui({ restart: true });

    // Normal flow would call mockConnectAll — it should NOT be called
    expect(mockConnectAll).not.toHaveBeenCalled();
  });
});
