import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockInstall = vi.fn();
const mockConsoleUtils = {
  log: {
    info: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    step: vi.fn(),
  },
};

vi.mock('../../plugin/plugin-installer.service', () => ({
  PluginInstallerService: class {
    install = mockInstall;
  },
}));

vi.mock('../utils/console', () => ({
  createConsoleUtils: () => mockConsoleUtils,
}));

import { runInstall, InstallCommandOptions } from './install.command';

describe('install.command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultOptions: InstallCommandOptions = {
    source: 'github:user/repo',
    projectRoot: '/project',
    force: false,
  };

  it('should call PluginInstallerService.install with correct options', async () => {
    mockInstall.mockResolvedValue({
      success: true,
      pluginName: 'my-plugin',
      summary: 'Installed my-plugin@1.0.0: 1 agents, 1 rules, 0 skills',
    });

    await runInstall(defaultOptions);

    expect(mockInstall).toHaveBeenCalledWith({
      source: 'github:user/repo',
      targetRoot: '/project',
      force: false,
    });
  });

  it('should print success summary on successful install', async () => {
    mockInstall.mockResolvedValue({
      success: true,
      pluginName: 'my-plugin',
      summary: 'Installed my-plugin@1.0.0: 1 agents, 1 rules, 0 skills',
    });

    const result = await runInstall(defaultOptions);

    expect(result.success).toBe(true);
    expect(mockConsoleUtils.log.success).toHaveBeenCalledWith(
      expect.stringContaining('my-plugin@1.0.0'),
    );
  });

  it('should print error message on failure', async () => {
    mockInstall.mockResolvedValue({
      success: false,
      error: 'Invalid plugin manifest: name is required',
    });

    const result = await runInstall(defaultOptions);

    expect(result.success).toBe(false);
    expect(mockConsoleUtils.log.error).toHaveBeenCalledWith(
      expect.stringContaining('Invalid plugin manifest'),
    );
  });

  it('should pass force flag through', async () => {
    mockInstall.mockResolvedValue({
      success: true,
      pluginName: 'my-plugin',
      summary: 'Installed my-plugin@1.0.0',
    });

    await runInstall({ ...defaultOptions, force: true });

    expect(mockInstall).toHaveBeenCalledWith(expect.objectContaining({ force: true }));
  });

  it('should handle unexpected errors gracefully', async () => {
    mockInstall.mockRejectedValue(new Error('Network error'));

    const result = await runInstall(defaultOptions);

    expect(result.success).toBe(false);
    expect(mockConsoleUtils.log.error).toHaveBeenCalled();
  });

  it('should log install step before starting', async () => {
    mockInstall.mockResolvedValue({
      success: true,
      pluginName: 'my-plugin',
      summary: 'Installed',
    });

    await runInstall(defaultOptions);

    expect(mockConsoleUtils.log.step).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('github:user/repo'),
    );
  });
});
