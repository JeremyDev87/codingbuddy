import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';

// Mock fs modules before importing RulesService
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  readdir: vi.fn(),
}));

vi.mock('fs', () => ({
  existsSync: vi.fn(),
}));

// Import after mocks
import { RulesService } from './rules.service';

describe('RulesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variable
    delete process.env.CODINGBUDDY_RULES_DIR;
  });

  describe('constructor', () => {
    it('should use CODINGBUDDY_RULES_DIR env variable when set', () => {
      process.env.CODINGBUDDY_RULES_DIR = '/custom/rules/path';

      const service = new RulesService();

      // Access private property via any cast for testing
      expect((service as unknown as { rulesDir: string }).rulesDir).toBe(
        '/custom/rules/path',
      );
    });

    it('should use codingbuddy-rules package or dev fallback', () => {
      const service = new RulesService();
      const rulesDir = (service as unknown as { rulesDir: string }).rulesDir;

      // Should resolve to .ai-rules path (either from package or dev fallback)
      expect(rulesDir).toContain('.ai-rules');
    });

    it('should find rules directory successfully', () => {
      const service = new RulesService();
      const rulesDir = (service as unknown as { rulesDir: string }).rulesDir;

      // Verify the path contains the expected structure
      expect(rulesDir).toBeDefined();
      expect(typeof rulesDir).toBe('string');
    });
  });

  describe('getRuleContent', () => {
    let service: RulesService;

    beforeEach(() => {
      process.env.CODINGBUDDY_RULES_DIR = '/test/rules';
      service = new RulesService();
    });

    it('should return file content when file exists', async () => {
      const mockContent = '# Core Rules\n\nSome content here...';
      vi.mocked(fs.readFile).mockResolvedValue(mockContent);

      const result = await service.getRuleContent('rules/core.md');

      expect(result).toBe(mockContent);
      expect(fs.readFile).toHaveBeenCalledWith(
        '/test/rules/rules/core.md',
        'utf-8',
      );
    });

    it('should throw error when file does not exist', async () => {
      const error = new Error('ENOENT: no such file or directory');
      vi.mocked(fs.readFile).mockRejectedValue(error);

      await expect(service.getRuleContent('nonexistent.md')).rejects.toThrow(
        'Failed to read rule file: nonexistent.md',
      );
    });

    it('should throw error on read failure', async () => {
      const error = new Error('Permission denied');
      vi.mocked(fs.readFile).mockRejectedValue(error);

      await expect(service.getRuleContent('protected.md')).rejects.toThrow(
        'Failed to read rule file: protected.md',
      );
    });
  });

  describe('listAgents', () => {
    let service: RulesService;

    beforeEach(() => {
      process.env.CODINGBUDDY_RULES_DIR = '/test/rules';
      service = new RulesService();
    });

    it('should return agent names from directory', async () => {
      vi.mocked(fs.readdir).mockResolvedValue([
        'frontend-developer.json',
        'code-reviewer.json',
        'backend-developer.json',
      ] as unknown as Awaited<ReturnType<typeof fs.readdir>>);

      const result = await service.listAgents();

      expect(result).toEqual([
        'frontend-developer',
        'code-reviewer',
        'backend-developer',
      ]);
    });

    it('should filter only .json files', async () => {
      vi.mocked(fs.readdir).mockResolvedValue([
        'frontend-developer.json',
        'README.md',
        'code-reviewer.json',
        '.gitkeep',
      ] as unknown as Awaited<ReturnType<typeof fs.readdir>>);

      const result = await service.listAgents();

      expect(result).toEqual(['frontend-developer', 'code-reviewer']);
    });

    it('should return empty array when directory is empty', async () => {
      vi.mocked(fs.readdir).mockResolvedValue(
        [] as unknown as Awaited<ReturnType<typeof fs.readdir>>,
      );

      const result = await service.listAgents();

      expect(result).toEqual([]);
    });

    it('should return empty array on error', async () => {
      vi.mocked(fs.readdir).mockRejectedValue(new Error('Directory not found'));

      const result = await service.listAgents();

      expect(result).toEqual([]);
    });
  });

  describe('getAgent', () => {
    let service: RulesService;

    beforeEach(() => {
      process.env.CODINGBUDDY_RULES_DIR = '/test/rules';
      service = new RulesService();
    });

    it('should return parsed AgentProfile', async () => {
      const mockAgent = {
        name: 'Frontend Developer',
        role: 'Frontend development specialist',
        goals: ['Write clean code'],
        workflow: ['Analyze requirements'],
      };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockAgent));

      const result = await service.getAgent('frontend-developer');

      expect(result).toEqual(mockAgent);
      expect(fs.readFile).toHaveBeenCalledWith(
        '/test/rules/agents/frontend-developer.json',
        'utf-8',
      );
    });

    it('should throw on invalid JSON', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('{ invalid json }');

      await expect(service.getAgent('broken-agent')).rejects.toThrow();
    });

    it('should throw when agent file does not exist', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));

      await expect(service.getAgent('nonexistent')).rejects.toThrow(
        'Failed to read rule file',
      );
    });
  });

  describe('searchRules', () => {
    let service: RulesService;

    beforeEach(() => {
      process.env.CODINGBUDDY_RULES_DIR = '/test/rules';
      service = new RulesService();
    });

    it('should find matches across files', async () => {
      // Mock listAgents
      vi.mocked(fs.readdir).mockResolvedValue([
        'frontend-developer.json',
      ] as unknown as Awaited<ReturnType<typeof fs.readdir>>);

      // Mock file reads
      vi.mocked(fs.readFile).mockImplementation(async (filePath: unknown) => {
        const path = filePath as string;
        if (path.includes('core.md')) {
          return 'Line 1: TDD is important\nLine 2: Test first\nLine 3: Other content';
        }
        if (path.includes('project.md')) {
          return 'Project setup\nNo matches here';
        }
        if (path.includes('augmented-coding.md')) {
          return 'TDD cycle\nRed Green Refactor';
        }
        if (path.includes('frontend-developer.json')) {
          return '{"name": "Frontend Developer", "tdd": true}';
        }
        return '';
      });

      const result = await service.searchRules('TDD');

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].score).toBeGreaterThan(0);
      expect(result[0].matches.length).toBeGreaterThan(0);
    });

    it('should return results sorted by score (highest first)', async () => {
      vi.mocked(fs.readdir).mockResolvedValue(
        [] as unknown as Awaited<ReturnType<typeof fs.readdir>>,
      );

      vi.mocked(fs.readFile).mockImplementation(async (filePath: unknown) => {
        const path = filePath as string;
        if (path.includes('core.md')) {
          return 'test\ntest\ntest'; // 3 matches
        }
        if (path.includes('project.md')) {
          return 'test'; // 1 match
        }
        if (path.includes('augmented-coding.md')) {
          return 'test\ntest'; // 2 matches
        }
        return '';
      });

      const result = await service.searchRules('test');

      expect(result[0].file).toBe('rules/core.md');
      expect(result[0].score).toBe(3);
      expect(result[1].file).toBe('rules/augmented-coding.md');
      expect(result[1].score).toBe(2);
      expect(result[2].file).toBe('rules/project.md');
      expect(result[2].score).toBe(1);
    });

    it('should return empty array for no matches', async () => {
      vi.mocked(fs.readdir).mockResolvedValue(
        [] as unknown as Awaited<ReturnType<typeof fs.readdir>>,
      );

      vi.mocked(fs.readFile).mockResolvedValue('No matching content here');

      const result = await service.searchRules('nonexistent-query-xyz');

      expect(result).toEqual([]);
    });

    it('should be case-insensitive', async () => {
      vi.mocked(fs.readdir).mockResolvedValue(
        [] as unknown as Awaited<ReturnType<typeof fs.readdir>>,
      );

      vi.mocked(fs.readFile).mockImplementation(async (filePath: unknown) => {
        const path = filePath as string;
        if (path.includes('core.md')) {
          return 'TDD is important\ntdd works'; // 2 matches (case-insensitive)
        }
        return 'no match here';
      });

      const result = await service.searchRules('TDD');

      // core.md should have 2 matches (TDD and tdd both match)
      const coreResult = result.find(r => r.file === 'rules/core.md');
      expect(coreResult).toBeDefined();
      expect(coreResult!.score).toBe(2);
    });

    it('should ignore file read errors and continue', async () => {
      vi.mocked(fs.readdir).mockResolvedValue(
        [] as unknown as Awaited<ReturnType<typeof fs.readdir>>,
      );

      let callCount = 0;
      vi.mocked(fs.readFile).mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('File read error');
        }
        return 'test content with match';
      });

      const result = await service.searchRules('match');

      // Should still return results from files that were read successfully
      expect(result.length).toBeGreaterThan(0);
    });

    it('should include line numbers in matches', async () => {
      vi.mocked(fs.readdir).mockResolvedValue(
        [] as unknown as Awaited<ReturnType<typeof fs.readdir>>,
      );

      vi.mocked(fs.readFile).mockResolvedValue(
        'Line 1\nLine 2 with keyword\nLine 3',
      );

      const result = await service.searchRules('keyword');

      expect(result[0].matches[0]).toContain('Line 2:');
    });
  });

  describe('checkExists (private method behavior)', () => {
    it('should resolve rules directory path', () => {
      const service = new RulesService();
      const rulesDir = (service as unknown as { rulesDir: string }).rulesDir;

      // Should have resolved to a valid .ai-rules path
      expect(rulesDir).toContain('.ai-rules');
    });

    it('should handle existsSync throwing an error gracefully', () => {
      vi.mocked(existsSync).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      // Should not throw - either package provides path or fallback handles error
      expect(() => new RulesService()).not.toThrow();
    });
  });
});
