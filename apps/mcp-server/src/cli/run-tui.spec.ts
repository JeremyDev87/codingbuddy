import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { selectInstance } from './run-tui';
import type { IpcInstance } from '../tui/ipc/ipc.types';
import { getSocketPath } from '../tui/ipc/ipc.types';

describe('selectInstance', () => {
  it('should return the only instance when there is exactly one', () => {
    const instances: IpcInstance[] = [
      {
        pid: 1234,
        socketPath: '/tmp/codingbuddy-1234.sock',
        projectRoot: '/home/user/project',
        startedAt: '2026-02-15T10:00:00Z',
      },
    ];
    const result = selectInstance(instances);
    expect(result).toEqual(instances[0]);
  });

  it('should return null when there are no instances', () => {
    const result = selectInstance([]);
    expect(result).toBeNull();
  });

  it('should return the most recent instance when multiple exist', () => {
    const instances: IpcInstance[] = [
      {
        pid: 1111,
        socketPath: '/tmp/codingbuddy-1111.sock',
        projectRoot: '/old',
        startedAt: '2026-02-15T09:00:00Z',
      },
      {
        pid: 2222,
        socketPath: '/tmp/codingbuddy-2222.sock',
        projectRoot: '/new',
        startedAt: '2026-02-15T10:00:00Z',
      },
    ];
    const result = selectInstance(instances);
    expect(result?.pid).toBe(2222);
  });
});

// --- runTui integration tests with module mocks ---

const mockPrune = vi.fn().mockReturnValue(0);
const mockList = vi.fn<() => IpcInstance[]>().mockReturnValue([]);
const mockUnregister = vi.fn();
const mockConnect = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
const mockDisconnect = vi.fn();
const mockOnMessage = vi.fn();
const mockOnError = vi.fn();

vi.mock('../tui/ipc/instance-registry', () => ({
  InstanceRegistry: class {
    prune = mockPrune;
    list = mockList;
    unregister = mockUnregister;
  },
}));

vi.mock('../tui/ipc/ipc-client', () => ({
  TuiIpcClient: class {
    connect = mockConnect;
    disconnect = mockDisconnect;
    onMessage = mockOnMessage;
    onError = mockOnError;
  },
}));

describe('runTui', () => {
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

  it('should set exitCode=1 when no instances found', async () => {
    mockList.mockReturnValue([]);

    const { runTui } = await import('./run-tui');
    await runTui();

    expect(process.exitCode).toBe(1);
    expect(stderrSpy).toHaveBeenCalledWith(
      expect.stringContaining('No running codingbuddy MCP server found'),
    );
  });

  it('should set exitCode=1 and unregister on invalid socket path', async () => {
    const poisonedInstance: IpcInstance = {
      pid: 9999,
      socketPath: '/tmp/evil-socket.sock',
      projectRoot: '/home/user/project',
      startedAt: '2026-02-15T10:00:00Z',
    };
    mockList.mockReturnValue([poisonedInstance]);

    const { runTui } = await import('./run-tui');
    await runTui();

    expect(process.exitCode).toBe(1);
    expect(stderrSpy).toHaveBeenCalledWith(
      expect.stringContaining('Invalid socket path in registry'),
    );
    expect(mockUnregister).toHaveBeenCalledWith(9999);
  });

  it('should set exitCode=1 when connection fails', async () => {
    const validPid = 8888;
    const validInstance: IpcInstance = {
      pid: validPid,
      socketPath: getSocketPath(validPid),
      projectRoot: '/home/user/project',
      startedAt: '2026-02-15T10:00:00Z',
    };
    mockList.mockReturnValue([validInstance]);
    mockConnect.mockRejectedValue(new Error('ENOENT'));

    const { runTui } = await import('./run-tui');
    await runTui();

    expect(process.exitCode).toBe(1);
    expect(stderrSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to connect'),
    );
  });
});
