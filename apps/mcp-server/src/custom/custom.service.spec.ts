import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CustomService } from './custom.service';
import * as fs from 'fs/promises';
vi.mock('fs/promises');

const createMockDirent = (name: string, isFile: boolean) =>
  ({
    name,
    parentPath: '',
    path: '',
    isFile: () => isFile,
    isDirectory: () => !isFile,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isSymbolicLink: () => false,
    isFIFO: () => false,
    isSocket: () => false,
  }) as unknown as Awaited<ReturnType<typeof import('fs/promises').readdir>>[0];

describe('CustomService', () => {
  let service: CustomService;
  const mockFs = vi.mocked(fs);

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CustomService();
  });

  describe('findCustomPath', () => {
    it('returns path when .codingbuddy exists', async () => {
      mockFs.access.mockResolvedValue(undefined);

      const result = await service.findCustomPath('/project');

      expect(result).toBe('/project/.codingbuddy');
    });

    it('returns null when .codingbuddy does not exist', async () => {
      mockFs.access.mockRejectedValue(new Error('ENOENT'));

      const result = await service.findCustomPath('/project');

      expect(result).toBeNull();
    });
  });

  describe('listCustomRules', () => {
    it('returns rules from .codingbuddy/rules/', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue([
        createMockDirent('api.md', true),
        createMockDirent('naming.md', true),
      ]);
      mockFs.readFile.mockResolvedValue('# Rule content');

      const result = await service.listCustomRules('/project');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('api.md');
      expect(result[0].source).toBe('custom');
      expect(result[0].content).toBe('# Rule content');
    });

    it('returns empty array when no .codingbuddy folder', async () => {
      mockFs.access.mockRejectedValue(new Error('ENOENT'));

      const result = await service.listCustomRules('/project');

      expect(result).toEqual([]);
    });

    it('filters non-md files', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue([
        createMockDirent('api.md', true),
        createMockDirent('readme.txt', true),
      ]);
      mockFs.readFile.mockResolvedValue('# Content');

      const result = await service.listCustomRules('/project');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('api.md');
    });
  });

  describe('listCustomAgents', () => {
    it('returns valid agents from .codingbuddy/agents/', async () => {
      const validAgent = JSON.stringify({
        name: 'API Specialist',
        description: 'API design expert',
        role: {
          title: 'API Specialist',
          expertise: ['REST'],
        },
      });
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue([createMockDirent('api.json', true)]);
      mockFs.readFile.mockResolvedValue(validAgent);

      const result = await service.listCustomAgents('/project');

      expect(result).toHaveLength(1);
      expect(result[0].parsed.name).toBe('API Specialist');
      expect(result[0].source).toBe('custom');
    });

    it('skips invalid JSON files', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue([createMockDirent('invalid.json', true)]);
      mockFs.readFile.mockResolvedValue('not valid json');

      const result = await service.listCustomAgents('/project');

      expect(result).toEqual([]);
    });

    it('skips agents missing required fields', async () => {
      const invalidAgent = JSON.stringify({
        name: 'Missing role and description',
      });
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue([createMockDirent('bad.json', true)]);
      mockFs.readFile.mockResolvedValue(invalidAgent);

      const result = await service.listCustomAgents('/project');

      expect(result).toEqual([]);
    });
  });

  describe('listCustomSkills', () => {
    it('returns skills from .codingbuddy/skills/*/SKILL.md', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue([createMockDirent('my-workflow', false)]);
      mockFs.readFile.mockResolvedValue('# Skill content');

      const result = await service.listCustomSkills('/project');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('my-workflow');
      expect(result[0].source).toBe('custom');
    });

    it('skips folders without SKILL.md', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue([createMockDirent('incomplete', false)]);
      mockFs.readFile.mockRejectedValue(new Error('ENOENT'));

      const result = await service.listCustomSkills('/project');

      expect(result).toEqual([]);
    });
  });
});
