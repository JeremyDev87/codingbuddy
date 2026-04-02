import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetchIndex = vi.fn();
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

vi.mock('../../plugin/registry-client', () => ({
  RegistryClient: class {
    fetchIndex = mockFetchIndex;
  },
}));

vi.mock('../../plugin/plugin-installer.service', () => ({
  PluginInstallerService: class {
    install = mockInstall;
  },
}));

vi.mock('../utils/console', () => ({
  createConsoleUtils: () => mockConsoleUtils,
}));

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actual,
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
  };
});

import { existsSync, readFileSync } from 'fs';
import { runUpdate } from './update.command';

const mockExistsSync = vi.mocked(existsSync);
const mockReadFileSync = vi.mocked(readFileSync);

function makePluginsJson(plugins: Array<{ name: string; version: string; source: string }>) {
  return JSON.stringify({
    plugins: plugins.map(p => ({
      ...p,
      installedAt: '2026-01-01T00:00:00.000Z',
      provides: { agents: [], rules: [], skills: [], checklists: [] },
    })),
  });
}

function makeRegistryIndex(plugins: Array<{ name: string; version: string }>) {
  return {
    plugins: plugins.map(p => ({
      ...p,
      description: `${p.name} plugin`,
      tags: [],
      provides: {},
    })),
  };
}

describe('update.command', () => {
  const projectRoot = '/test/project';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('no installed plugins', () => {
    it('should report no plugins installed when plugins.json does not exist', async () => {
      mockExistsSync.mockReturnValue(false);

      const result = await runUpdate({ projectRoot });

      expect(result.success).toBe(true);
      expect(result.checked).toBe(0);
      expect(result.updated).toBe(0);
      expect(mockConsoleUtils.log.info).toHaveBeenCalledWith(
        expect.stringMatching(/no.*plugin.*installed/i),
      );
    });
  });

  describe('all up-to-date', () => {
    it('should report all plugins are up-to-date', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        makePluginsJson([{ name: 'my-plugin', version: '1.0.0', source: 'github:user/repo' }]),
      );
      mockFetchIndex.mockResolvedValue(
        makeRegistryIndex([{ name: 'my-plugin', version: '1.0.0' }]),
      );

      const result = await runUpdate({ projectRoot });

      expect(result.success).toBe(true);
      expect(result.checked).toBe(1);
      expect(result.updated).toBe(0);
      expect(mockConsoleUtils.log.success).toHaveBeenCalledWith(
        expect.stringMatching(/up.to.date/i),
      );
    });
  });

  describe('outdated plugins', () => {
    it('should detect and update outdated plugins', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        makePluginsJson([
          { name: 'plugin-a', version: '1.0.0', source: 'github:user/plugin-a' },
          { name: 'plugin-b', version: '2.1.0', source: 'github:user/plugin-b' },
        ]),
      );
      mockFetchIndex.mockResolvedValue(
        makeRegistryIndex([
          { name: 'plugin-a', version: '1.2.0' },
          { name: 'plugin-b', version: '2.1.0' },
        ]),
      );
      mockInstall.mockResolvedValue({ success: true, pluginName: 'plugin-a' });

      const result = await runUpdate({ projectRoot });

      expect(result.success).toBe(true);
      expect(result.checked).toBe(2);
      expect(result.updated).toBe(1);
      expect(mockInstall).toHaveBeenCalledTimes(1);
      expect(mockInstall).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'github:user/plugin-a',
          force: true,
        }),
      );
    });

    it('should show version diff for outdated plugins', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        makePluginsJson([{ name: 'my-plugin', version: '1.0.0', source: 'github:user/repo' }]),
      );
      mockFetchIndex.mockResolvedValue(
        makeRegistryIndex([{ name: 'my-plugin', version: '2.0.0' }]),
      );
      mockInstall.mockResolvedValue({ success: true, pluginName: 'my-plugin' });

      await runUpdate({ projectRoot });

      const allStepCalls = mockConsoleUtils.log.step.mock.calls.map((c: string[]) => c[1]);
      const versionLine = allStepCalls.find(
        (msg: string) => msg.includes('1.0.0') && msg.includes('2.0.0'),
      );
      expect(versionLine).toBeDefined();
    });
  });

  describe('update specific plugin', () => {
    it('should update only the named plugin', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        makePluginsJson([
          { name: 'plugin-a', version: '1.0.0', source: 'github:user/plugin-a' },
          { name: 'plugin-b', version: '1.0.0', source: 'github:user/plugin-b' },
        ]),
      );
      mockFetchIndex.mockResolvedValue(
        makeRegistryIndex([
          { name: 'plugin-a', version: '2.0.0' },
          { name: 'plugin-b', version: '2.0.0' },
        ]),
      );
      mockInstall.mockResolvedValue({ success: true, pluginName: 'plugin-a' });

      const result = await runUpdate({ projectRoot, pluginName: 'plugin-a' });

      expect(result.success).toBe(true);
      expect(result.checked).toBe(1);
      expect(result.updated).toBe(1);
      expect(mockInstall).toHaveBeenCalledTimes(1);
    });

    it('should error when named plugin is not installed', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(makePluginsJson([]));

      const result = await runUpdate({ projectRoot, pluginName: 'nonexistent' });

      expect(result.success).toBe(false);
      expect(mockConsoleUtils.log.error).toHaveBeenCalledWith(
        expect.stringMatching(/not found|not installed/i),
      );
    });
  });

  describe('plugin not in registry', () => {
    it('should skip plugins not found in registry', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        makePluginsJson([{ name: 'local-only', version: '1.0.0', source: 'github:user/local' }]),
      );
      mockFetchIndex.mockResolvedValue(makeRegistryIndex([]));

      const result = await runUpdate({ projectRoot });

      expect(result.success).toBe(true);
      expect(result.updated).toBe(0);
      expect(mockConsoleUtils.log.warn).toHaveBeenCalledWith(
        expect.stringMatching(/not found in registry/i),
      );
    });
  });

  describe('semver comparison', () => {
    it('should detect major version updates', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        makePluginsJson([{ name: 'p', version: '1.9.9', source: 'github:u/p' }]),
      );
      mockFetchIndex.mockResolvedValue(makeRegistryIndex([{ name: 'p', version: '2.0.0' }]));
      mockInstall.mockResolvedValue({ success: true, pluginName: 'p' });

      const result = await runUpdate({ projectRoot });

      expect(result.updated).toBe(1);
    });

    it('should detect minor version updates', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        makePluginsJson([{ name: 'p', version: '1.0.0', source: 'github:u/p' }]),
      );
      mockFetchIndex.mockResolvedValue(makeRegistryIndex([{ name: 'p', version: '1.1.0' }]));
      mockInstall.mockResolvedValue({ success: true, pluginName: 'p' });

      const result = await runUpdate({ projectRoot });

      expect(result.updated).toBe(1);
    });

    it('should detect patch version updates', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        makePluginsJson([{ name: 'p', version: '1.0.0', source: 'github:u/p' }]),
      );
      mockFetchIndex.mockResolvedValue(makeRegistryIndex([{ name: 'p', version: '1.0.1' }]));
      mockInstall.mockResolvedValue({ success: true, pluginName: 'p' });

      const result = await runUpdate({ projectRoot });

      expect(result.updated).toBe(1);
    });

    it('should not update when installed version is newer than registry', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        makePluginsJson([{ name: 'p', version: '2.0.0', source: 'github:u/p' }]),
      );
      mockFetchIndex.mockResolvedValue(makeRegistryIndex([{ name: 'p', version: '1.0.0' }]));

      const result = await runUpdate({ projectRoot });

      expect(result.updated).toBe(0);
      expect(mockInstall).not.toHaveBeenCalled();
    });
  });

  describe('install failure handling', () => {
    it('should report failure when re-install fails', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        makePluginsJson([{ name: 'p', version: '1.0.0', source: 'github:u/p' }]),
      );
      mockFetchIndex.mockResolvedValue(makeRegistryIndex([{ name: 'p', version: '2.0.0' }]));
      mockInstall.mockResolvedValue({ success: false, error: 'Clone failed' });

      const result = await runUpdate({ projectRoot });

      expect(result.success).toBe(false);
      expect(result.updated).toBe(0);
      expect(mockConsoleUtils.log.error).toHaveBeenCalledWith(expect.stringMatching(/failed/i));
    });
  });

  describe('registry fetch failure', () => {
    it('should handle registry fetch error gracefully', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        makePluginsJson([{ name: 'p', version: '1.0.0', source: 'github:u/p' }]),
      );
      mockFetchIndex.mockRejectedValue(new Error('Network error'));

      const result = await runUpdate({ projectRoot });

      expect(result.success).toBe(false);
      expect(mockConsoleUtils.log.error).toHaveBeenCalled();
    });
  });
});
