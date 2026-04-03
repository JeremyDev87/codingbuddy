import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadAgentStacks, loadAgentStack } from './agent-stack.loader';
import * as fs from 'fs/promises';

vi.mock('fs/promises');

describe('agent-stack.loader', () => {
  const validStackJson = JSON.stringify({
    name: 'full-stack',
    description: 'Full-stack development team',
    category: 'development',
    tags: ['web', 'fullstack'],
    primary_agent: 'software-engineer',
    specialist_agents: ['frontend-developer', 'backend-developer'],
  });

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('loadAgentStack', () => {
    it('loads and validates a single stack JSON file', async () => {
      vi.mocked(fs.readFile).mockResolvedValue(validStackJson);

      const result = await loadAgentStack('/path/to/full-stack.json');
      expect(result.name).toBe('full-stack');
      expect(result.primary_agent).toBe('software-engineer');
      expect(result.specialist_agents).toEqual(['frontend-developer', 'backend-developer']);
    });

    it('throws on invalid JSON', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('not json');

      await expect(loadAgentStack('/path/to/bad.json')).rejects.toThrow();
    });

    it('throws on invalid schema', async () => {
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({ name: 'only-name' }));

      await expect(loadAgentStack('/path/to/invalid.json')).rejects.toThrow('Invalid agent stack');
    });
  });

  describe('loadAgentStacks', () => {
    it('loads all .json files from directory', async () => {
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: 'full-stack.json', isFile: () => true },
        { name: 'api-development.json', isFile: () => true },
      ] as unknown as Awaited<ReturnType<typeof fs.readdir>>);

      vi.mocked(fs.readFile).mockResolvedValue(validStackJson);

      const result = await loadAgentStacks('/path/to/stacks');
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('full-stack');
    });

    it('skips non-json files', async () => {
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: 'full-stack.json', isFile: () => true },
        { name: 'README.md', isFile: () => true },
        { name: 'subdir', isFile: () => false },
      ] as unknown as Awaited<ReturnType<typeof fs.readdir>>);

      vi.mocked(fs.readFile).mockResolvedValue(validStackJson);

      const result = await loadAgentStacks('/path/to/stacks');
      expect(result).toHaveLength(1);
    });

    it('returns empty array when directory does not exist', async () => {
      vi.mocked(fs.readdir).mockRejectedValue(new Error('ENOENT'));

      const result = await loadAgentStacks('/path/to/missing');
      expect(result).toEqual([]);
    });

    it('skips individual files that fail validation', async () => {
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: 'valid.json', isFile: () => true },
        { name: 'invalid.json', isFile: () => true },
      ] as unknown as Awaited<ReturnType<typeof fs.readdir>>);

      const invalidStackJson = JSON.stringify({ name: 'only-name' });
      vi.mocked(fs.readFile).mockImplementation(async (filePath: unknown) => {
        const path = String(filePath);
        if (path.endsWith('/valid.json')) return validStackJson;
        return invalidStackJson;
      });

      const result = await loadAgentStacks('/path/to/stacks');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('full-stack');
    });
  });
});
