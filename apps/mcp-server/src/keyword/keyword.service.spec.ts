import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KeywordService } from './keyword.service';
import type { KeywordModesConfig } from './keyword.types';

const mockConfig: KeywordModesConfig = {
  modes: {
    PLAN: {
      description: 'Task planning and design phase',
      instructions: 'Design first approach.',
      rules: ['rules/core.md'],
    },
    ACT: {
      description: 'Actual task execution phase',
      instructions: 'Red-Green-Refactor cycle.',
      rules: ['rules/core.md', 'rules/project.md'],
    },
    EVAL: {
      description: 'Result review and assessment phase',
      instructions: 'Code quality review.',
      rules: ['rules/core.md'],
    },
  },
  defaultMode: 'PLAN',
};

const mockRulesContent: Record<string, string> = {
  'rules/core.md': '# Core Rules\nCore content here.',
  'rules/project.md': '# Project Rules\nProject content here.',
};

describe('KeywordService', () => {
  let service: KeywordService;
  let mockLoadConfig: () => Promise<KeywordModesConfig>;
  let mockLoadRule: (path: string) => Promise<string>;

  beforeEach(() => {
    mockLoadConfig = vi.fn().mockResolvedValue(mockConfig);
    mockLoadRule = vi.fn().mockImplementation((path: string) => {
      const content = mockRulesContent[path];
      if (content) return Promise.resolve(content);
      return Promise.reject(new Error(`File not found: ${path}`));
    });
    service = new KeywordService(mockLoadConfig, mockLoadRule);
  });

  describe('parseMode', () => {
    describe('normal cases - each keyword', () => {
      it('parses PLAN keyword', async () => {
        const result = await service.parseMode('PLAN design auth feature');

        expect(result.mode).toBe('PLAN');
        expect(result.originalPrompt).toBe('design auth feature');
        expect(result.instructions).toBe('Design first approach.');
        expect(result.rules).toHaveLength(1);
        expect(result.rules[0].name).toBe('rules/core.md');
        expect(result.warnings).toBeUndefined();
      });

      it('parses ACT keyword', async () => {
        const result = await service.parseMode('ACT implement login API');

        expect(result.mode).toBe('ACT');
        expect(result.originalPrompt).toBe('implement login API');
        expect(result.instructions).toBe('Red-Green-Refactor cycle.');
        expect(result.rules).toHaveLength(2);
      });

      it('parses EVAL keyword', async () => {
        const result = await service.parseMode('EVAL review security');

        expect(result.mode).toBe('EVAL');
        expect(result.originalPrompt).toBe('review security');
        expect(result.instructions).toBe('Code quality review.');
      });
    });

    describe('case insensitive - each keyword', () => {
      it('parses plan (lowercase)', async () => {
        const result = await service.parseMode('plan design feature');

        expect(result.mode).toBe('PLAN');
        expect(result.originalPrompt).toBe('design feature');
      });

      it('parses act (lowercase)', async () => {
        const result = await service.parseMode('act implement feature');

        expect(result.mode).toBe('ACT');
      });

      it('parses eval (lowercase)', async () => {
        const result = await service.parseMode('eval review code');

        expect(result.mode).toBe('EVAL');
      });

      it('parses Plan (capitalized)', async () => {
        const result = await service.parseMode('Plan design feature');

        expect(result.mode).toBe('PLAN');
      });

      it('parses pLaN (mixed case)', async () => {
        const result = await service.parseMode('pLaN design feature');

        expect(result.mode).toBe('PLAN');
      });
    });

    describe('default value cases', () => {
      it('defaults to PLAN with warning when no keyword', async () => {
        const result = await service.parseMode('design auth feature');

        expect(result.mode).toBe('PLAN');
        expect(result.originalPrompt).toBe('design auth feature');
        expect(result.warnings).toContain(
          'No keyword found, defaulting to PLAN',
        );
      });

      it('defaults to PLAN with warning for empty string', async () => {
        const result = await service.parseMode('');

        expect(result.mode).toBe('PLAN');
        expect(result.originalPrompt).toBe('');
        expect(result.warnings).toContain(
          'No keyword found, defaulting to PLAN',
        );
      });

      it('defaults to PLAN with warning for whitespace only', async () => {
        const result = await service.parseMode('   ');

        expect(result.mode).toBe('PLAN');
        expect(result.originalPrompt).toBe('');
        expect(result.warnings).toContain(
          'No keyword found, defaulting to PLAN',
        );
      });
    });

    describe('warning cases', () => {
      it('uses first keyword with warning for multiple keywords', async () => {
        const result = await service.parseMode('PLAN ACT implement feature');

        expect(result.mode).toBe('PLAN');
        expect(result.originalPrompt).toBe('ACT implement feature');
        expect(result.warnings).toContain(
          'Multiple keywords found, using first',
        );
      });

      it('warns when no content after keyword', async () => {
        const result = await service.parseMode('PLAN');

        expect(result.mode).toBe('PLAN');
        expect(result.originalPrompt).toBe('');
        expect(result.warnings).toContain('No prompt content after keyword');
      });

      it('warns when only whitespace after keyword', async () => {
        const result = await service.parseMode('PLAN   ');

        expect(result.mode).toBe('PLAN');
        expect(result.originalPrompt).toBe('');
        expect(result.warnings).toContain('No prompt content after keyword');
      });
    });

    describe('edge cases', () => {
      it('does not recognize keyword in middle of prompt', async () => {
        const result = await service.parseMode('Please PLAN this feature');

        expect(result.mode).toBe('PLAN');
        expect(result.originalPrompt).toBe('Please PLAN this feature');
        expect(result.warnings).toContain(
          'No keyword found, defaulting to PLAN',
        );
      });

      it('distinguishes from similar words (PLANNING)', async () => {
        const result = await service.parseMode('PLANNING session today');

        expect(result.mode).toBe('PLAN');
        expect(result.originalPrompt).toBe('PLANNING session today');
        expect(result.warnings).toContain(
          'No keyword found, defaulting to PLAN',
        );
      });

      it('distinguishes from similar words (ACTION)', async () => {
        const result = await service.parseMode('ACTION items for today');

        expect(result.mode).toBe('PLAN');
        expect(result.originalPrompt).toBe('ACTION items for today');
        expect(result.warnings).toContain(
          'No keyword found, defaulting to PLAN',
        );
      });

      it('handles special characters in prompt', async () => {
        const result = await service.parseMode('PLAN design @feature #auth!');

        expect(result.mode).toBe('PLAN');
        expect(result.originalPrompt).toBe('design @feature #auth!');
      });

      it('handles newlines in prompt', async () => {
        const result = await service.parseMode(
          'PLAN design feature\nwith auth',
        );

        expect(result.mode).toBe('PLAN');
        expect(result.originalPrompt).toBe('design feature\nwith auth');
      });

      it('handles tabs in prompt', async () => {
        const result = await service.parseMode('PLAN\tdesign feature');

        expect(result.mode).toBe('PLAN');
        expect(result.originalPrompt).toBe('design feature');
      });
    });
  });

  describe('loadModeConfig', () => {
    it('loads keyword-modes.json successfully', async () => {
      const config = await service.loadModeConfig();

      expect(config).toEqual(mockConfig);
      expect(mockLoadConfig).toHaveBeenCalled();
    });

    it('uses default config when file not found', async () => {
      mockLoadConfig = vi.fn().mockRejectedValue(new Error('File not found'));
      service = new KeywordService(mockLoadConfig, mockLoadRule);

      const config = await service.loadModeConfig();

      expect(config.defaultMode).toBe('PLAN');
      expect(config.modes.PLAN).toBeDefined();
      expect(config.modes.ACT).toBeDefined();
      expect(config.modes.EVAL).toBeDefined();
    });

    it('uses default config with warning for invalid JSON', async () => {
      mockLoadConfig = vi
        .fn()
        .mockRejectedValue(new SyntaxError('Invalid JSON'));
      service = new KeywordService(mockLoadConfig, mockLoadRule);

      const config = await service.loadModeConfig();

      expect(config.defaultMode).toBe('PLAN');
    });
  });

  describe('getRulesForMode', () => {
    it('returns PLAN mode rules bundle', async () => {
      const rules = await service.getRulesForMode('PLAN');

      expect(rules).toHaveLength(1);
      expect(rules[0].name).toBe('rules/core.md');
      expect(rules[0].content).toBe('# Core Rules\nCore content here.');
    });

    it('returns ACT mode rules bundle', async () => {
      const rules = await service.getRulesForMode('ACT');

      expect(rules).toHaveLength(2);
      expect(rules[0].name).toBe('rules/core.md');
      expect(rules[1].name).toBe('rules/project.md');
    });

    it('returns EVAL mode rules bundle', async () => {
      const rules = await service.getRulesForMode('EVAL');

      expect(rules).toHaveLength(1);
      expect(rules[0].name).toBe('rules/core.md');
    });

    it('skips missing rule file with warning', async () => {
      mockLoadConfig = vi.fn().mockResolvedValue({
        ...mockConfig,
        modes: {
          ...mockConfig.modes,
          PLAN: {
            ...mockConfig.modes.PLAN,
            rules: ['rules/core.md', 'rules/missing.md'],
          },
        },
      });
      service = new KeywordService(mockLoadConfig, mockLoadRule);

      const rules = await service.getRulesForMode('PLAN');

      expect(rules).toHaveLength(1);
      expect(rules[0].name).toBe('rules/core.md');
    });
  });
});
