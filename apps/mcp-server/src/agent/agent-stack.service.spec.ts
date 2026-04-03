import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AgentStackService } from './agent-stack.service';
import type { RulesService } from '../rules/rules.service';
import type { ConfigService } from '../config/config.service';
import * as fs from 'fs/promises';

vi.mock('fs/promises');

const mockFs = vi.mocked(fs);

describe('AgentStackService', () => {
  let service: AgentStackService;
  let mockRulesService: Partial<RulesService>;
  let mockConfigService: Partial<ConfigService>;

  const sampleStack = {
    name: 'api-development',
    description: 'API development stack',
    category: 'development',
    primary_agent: 'backend-developer',
    specialists: ['security-specialist', 'test-engineer'],
    tags: ['api', 'backend'],
  };

  const sampleStack2 = {
    name: 'frontend-review',
    description: 'Frontend review stack',
    category: 'review',
    primary_agent: 'frontend-developer',
    specialists: ['accessibility-specialist', 'performance-specialist'],
    tags: ['frontend', 'ui'],
  };

  beforeEach(() => {
    mockRulesService = {
      getRulesDir: vi.fn().mockReturnValue('/rules/.ai-rules'),
    };
    mockConfigService = {
      getProjectRoot: vi.fn().mockReturnValue('/project'),
    };
    service = new AgentStackService(
      mockRulesService as RulesService,
      mockConfigService as ConfigService,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('listStacks', () => {
    it('should return stacks from default location', async () => {
      mockFs.readdir.mockImplementation(async (dirPath: unknown) => {
        if (String(dirPath).includes('.ai-rules/agent-stacks')) {
          return ['api-development.json', 'frontend-review.json'] as unknown[];
        }
        throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      });
      mockFs.readFile.mockImplementation(async (filePath: unknown) => {
        const p = String(filePath);
        if (p.includes('api-development.json')) return JSON.stringify(sampleStack);
        if (p.includes('frontend-review.json')) return JSON.stringify(sampleStack2);
        throw new Error('Not found');
      });

      const stacks = await service.listStacks();

      expect(stacks).toHaveLength(2);
      expect(stacks[0].name).toBe('api-development');
      expect(stacks[0].specialist_count).toBe(2);
      expect(stacks[1].name).toBe('frontend-review');
    });

    it('should merge custom stacks with default, custom taking priority', async () => {
      const customStack = {
        ...sampleStack,
        description: 'Custom API stack',
        specialists: ['security-specialist'],
      };

      mockFs.readdir.mockImplementation(async (dirPath: unknown) => {
        const p = String(dirPath);
        if (p.includes('.codingbuddy/agent-stacks')) {
          return ['api-development.json'] as unknown[];
        }
        if (p.includes('.ai-rules/agent-stacks')) {
          return ['api-development.json', 'frontend-review.json'] as unknown[];
        }
        throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      });
      mockFs.readFile.mockImplementation(async (filePath: unknown) => {
        const p = String(filePath);
        if (p.includes('.codingbuddy') && p.includes('api-development.json')) {
          return JSON.stringify(customStack);
        }
        if (p.includes('api-development.json')) return JSON.stringify(sampleStack);
        if (p.includes('frontend-review.json')) return JSON.stringify(sampleStack2);
        throw new Error('Not found');
      });

      const stacks = await service.listStacks();

      expect(stacks).toHaveLength(2);
      const apiStack = stacks.find(s => s.name === 'api-development');
      expect(apiStack?.description).toBe('Custom API stack');
      expect(apiStack?.specialist_count).toBe(1);
    });

    it('should filter by category', async () => {
      mockFs.readdir.mockImplementation(async (dirPath: unknown) => {
        if (String(dirPath).includes('.ai-rules/agent-stacks')) {
          return ['api-development.json', 'frontend-review.json'] as unknown[];
        }
        throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      });
      mockFs.readFile.mockImplementation(async (filePath: unknown) => {
        const p = String(filePath);
        if (p.includes('api-development.json')) return JSON.stringify(sampleStack);
        if (p.includes('frontend-review.json')) return JSON.stringify(sampleStack2);
        throw new Error('Not found');
      });

      const stacks = await service.listStacks('review');

      expect(stacks).toHaveLength(1);
      expect(stacks[0].name).toBe('frontend-review');
    });

    it('should return empty array when no stack directories exist', async () => {
      mockFs.readdir.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

      const stacks = await service.listStacks();

      expect(stacks).toEqual([]);
    });

    it('should skip invalid JSON files gracefully', async () => {
      mockFs.readdir.mockImplementation(async (dirPath: unknown) => {
        if (String(dirPath).includes('.ai-rules/agent-stacks')) {
          return ['valid.json', 'invalid.json', 'not-json.txt'] as unknown[];
        }
        throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      });
      mockFs.readFile.mockImplementation(async (filePath: unknown) => {
        const p = String(filePath);
        if (p.includes('valid.json')) return JSON.stringify(sampleStack);
        if (p.includes('invalid.json')) return 'not valid json {{{';
        throw new Error('Not found');
      });

      const stacks = await service.listStacks();

      expect(stacks).toHaveLength(1);
      expect(stacks[0].name).toBe('api-development');
    });

    it('should skip stacks missing required fields', async () => {
      const incompleteStack = { name: 'incomplete' };

      mockFs.readdir.mockImplementation(async (dirPath: unknown) => {
        if (String(dirPath).includes('.ai-rules/agent-stacks')) {
          return ['valid.json', 'incomplete.json'] as unknown[];
        }
        throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      });
      mockFs.readFile.mockImplementation(async (filePath: unknown) => {
        const p = String(filePath);
        if (p.includes('valid.json')) return JSON.stringify(sampleStack);
        if (p.includes('incomplete.json')) return JSON.stringify(incompleteStack);
        throw new Error('Not found');
      });

      const stacks = await service.listStacks();

      expect(stacks).toHaveLength(1);
    });
  });

  describe('resolveStack', () => {
    it('should resolve stack by name from default location', async () => {
      mockFs.readdir.mockImplementation(async (dirPath: unknown) => {
        if (String(dirPath).includes('.ai-rules/agent-stacks')) {
          return ['api-development.json'] as unknown[];
        }
        throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      });
      mockFs.readFile.mockImplementation(async (filePath: unknown) => {
        if (String(filePath).includes('api-development.json')) {
          return JSON.stringify(sampleStack);
        }
        throw new Error('Not found');
      });

      const stack = await service.resolveStack('api-development');

      expect(stack.name).toBe('api-development');
      expect(stack.primary_agent).toBe('backend-developer');
      expect(stack.specialists).toEqual(['security-specialist', 'test-engineer']);
    });

    it('should prefer custom stack over default', async () => {
      const customStack = {
        ...sampleStack,
        specialists: ['security-specialist', 'test-engineer', 'code-quality-specialist'],
      };

      mockFs.readdir.mockImplementation(async (dirPath: unknown) => {
        const p = String(dirPath);
        if (p.includes('.codingbuddy/agent-stacks')) {
          return ['api-development.json'] as unknown[];
        }
        if (p.includes('.ai-rules/agent-stacks')) {
          return ['api-development.json'] as unknown[];
        }
        throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      });
      mockFs.readFile.mockImplementation(async (filePath: unknown) => {
        const p = String(filePath);
        if (p.includes('.codingbuddy') && p.includes('api-development.json')) {
          return JSON.stringify(customStack);
        }
        if (p.includes('api-development.json')) return JSON.stringify(sampleStack);
        throw new Error('Not found');
      });

      const stack = await service.resolveStack('api-development');

      expect(stack.specialists).toHaveLength(3);
    });

    it('should throw when stack not found', async () => {
      mockFs.readdir.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

      await expect(service.resolveStack('non-existent')).rejects.toThrow(
        "Agent stack 'non-existent' not found",
      );
    });
  });
});
