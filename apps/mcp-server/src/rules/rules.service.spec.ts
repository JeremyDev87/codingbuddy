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
import { ConfigService } from '../config/config.service';
import { CustomRule } from '../custom/custom.types';

// Create a mock CustomService
const createMockCustomService = (): CustomService =>
  ({
    findCustomPath: vi.fn().mockResolvedValue(null),
    listCustomRules: vi.fn().mockResolvedValue([]),
    listCustomAgents: vi.fn().mockResolvedValue([]),
    listCustomSkills: vi.fn().mockResolvedValue([]),
  }) as unknown as CustomService;

// Create a mock ConfigService
const createMockConfigService = (language?: string): ConfigService =>
  ({
    getProjectRoot: vi.fn().mockReturnValue('/test/project'),
    getSettings: vi.fn().mockResolvedValue({}),
    getLanguage: vi.fn().mockResolvedValue(language),
  }) as unknown as ConfigService;

describe('RulesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variable
    delete process.env.CODINGBUDDY_RULES_DIR;
  });

  describe('constructor', () => {
    it('should use CODINGBUDDY_RULES_DIR env variable when set', () => {
      process.env.CODINGBUDDY_RULES_DIR = '/custom/rules/path';

      const service = new RulesService(createMockCustomService(), createMockConfigService());

      // Access private property via any cast for testing
      expect((service as unknown as { rulesDir: string }).rulesDir).toBe('/custom/rules/path');
    });

    it('should use codingbuddy-rules package or dev fallback', () => {
      const service = new RulesService(createMockCustomService(), createMockConfigService());
      const rulesDir = (service as unknown as { rulesDir: string }).rulesDir;

      // Should resolve to .ai-rules path (either from package or dev fallback)
      expect(rulesDir).toContain('.ai-rules');
    });

    it('should find rules directory successfully', () => {
      const service = new RulesService(createMockCustomService(), createMockConfigService());
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
      service = new RulesService(createMockCustomService(), createMockConfigService());
    });

    it('should return file content when file exists', async () => {
      const mockContent = '# Core Rules\n\nSome content here...';
      vi.mocked(fs.readFile).mockResolvedValue(mockContent);

      const result = await service.getRuleContent('rules/core.md');

      expect(result).toBe(mockContent);
      expect(fs.readFile).toHaveBeenCalledWith('/test/rules/rules/core.md', 'utf-8');
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
        await expect(service.getRuleContent('../../../etc/passwd')).rejects.toThrow(
          'Access denied: Invalid path',
        );
      });

      it('should reject hidden path traversal', async () => {
        await expect(service.getRuleContent('agents/../../secret')).rejects.toThrow(
          'Access denied: Invalid path',
        );
      });

      it('should reject absolute paths', async () => {
        await expect(service.getRuleContent('/etc/passwd')).rejects.toThrow(
          'Access denied: Invalid path',
        );
      });

      it('should reject Windows-style path traversal', async () => {
        await expect(service.getRuleContent('..\\..\\etc\\passwd')).rejects.toThrow(
          'Access denied: Invalid path',
        );
      });

      it('should reject null byte injection', async () => {
        await expect(service.getRuleContent('agents/test.json\x00.txt')).rejects.toThrow(
          'Access denied: Invalid path',
        );
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
      service = new RulesService(createMockCustomService(), createMockConfigService());
    });

    it('should return agent names from directory', async () => {
      vi.mocked(fs.readdir).mockResolvedValue([
        'frontend-developer.json',
        'code-reviewer.json',
        'backend-developer.json',
      ] as unknown as Awaited<ReturnType<typeof fs.readdir>>);

      const result = await service.listAgents();

      expect(result).toEqual(['backend-developer', 'code-reviewer', 'frontend-developer']);
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
      service = new RulesService(createMockCustomService(), createMockConfigService());
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

      await expect(service.getAgent('invalid')).rejects.toThrow('Invalid agent profile');
    });

    it('should reject agent with prototype pollution attempt', async () => {
      const maliciousJson =
        '{"name":"Agent","description":"Desc","role":{"title":"Title","expertise":[]},"__proto__":{"isAdmin":true}}';
      vi.mocked(fs.readFile).mockResolvedValue(maliciousJson);

      await expect(service.getAgent('malicious')).rejects.toThrow('Invalid agent profile');
    });

    it('should throw on invalid JSON', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('{ invalid json }');

      await expect(service.getAgent('broken-agent')).rejects.toThrow();
    });

    it('should throw when agent file does not exist', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));

      await expect(service.getAgent('nonexistent')).rejects.toThrow('Failed to read rule file');
    });

    describe('language override from config', () => {
      it('should override communication.language with config language', async () => {
        const mockAgent = {
          name: 'Frontend Developer',
          description: 'Frontend development specialist',
          role: {
            title: 'Senior Frontend Developer',
            expertise: ['React', 'TypeScript'],
          },
          communication: {
            language: 'en',
            style: 'Technical and precise',
          },
        };
        vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockAgent));

        // Create service with config language 'ko'
        const serviceWithLang = new RulesService(
          createMockCustomService(),
          createMockConfigService('ko'),
        );

        const result = await serviceWithLang.getAgent('frontend-developer');

        expect(result.communication?.language).toBe('ko');
        // Other communication properties should be preserved
        expect(result.communication?.style).toBe('Technical and precise');
      });

      it('should preserve agent language when config has no language', async () => {
        const mockAgent = {
          name: 'Frontend Developer',
          description: 'Frontend development specialist',
          role: {
            title: 'Senior Frontend Developer',
            expertise: ['React', 'TypeScript'],
          },
          communication: {
            language: 'en',
          },
        };
        vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockAgent));

        // Create service with no config language
        const serviceWithoutLang = new RulesService(
          createMockCustomService(),
          createMockConfigService(undefined),
        );

        const result = await serviceWithoutLang.getAgent('frontend-developer');

        expect(result.communication?.language).toBe('en');
      });

      it('should create communication object with config language when agent has none', async () => {
        const mockAgent = {
          name: 'Frontend Developer',
          description: 'Frontend development specialist',
          role: {
            title: 'Senior Frontend Developer',
            expertise: ['React', 'TypeScript'],
          },
          // No communication field
        };
        vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockAgent));

        // Create service with config language 'ja'
        const serviceWithLang = new RulesService(
          createMockCustomService(),
          createMockConfigService('ja'),
        );

        const result = await serviceWithLang.getAgent('frontend-developer');

        expect(result.communication?.language).toBe('ja');
      });

      it('should not modify agent when config language is undefined and agent has no communication', async () => {
        const mockAgent = {
          name: 'Frontend Developer',
          description: 'Frontend development specialist',
          role: {
            title: 'Senior Frontend Developer',
            expertise: ['React', 'TypeScript'],
          },
          // No communication field
        };
        vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockAgent));

        // Create service without config language
        const serviceWithoutLang = new RulesService(
          createMockCustomService(),
          createMockConfigService(undefined),
        );

        const result = await serviceWithoutLang.getAgent('frontend-developer');

        expect(result.communication).toBeUndefined();
      });

      it('should return agent with original language when getLanguage() fails', async () => {
        const mockAgent = {
          name: 'Frontend Developer',
          description: 'Frontend development specialist',
          role: {
            title: 'Senior Frontend Developer',
            expertise: ['React', 'TypeScript'],
          },
          communication: {
            language: 'en',
            style: 'Technical and precise',
          },
        };
        vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockAgent));

        // Create service with failing getLanguage
        const failingConfigService = {
          getProjectRoot: vi.fn().mockReturnValue('/test/project'),
          getSettings: vi.fn().mockResolvedValue({}),
          getLanguage: vi.fn().mockRejectedValue(new Error('Config error')),
        } as unknown as ConfigService;

        const serviceWithError = new RulesService(createMockCustomService(), failingConfigService);

        const result = await serviceWithError.getAgent('frontend-developer');

        // Should still return agent with original language
        expect(result.communication?.language).toBe('en');
        expect(result.communication?.style).toBe('Technical and precise');
      });
    });
  });

  describe('searchRules', () => {
    let service: RulesService;
    let mockCustomService: CustomService;

    beforeEach(() => {
      process.env.CODINGBUDDY_RULES_DIR = '/test/rules';
      mockCustomService = createMockCustomService();
      service = new RulesService(mockCustomService, createMockConfigService());
    });

    it('should find matches across files', async () => {
      // Mock listAgents
      vi.mocked(fs.readdir).mockResolvedValue(['frontend-developer.json'] as unknown as Awaited<
        ReturnType<typeof fs.readdir>
      >);

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

      vi.mocked(fs.readFile).mockResolvedValue('Line 1\nLine 2 with keyword\nLine 3');

      const result = await service.searchRules('keyword');

      expect(result[0].matches[0]).toContain('Line 2:');
    });
  });

  describe('checkExists (private method behavior)', () => {
    it('should resolve rules directory path', () => {
      const service = new RulesService(createMockCustomService(), createMockConfigService());
      const rulesDir = (service as unknown as { rulesDir: string }).rulesDir;

      // Should have resolved to a valid .ai-rules path
      expect(rulesDir).toContain('.ai-rules');
    });

    it('should handle existsSync throwing an error gracefully', () => {
      vi.mocked(existsSync).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      // Should not throw - either package provides path or fallback handles error
      expect(
        () => new RulesService(createMockCustomService(), createMockConfigService()),
      ).not.toThrow();
    });
  });

  describe('findDevRulesDir (fallback logic)', () => {
    beforeEach(() => {
      // Reset require cache to force fallback
      delete process.env.CODINGBUDDY_RULES_DIR;
      vi.clearAllMocks();
    });

    it('should use package path when available', () => {
      // In this test environment, codingbuddy-rules package is available
      const service = new RulesService(createMockCustomService(), createMockConfigService());
      const rulesDir = (service as unknown as { rulesDir: string }).rulesDir;

      // Should resolve to package path or fallback
      expect(rulesDir).toBeDefined();
      expect(typeof rulesDir).toBe('string');
      expect(rulesDir).toContain('.ai-rules');
    });

    it('should use first existing candidate when checking paths', () => {
      // The actual implementation checks real filesystem paths
      // In development, package is available so fallback isn't triggered
      // This test verifies the constructor completes successfully
      const service = new RulesService(createMockCustomService(), createMockConfigService());
      const rulesDir = (service as unknown as { rulesDir: string }).rulesDir;

      expect(rulesDir).toBeDefined();
      expect(rulesDir).toContain('.ai-rules');
    });

    it('should handle directory resolution gracefully', () => {
      // Test that constructor doesn't throw even with filesystem variations
      expect(
        () => new RulesService(createMockCustomService(), createMockConfigService()),
      ).not.toThrow();
    });

    it('should use fallback when existsSync returns false for all candidates', () => {
      // Mock existsSync to return false for all candidates
      vi.mocked(existsSync).mockReturnValue(false);

      const service = new RulesService(createMockCustomService(), createMockConfigService());
      const rulesDir = (service as unknown as { rulesDir: string }).rulesDir;

      // Should still return a valid path (first candidate as fallback)
      expect(rulesDir).toBeDefined();
      expect(rulesDir).toContain('.ai-rules');
    });

    it('should stop checking candidates when first valid path found', () => {
      // Mock existsSync to return true on first call
      vi.mocked(existsSync).mockReturnValueOnce(true);

      const service = new RulesService(createMockCustomService(), createMockConfigService());
      const rulesDir = (service as unknown as { rulesDir: string }).rulesDir;

      // Should have found a valid directory
      expect(rulesDir).toBeDefined();
      expect(rulesDir).toContain('.ai-rules');
    });
  });

  describe('searchRules with custom rules', () => {
    let service: RulesService;
    let mockCustomService: CustomService;

    beforeEach(() => {
      process.env.CODINGBUDDY_RULES_DIR = '/test/rules';
      mockCustomService = createMockCustomService();
      service = new RulesService(mockCustomService, createMockConfigService());
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
      vi.mocked(mockCustomService.listCustomRules).mockResolvedValue([customRule]);

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
      vi.mocked(mockCustomService.listCustomRules).mockResolvedValue([customRule]);

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
      vi.mocked(mockCustomService.listCustomRules).mockResolvedValue([customRule]);

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
      service = new RulesService(mockCustomService, createMockConfigService());
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

        expect(result).toEqual(['plan-mode', 'backend-developer', 'frontend-developer']);
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

  describe('Skill Operations', () => {
    let service: RulesService;

    beforeEach(() => {
      process.env.CODINGBUDDY_RULES_DIR = '/test/rules';
      service = new RulesService(createMockCustomService(), createMockConfigService());
    });

    describe('listSkillsFromDir', () => {
      it('should list all valid skills from directory', async () => {
        // Mock readdir to return skill directories
        const mockDirEntries = [
          { name: 'parallel-execution', isDirectory: () => true },
          { name: 'api-design', isDirectory: () => true },
          { name: 'README.md', isDirectory: () => false }, // should be filtered
        ];
        vi.mocked(fs.readdir).mockResolvedValue(
          mockDirEntries as unknown as Awaited<ReturnType<typeof fs.readdir>>,
        );

        // Mock SKILL.md content with proper YAML frontmatter
        vi.mocked(fs.readFile).mockImplementation(async (filePath: unknown) => {
          const path = filePath as string;
          if (path.includes('parallel-execution')) {
            return `---
name: parallel-execution
description: Execute tasks in parallel for improved performance
---

This skill enables parallel execution of independent tasks.`;
          }
          if (path.includes('api-design')) {
            return `---
name: api-design
description: Design RESTful APIs following best practices
---

API design skill with comprehensive guidelines.`;
          }
          return '';
        });

        const result = await service.listSkillsFromDir();

        expect(result).toHaveLength(2);
        expect(result[0].name).toBe('parallel-execution');
        expect(result[0].description).toBe('Execute tasks in parallel for improved performance');
        expect(result[1].name).toBe('api-design');
        expect(result[1].description).toBe('Design RESTful APIs following best practices');
      });

      it('should return empty array when skills directory is empty', async () => {
        vi.mocked(fs.readdir).mockResolvedValue(
          [] as unknown as Awaited<ReturnType<typeof fs.readdir>>,
        );

        const result = await service.listSkillsFromDir();

        expect(result).toEqual([]);
      });

      it('should skip invalid skill files and continue', async () => {
        const mockDirEntries = [
          { name: 'valid-skill', isDirectory: () => true },
          { name: 'invalid-skill', isDirectory: () => true },
        ];
        vi.mocked(fs.readdir).mockResolvedValue(
          mockDirEntries as unknown as Awaited<ReturnType<typeof fs.readdir>>,
        );

        let callCount = 0;
        vi.mocked(fs.readFile).mockImplementation(async () => {
          callCount++;
          if (callCount === 1) {
            return `---
name: valid-skill
description: A valid skill description
---

Valid skill content.`;
          }
          // Second call returns invalid content (missing frontmatter)
          return 'Invalid SKILL.md without frontmatter';
        });

        const result = await service.listSkillsFromDir();

        // Should return only the valid skill
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('valid-skill');
      });

      it('should handle readdir errors gracefully', async () => {
        vi.mocked(fs.readdir).mockRejectedValue(new Error('Directory not found'));

        const result = await service.listSkillsFromDir();

        expect(result).toEqual([]);
      });

      it('should filter non-directory entries', async () => {
        const mockDirEntries = [
          { name: 'skill-one', isDirectory: () => true },
          { name: 'README.md', isDirectory: () => false },
          { name: '.gitkeep', isDirectory: () => false },
          { name: 'skill-two', isDirectory: () => true },
        ];
        vi.mocked(fs.readdir).mockResolvedValue(
          mockDirEntries as unknown as Awaited<ReturnType<typeof fs.readdir>>,
        );

        vi.mocked(fs.readFile).mockImplementation(async (filePath: unknown) => {
          const path = filePath as string;
          if (path.includes('skill-one')) {
            return `---
name: skill-one
description: First test skill
---

Skill one content.`;
          }
          if (path.includes('skill-two')) {
            return `---
name: skill-two
description: Second test skill
---

Skill two content.`;
          }
          return '';
        });

        const result = await service.listSkillsFromDir();

        // Only directories should be processed
        expect(result).toHaveLength(2);
        expect(result[0].name).toBe('skill-one');
        expect(result[1].name).toBe('skill-two');
      });
    });

    describe('getSkill', () => {
      it('should return parsed Skill object', async () => {
        const mockSkillContent = `---
name: test-skill
description: A test skill for demonstration
---

# Test Skill

This is a detailed description of the test skill.

## Usage

Use this skill when you need to test.

## Examples

\`\`\`
Example usage here
\`\`\`
`;
        vi.mocked(fs.readFile).mockResolvedValue(mockSkillContent);

        const result = await service.getSkill('test-skill');

        expect(result.name).toBe('test-skill');
        expect(result.description).toBe('A test skill for demonstration');
        expect(result.content).toBeDefined();
        expect(fs.readFile).toHaveBeenCalledWith('/test/rules/skills/test-skill/SKILL.md', 'utf-8');
      });

      it('should throw error for invalid skill name format', async () => {
        await expect(service.getSkill('Invalid_Skill')).rejects.toThrow(
          'Invalid skill name format',
        );
        await expect(service.getSkill('skill with spaces')).rejects.toThrow(
          'Invalid skill name format',
        );
        await expect(service.getSkill('UPPERCASE-SKILL')).rejects.toThrow(
          'Invalid skill name format',
        );
      });

      it('should accept valid lowercase alphanumeric with hyphens', async () => {
        vi.mocked(fs.readFile).mockImplementation(async (filePath: unknown) => {
          const path = filePath as string;
          if (path.includes('valid-skill-123')) {
            return `---
name: valid-skill-123
description: Valid skill with numbers
---

Content for skill 123.`;
          }
          if (path.includes('skill123')) {
            return `---
name: skill123
description: Valid skill without hyphens
---

Content for skill123.`;
          }
          if (path.includes('my-skill')) {
            return `---
name: my-skill
description: My custom skill
---

Content for my-skill.`;
          }
          return '';
        });

        await expect(service.getSkill('valid-skill-123')).resolves.toBeDefined();
        await expect(service.getSkill('skill123')).resolves.toBeDefined();
        await expect(service.getSkill('my-skill')).resolves.toBeDefined();
      });

      it('should throw error when skill file does not exist', async () => {
        vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT: no such file or directory'));

        await expect(service.getSkill('nonexistent-skill')).rejects.toThrow('Skill not found');
      });

      it('should throw error for invalid skill schema', async () => {
        // Mock invalid SKILL.md content (missing required sections)
        vi.mocked(fs.readFile).mockResolvedValue('Invalid skill content');

        await expect(service.getSkill('invalid-skill')).rejects.toThrow('Invalid skill');
      });

      it('should reject path traversal attempts with format validation', async () => {
        // Path traversal with ../ is caught by format validation
        await expect(service.getSkill('../../../etc/passwd')).rejects.toThrow(
          'Invalid skill name format',
        );
      });

      it('should reject skills with slashes (directory traversal)', async () => {
        // Slashes in skill name are invalid format
        await expect(service.getSkill('skill/../../etc')).rejects.toThrow(
          'Invalid skill name format',
        );
      });

      it('should validate path safety for valid names', async () => {
        // Even if name format is valid, path safety should be checked
        vi.mocked(fs.readFile).mockResolvedValue(`---
name: valid-skill
description: A valid skill for testing
---

Valid skill content.`);

        const result = await service.getSkill('valid-skill');
        expect(result).toBeDefined();
        expect(result.name).toBe('valid-skill');
      });
    });
  });
});
