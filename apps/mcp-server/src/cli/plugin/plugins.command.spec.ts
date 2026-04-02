import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync, existsSync } from 'fs';

vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  existsSync: vi.fn(),
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

import { runPlugins } from './plugins.command';

const mockExistsSync = existsSync as ReturnType<typeof vi.fn>;
const mockReadFileSync = readFileSync as ReturnType<typeof vi.fn>;

describe('plugins.command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultOptions = { projectRoot: '/project' };

  it('should list all installed plugins with correct counts', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        plugins: [
          {
            name: 'my-plugin',
            version: '1.0.0',
            source: 'github:user/my-plugin',
            installedAt: '2026-01-01T00:00:00.000Z',
            provides: {
              agents: ['agent-a', 'agent-b'],
              rules: ['rule-x', 'rule-y', 'rule-z'],
              skills: ['skill-1'],
              checklists: [],
            },
          },
          {
            name: 'security-pack',
            version: '2.1.0',
            source: 'github:user/security-pack',
            installedAt: '2026-02-01T00:00:00.000Z',
            provides: {
              agents: ['sec-a', 'sec-b', 'sec-c', 'sec-d', 'sec-e'],
              rules: [],
              skills: ['sec-skill-1', 'sec-skill-2', 'sec-skill-3', 'sec-skill-4'],
              checklists: [],
            },
          },
        ],
      }),
    );

    const result = runPlugins(defaultOptions);

    expect(result.success).toBe(true);
    expect(result.count).toBe(2);

    // Verify header is printed
    expect(mockConsoleUtils.log.info).toHaveBeenCalledWith(
      expect.stringContaining('Installed plugins:'),
    );

    // Verify each plugin line is printed
    const stepCalls = mockConsoleUtils.log.step.mock.calls.map((c: unknown[]) => c[1]) as string[];
    expect(stepCalls.some(s => s.includes('my-plugin') && s.includes('1.0.0'))).toBe(true);
    expect(stepCalls.some(s => s.includes('security-pack') && s.includes('2.1.0'))).toBe(true);
  });

  it('should show "No plugins installed" when registry is empty', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify({ plugins: [] }));

    const result = runPlugins(defaultOptions);

    expect(result.success).toBe(true);
    expect(result.count).toBe(0);
    expect(mockConsoleUtils.log.info).toHaveBeenCalledWith('No plugins installed.');
  });

  it('should handle missing plugins.json gracefully', () => {
    mockExistsSync.mockReturnValue(false);

    const result = runPlugins(defaultOptions);

    expect(result.success).toBe(true);
    expect(result.count).toBe(0);
    expect(mockConsoleUtils.log.info).toHaveBeenCalledWith('No plugins installed.');
  });

  it('should handle corrupted plugins.json gracefully', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('not-valid-json{{{');

    const result = runPlugins(defaultOptions);

    expect(result.success).toBe(false);
    expect(mockConsoleUtils.log.error).toHaveBeenCalledWith(
      expect.stringContaining('plugins.json'),
    );
  });

  it('should read from correct path', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify({ plugins: [] }));

    runPlugins({ projectRoot: '/my-project' });

    expect(mockReadFileSync).toHaveBeenCalledWith('/my-project/.codingbuddy/plugins.json', 'utf-8');
  });

  it('should display total count footer', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        plugins: [
          {
            name: 'p1',
            version: '1.0.0',
            source: 'github:u/p1',
            installedAt: '2026-01-01T00:00:00.000Z',
            provides: { agents: [], rules: [], skills: [], checklists: [] },
          },
        ],
      }),
    );

    runPlugins(defaultOptions);

    expect(mockConsoleUtils.log.info).toHaveBeenCalledWith(expect.stringContaining('Total: 1'));
  });
});
