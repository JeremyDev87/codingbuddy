import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrune = vi.fn().mockReturnValue(0);
const mockList = vi.fn();

vi.mock('../tui/ipc/instance-registry', () => ({
  InstanceRegistry: class {
    prune = mockPrune;
    list = mockList;
  },
}));

const mockLaunch = vi.fn();
vi.mock('../tui/ipc/tui-auto-launcher', () => ({
  TuiAutoLauncher: class {
    constructor(_opts: unknown) {}
    launch = mockLaunch;
  },
}));

const mockSpawnSync = vi.fn().mockReturnValue({ status: 0 });
vi.mock('child_process', () => ({
  spawnSync: mockSpawnSync,
}));

vi.mock('../tui/ipc/ipc.types', () => ({
  getInstancesFilePath: vi.fn().mockReturnValue('/fake/.codingbuddy/instances.json'),
}));

const fakeInstance = {
  pid: 1234,
  socketPath: '/tmp/codingbuddy-1234.sock',
  projectRoot: '/project',
  startedAt: '2026-01-01T00:00:00Z',
};

describe('restartTui', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockReturnValue([]);
  });

  it('should return error when no MCP server instances found', async () => {
    mockList.mockReturnValue([]);
    const { restartTui } = await import('./restart-tui');
    const result = await restartTui();
    expect(result.success).toBe(false);
    expect(result.reason).toMatch(/No running MCP server/);
  });

  it('should kill existing TUI client before checking instances', async () => {
    mockList.mockReturnValue([fakeInstance]);
    mockLaunch.mockResolvedValue({ launched: true, reason: 'spawned', pid: 9999 });

    const { restartTui } = await import('./restart-tui');
    await restartTui();

    expect(mockSpawnSync).toHaveBeenCalledWith(
      'pkill',
      expect.arrayContaining(['-f']),
      expect.any(Object),
    );
  });

  it('should prune registry before relaunching', async () => {
    mockList.mockReturnValue([fakeInstance]);
    mockLaunch.mockResolvedValue({ launched: true, reason: 'spawned', pid: 9999 });

    const { restartTui } = await import('./restart-tui');
    await restartTui();

    expect(mockPrune).toHaveBeenCalled();
  });

  it('should return success with pid when spawn succeeds', async () => {
    mockList.mockReturnValue([fakeInstance]);
    mockLaunch.mockResolvedValue({ launched: true, reason: 'spawned', pid: 9999 });

    const { restartTui } = await import('./restart-tui');
    const result = await restartTui();

    expect(result.success).toBe(true);
    expect(result.pid).toBe(9999);
  });

  it('should return failure when TuiAutoLauncher spawn fails', async () => {
    mockList.mockReturnValue([fakeInstance]);
    mockLaunch.mockResolvedValue({ launched: false, reason: 'spawn-failed' });

    const { restartTui } = await import('./restart-tui');
    const result = await restartTui();

    expect(result.success).toBe(false);
    expect(result.reason).toContain('spawn-failed');
  });

  it('should call TuiAutoLauncher with clientCount returning 0 to force spawn', async () => {
    mockList.mockReturnValue([fakeInstance]);
    mockLaunch.mockResolvedValue({ launched: true, reason: 'spawned', pid: 8888 });

    const { restartTui } = await import('./restart-tui');
    await restartTui();

    // launch should be called with a stub that always returns 0
    expect(mockLaunch).toHaveBeenCalledWith(
      expect.objectContaining({ clientCount: expect.any(Function) }),
    );
    const stub = mockLaunch.mock.calls[0][0] as { clientCount: () => number };
    expect(stub.clientCount()).toBe(0);
  });

  it('should accept custom codingbuddyBin option', async () => {
    mockList.mockReturnValue([fakeInstance]);
    mockLaunch.mockResolvedValue({ launched: true, reason: 'spawned', pid: 7777 });

    const { restartTui } = await import('./restart-tui');
    const result = await restartTui({ codingbuddyBin: '/custom/bin/codingbuddy' });

    expect(result.success).toBe(true);
    expect(mockLaunch).toHaveBeenCalled();
  });
});
