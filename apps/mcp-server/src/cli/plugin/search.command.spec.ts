import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSearch = vi.fn();
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
    search = mockSearch;
  },
}));

vi.mock('../utils/console', () => ({
  createConsoleUtils: () => mockConsoleUtils,
}));

import { runSearch } from './search.command';

describe('search.command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call RegistryClient.search with the query', async () => {
    mockSearch.mockResolvedValue([]);

    await runSearch({ query: 'nextjs' });

    expect(mockSearch).toHaveBeenCalledWith('nextjs');
  });

  it('should display formatted results when plugins found', async () => {
    mockSearch.mockResolvedValue([
      {
        name: 'nextjs-app-router',
        version: '1.0.0',
        description: 'Next.js App Router best practices',
        tags: ['nextjs', 'react', 'frontend'],
        provides: { agents: ['a1'], rules: ['r1', 'r2'], skills: ['s1'] },
      },
    ]);

    const result = await runSearch({ query: 'nextjs' });

    expect(result.success).toBe(true);
    expect(result.count).toBe(1);
    // Check name/version displayed
    expect(mockConsoleUtils.log.step).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('nextjs-app-router'),
    );
  });

  it('should display provides counts', async () => {
    mockSearch.mockResolvedValue([
      {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test',
        tags: ['test'],
        provides: { agents: ['a1'], rules: ['r1', 'r2'], skills: ['s1'] },
      },
    ]);

    await runSearch({ query: 'test' });

    const allStepCalls = mockConsoleUtils.log.step.mock.calls.map((call: string[]) => call[1]);
    const providesLine = allStepCalls.find((msg: string) => msg.includes('Provides'));
    expect(providesLine).toContain('1 agent');
    expect(providesLine).toContain('2 rules');
    expect(providesLine).toContain('1 skill');
  });

  it('should display install command for each plugin', async () => {
    mockSearch.mockResolvedValue([
      {
        name: 'my-plugin',
        version: '1.0.0',
        description: 'Test',
        tags: [],
        provides: {},
      },
    ]);

    await runSearch({ query: 'my' });

    const allStepCalls = mockConsoleUtils.log.step.mock.calls.map((call: string[]) => call[1]);
    const installLine = allStepCalls.find((msg: string) => msg.includes('codingbuddy install'));
    expect(installLine).toContain('codingbuddy install my-plugin');
  });

  it('should display summary with match count', async () => {
    mockSearch.mockResolvedValue([
      {
        name: 'a',
        version: '1.0.0',
        description: 'A',
        tags: [],
        provides: {},
      },
      {
        name: 'b',
        version: '1.0.0',
        description: 'B',
        tags: [],
        provides: {},
      },
    ]);

    await runSearch({ query: 'test' });

    expect(mockConsoleUtils.log.info).toHaveBeenCalledWith(
      expect.stringMatching(/found 2 plugin/i),
    );
  });

  it('should handle no results gracefully', async () => {
    mockSearch.mockResolvedValue([]);

    const result = await runSearch({ query: 'nonexistent' });

    expect(result.success).toBe(true);
    expect(result.count).toBe(0);
    expect(mockConsoleUtils.log.info).toHaveBeenCalledWith(expect.stringMatching(/no plugin/i));
  });

  it('should handle network errors gracefully', async () => {
    mockSearch.mockRejectedValue(new Error('Network error'));

    const result = await runSearch({ query: 'test' });

    expect(result.success).toBe(false);
    expect(mockConsoleUtils.log.error).toHaveBeenCalled();
  });
});
