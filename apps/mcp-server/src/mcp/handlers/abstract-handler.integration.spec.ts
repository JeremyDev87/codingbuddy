import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentHandler } from './agent.handler';
import { ChecklistContextHandler } from './checklist-context.handler';
import { ConfigHandler } from './config.handler';
import { ModeHandler } from './mode.handler';
import { RulesHandler } from './rules.handler';
import { SkillHandler } from './skill.handler';
import { AgentService } from '../../agent/agent.service';
import { ChecklistService } from '../../checklist/checklist.service';
import { ContextService } from '../../context/context.service';
import { KeywordService } from '../../keyword/keyword.service';
import { ConfigService } from '../../config/config.service';
import { ConfigDiffService } from '../../config/config-diff.service';
import { AnalyzerService } from '../../analyzer/analyzer.service';
import { SkillRecommendationService } from '../../skill/skill-recommendation.service';
import { RulesService } from '../../rules/rules.service';
import { LanguageService } from '../../shared/language.service';
import { ModelResolverService } from '../../model/model-resolver.service';

/**
 * Integration tests verifying all concrete handlers inherit
 * prototype pollution protection from AbstractHandler.
 *
 * These tests ensure the Template Method pattern correctly enforces
 * security validation across all handler implementations.
 */
describe('Handler Security Integration', () => {
  let agentHandler: AgentHandler;
  let checklistHandler: ChecklistContextHandler;
  let configHandler: ConfigHandler;
  let modeHandler: ModeHandler;
  let rulesHandler: RulesHandler;
  let skillHandler: SkillHandler;

  // Mock services
  let mockAgentService: AgentService;
  let mockChecklistService: ChecklistService;
  let mockContextService: ContextService;
  let mockKeywordService: KeywordService;
  let mockConfigService: ConfigService;
  let mockConfigDiffService: ConfigDiffService;
  let mockAnalyzerService: AnalyzerService;
  let mockSkillRecommendationService: SkillRecommendationService;
  let mockRulesService: RulesService;
  let mockLanguageService: LanguageService;
  let mockModelResolverService: ModelResolverService;

  beforeEach(() => {
    // Create mock services with minimal implementation
    mockAgentService = {
      getAgentSystemPrompt: vi.fn().mockResolvedValue('mock prompt'),
      prepareParallelAgents: vi.fn().mockResolvedValue({ agents: [] }),
    } as unknown as AgentService;

    mockChecklistService = {
      generateChecklist: vi.fn().mockResolvedValue({ items: [] }),
    } as unknown as ChecklistService;

    mockContextService = {
      analyzeTask: vi.fn().mockResolvedValue({ risk: 'LOW' }),
    } as unknown as ContextService;

    mockKeywordService = {
      parseMode: vi.fn().mockResolvedValue({ mode: 'PLAN' }),
    } as unknown as KeywordService;

    mockConfigService = {
      getSettings: vi.fn().mockResolvedValue({}),
      reload: vi.fn().mockResolvedValue(undefined),
    } as unknown as ConfigService;

    mockConfigDiffService = {
      compareConfig: vi.fn().mockReturnValue({ suggestions: [] }),
    } as unknown as ConfigDiffService;

    mockAnalyzerService = {
      analyzeProject: vi.fn().mockResolvedValue({ frameworks: [] }),
    } as unknown as AnalyzerService;

    mockSkillRecommendationService = {
      recommendSkills: vi.fn().mockResolvedValue({ skills: [] }),
      listSkills: vi.fn().mockResolvedValue({ skills: [] }),
    } as unknown as SkillRecommendationService;

    mockRulesService = {
      searchRules: vi.fn().mockResolvedValue([]),
      getAgent: vi.fn().mockResolvedValue({ name: 'test-agent' }),
    } as unknown as RulesService;

    mockLanguageService = {
      translate: vi.fn((key: string) => key),
    } as unknown as LanguageService;

    mockModelResolverService = {
      resolveModel: vi.fn().mockReturnValue({ model: 'default' }),
    } as unknown as ModelResolverService;

    // Initialize handlers
    agentHandler = new AgentHandler(mockAgentService);
    checklistHandler = new ChecklistContextHandler(
      mockChecklistService,
      mockContextService,
    );
    configHandler = new ConfigHandler(
      mockConfigService,
      mockConfigDiffService,
      mockAnalyzerService,
    );
    modeHandler = new ModeHandler(
      mockKeywordService,
      mockConfigService,
      mockLanguageService,
      mockModelResolverService,
    );
    rulesHandler = new RulesHandler(mockRulesService);
    skillHandler = new SkillHandler(mockSkillRecommendationService);
  });

  describe('__proto__ pollution protection', () => {
    it('AgentHandler rejects args with __proto__ key', async () => {
      const maliciousArgs: Record<string, unknown> = { agentName: 'test' };
      Object.defineProperty(maliciousArgs, '__proto__', {
        value: { polluted: true },
        enumerable: true,
      });

      const result = await agentHandler.handle(
        'get_agent_system_prompt',
        maliciousArgs,
      );

      expect(result).not.toBeNull();
      expect(result!.isError).toBe(true);
      expect(result!.content[0].text).toContain('dangerous key detected');
      expect(result!.content[0].text).toContain('__proto__');
    });

    it('ChecklistContextHandler rejects args with __proto__ key', async () => {
      const maliciousArgs: Record<string, unknown> = { files: [] };
      Object.defineProperty(maliciousArgs, '__proto__', {
        value: { polluted: true },
        enumerable: true,
      });

      const result = await checklistHandler.handle(
        'generate_checklist',
        maliciousArgs,
      );

      expect(result).not.toBeNull();
      expect(result!.isError).toBe(true);
      expect(result!.content[0].text).toContain('dangerous key detected');
    });

    it('ConfigHandler rejects args with __proto__ key', async () => {
      const maliciousArgs: Record<string, unknown> = {};
      Object.defineProperty(maliciousArgs, '__proto__', {
        value: { polluted: true },
        enumerable: true,
      });

      const result = await configHandler.handle(
        'get_project_config',
        maliciousArgs,
      );

      expect(result).not.toBeNull();
      expect(result!.isError).toBe(true);
      expect(result!.content[0].text).toContain('dangerous key detected');
    });

    it('ModeHandler rejects args with __proto__ key', async () => {
      const maliciousArgs: Record<string, unknown> = { prompt: 'test' };
      Object.defineProperty(maliciousArgs, '__proto__', {
        value: { polluted: true },
        enumerable: true,
      });

      const result = await modeHandler.handle('parse_mode', maliciousArgs);

      expect(result).not.toBeNull();
      expect(result!.isError).toBe(true);
      expect(result!.content[0].text).toContain('dangerous key detected');
    });

    it('RulesHandler rejects args with __proto__ key', async () => {
      const maliciousArgs: Record<string, unknown> = { query: 'test' };
      Object.defineProperty(maliciousArgs, '__proto__', {
        value: { polluted: true },
        enumerable: true,
      });

      const result = await rulesHandler.handle('search_rules', maliciousArgs);

      expect(result).not.toBeNull();
      expect(result!.isError).toBe(true);
      expect(result!.content[0].text).toContain('dangerous key detected');
    });

    it('SkillHandler rejects args with __proto__ key', async () => {
      const maliciousArgs: Record<string, unknown> = { prompt: 'test' };
      Object.defineProperty(maliciousArgs, '__proto__', {
        value: { polluted: true },
        enumerable: true,
      });

      const result = await skillHandler.handle(
        'recommend_skills',
        maliciousArgs,
      );

      expect(result).not.toBeNull();
      expect(result!.isError).toBe(true);
      expect(result!.content[0].text).toContain('dangerous key detected');
    });
  });

  describe('constructor pollution protection', () => {
    it('All handlers reject args with constructor key', async () => {
      const maliciousArgs = {
        constructor: { polluted: true },
        agentName: 'test',
        query: 'test',
        prompt: 'test',
      };

      // Test all handlers with their respective tools
      const results = await Promise.all([
        agentHandler.handle('get_agent_system_prompt', { ...maliciousArgs }),
        checklistHandler.handle('analyze_task', { ...maliciousArgs }),
        configHandler.handle('get_project_config', { ...maliciousArgs }),
        modeHandler.handle('parse_mode', { ...maliciousArgs }),
        rulesHandler.handle('search_rules', { ...maliciousArgs }),
        skillHandler.handle('recommend_skills', { ...maliciousArgs }),
      ]);

      // All handlers should reject with error
      results.forEach(result => {
        expect(result).not.toBeNull();
        expect(result!.isError).toBe(true);
        expect(result!.content[0].text).toContain('dangerous key detected');
        expect(result!.content[0].text).toContain('constructor');
      });
    });
  });

  describe('prototype pollution protection', () => {
    it('All handlers reject args with prototype key', async () => {
      const maliciousArgs = {
        prototype: { polluted: true },
        agentName: 'test',
        query: 'test',
        prompt: 'test',
      };

      const results = await Promise.all([
        agentHandler.handle('get_agent_system_prompt', { ...maliciousArgs }),
        checklistHandler.handle('analyze_task', { ...maliciousArgs }),
        configHandler.handle('get_project_config', { ...maliciousArgs }),
        modeHandler.handle('parse_mode', { ...maliciousArgs }),
        rulesHandler.handle('search_rules', { ...maliciousArgs }),
        skillHandler.handle('recommend_skills', { ...maliciousArgs }),
      ]);

      results.forEach(result => {
        expect(result).not.toBeNull();
        expect(result!.isError).toBe(true);
        expect(result!.content[0].text).toContain('dangerous key detected');
        expect(result!.content[0].text).toContain('prototype');
      });
    });
  });

  describe('Nested dangerous keys protection', () => {
    it('All handlers reject deeply nested __proto__ in args', async () => {
      const deepNested: Record<string, unknown> = {};
      Object.defineProperty(deepNested, '__proto__', {
        value: { polluted: true },
        enumerable: true,
      });

      const maliciousArgs = {
        agentName: 'test',
        query: 'test',
        prompt: 'test',
        nested: {
          deepNested,
        },
      };

      const results = await Promise.all([
        agentHandler.handle('get_agent_system_prompt', { ...maliciousArgs }),
        checklistHandler.handle('analyze_task', { ...maliciousArgs }),
        configHandler.handle('get_project_config', { ...maliciousArgs }),
        modeHandler.handle('parse_mode', { ...maliciousArgs }),
        rulesHandler.handle('search_rules', { ...maliciousArgs }),
        skillHandler.handle('recommend_skills', { ...maliciousArgs }),
      ]);

      results.forEach(result => {
        expect(result).not.toBeNull();
        expect(result!.isError).toBe(true);
        expect(result!.content[0].text).toContain('dangerous key detected');
        expect(result!.content[0].text).toContain(
          'nested.deepNested.__proto__',
        );
      });
    });
  });

  describe('Safe args handling', () => {
    it('All handlers accept safe args without security errors', async () => {
      // These should all succeed (or fail for business logic reasons, not security)
      const results = await Promise.all([
        agentHandler.handle('get_agent_system_prompt', {
          agentName: 'test-agent',
        }),
        checklistHandler.handle('analyze_task', { prompt: 'test' }),
        configHandler.handle('get_project_config', {}),
        modeHandler.handle('parse_mode', { prompt: 'test' }),
        rulesHandler.handle('search_rules', { query: 'test' }),
        skillHandler.handle('recommend_skills', { prompt: 'test' }),
      ]);

      // None should have security errors
      results.forEach(result => {
        expect(result).not.toBeNull();
        // If there's an error, it should not be about dangerous keys
        if (result!.isError) {
          expect(result!.content[0].text).not.toContain(
            'dangerous key detected',
          );
        }
      });
    });
  });
});
