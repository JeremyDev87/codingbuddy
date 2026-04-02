import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync, existsSync, writeFileSync, unlinkSync } from 'fs';

vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  existsSync: vi.fn(),
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
}));

const mockConsoleUtils = {
  log: {
    info: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    step: vi.fn(),
  },
};

vi.mock('../utils/console', () => ({
  createConsoleUtils: () => mockConsoleUtils,
}));

import { runUninstall } from './uninstall.command';

const mockExistsSync = existsSync as ReturnType<typeof vi.fn>;
const mockReadFileSync = readFileSync as ReturnType<typeof vi.fn>;
const mockWriteFileSync = writeFileSync as ReturnType<typeof vi.fn>;
const mockUnlinkSync = unlinkSync as ReturnType<typeof vi.fn>;

function makeRegistry(plugins: Array<Record<string, unknown>>): string {
  return JSON.stringify({ plugins });
}

const samplePlugin = {
  name: 'my-plugin',
  version: '1.0.0',
  source: 'github:user/my-plugin',
  installedAt: '2026-01-01T00:00:00.000Z',
  provides: {
    agents: ['agent-a', 'agent-b'],
    rules: ['rule-x'],
    skills: [],
    checklists: [],
  },
};

describe('uninstall.command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultOptions = {
    pluginName: 'my-plugin',
    projectRoot: '/project',
    yes: true, // skip confirmation for tests
  };

  it('should remove all plugin files from .ai-rules/ directories', () => {
    mockExistsSync.mockImplementation((path: string) => {
      // plugins.json exists
      if (path.includes('plugins.json')) return true;
      // All asset files exist
      if (path.includes('.ai-rules/')) return true;
      return false;
    });
    mockReadFileSync.mockReturnValue(makeRegistry([samplePlugin]));

    const result = runUninstall(defaultOptions);

    expect(result.success).toBe(true);
    // Verify unlinkSync was called for each file
    expect(mockUnlinkSync).toHaveBeenCalledWith(
      expect.stringContaining('.ai-rules/agents/agent-a.json'),
    );
    expect(mockUnlinkSync).toHaveBeenCalledWith(
      expect.stringContaining('.ai-rules/agents/agent-b.json'),
    );
    expect(mockUnlinkSync).toHaveBeenCalledWith(
      expect.stringContaining('.ai-rules/rules/rule-x.md'),
    );
  });

  it('should update plugins.json after removal', () => {
    mockExistsSync.mockImplementation((path: string) => {
      if (path.includes('plugins.json')) return true;
      if (path.includes('.ai-rules/')) return true;
      return false;
    });
    mockReadFileSync.mockReturnValue(
      makeRegistry([
        samplePlugin,
        {
          name: 'other-plugin',
          version: '2.0.0',
          source: 'github:user/other',
          installedAt: '2026-01-01T00:00:00.000Z',
          provides: { agents: [], rules: [], skills: [], checklists: [] },
        },
      ]),
    );

    runUninstall(defaultOptions);

    expect(mockWriteFileSync).toHaveBeenCalledWith(
      expect.stringContaining('plugins.json'),
      expect.any(String),
      'utf-8',
    );

    // The written JSON should NOT contain my-plugin
    const writtenJson = JSON.parse((mockWriteFileSync.mock.calls[0] as unknown[])[1] as string);
    expect(writtenJson.plugins).toHaveLength(1);
    expect(writtenJson.plugins[0].name).toBe('other-plugin');
  });

  it('should error when plugin name not found', () => {
    mockExistsSync.mockImplementation((path: string) => {
      if (path.includes('plugins.json')) return true;
      return false;
    });
    mockReadFileSync.mockReturnValue(makeRegistry([]));

    const result = runUninstall(defaultOptions);

    expect(result.success).toBe(false);
    expect(mockConsoleUtils.log.error).toHaveBeenCalledWith(expect.stringContaining('not found'));
  });

  it('should handle partially missing files gracefully', () => {
    mockExistsSync.mockImplementation((path: string) => {
      if (path.includes('plugins.json')) return true;
      // Only agent-a exists, agent-b does not
      if (path.includes('agent-a.json')) return true;
      return false;
    });
    mockReadFileSync.mockReturnValue(makeRegistry([samplePlugin]));

    const result = runUninstall(defaultOptions);

    expect(result.success).toBe(true);
    // Should still work even if some files are missing
    expect(mockUnlinkSync).toHaveBeenCalledWith(expect.stringContaining('agent-a.json'));
    // agent-b.json does not exist, so unlinkSync should not be called for it
    const unlinkCalls = mockUnlinkSync.mock.calls.map((c: unknown[]) => c[0]) as string[];
    expect(unlinkCalls.some((p: string) => p.includes('agent-b'))).toBe(false);
  });

  it('should handle missing plugins.json gracefully', () => {
    mockExistsSync.mockReturnValue(false);

    const result = runUninstall(defaultOptions);

    expect(result.success).toBe(false);
    expect(mockConsoleUtils.log.error).toHaveBeenCalledWith(expect.stringContaining('not found'));
  });

  it('should log uninstall summary on success', () => {
    mockExistsSync.mockImplementation((path: string) => {
      if (path.includes('plugins.json')) return true;
      if (path.includes('.ai-rules/')) return true;
      return false;
    });
    mockReadFileSync.mockReturnValue(makeRegistry([samplePlugin]));

    runUninstall(defaultOptions);

    expect(mockConsoleUtils.log.success).toHaveBeenCalledWith(
      expect.stringContaining('Removed my-plugin'),
    );
  });

  it('should return confirmation required when --yes is not set', () => {
    mockExistsSync.mockImplementation((path: string) => {
      if (path.includes('plugins.json')) return true;
      return false;
    });
    mockReadFileSync.mockReturnValue(makeRegistry([samplePlugin]));

    const result = runUninstall({
      ...defaultOptions,
      yes: false,
    });

    expect(result.success).toBe(false);
    expect(result.confirmationRequired).toBe(true);
    expect(result.pluginSummary).toBeDefined();
  });

  it('should show removal summary in step output', () => {
    mockExistsSync.mockImplementation((path: string) => {
      if (path.includes('plugins.json')) return true;
      if (path.includes('.ai-rules/')) return true;
      return false;
    });
    mockReadFileSync.mockReturnValue(makeRegistry([samplePlugin]));

    runUninstall(defaultOptions);

    expect(mockConsoleUtils.log.step).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('Uninstalling my-plugin@1.0.0'),
    );
  });
});
