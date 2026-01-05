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
import { CustomService } from '../custom';
import { CustomRule } from '../custom/custom.types';

// Create a mock CustomService
const createMockCustomService = (): CustomService =>
  ({
    findCustomPath: vi.fn().mockResolvedValue(null),
    listCustomRules: vi.fn().mockResolvedValue([]),
    listCustomAgents: vi.fn().mockResolvedValue([]),
    listCustomSkills: vi.fn().mockResolvedValue([]),
  }) as unknown as CustomService;

describe('RulesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variable
    delete process.env.CODINGBUDDY_RULES_DIR;
  });

  describe('constructor', () => {
    it('should use CODINGBUDDY_RULES_DIR env variable when set', () => {
      process.env.CODINGBUDDY_RULES_DIR = '/custom/rules/path';

      const service = new RulesService(createMockCustomService());

      // Access private property via any cast for testing
      expect((service as unknown as { rulesDir: string }).rulesDir).toBe(
        '/custom/rules/path',
      );
    });

    it('should use codingbuddy-rules package or dev fallback', () => {
      const service = new RulesService(createMockCustomService());
      const rulesDir = (service as unknown as { rulesDir: string }).rulesDir;

      // Should resolve to .ai-rules path (either from package or dev fallback)
      expect(rulesDir).toContain('.ai-rules');
    });

    it('should find rules directory successfully', () => {
      const service = new RulesService(createMockCustomService());
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
      service = new RulesService(createMockCustomService());
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

    describe('path traversal protection', () => {
      it('should reject path traversal with ../', async () => {
        await expect(
          service.getRuleContent('../../../etc/passwd'),
        ).rejects.toThrow('Access denied: Invalid path');
      });

      it('should reject hidden path traversal', async () => {
        await expect(
          service.getRuleContent('agents/../../secret'),
        ).rejects.toThrow('Access denied: Invalid path');
      });

      it('should reject absolute paths', async () => {
        await expect(service.getRuleContent('/etc/passwd')).rejects.toThrow(
          'Access denied: Invalid path',
        );
      });

      it('should reject Windows-style path traversal', async () => {
        await expect(
          service.getRuleContent('..\\..\\etc\\passwd'),
        ).rejects.toThrow('Access denied: Invalid path');
      });

      it('should reject null byte injection', async () => {
        await expect(
          service.getRuleContent('agents/test.json\x00.txt'),
        ).rejects.toThrow('Access denied: Invalid path');
      });

      it('should allow valid relative paths', async () => {
        vi.mocked(fs.readFile).mockResolvedValue('content');

        const result = await service.getRuleContent('agents/test.json');

        expect(result).toBe('content');
      });
    });
  });

  describe('listAgents', () => {
    let service: RulesService;

    beforeEach(() => {
      process.env.CODINGBUDDY_RULES_DIR = '/test/rules';
      service = new RulesService(createMockCustomService());
    });

    it('should return agent names from directory', async () => {
      vi.mocked(fs.readdir).mockResolvedValue([
        'frontend-developer.json',
        'code-reviewer.json',
        'backend-developer.json',
      ] as unknown as Awaited<ReturnType<typeof fs.readdir>>);

      const result = await service.listAgents();

      expect(result).toEqual([
        'backend-developer',
        'code-reviewer',
        'frontend-developer',
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

      expect(result).toEqual(['code-reviewer', 'frontend-developer']);
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
      service = new RulesService(createMockCustomService());
    });

    it('should return parsed AgentProfile', async () => {
      const mockAgent = {
        name: 'Frontend Developer',
        description: 'Frontend development specialist',
        role: {
          title: 'Senior Frontend Developer',
          expertise: ['React', 'TypeScript'],
        },
        goals: ['Write clean code'],
        workflow: ['Analyze requirements'],
      };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockAgent));

      const result = await service.getAgent('frontend-developer');

      expect(result.name).toBe('Frontend Developer');
      expect(result.description).toBe('Frontend development specialist');
      expect(fs.readFile).toHaveBeenCalledWith(
        '/test/rules/agents/frontend-developer.json',
        'utf-8',
      );
    });

    it('should include source: default in returned AgentProfile', async () => {
      const mockAgent = {
        name: 'Frontend Developer',
        description: 'Frontend development specialist',
        role: {
          title: 'Senior Frontend Developer',
          expertise: ['React', 'TypeScript'],
        },
      };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockAgent));

      const result = await service.getAgent('frontend-developer');

      expect(result.source).toBe('default');
    });

    it('should reject agent with missing required fields', async () => {
      const invalidAgent = {
        name: 'Invalid Agent',
        // missing description and role
      };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(invalidAgent));

      await expect(service.getAgent('invalid')).rejects.toThrow(
        'Invalid agent profile',
      );
    });

    it('should reject agent with prototype pollution attempt', async () => {
      const maliciousJson =
        '{"name":"Agent","description":"Desc","role":{"title":"Title","expertise":[]},"__proto__":{"isAdmin":true}}';
      vi.mocked(fs.readFile).mockResolvedValue(maliciousJson);

      await expect(service.getAgent('malicious')).rejects.toThrow(
        'Invalid agent profile',
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
    let mockCustomService: CustomService;

    beforeEach(() => {
      process.env.CODINGBUDDY_RULES_DIR = '/test/rules';
      mockCustomService = createMockCustomService();
      service = new RulesService(mockCustomService);
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
      const service = new RulesService(createMockCustomService());
      const rulesDir = (service as unknown as { rulesDir: string }).rulesDir;

      // Should have resolved to a valid .ai-rules path
      expect(rulesDir).toContain('.ai-rules');
    });

    it('should handle existsSync throwing an error gracefully', () => {
      vi.mocked(existsSync).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      // Should not throw - either package provides path or fallback handles error
      expect(() => new RulesService(createMockCustomService())).not.toThrow();
    });
  });

  describe('searchRules with custom rules', () => {
    let service: RulesService;
    let mockCustomService: CustomService;

    beforeEach(() => {
      process.env.CODINGBUDDY_RULES_DIR = '/test/rules';
      mockCustomService = createMockCustomService();
      service = new RulesService(mockCustomService);
    });

    it('includes custom rules in search results', async () => {
      // Mock CustomService to return a custom rule
      const customRule: CustomRule = {
        type: 'rule',
        name: 'api-conventions.md',
        path: '/project/.codingbuddy/rules/api-conventions.md',
        content: '# API Conventions\nUse REST patterns.',
        source: 'custom',
      };
      vi.mocked(mockCustomService.listCustomRules).mockResolvedValue([
        customRule,
      ]);

      // Mock default rules with no matches
      vi.mocked(fs.readdir).mockResolvedValue(
        [] as unknown as Awaited<ReturnType<typeof fs.readdir>>,
      );
      vi.mocked(fs.readFile).mockResolvedValue('No REST here');

      const result = await service.searchRules('REST');

      expect(result.some(r => r.source === 'custom')).toBe(true);
      const customResult = result.find(r => r.source === 'custom');
      expect(customResult).toBeDefined();
      expect(customResult!.file).toBe('api-conventions.md');
      expect(customResult!.score).toBe(1);
    });

    it('includes both custom and default rules in search results', async () => {
      // Mock CustomService to return a custom rule
      const customRule: CustomRule = {
        type: 'rule',
        name: 'custom-tdd.md',
        path: '/project/.codingbuddy/rules/custom-tdd.md',
        content: '# Custom TDD\nTDD is important.',
        source: 'custom',
      };
      vi.mocked(mockCustomService.listCustomRules).mockResolvedValue([
        customRule,
      ]);

      // Mock default rules with TDD matches
      vi.mocked(fs.readdir).mockResolvedValue(
        [] as unknown as Awaited<ReturnType<typeof fs.readdir>>,
      );
      vi.mocked(fs.readFile).mockImplementation(async (filePath: unknown) => {
        const path = filePath as string;
        if (path.includes('core.md')) {
          return 'TDD cycle\nRed Green Refactor';
        }
        return 'No match here';
      });

      const result = await service.searchRules('TDD');

      expect(result.some(r => r.source === 'custom')).toBe(true);
      expect(result.some(r => r.source === 'default')).toBe(true);
    });

    it('returns empty array when no custom or default rules match', async () => {
      vi.mocked(mockCustomService.listCustomRules).mockResolvedValue([]);
      vi.mocked(fs.readdir).mockResolvedValue(
        [] as unknown as Awaited<ReturnType<typeof fs.readdir>>,
      );
      vi.mocked(fs.readFile).mockResolvedValue('No match here');

      const result = await service.searchRules('nonexistent-query-xyz');

      expect(result).toEqual([]);
    });

    it('sorts results by score regardless of source', async () => {
      // Custom rule with 3 matches
      const customRule: CustomRule = {
        type: 'rule',
        name: 'high-match.md',
        path: '/project/.codingbuddy/rules/high-match.md',
        content: 'test\ntest\ntest',
        source: 'custom',
      };
      vi.mocked(mockCustomService.listCustomRules).mockResolvedValue([
        customRule,
      ]);

      // Default rule with 1 match
      vi.mocked(fs.readdir).mockResolvedValue(
        [] as unknown as Awaited<ReturnType<typeof fs.readdir>>,
      );
      vi.mocked(fs.readFile).mockResolvedValue('test'); // 1 match

      const result = await service.searchRules('test');

      // Custom rule should be first due to higher score
      expect(result[0].source).toBe('custom');
      expect(result[0].score).toBe(3);
    });
  });

  describe('Mode Agent functionality', () => {
    let service: RulesService;
    let mockCustomService: CustomService;

    beforeEach(() => {
      process.env.CODINGBUDDY_RULES_DIR = '/test/rules';
      mockCustomService = createMockCustomService();
      service = new RulesService(mockCustomService);
    });

    describe('listAgents with Mode Agent priority', () => {
      it('should prioritize Mode Agents first in correct order', async () => {
        vi.mocked(fs.readdir).mockResolvedValue([
          'frontend-developer.json',
          'eval-mode.json',
          'code-reviewer.json',
          'plan-mode.json',
          'act-mode.json',
          'backend-developer.json',
        ] as unknown as Awaited<ReturnType<typeof fs.readdir>>);

        const result = await service.listAgents();

        expect(result).toEqual([
          'plan-mode',
          'act-mode',
          'eval-mode',
          'backend-developer',
          'code-reviewer',
          'frontend-developer',
        ]);
      });

      it('should handle missing Mode Agents gracefully', async () => {
        vi.mocked(fs.readdir).mockResolvedValue([
          'frontend-developer.json',
          'plan-mode.json',
          'backend-developer.json',
        ] as unknown as Awaited<ReturnType<typeof fs.readdir>>);

        const result = await service.listAgents();

        expect(result).toEqual([
          'plan-mode',
          'backend-developer',
          'frontend-developer',
        ]);
      });

      it('should sort non-mode agents alphabetically', async () => {
        vi.mocked(fs.readdir).mockResolvedValue([
          'zebra-agent.json',
          'alpha-agent.json',
          'beta-agent.json',
        ] as unknown as Awaited<ReturnType<typeof fs.readdir>>);

        const result = await service.listAgents();

        expect(result).toEqual(['alpha-agent', 'beta-agent', 'zebra-agent']);
      });

      it('should handle only Mode Agents', async () => {
        vi.mocked(fs.readdir).mockResolvedValue([
          'eval-mode.json',
          'plan-mode.json',
          'act-mode.json',
        ] as unknown as Awaited<ReturnType<typeof fs.readdir>>);

        const result = await service.listAgents();

        expect(result).toEqual(['plan-mode', 'act-mode', 'eval-mode']);
      });
    });

    describe('isModeAgent', () => {
      it('should identify plan-mode as Mode Agent', () => {
        expect(service.isModeAgent('plan-mode')).toBe(true);
      });

      it('should identify act-mode as Mode Agent', () => {
        expect(service.isModeAgent('act-mode')).toBe(true);
      });

      it('should identify eval-mode as Mode Agent', () => {
        expect(service.isModeAgent('eval-mode')).toBe(true);
      });

      it('should not identify regular agents as Mode Agents', () => {
        expect(service.isModeAgent('frontend-developer')).toBe(false);
        expect(service.isModeAgent('code-reviewer')).toBe(false);
        expect(service.isModeAgent('backend-developer')).toBe(false);
      });

      it('should not identify partial matches as Mode Agents', () => {
        expect(service.isModeAgent('plan')).toBe(false);
        expect(service.isModeAgent('mode')).toBe(false);
        expect(service.isModeAgent('plan-mode-extended')).toBe(false);
      });

      it('should handle empty string and undefined gracefully', () => {
        expect(service.isModeAgent('')).toBe(false);
        expect(service.isModeAgent('undefined')).toBe(false);
      });

      it('should be case sensitive', () => {
        expect(service.isModeAgent('PLAN-MODE')).toBe(false);
        expect(service.isModeAgent('Plan-Mode')).toBe(false);
      });
    });
  });
});
