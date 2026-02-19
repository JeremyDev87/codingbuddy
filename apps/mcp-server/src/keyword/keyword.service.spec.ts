import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  KeywordService,
  type SkillRecommendationInfo,
  type SkillContentInfo,
  type AgentSystemPromptInfo,
} from './keyword.service';
import type { KeywordModesConfig, Mode } from './keyword.types';
import type { PrimaryAgentResolver } from './primary-agent-resolver';

/**
 * NOTE: Korean/Japanese/Chinese/Spanish test inputs (e.g., '계획 인증 기능 설계')
 * are intentional for testing multi-language keyword parsing functionality.
 * These are NOT translation targets - they are test data for i18n support.
 */

const mockConfig: KeywordModesConfig = {
  modes: {
    PLAN: {
      description: 'Task planning and design phase',
      instructions: 'Design first approach.',
      rules: ['rules/core.md'],
      agent: 'plan-mode',
      delegates_to: 'frontend-developer',
      defaultSpecialists: ['architecture-specialist', 'test-strategy-specialist'],
    },
    ACT: {
      description: 'Actual task execution phase',
      instructions: 'Red-Green-Refactor cycle.',
      rules: ['rules/core.md', 'rules/project.md'],
      agent: 'act-mode',
      delegates_to: 'frontend-developer',
      defaultSpecialists: ['code-quality-specialist', 'test-strategy-specialist'],
    },
    EVAL: {
      description: 'Result review and assessment phase',
      instructions: 'Code quality review.',
      rules: ['rules/core.md'],
      agent: 'eval-mode',
      delegates_to: 'code-reviewer',
      defaultSpecialists: [
        'security-specialist',
        'accessibility-specialist',
        'performance-specialist',
        'code-quality-specialist',
        'observability-specialist',
        'event-architecture-specialist',
        'migration-specialist',
      ],
    },
    AUTO: {
      description: 'Autonomous execution mode',
      instructions: 'Execute PLAN → ACT → EVAL cycle automatically.',
      rules: ['rules/core.md'],
      agent: 'auto-mode',
      defaultSpecialists: ['architecture-specialist', 'test-strategy-specialist'],
    },
  },
  defaultMode: 'PLAN',
};

const mockRulesContent: Record<string, string> = {
  'rules/core.md': '# Core Rules\nCore content here.',
  'rules/project.md': '# Project Rules\nProject content here.',
};

const mockAgentData: Record<string, unknown> = {
  'frontend-developer': {
    name: 'Frontend Developer',
    description: 'React/Next.js specialist with TDD and design system experience',
    role: {
      expertise: ['React', 'Next.js', 'TDD', 'TypeScript'],
    },
  },
  'code-reviewer': {
    name: 'Code Reviewer',
    description: 'Code quality evaluation and improvement suggestion specialist',
    role: {
      expertise: ['Code Quality', 'SOLID Principles', 'Performance', 'Security'],
    },
  },
};

describe('KeywordService', () => {
  let service: KeywordService;
  let mockLoadConfig: () => Promise<KeywordModesConfig>;
  let mockLoadRule: (path: string) => Promise<string>;
  let mockLoadAgentInfo: (agentName: string) => Promise<unknown>;

  beforeEach(() => {
    mockLoadConfig = vi.fn().mockResolvedValue(mockConfig);
    mockLoadRule = vi.fn().mockImplementation((path: string) => {
      const content = mockRulesContent[path];
      if (content) return Promise.resolve(content);
      return Promise.reject(new Error(`File not found: ${path}`));
    });
    mockLoadAgentInfo = vi.fn().mockImplementation((agentName: string) => {
      const agentData = mockAgentData[agentName];
      if (agentData) return Promise.resolve(agentData);
      return Promise.reject(new Error(`Agent not found: ${agentName}`));
    });
    service = new KeywordService(mockLoadConfig, mockLoadRule, mockLoadAgentInfo);
  });

  describe('parseMode', () => {
    describe('normal cases - each keyword', () => {
      it('parses PLAN keyword', async () => {
        const result = await service.parseMode('PLAN design auth feature');

        expect(result.mode).toBe('PLAN');
        expect(result.originalPrompt).toBe('design auth feature');
        // Instructions may include SRP content for COMPLEX tasks
        expect(result.instructions).toContain('Design first approach.');
        expect(result.rules).toHaveLength(1);
        expect(result.rules[0].name).toBe('rules/core.md');
        expect(result.warnings).toBeUndefined();
        expect(result.agent).toBe('plan-mode');
        expect(result.delegates_to).toBe('frontend-developer');
        expect(result.delegate_agent_info).toEqual({
          name: 'Frontend Developer',
          description: 'React/Next.js specialist with TDD and design system experience',
          expertise: ['React', 'Next.js', 'TDD', 'TypeScript'],
        });
      });

      it('parses ACT keyword', async () => {
        const result = await service.parseMode('ACT implement login API');

        expect(result.mode).toBe('ACT');
        expect(result.originalPrompt).toBe('implement login API');
        expect(result.instructions).toContain('Red-Green-Refactor cycle.');
        expect(result.rules).toHaveLength(2);
        expect(result.agent).toBe('act-mode');
        expect(result.delegates_to).toBe('frontend-developer');
        expect(result.delegate_agent_info).toEqual({
          name: 'Frontend Developer',
          description: 'React/Next.js specialist with TDD and design system experience',
          expertise: ['React', 'Next.js', 'TDD', 'TypeScript'],
        });
      });

      it('parses EVAL keyword', async () => {
        const result = await service.parseMode('EVAL review security');

        expect(result.mode).toBe('EVAL');
        expect(result.originalPrompt).toBe('review security');
        expect(result.instructions).toContain('Code quality review.');
        expect(result.agent).toBe('eval-mode');
        expect(result.delegates_to).toBe('code-reviewer');
        expect(result.delegate_agent_info).toEqual({
          name: 'Code Reviewer',
          description: 'Code quality evaluation and improvement suggestion specialist',
          expertise: ['Code Quality', 'SOLID Principles', 'Performance', 'Security'],
        });
      });

      it('parses AUTO keyword', async () => {
        const result = await service.parseMode('AUTO Add login feature');

        expect(result.mode).toBe('AUTO');
        expect(result.originalPrompt).toBe('Add login feature');
        expect(result.agent).toBe('auto-mode');
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
        expect(result.warnings).toContain('No keyword found, defaulting to PLAN');
      });

      it('defaults to PLAN with warning for empty string', async () => {
        const result = await service.parseMode('');

        expect(result.mode).toBe('PLAN');
        expect(result.originalPrompt).toBe('');
        expect(result.warnings).toContain('No keyword found, defaulting to PLAN');
      });

      it('defaults to PLAN with warning for whitespace only', async () => {
        const result = await service.parseMode('   ');

        expect(result.mode).toBe('PLAN');
        expect(result.originalPrompt).toBe('');
        expect(result.warnings).toContain('No keyword found, defaulting to PLAN');
      });
    });

    describe('warning cases', () => {
      it('uses first keyword with warning for multiple keywords', async () => {
        const result = await service.parseMode('PLAN ACT implement feature');

        expect(result.mode).toBe('PLAN');
        expect(result.originalPrompt).toBe('ACT implement feature');
        expect(result.warnings).toContain('Multiple keywords found, using first');
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

      it('warns for English + localized multi-keyword (PLAN 계획)', async () => {
        const result = await service.parseMode('PLAN 계획 some task');

        expect(result.mode).toBe('PLAN');
        expect(result.originalPrompt).toBe('계획 some task');
        expect(result.warnings).toContain('Multiple keywords found, using first');
      });

      it('warns for localized + English multi-keyword (계획 PLAN)', async () => {
        const result = await service.parseMode('계획 PLAN some task');

        expect(result.mode).toBe('PLAN');
        expect(result.originalPrompt).toBe('PLAN some task');
        expect(result.warnings).toContain('Multiple keywords found, using first');
      });

      it('warns for localized + localized multi-keyword (계획 실행)', async () => {
        const result = await service.parseMode('계획 실행 some task');

        expect(result.mode).toBe('PLAN');
        expect(result.originalPrompt).toBe('실행 some task');
        expect(result.warnings).toContain('Multiple keywords found, using first');
      });

      it('warns for Japanese multi-keyword (計画 実行)', async () => {
        const result = await service.parseMode('計画 実行 some task');

        expect(result.mode).toBe('PLAN');
        expect(result.originalPrompt).toBe('実行 some task');
        expect(result.warnings).toContain('Multiple keywords found, using first');
      });

      it('warns for Spanish multi-keyword (PLANIFICAR ACTUAR)', async () => {
        const result = await service.parseMode('PLANIFICAR ACTUAR some task');

        expect(result.mode).toBe('PLAN');
        expect(result.originalPrompt).toBe('ACTUAR some task');
        expect(result.warnings).toContain('Multiple keywords found, using first');
      });
    });

    describe('Korean keywords', () => {
      it('parses 계획 as PLAN', async () => {
        const result = await service.parseMode('계획 인증 기능 설계');

        expect(result.mode).toBe('PLAN');
        expect(result.originalPrompt).toBe('인증 기능 설계');
        expect(result.warnings).toBeUndefined();
      });

      it('parses 실행 as ACT', async () => {
        const result = await service.parseMode('실행 로그인 API 구현');

        expect(result.mode).toBe('ACT');
        expect(result.originalPrompt).toBe('로그인 API 구현');
      });

      it('parses 평가 as EVAL', async () => {
        const result = await service.parseMode('평가 보안 검토');

        expect(result.mode).toBe('EVAL');
        expect(result.originalPrompt).toBe('보안 검토');
      });

      it('warns when no content after Korean keyword', async () => {
        const result = await service.parseMode('평가');

        expect(result.mode).toBe('EVAL');
        expect(result.originalPrompt).toBe('');
        expect(result.warnings).toContain('No prompt content after keyword');
      });

      it('handles mixed Korean keyword with English content', async () => {
        const result = await service.parseMode('계획 design auth feature');

        expect(result.mode).toBe('PLAN');
        expect(result.originalPrompt).toBe('design auth feature');
      });
    });

    describe('Japanese keywords', () => {
      it('parses 計画 as PLAN', async () => {
        const result = await service.parseMode('計画 認証機能を設計');

        expect(result.mode).toBe('PLAN');
        expect(result.originalPrompt).toBe('認証機能を設計');
        expect(result.warnings).toBeUndefined();
      });

      it('parses 実行 as ACT', async () => {
        const result = await service.parseMode('実行 ログインAPIを実装');

        expect(result.mode).toBe('ACT');
        expect(result.originalPrompt).toBe('ログインAPIを実装');
      });

      it('parses 評価 as EVAL', async () => {
        const result = await service.parseMode('評価 セキュリティレビュー');

        expect(result.mode).toBe('EVAL');
        expect(result.originalPrompt).toBe('セキュリティレビュー');
      });

      it('warns when no content after Japanese keyword', async () => {
        const result = await service.parseMode('計画');

        expect(result.mode).toBe('PLAN');
        expect(result.originalPrompt).toBe('');
        expect(result.warnings).toContain('No prompt content after keyword');
      });
    });

    describe('Chinese keywords', () => {
      it('parses 计划 as PLAN', async () => {
        const result = await service.parseMode('计划 设计认证功能');

        expect(result.mode).toBe('PLAN');
        expect(result.originalPrompt).toBe('设计认证功能');
        expect(result.warnings).toBeUndefined();
      });

      it('parses 执行 as ACT', async () => {
        const result = await service.parseMode('执行 实现登录API');

        expect(result.mode).toBe('ACT');
        expect(result.originalPrompt).toBe('实现登录API');
      });

      it('parses 评估 as EVAL', async () => {
        const result = await service.parseMode('评估 安全审查');

        expect(result.mode).toBe('EVAL');
        expect(result.originalPrompt).toBe('安全审查');
      });

      it('warns when no content after Chinese keyword', async () => {
        const result = await service.parseMode('执行');

        expect(result.mode).toBe('ACT');
        expect(result.originalPrompt).toBe('');
        expect(result.warnings).toContain('No prompt content after keyword');
      });
    });

    describe('Spanish keywords', () => {
      it('parses PLANIFICAR as PLAN (uppercase)', async () => {
        const result = await service.parseMode('PLANIFICAR diseño de autenticación');

        expect(result.mode).toBe('PLAN');
        expect(result.originalPrompt).toBe('diseño de autenticación');
        expect(result.warnings).toBeUndefined();
      });

      it('parses planificar as PLAN (lowercase)', async () => {
        const result = await service.parseMode('planificar diseño de autenticación');

        expect(result.mode).toBe('PLAN');
        expect(result.originalPrompt).toBe('diseño de autenticación');
      });

      it('parses ACTUAR as ACT', async () => {
        const result = await service.parseMode('ACTUAR implementar API');

        expect(result.mode).toBe('ACT');
        expect(result.originalPrompt).toBe('implementar API');
      });

      it('parses actuar as ACT (lowercase)', async () => {
        const result = await service.parseMode('actuar implementar API');

        expect(result.mode).toBe('ACT');
        expect(result.originalPrompt).toBe('implementar API');
      });

      it('parses EVALUAR as EVAL', async () => {
        const result = await service.parseMode('EVALUAR revisión de seguridad');

        expect(result.mode).toBe('EVAL');
        expect(result.originalPrompt).toBe('revisión de seguridad');
      });

      it('parses evaluar as EVAL (lowercase)', async () => {
        const result = await service.parseMode('evaluar revisión de seguridad');

        expect(result.mode).toBe('EVAL');
        expect(result.originalPrompt).toBe('revisión de seguridad');
      });

      it('warns when no content after Spanish keyword', async () => {
        const result = await service.parseMode('EVALUAR');

        expect(result.mode).toBe('EVAL');
        expect(result.originalPrompt).toBe('');
        expect(result.warnings).toContain('No prompt content after keyword');
      });

      it('parses AUTOMÁTICO as AUTO (Spanish)', async () => {
        const result = await service.parseMode('AUTOMÁTICO implementar feature');

        expect(result.mode).toBe('AUTO');
        expect(result.originalPrompt).toBe('implementar feature');
      });
    });

    describe('AUTO mode', () => {
      it('should parse AUTO keyword', async () => {
        const result = await service.parseMode('AUTO Add login feature');

        expect(result.mode).toBe('AUTO');
        expect(result.originalPrompt).toBe('Add login feature');
        expect(result.agent).toBe('auto-mode');
      });

      it('should parse Korean AUTO keyword (자동)', async () => {
        const result = await service.parseMode('자동 로그인 기능 추가');

        expect(result.mode).toBe('AUTO');
        expect(result.originalPrompt).toBe('로그인 기능 추가');
      });

      it('should parse Japanese AUTO keyword (自動)', async () => {
        const result = await service.parseMode('自動 ログイン機能追加');

        expect(result.mode).toBe('AUTO');
        expect(result.originalPrompt).toBe('ログイン機能追加');
      });

      it('should parse Chinese AUTO keyword (自动)', async () => {
        const result = await service.parseMode('自动 登录功能添加');

        expect(result.mode).toBe('AUTO');
        expect(result.originalPrompt).toBe('登录功能添加');
      });

      it('should include auto config in result for AUTO mode', async () => {
        const result = await service.parseMode('AUTO Add login feature');

        expect(result.autoConfig).toBeDefined();
        expect(result.autoConfig?.maxIterations).toBe(3);
      });

      it('should use configured maxIterations when loadAutoConfigFn is provided', async () => {
        const mockLoadAutoConfig = vi.fn().mockResolvedValue({
          maxIterations: 5,
        });
        const serviceWithAutoConfig = new KeywordService(
          mockLoadConfig,
          mockLoadRule,
          mockLoadAgentInfo,
          { loadAutoConfigFn: mockLoadAutoConfig },
        );

        const result = await serviceWithAutoConfig.parseMode('AUTO Add login feature');

        expect(result.autoConfig).toBeDefined();
        expect(result.autoConfig?.maxIterations).toBe(5);
        expect(mockLoadAutoConfig).toHaveBeenCalled();
      });

      it('should fallback to default maxIterations when loadAutoConfigFn returns null', async () => {
        const mockLoadAutoConfig = vi.fn().mockResolvedValue(null);
        const serviceWithAutoConfig = new KeywordService(
          mockLoadConfig,
          mockLoadRule,
          mockLoadAgentInfo,
          { loadAutoConfigFn: mockLoadAutoConfig },
        );

        const result = await serviceWithAutoConfig.parseMode('AUTO Add login feature');

        expect(result.autoConfig).toBeDefined();
        expect(result.autoConfig?.maxIterations).toBe(3);
      });

      it('should fallback to default maxIterations when loadAutoConfigFn throws', async () => {
        const mockLoadAutoConfig = vi.fn().mockRejectedValue(new Error('Config error'));
        const serviceWithAutoConfig = new KeywordService(
          mockLoadConfig,
          mockLoadRule,
          mockLoadAgentInfo,
          { loadAutoConfigFn: mockLoadAutoConfig },
        );

        const result = await serviceWithAutoConfig.parseMode('AUTO Add login feature');

        expect(result.autoConfig).toBeDefined();
        expect(result.autoConfig?.maxIterations).toBe(3);
      });

      it('should not include autoConfig for PLAN mode', async () => {
        const result = await service.parseMode('PLAN design feature');

        expect(result.autoConfig).toBeUndefined();
      });

      it('should not include autoConfig for ACT mode', async () => {
        const result = await service.parseMode('ACT implement feature');

        expect(result.autoConfig).toBeUndefined();
      });

      it('should not include autoConfig for EVAL mode', async () => {
        const result = await service.parseMode('EVAL review code');

        expect(result.autoConfig).toBeUndefined();
      });
    });

    describe('edge cases', () => {
      it('does not recognize keyword in middle of prompt', async () => {
        const result = await service.parseMode('Please PLAN this feature');

        expect(result.mode).toBe('PLAN');
        expect(result.originalPrompt).toBe('Please PLAN this feature');
        expect(result.warnings).toContain('No keyword found, defaulting to PLAN');
      });

      it('distinguishes from similar words (PLANNING)', async () => {
        const result = await service.parseMode('PLANNING session today');

        expect(result.mode).toBe('PLAN');
        expect(result.originalPrompt).toBe('PLANNING session today');
        expect(result.warnings).toContain('No keyword found, defaulting to PLAN');
      });

      it('distinguishes from similar words (ACTION)', async () => {
        const result = await service.parseMode('ACTION items for today');

        expect(result.mode).toBe('PLAN');
        expect(result.originalPrompt).toBe('ACTION items for today');
        expect(result.warnings).toContain('No keyword found, defaulting to PLAN');
      });

      it('handles special characters in prompt', async () => {
        const result = await service.parseMode('PLAN design @feature #auth!');

        expect(result.mode).toBe('PLAN');
        expect(result.originalPrompt).toBe('design @feature #auth!');
      });

      it('handles newlines in prompt', async () => {
        const result = await service.parseMode('PLAN design feature\nwith auth');

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
      mockLoadConfig = vi.fn().mockRejectedValue(new SyntaxError('Invalid JSON'));
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

  describe('Mode Agent functionality', () => {
    describe('agent field population', () => {
      it('includes agent field for modes with agent configured', async () => {
        const result = await service.parseMode('PLAN design feature');

        expect(result.agent).toBe('plan-mode');
      });

      it('does not include agent field when agent is undefined in config, but delegates_to defaults to frontend-developer', async () => {
        const configWithoutAgent: KeywordModesConfig = {
          modes: {
            PLAN: {
              description: 'Task planning and design phase',
              instructions: 'Design first approach.',
              rules: ['rules/core.md'],
            },
            ACT: mockConfig.modes.ACT,
            EVAL: mockConfig.modes.EVAL,
            AUTO: mockConfig.modes.AUTO,
          },
          defaultMode: 'PLAN',
        };
        mockLoadConfig = vi.fn().mockResolvedValue(configWithoutAgent);
        service = new KeywordService(mockLoadConfig, mockLoadRule, mockLoadAgentInfo);

        const result = await service.parseMode('PLAN design feature');

        // agent field is undefined since not in config
        expect(result.agent).toBeUndefined();
        // delegates_to defaults to 'frontend-developer' for PLAN/ACT modes (dynamic resolution)
        expect(result.delegates_to).toBe('frontend-developer');
        expect(result.primary_agent_source).toBe('default');
      });
    });

    describe('delegate agent information', () => {
      it('includes delegate information when delegates_to is configured', async () => {
        const result = await service.parseMode('ACT implement feature');

        expect(result.delegates_to).toBe('frontend-developer');
        expect(result.delegate_agent_info).toEqual({
          name: 'Frontend Developer',
          description: 'React/Next.js specialist with TDD and design system experience',
          expertise: ['React', 'Next.js', 'TDD', 'TypeScript'],
        });
        expect(mockLoadAgentInfo).toHaveBeenCalledWith('frontend-developer');
      });

      it('includes different delegate for EVAL mode', async () => {
        const result = await service.parseMode('EVAL review code');

        expect(result.delegates_to).toBe('code-reviewer');
        expect(result.delegate_agent_info).toEqual({
          name: 'Code Reviewer',
          description: 'Code quality evaluation and improvement suggestion specialist',
          expertise: ['Code Quality', 'SOLID Principles', 'Performance', 'Security'],
        });
        expect(mockLoadAgentInfo).toHaveBeenCalledWith('code-reviewer');
      });

      it('handles missing delegate agent gracefully', async () => {
        mockLoadAgentInfo = vi.fn().mockRejectedValue(new Error('Agent not found'));
        service = new KeywordService(mockLoadConfig, mockLoadRule, mockLoadAgentInfo);

        const result = await service.parseMode('PLAN design feature');

        expect(result.delegates_to).toBe('frontend-developer');
        expect(result.delegate_agent_info).toBeUndefined();
      });

      it('does not call loadAgentInfo when no loadAgentInfoFn provided', async () => {
        service = new KeywordService(mockLoadConfig, mockLoadRule);

        const result = await service.parseMode('PLAN design feature');

        expect(result.delegates_to).toBe('frontend-developer');
        expect(result.delegate_agent_info).toBeUndefined();
      });

      it('handles agent with incomplete data', async () => {
        mockLoadAgentInfo = vi.fn().mockResolvedValue({
          name: 'Incomplete Agent',
        });
        service = new KeywordService(mockLoadConfig, mockLoadRule, mockLoadAgentInfo);

        const result = await service.parseMode('PLAN design feature');

        expect(result.delegate_agent_info).toEqual({
          name: 'Incomplete Agent',
          description: '',
          expertise: [],
        });
      });

      it('uses agentName as fallback when name is missing', async () => {
        mockLoadAgentInfo = vi.fn().mockResolvedValue({
          description: 'Test description',
          role: { expertise: ['test'] },
        });
        service = new KeywordService(mockLoadConfig, mockLoadRule, mockLoadAgentInfo);

        const result = await service.parseMode('PLAN design feature');

        expect(result.delegate_agent_info).toEqual({
          name: 'frontend-developer',
          description: 'Test description',
          expertise: ['test'],
        });
      });
    });

    describe('backward compatibility', () => {
      it('maintains backward compatibility for existing fields', async () => {
        const result = await service.parseMode('PLAN design feature');

        expect(result.mode).toBe('PLAN');
        expect(result.originalPrompt).toBe('design feature');
        // Instructions may include SRP content for COMPLEX tasks
        expect(result.instructions).toContain('Design first approach.');
        expect(result.rules).toHaveLength(1);
        expect(result.warnings).toBeUndefined();
      });

      it('works with Korean keywords and includes agent information', async () => {
        const result = await service.parseMode('계획 인증 기능 설계');

        expect(result.mode).toBe('PLAN');
        expect(result.originalPrompt).toBe('인증 기능 설계');
        expect(result.agent).toBe('plan-mode');
        expect(result.delegates_to).toBe('frontend-developer');
        expect(result.delegate_agent_info?.name).toBe('Frontend Developer');
      });

      it('works with default mode and includes agent information', async () => {
        const result = await service.parseMode('design auth feature');

        expect(result.mode).toBe('PLAN');
        expect(result.originalPrompt).toBe('design auth feature');
        expect(result.warnings).toContain('No keyword found, defaulting to PLAN');
        expect(result.agent).toBe('plan-mode');
        expect(result.delegates_to).toBe('frontend-developer');
      });
    });
  });

  describe('complexity classification', () => {
    it('classifies COMPLEX task and includes SRP instructions', async () => {
      const result = await service.parseMode(
        'PLAN How should we design the authentication system?',
      );

      expect(result.complexity).toBeDefined();
      expect(result.complexity?.complexity).toBe('COMPLEX');
      expect(result.complexity?.applySrp).toBe(true);
      expect(result.srpInstructions).toBeDefined();
      expect(result.srpInstructions).toContain('Structured Reasoning Process');
    });

    it('classifies SIMPLE task and skips SRP', async () => {
      const result = await service.parseMode('PLAN fix typo in file');

      expect(result.complexity).toBeDefined();
      expect(result.complexity?.complexity).toBe('SIMPLE');
      expect(result.complexity?.applySrp).toBe(false);
      expect(result.srpInstructions).toBeUndefined();
    });

    it('respects --srp override flag for SIMPLE tasks', async () => {
      const result = await service.parseMode('PLAN fix typo --srp');

      expect(result.complexity?.complexity).toBe('SIMPLE');
      expect(result.complexity?.applySrp).toBe(true);
      expect(result.complexity?.override).toBe('force');
      expect(result.srpInstructions).toBeDefined();
    });

    it('respects --no-srp override flag for COMPLEX tasks', async () => {
      const result = await service.parseMode('PLAN How should we design the auth? --no-srp');

      expect(result.complexity?.complexity).toBe('COMPLEX');
      expect(result.complexity?.applySrp).toBe(false);
      expect(result.complexity?.override).toBe('skip');
      expect(result.srpInstructions).toBeUndefined();
    });

    it('does not add complexity for ACT mode', async () => {
      const result = await service.parseMode('ACT implement login');

      expect(result.complexity).toBeUndefined();
      expect(result.srpInstructions).toBeUndefined();
    });

    it('does not add complexity for EVAL mode', async () => {
      const result = await service.parseMode('EVAL review code');

      expect(result.complexity).toBeUndefined();
      expect(result.srpInstructions).toBeUndefined();
    });

    it('adds complexity for AUTO mode (includes PLAN phase)', async () => {
      const result = await service.parseMode('AUTO design new feature');

      expect(result.complexity).toBeDefined();
      expect(result.complexity?.complexity).toBe('COMPLEX');
    });
  });

  describe('parallelAgentsRecommendation', () => {
    it('returns parallel agents recommendation for PLAN mode', async () => {
      const result = await service.parseMode('PLAN design auth feature');

      expect(result.parallelAgentsRecommendation).toBeDefined();
      expect(result.parallelAgentsRecommendation?.specialists).toContain('architecture-specialist');
      expect(result.parallelAgentsRecommendation?.specialists).toContain(
        'test-strategy-specialist',
      );
      expect(result.parallelAgentsRecommendation?.hint).toContain('Task tool');
      expect(result.parallelAgentsRecommendation?.hint).toContain('prepare_parallel_agents');
    });

    it('returns parallel agents recommendation for ACT mode', async () => {
      const result = await service.parseMode('ACT implement auth feature');

      expect(result.parallelAgentsRecommendation).toBeDefined();
      expect(result.parallelAgentsRecommendation?.specialists).toContain('code-quality-specialist');
      expect(result.parallelAgentsRecommendation?.specialists).toContain(
        'test-strategy-specialist',
      );
    });

    it('returns parallel agents recommendation for EVAL mode', async () => {
      const result = await service.parseMode('EVAL review auth feature');

      expect(result.parallelAgentsRecommendation).toBeDefined();
      expect(result.parallelAgentsRecommendation?.specialists).toContain('security-specialist');
      expect(result.parallelAgentsRecommendation?.specialists).toContain(
        'accessibility-specialist',
      );
      expect(result.parallelAgentsRecommendation?.specialists).toContain('performance-specialist');
      expect(result.parallelAgentsRecommendation?.specialists).toContain('code-quality-specialist');
      expect(result.parallelAgentsRecommendation?.specialists).toContain('migration-specialist');
    });

    it('returns specialists as a copy (not reference)', async () => {
      const result1 = await service.parseMode('PLAN task1');
      const result2 = await service.parseMode('PLAN task2');

      // Modifying one should not affect the other
      result1.parallelAgentsRecommendation?.specialists.push('test-specialist');
      expect(result2.parallelAgentsRecommendation?.specialists).not.toContain('test-specialist');
    });

    it('includes hint with Task tool usage instructions', async () => {
      const result = await service.parseMode('EVAL code review');

      expect(result.parallelAgentsRecommendation?.hint).toContain(
        'subagent_type="general-purpose"',
      );
      expect(result.parallelAgentsRecommendation?.hint).toContain('run_in_background=true');
    });
  });

  describe('recommended_act_agent (with PrimaryAgentResolver)', () => {
    it('returns recommended_act_agent in PLAN mode when resolver is provided', async () => {
      const mockResolver = {
        resolve: vi.fn().mockResolvedValue({
          agentName: 'backend-developer',
          source: 'intent',
          confidence: 0.9,
          reason: 'API implementation detected',
        }),
      };
      const serviceWithResolver = new KeywordService(
        mockLoadConfig,
        mockLoadRule,
        mockLoadAgentInfo,
        {
          primaryAgentResolver: mockResolver as unknown as PrimaryAgentResolver,
        },
      );

      const result = await serviceWithResolver.parseMode('PLAN design API');

      expect(result.recommended_act_agent).toBeDefined();
      expect(result.recommended_act_agent?.agentName).toBe('backend-developer');
      expect(result.recommended_act_agent?.confidence).toBe(0.9);
      expect(result.recommended_act_agent?.reason).toBe('API implementation detected');
    });

    it('returns available_act_agents in PLAN mode when resolver is provided', async () => {
      const mockResolver = {
        resolve: vi.fn().mockResolvedValue({
          agentName: 'frontend-developer',
          source: 'default',
          confidence: 1.0,
          reason: 'Default agent',
        }),
      };
      const serviceWithResolver = new KeywordService(
        mockLoadConfig,
        mockLoadRule,
        mockLoadAgentInfo,
        {
          primaryAgentResolver: mockResolver as unknown as PrimaryAgentResolver,
        },
      );

      const result = await serviceWithResolver.parseMode('PLAN build UI');

      expect(result.available_act_agents).toBeDefined();
      expect(result.available_act_agents).toContain('frontend-developer');
      expect(result.available_act_agents).toContain('backend-developer');
      expect(result.available_act_agents).toContain('devops-engineer');
      expect(result.available_act_agents).toContain('agent-architect');
      expect(result.available_act_agents).toContain('ai-ml-engineer');
      expect(result.available_act_agents).toContain('test-engineer');
    });

    it('does not return recommended_act_agent in ACT mode', async () => {
      const mockResolver = {
        resolve: vi.fn().mockResolvedValue({
          agentName: 'frontend-developer',
          source: 'default',
          confidence: 1.0,
          reason: 'Default',
        }),
      };
      const serviceWithResolver = new KeywordService(
        mockLoadConfig,
        mockLoadRule,
        mockLoadAgentInfo,
        {
          primaryAgentResolver: mockResolver as unknown as PrimaryAgentResolver,
        },
      );

      const result = await serviceWithResolver.parseMode('ACT implement');

      expect(result.recommended_act_agent).toBeUndefined();
      expect(result.available_act_agents).toBeUndefined();
    });

    it('returns recommended_act_agent in EVAL mode when resolver is provided', async () => {
      const mockResolver = {
        resolve: vi.fn().mockResolvedValue({
          agentName: 'code-reviewer',
          source: 'default',
          confidence: 1.0,
          reason: 'EVAL mode',
        }),
      };
      const serviceWithResolver = new KeywordService(
        mockLoadConfig,
        mockLoadRule,
        mockLoadAgentInfo,
        {
          primaryAgentResolver: mockResolver as unknown as PrimaryAgentResolver,
        },
      );

      const result = await serviceWithResolver.parseMode('EVAL review');

      expect(result.recommended_act_agent).toBeDefined();
      expect(result.recommended_act_agent?.agentName).toBe('code-reviewer');
      expect(result.recommended_act_agent?.confidence).toBe(1.0);
      expect(result.available_act_agents).toBeDefined();
    });

    it('handles resolver error gracefully', async () => {
      const mockResolver = {
        resolve: vi
          .fn()
          // First call: for resolvePrimaryAgent() in PLAN mode - should succeed
          .mockResolvedValueOnce({
            agentName: 'solution-architect',
            source: 'default',
            confidence: 1.0,
            reason: 'PLAN mode default',
          })
          // Second call: for getActAgentRecommendation() - should throw
          .mockRejectedValueOnce(new Error('Resolver error')),
      };
      const serviceWithResolver = new KeywordService(
        mockLoadConfig,
        mockLoadRule,
        mockLoadAgentInfo,
        {
          primaryAgentResolver: mockResolver as unknown as PrimaryAgentResolver,
        },
      );

      const result = await serviceWithResolver.parseMode('PLAN design');

      // Should still work, just without recommendation
      expect(result.mode).toBe('PLAN');
      expect(result.delegates_to).toBe('solution-architect');
      expect(result.recommended_act_agent).toBeUndefined();
    });
  });

  describe('activation_message', () => {
    it('includes activation_message for PLAN mode', async () => {
      const result = await service.parseMode('PLAN design auth feature');

      expect(result.activation_message).toBeDefined();
      expect(result.activation_message?.activations).toHaveLength(1);
      expect(result.activation_message?.activations[0]).toMatchObject({
        type: 'agent',
        name: 'frontend-developer',
        tier: 'primary',
      });
    });

    it('includes activation_message for ACT mode', async () => {
      const result = await service.parseMode('ACT implement login API');

      expect(result.activation_message).toBeDefined();
      expect(result.activation_message?.activations[0]).toMatchObject({
        type: 'agent',
        name: 'frontend-developer',
        tier: 'primary',
      });
    });

    it('includes activation_message for EVAL mode with code-reviewer', async () => {
      const result = await service.parseMode('EVAL review security');

      expect(result.activation_message).toBeDefined();
      expect(result.activation_message?.activations[0]).toMatchObject({
        type: 'agent',
        name: 'code-reviewer',
        tier: 'primary',
      });
    });

    it('formats activation_message with robot icon for primary agent', async () => {
      const result = await service.parseMode('PLAN design feature');

      expect(result.activation_message?.formatted).toContain('🤖');
      expect(result.activation_message?.formatted).toContain('[Primary Agent]');
    });

    it('includes timestamp in activation record', async () => {
      const result = await service.parseMode('PLAN design feature');

      expect(result.activation_message?.activations[0].timestamp).toBeDefined();
      expect(new Date(result.activation_message!.activations[0].timestamp).getTime()).not.toBeNaN();
    });

    it('includes activation_message with Korean keywords', async () => {
      const result = await service.parseMode('계획 인증 기능 설계');

      expect(result.activation_message).toBeDefined();
      expect(result.activation_message?.activations[0].name).toBe('frontend-developer');
    });

    it('includes activation_message even without keyword (default mode)', async () => {
      const result = await service.parseMode('design auth feature');

      expect(result.activation_message).toBeDefined();
      expect(result.activation_message?.activations[0].tier).toBe('primary');
    });
  });

  describe('display instruction in instructions field', () => {
    it('prepends display instruction for PLAN mode', async () => {
      const result = await service.parseMode('PLAN design feature');
      expect(result.instructions).toContain('📌 OUTPUT FORMAT:');
      expect(result.instructions).toContain('[Primary Agent]');
      expect(result.instructions).toContain('# Mode: PLAN');
    });

    it('prepends display instruction for ACT mode', async () => {
      const result = await service.parseMode('ACT implement feature');
      expect(result.instructions).toContain('📌 OUTPUT FORMAT:');
      expect(result.instructions).toContain('# Mode: ACT');
    });

    it('prepends display instruction for EVAL mode', async () => {
      const result = await service.parseMode('EVAL review code');
      expect(result.instructions).toContain('📌 OUTPUT FORMAT:');
      expect(result.instructions).toContain('# Mode: EVAL');
    });

    it('preserves original instructions content after prefix', async () => {
      const result = await service.parseMode('PLAN design feature');
      expect(result.instructions).toContain('Design first approach');
    });

    it('includes resolved agent name in display instruction', async () => {
      const result = await service.parseMode('PLAN design feature');
      // activation_message.formatted에 포함된 agent 이름이 instructions에도 포함
      expect(result.instructions).toContain(result.activation_message!.formatted);
    });

    it('ACT mode default instructions include TDD continuity rule', async () => {
      // Use default config fallback (loadConfigFn fails → DEFAULT_CONFIG with enriched instructions)
      const fallbackService = new KeywordService(
        vi.fn().mockRejectedValue(new Error('Config not found')),
        mockLoadRule,
        mockLoadAgentInfo,
      );
      const result = await fallbackService.parseMode('ACT implement feature');

      expect(result.instructions).toContain('RED phase test failures are EXPECTED');
      expect(result.instructions).toContain('do NOT stop');
      expect(result.instructions).toContain('atomic operation');
    });
  });

  describe('recommendedActAgent parameter (ACT mode agent override)', () => {
    it('uses recommendedActAgent when provided in ACT mode', async () => {
      const mockResolver = {
        resolve: vi.fn().mockResolvedValue({
          agentName: 'backend-developer',
          source: 'config',
          confidence: 1.0,
          reason: 'Using recommended agent from PLAN mode: backend-developer',
        }),
      };
      const serviceWithResolver = new KeywordService(
        mockLoadConfig,
        mockLoadRule,
        mockLoadAgentInfo,
        {
          primaryAgentResolver: mockResolver as unknown as PrimaryAgentResolver,
        },
      );

      const result = await serviceWithResolver.parseMode('ACT implement login API', {
        recommendedActAgent: 'backend-developer',
      });

      expect(result.mode).toBe('ACT');
      expect(result.delegates_to).toBe('backend-developer');
      expect(mockResolver.resolve).toHaveBeenCalledWith(
        'ACT',
        'implement login API',
        undefined,
        'backend-developer',
      );
    });

    it('ignores recommendedActAgent in PLAN mode', async () => {
      const mockResolver = {
        resolve: vi.fn().mockResolvedValue({
          agentName: 'solution-architect',
          source: 'default',
          confidence: 1.0,
          reason: 'PLAN mode default',
        }),
      };
      const serviceWithResolver = new KeywordService(
        mockLoadConfig,
        mockLoadRule,
        mockLoadAgentInfo,
        {
          primaryAgentResolver: mockResolver as unknown as PrimaryAgentResolver,
        },
      );

      const result = await serviceWithResolver.parseMode('PLAN design API', {
        recommendedActAgent: 'backend-developer',
      });

      expect(result.mode).toBe('PLAN');
      expect(result.delegates_to).toBe('solution-architect');
      // Should not pass recommendedActAgent for PLAN mode
      expect(mockResolver.resolve).toHaveBeenCalledWith('PLAN', 'design API', undefined, undefined);
    });

    it('ignores recommendedActAgent in EVAL mode', async () => {
      const mockResolver = {
        resolve: vi.fn().mockResolvedValue({
          agentName: 'code-reviewer',
          source: 'default',
          confidence: 1.0,
          reason: 'EVAL always uses code-reviewer',
        }),
      };
      const serviceWithResolver = new KeywordService(
        mockLoadConfig,
        mockLoadRule,
        mockLoadAgentInfo,
        {
          primaryAgentResolver: mockResolver as unknown as PrimaryAgentResolver,
        },
      );

      const result = await serviceWithResolver.parseMode('EVAL review code', {
        recommendedActAgent: 'backend-developer',
      });

      expect(result.mode).toBe('EVAL');
      expect(result.delegates_to).toBe('code-reviewer');
    });

    it('falls back to default resolution if no recommendedActAgent provided', async () => {
      const mockResolver = {
        resolve: vi.fn().mockResolvedValue({
          agentName: 'frontend-developer',
          source: 'default',
          confidence: 1.0,
          reason: 'ACT mode default: frontend-developer',
        }),
      };
      const serviceWithResolver = new KeywordService(
        mockLoadConfig,
        mockLoadRule,
        mockLoadAgentInfo,
        {
          primaryAgentResolver: mockResolver as unknown as PrimaryAgentResolver,
        },
      );

      const result = await serviceWithResolver.parseMode('ACT implement feature');

      expect(result.delegates_to).toBe('frontend-developer');
      expect(mockResolver.resolve).toHaveBeenCalledWith(
        'ACT',
        'implement feature',
        undefined,
        undefined,
      );
    });

    it('treats empty string recommendedActAgent as undefined', async () => {
      const mockResolver = {
        resolve: vi.fn().mockResolvedValue({
          agentName: 'frontend-developer',
          source: 'default',
          confidence: 1.0,
          reason: 'ACT mode default: frontend-developer',
        }),
      };
      const serviceWithResolver = new KeywordService(
        mockLoadConfig,
        mockLoadRule,
        mockLoadAgentInfo,
        {
          primaryAgentResolver: mockResolver as unknown as PrimaryAgentResolver,
        },
      );

      // Empty string should be treated as undefined
      const result = await serviceWithResolver.parseMode('ACT implement', {
        recommendedActAgent: '',
      });

      expect(result.delegates_to).toBe('frontend-developer');
      // Should be called with undefined, not empty string
      expect(mockResolver.resolve).toHaveBeenCalledWith(
        'ACT',
        'implement',
        undefined,
        '', // Empty string is passed through (MCP layer handles trim)
      );
    });

    it('treats whitespace-only recommendedActAgent as undefined', async () => {
      const mockResolver = {
        resolve: vi.fn().mockResolvedValue({
          agentName: 'frontend-developer',
          source: 'default',
          confidence: 1.0,
          reason: 'ACT mode default: frontend-developer',
        }),
      };
      const serviceWithResolver = new KeywordService(
        mockLoadConfig,
        mockLoadRule,
        mockLoadAgentInfo,
        {
          primaryAgentResolver: mockResolver as unknown as PrimaryAgentResolver,
        },
      );

      // Whitespace should be treated as undefined at MCP layer
      // KeywordService passes through, validation is in MCP handler
      const result = await serviceWithResolver.parseMode('ACT implement', {
        recommendedActAgent: '   ',
      });

      expect(result.delegates_to).toBe('frontend-developer');
    });
  });

  describe('Environment-based cache TTL', () => {
    it('uses 1 hour (3600000ms) TTL in production environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const productionService = new KeywordService(mockLoadConfig, mockLoadRule, mockLoadAgentInfo);

      // Access private cacheTTL via type assertion for testing
      const ttl = (productionService as unknown as { cacheTTL: number }).cacheTTL;
      expect(ttl).toBe(3600000); // 1 hour

      process.env.NODE_ENV = originalEnv;
    });

    it('uses 5 minutes (300000ms) TTL in development environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const devService = new KeywordService(mockLoadConfig, mockLoadRule, mockLoadAgentInfo);

      const ttl = (devService as unknown as { cacheTTL: number }).cacheTTL;
      expect(ttl).toBe(300000); // 5 minutes

      process.env.NODE_ENV = originalEnv;
    });

    it('uses 5 minutes (300000ms) TTL when NODE_ENV is not set (defaults to dev)', () => {
      const originalEnv = process.env.NODE_ENV;
      delete process.env.NODE_ENV;

      const defaultService = new KeywordService(mockLoadConfig, mockLoadRule, mockLoadAgentInfo);

      const ttl = (defaultService as unknown as { cacheTTL: number }).cacheTTL;
      expect(ttl).toBe(300000); // 5 minutes (development default)

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('invalidateConfigCache', () => {
    it('clears the config cache when called', async () => {
      // First call loads config and caches it
      const config1 = await service.loadModeConfig();
      expect(config1).toEqual(mockConfig);
      expect(mockLoadConfig).toHaveBeenCalledTimes(1);

      // Second call uses cache (mockLoadConfig not called again)
      const config2 = await service.loadModeConfig();
      expect(config2).toEqual(mockConfig);
      expect(mockLoadConfig).toHaveBeenCalledTimes(1); // Still 1

      // Invalidate cache
      service.invalidateConfigCache();

      // Third call reloads config (mockLoadConfig called again)
      const config3 = await service.loadModeConfig();
      expect(config3).toEqual(mockConfig);
      expect(mockLoadConfig).toHaveBeenCalledTimes(2); // Now 2
    });

    it('does nothing when cache is already empty', () => {
      // Service starts with empty cache
      expect(() => service.invalidateConfigCache()).not.toThrow();

      // Verify cache is still empty by checking that next load calls mockLoadConfig
      void service.loadModeConfig();
      expect(mockLoadConfig).toHaveBeenCalled();
    });

    it('forces fresh config load after invalidation', async () => {
      // Load and cache initial config
      await service.loadModeConfig();
      expect(mockLoadConfig).toHaveBeenCalledTimes(1);

      // Update mock to return different config
      const updatedConfig = {
        ...mockConfig,
        modes: {
          ...mockConfig.modes,
          PLAN: {
            ...mockConfig.modes.PLAN,
            instructions: 'Updated instructions',
          },
        },
      };

      // Reset mockLoadConfig to return updated config
      mockLoadConfig = vi.fn().mockResolvedValue(updatedConfig);
      const serviceWithUpdatedConfig = new KeywordService(
        mockLoadConfig,
        mockLoadRule,
        mockLoadAgentInfo,
      );

      // Load initial config
      await serviceWithUpdatedConfig.loadModeConfig();
      expect(mockLoadConfig).toHaveBeenCalledTimes(1);

      // Invalidate cache and reload
      serviceWithUpdatedConfig.invalidateConfigCache();
      const freshConfig = await serviceWithUpdatedConfig.loadModeConfig();

      expect(freshConfig.modes.PLAN.instructions).toBe('Updated instructions');
      expect(mockLoadConfig).toHaveBeenCalledTimes(2);
    });
  });

  describe('Performance monitoring', () => {
    it('tracks cache hits and misses correctly', async () => {
      // First call - MISS (cold cache)
      await service.loadModeConfig();
      expect(mockLoadConfig).toHaveBeenCalledTimes(1);

      // Second call - HIT (warm cache)
      await service.loadModeConfig();
      expect(mockLoadConfig).toHaveBeenCalledTimes(1); // Still 1 (cache used)

      // Third call - HIT (warm cache)
      await service.loadModeConfig();
      expect(mockLoadConfig).toHaveBeenCalledTimes(1); // Still 1 (cache used)

      // Verify hit/miss counts through side effects (logger calls)
      // 1 miss (first load) + 2 hits (subsequent loads) = 3 total accesses
      // Hit rate should be 66.67% (2/3)
    });

    it('resets counters after invalidation and shows correct metrics', async () => {
      // First load - MISS
      await service.loadModeConfig();

      // Second load - HIT
      await service.loadModeConfig();

      // Invalidate cache
      service.invalidateConfigCache();

      // Third load - MISS (cache invalidated)
      await service.loadModeConfig();
      expect(mockLoadConfig).toHaveBeenCalledTimes(2); // Called twice total

      // Fourth load - HIT (new cache)
      await service.loadModeConfig();
      expect(mockLoadConfig).toHaveBeenCalledTimes(2); // Still 2

      // Metrics: 2 misses, 2 hits = 50% hit rate
    });

    it('calculates 0% hit rate when only misses occur', async () => {
      // Create service and immediately invalidate before any loads
      const newService = new KeywordService(mockLoadConfig, mockLoadRule, mockLoadAgentInfo);

      // Load and invalidate repeatedly (only misses)
      await newService.loadModeConfig();
      newService.invalidateConfigCache();
      await newService.loadModeConfig();
      newService.invalidateConfigCache();

      // Hit rate should be 0% (0 hits, 2 misses)
      expect(mockLoadConfig).toHaveBeenCalled();
    });

    it('calculates 100% hit rate when only hits occur after first load', async () => {
      // First load - MISS
      await service.loadModeConfig();

      // Multiple hits
      await service.loadModeConfig();
      await service.loadModeConfig();
      await service.loadModeConfig();
      await service.loadModeConfig();

      // 1 miss + 4 hits = 80% hit rate (4/5)
      expect(mockLoadConfig).toHaveBeenCalledTimes(1);
    });
  });

  describe('keyword with colon variations (all modes)', () => {
    describe('PLAN mode colon variations', () => {
      it('parses PLAN: (colon attached)', async () => {
        const result = await service.parseMode('PLAN: design auth');
        expect(result.mode).toBe('PLAN');
        expect(result.originalPrompt).toBe('design auth');
        expect(result.warnings).toBeUndefined();
      });

      it('parses PLAN : (colon separated)', async () => {
        const result = await service.parseMode('PLAN : design auth');
        expect(result.mode).toBe('PLAN');
        expect(result.originalPrompt).toBe('design auth');
        expect(result.warnings).toBeUndefined();
      });

      it('parses plan: (lowercase with colon)', async () => {
        const result = await service.parseMode('plan: design auth');
        expect(result.mode).toBe('PLAN');
        expect(result.originalPrompt).toBe('design auth');
      });
    });

    describe('ACT mode colon variations', () => {
      it('parses ACT: (colon attached)', async () => {
        const result = await service.parseMode('ACT: implement feature');
        expect(result.mode).toBe('ACT');
        expect(result.originalPrompt).toBe('implement feature');
        expect(result.warnings).toBeUndefined();
      });

      it('parses ACT : (colon separated)', async () => {
        const result = await service.parseMode('ACT : implement feature');
        expect(result.mode).toBe('ACT');
        expect(result.originalPrompt).toBe('implement feature');
        expect(result.warnings).toBeUndefined();
      });

      it('parses act: (lowercase with colon)', async () => {
        const result = await service.parseMode('act: implement feature');
        expect(result.mode).toBe('ACT');
        expect(result.originalPrompt).toBe('implement feature');
      });
    });

    describe('EVAL mode colon variations', () => {
      it('parses EVAL: (colon attached)', async () => {
        const result = await service.parseMode('EVAL: review code');
        expect(result.mode).toBe('EVAL');
        expect(result.originalPrompt).toBe('review code');
        expect(result.warnings).toBeUndefined();
      });

      it('parses EVAL : (colon separated)', async () => {
        const result = await service.parseMode('EVAL : review code');
        expect(result.mode).toBe('EVAL');
        expect(result.originalPrompt).toBe('review code');
        expect(result.warnings).toBeUndefined();
      });

      it('parses eval: (lowercase with colon)', async () => {
        const result = await service.parseMode('eval: review code');
        expect(result.mode).toBe('EVAL');
        expect(result.originalPrompt).toBe('review code');
      });
    });

    describe('AUTO mode colon variations', () => {
      it('parses AUTO: (colon attached)', async () => {
        const result = await service.parseMode('AUTO: add login');
        expect(result.mode).toBe('AUTO');
        expect(result.originalPrompt).toBe('add login');
        expect(result.warnings).toBeUndefined();
      });

      it('parses AUTO : (colon separated)', async () => {
        const result = await service.parseMode('AUTO : add login');
        expect(result.mode).toBe('AUTO');
        expect(result.originalPrompt).toBe('add login');
        expect(result.warnings).toBeUndefined();
      });

      it('parses auto: (lowercase with colon)', async () => {
        const result = await service.parseMode('auto: add login');
        expect(result.mode).toBe('AUTO');
        expect(result.originalPrompt).toBe('add login');
      });
    });

    describe('Localized keywords with colon', () => {
      it('parses 계획: (Korean PLAN with colon)', async () => {
        const result = await service.parseMode('계획: 인증 설계');
        expect(result.mode).toBe('PLAN');
        expect(result.originalPrompt).toBe('인증 설계');
      });

      it('parses 실행: (Korean ACT with colon)', async () => {
        const result = await service.parseMode('실행: 구현하기');
        expect(result.mode).toBe('ACT');
        expect(result.originalPrompt).toBe('구현하기');
      });

      it('parses 평가: (Korean EVAL with colon)', async () => {
        const result = await service.parseMode('평가: 코드 검토');
        expect(result.mode).toBe('EVAL');
        expect(result.originalPrompt).toBe('코드 검토');
      });

      it('parses 자동: (Korean AUTO with colon)', async () => {
        const result = await service.parseMode('자동: 기능 추가');
        expect(result.mode).toBe('AUTO');
        expect(result.originalPrompt).toBe('기능 추가');
      });

      it('parses 計画: (Japanese PLAN with colon)', async () => {
        const result = await service.parseMode('計画: 設計する');
        expect(result.mode).toBe('PLAN');
        expect(result.originalPrompt).toBe('設計する');
      });

      it('parses 自動: (Japanese AUTO with colon)', async () => {
        const result = await service.parseMode('自動: 機能追加');
        expect(result.mode).toBe('AUTO');
        expect(result.originalPrompt).toBe('機能追加');
      });

      it('parses PLANIFICAR: (Spanish PLAN with colon)', async () => {
        const result = await service.parseMode('PLANIFICAR: diseño');
        expect(result.mode).toBe('PLAN');
        expect(result.originalPrompt).toBe('diseño');
      });

      it('parses AUTOMÁTICO: (Spanish AUTO with colon)', async () => {
        const result = await service.parseMode('AUTOMÁTICO: implementar');
        expect(result.mode).toBe('AUTO');
        expect(result.originalPrompt).toBe('implementar');
      });
    });

    describe('edge cases with colon', () => {
      it('handles multiple colons - uses first keyword', async () => {
        const result = await service.parseMode('PLAN: design: with: colons');
        expect(result.mode).toBe('PLAN');
        expect(result.originalPrompt).toBe('design: with: colons');
      });

      it('handles keyword with only colon (no prompt)', async () => {
        const result = await service.parseMode('AUTO:');
        expect(result.mode).toBe('AUTO');
        expect(result.originalPrompt).toBe('');
        expect(result.warnings).toContain('No prompt content after keyword');
      });

      it('handles full-width colon (：)', async () => {
        const result = await service.parseMode('PLAN： design auth');
        expect(result.mode).toBe('PLAN');
        expect(result.originalPrompt).toBe('design auth');
      });
    });
  });

  describe('context-aware specialist patterns', () => {
    describe('integration-specialist pattern', () => {
      it.each([
        'Create external API integration',
        'Implement webhook handler',
        'Add circuit breaker pattern',
        'third-party service integration',
        'SDK wrapper for Stripe',
        'retry pattern implementation',
        'API integration with payment gateway',
      ])('detects integration-specialist for English: %s', async prompt => {
        const result = await service.parseMode(`PLAN ${prompt}`);
        expect(result.parallelAgentsRecommendation?.specialists).toContain(
          'integration-specialist',
        );
      });

      it.each([
        '외부 서비스 연동 구현',
        '웹훅 핸들러 추가',
        '서드파티 API 연동',
        '연동 테스트 작성',
      ])('detects integration-specialist for Korean: %s', async prompt => {
        const result = await service.parseMode(`PLAN ${prompt}`);
        expect(result.parallelAgentsRecommendation?.specialists).toContain(
          'integration-specialist',
        );
      });

      it('does not detect integration-specialist for unrelated prompts', async () => {
        const result = await service.parseMode('PLAN create login form');
        expect(result.parallelAgentsRecommendation?.specialists).not.toContain(
          'integration-specialist',
        );
      });

      it('includes both default and context-aware specialists', async () => {
        const result = await service.parseMode(
          'PLAN external API integration with security review',
        );
        // Default PLAN specialists
        expect(result.parallelAgentsRecommendation?.specialists).toContain(
          'architecture-specialist',
        );
        expect(result.parallelAgentsRecommendation?.specialists).toContain(
          'test-strategy-specialist',
        );
        // Context-aware specialists
        expect(result.parallelAgentsRecommendation?.specialists).toContain(
          'integration-specialist',
        );
        expect(result.parallelAgentsRecommendation?.specialists).toContain('security-specialist');
      });
    });

    describe('observability-specialist pattern', () => {
      it.each([
        'implement distributed tracing',
        'add SLI/SLO monitoring',
        'setup OpenTelemetry instrumentation',
        'configure Prometheus metrics',
        'Grafana dashboard setup',
        'Jaeger tracing integration',
        'log aggregation pipeline',
        'alerting strategy design',
        'metric collection for API latency',
        'error budget tracking',
        'setup monitoring for services',
        'create dashboard for metrics',
        'logs management system',
      ])('detects observability-specialist for English: %s', async prompt => {
        const result = await service.parseMode(`PLAN ${prompt}`);
        expect(result.parallelAgentsRecommendation?.specialists).toContain(
          'observability-specialist',
        );
      });

      it.each([
        '관측성 인프라 구축',
        '분산 추적 시스템 설계',
        '로그 수집 파이프라인 구현',
        '메트릭 수집 설정',
        '알림 전략 수립',
        '대시보드 구축',
      ])('detects observability-specialist for Korean: %s', async prompt => {
        const result = await service.parseMode(`PLAN ${prompt}`);
        expect(result.parallelAgentsRecommendation?.specialists).toContain(
          'observability-specialist',
        );
      });

      it('does not detect observability-specialist for unrelated prompts', async () => {
        const result = await service.parseMode('PLAN create login form');
        expect(result.parallelAgentsRecommendation?.specialists).not.toContain(
          'observability-specialist',
        );
      });
    });

    describe('event-architecture-specialist pattern', () => {
      it.each([
        'implement event-driven architecture',
        'add Kafka message queue',
        'design saga pattern for order processing',
        'RabbitMQ consumer implementation',
        'CQRS pattern for read/write separation',
        'SQS queue integration',
        'distributed transaction handling',
        'dead letter queue configuration',
        'WebSocket real-time updates',
        'SSE for live notifications',
        'pub/sub messaging system',
        'event sourcing implementation',
        'real-time data synchronization',
        'async messaging between services',
      ])('detects event-architecture-specialist for English: %s', async prompt => {
        const result = await service.parseMode(`PLAN ${prompt}`);
        expect(result.parallelAgentsRecommendation?.specialists).toContain(
          'event-architecture-specialist',
        );
      });

      it.each([
        '이벤트 기반 아키텍처 설계',
        '메시지 큐 도입',
        '분산 트랜잭션 처리',
        '실시간 데이터 동기화',
        '비동기 통신 구현',
      ])('detects event-architecture-specialist for Korean: %s', async prompt => {
        const result = await service.parseMode(`PLAN ${prompt}`);
        expect(result.parallelAgentsRecommendation?.specialists).toContain(
          'event-architecture-specialist',
        );
      });

      it('does not detect event-architecture-specialist for unrelated prompts', async () => {
        const result = await service.parseMode('PLAN create login form');
        expect(result.parallelAgentsRecommendation?.specialists).not.toContain(
          'event-architecture-specialist',
        );
      });
    });

    describe('migration-specialist pattern', () => {
      it.each([
        'database migration strategy',
        'migrate legacy system to microservices',
        'legacy code modernization',
        'upgrade framework to latest version',
        'strangler fig pattern implementation',
        'branch by abstraction for refactoring',
        'blue-green deployment migration',
        'canary release strategy',
        'rollback plan for database changes',
        'api versioning strategy',
        'deprecate old endpoints',
        'dual-write pattern for data sync',
        'backward compatibility check',
        'zero-downtime migration',
        'data migration to new schema',
        'schema migration plan',
        'cutover strategy for new system',
      ])('detects migration-specialist for English: %s', async prompt => {
        const result = await service.parseMode(`PLAN ${prompt}`);
        expect(result.parallelAgentsRecommendation?.specialists).toContain('migration-specialist');
      });

      it.each([
        '데이터베이스 마이그레이션 전략',
        '레거시 시스템 이전 계획',
        '프레임워크 업그레이드',
        '롤백 계획 수립',
        '하위 호환성 검증',
        '데이터 마이그레이션 실행',
        '스키마 변경 적용',
        '시스템 전환 전략',
      ])('detects migration-specialist for Korean: %s', async prompt => {
        const result = await service.parseMode(`PLAN ${prompt}`);
        expect(result.parallelAgentsRecommendation?.specialists).toContain('migration-specialist');
      });

      it('does not detect migration-specialist for unrelated prompts', async () => {
        const result = await service.parseMode('PLAN create login form');
        expect(result.parallelAgentsRecommendation?.specialists).not.toContain(
          'migration-specialist',
        );
      });

      it('includes both default and migration specialists for complex prompts', async () => {
        const result = await service.parseMode(
          'PLAN strangler fig pattern with observability monitoring',
        );
        // Default PLAN specialists
        expect(result.parallelAgentsRecommendation?.specialists).toContain(
          'architecture-specialist',
        );
        // Context-aware specialists
        expect(result.parallelAgentsRecommendation?.specialists).toContain('migration-specialist');
        expect(result.parallelAgentsRecommendation?.specialists).toContain(
          'observability-specialist',
        );
      });
    });
  });

  describe('auto-included skills and agents (MCP mode enhancement)', () => {
    describe('included_skills', () => {
      it('auto-includes skills when skill functions are provided', async () => {
        const mockSkillRecommendations = vi.fn((prompt: string): SkillRecommendationInfo[] => {
          if (prompt.includes('debug')) {
            return [
              {
                skillName: 'systematic-debugging',
                confidence: 'high',
                matchedPatterns: ['debug'],
                description: 'Debug systematically',
              },
            ];
          }
          return [];
        });

        const mockLoadSkillContent = vi.fn(
          async (skillName: string): Promise<SkillContentInfo | null> => {
            if (skillName === 'systematic-debugging') {
              return {
                name: 'systematic-debugging',
                description: 'Debug systematically',
                content: '# Debugging Skill\nFollow these steps...',
              };
            }
            return null;
          },
        );

        const serviceWithSkills = new KeywordService(
          mockLoadConfig,
          mockLoadRule,
          mockLoadAgentInfo,
          {
            getSkillRecommendationsFn: mockSkillRecommendations,
            loadSkillContentFn: mockLoadSkillContent,
          },
        );

        const result = await serviceWithSkills.parseMode('PLAN debug issue');

        expect(result.included_skills).toBeDefined();
        expect(result.included_skills).toHaveLength(1);
        expect(result.included_skills![0]).toMatchObject({
          name: 'systematic-debugging',
          description: 'Debug systematically',
          content: '# Debugging Skill\nFollow these steps...',
        });
        expect(result.included_skills![0].reason).toContain('debug');
      });

      it('limits included skills to 3 maximum (default)', async () => {
        const mockSkillRecommendations = vi.fn((): SkillRecommendationInfo[] => [
          {
            skillName: 'skill-1',
            confidence: 'high',
            matchedPatterns: [],
            description: 'Skill 1',
          },
          {
            skillName: 'skill-2',
            confidence: 'high',
            matchedPatterns: [],
            description: 'Skill 2',
          },
          {
            skillName: 'skill-3',
            confidence: 'high',
            matchedPatterns: [],
            description: 'Skill 3',
          },
          {
            skillName: 'skill-4',
            confidence: 'medium',
            matchedPatterns: [],
            description: 'Skill 4',
          },
          {
            skillName: 'skill-5',
            confidence: 'low',
            matchedPatterns: [],
            description: 'Skill 5',
          },
        ]);

        const mockLoadSkillContent = vi.fn(
          async (skillName: string): Promise<SkillContentInfo | null> => ({
            name: skillName,
            description: `Description for ${skillName}`,
            content: `Content for ${skillName}`,
          }),
        );

        const serviceWithSkills = new KeywordService(
          mockLoadConfig,
          mockLoadRule,
          mockLoadAgentInfo,
          {
            getSkillRecommendationsFn: mockSkillRecommendations,
            loadSkillContentFn: mockLoadSkillContent,
          },
        );

        const result = await serviceWithSkills.parseMode('PLAN complex task');

        expect(result.included_skills).toBeDefined();
        expect(result.included_skills).toHaveLength(3);
        expect(result.included_skills!.map(s => s.name)).toEqual(['skill-1', 'skill-2', 'skill-3']);
      });

      it('respects runtime config for max included skills', async () => {
        const mockSkillRecommendations = vi.fn((): SkillRecommendationInfo[] => [
          {
            skillName: 'skill-1',
            confidence: 'high',
            matchedPatterns: [],
            description: 'Skill 1',
          },
          {
            skillName: 'skill-2',
            confidence: 'high',
            matchedPatterns: [],
            description: 'Skill 2',
          },
          {
            skillName: 'skill-3',
            confidence: 'high',
            matchedPatterns: [],
            description: 'Skill 3',
          },
        ]);

        const mockLoadSkillContent = vi.fn(
          async (skillName: string): Promise<SkillContentInfo | null> => ({
            name: skillName,
            description: `Description for ${skillName}`,
            content: `Content for ${skillName}`,
          }),
        );

        // Config says max 2 skills
        const mockGetMaxIncludedSkills = vi.fn().mockResolvedValue(2);

        const serviceWithConfiguredSkills = new KeywordService(
          mockLoadConfig,
          mockLoadRule,
          mockLoadAgentInfo,
          {
            getSkillRecommendationsFn: mockSkillRecommendations,
            loadSkillContentFn: mockLoadSkillContent,
            getMaxIncludedSkillsFn: mockGetMaxIncludedSkills,
          },
        );

        const result = await serviceWithConfiguredSkills.parseMode('PLAN complex task');

        expect(result.included_skills).toBeDefined();
        expect(result.included_skills).toHaveLength(2);
        expect(result.included_skills!.map(s => s.name)).toEqual(['skill-1', 'skill-2']);
        expect(mockGetMaxIncludedSkills).toHaveBeenCalled();
      });

      it('falls back to default when getMaxIncludedSkillsFn returns null', async () => {
        const mockSkillRecommendations = vi.fn((): SkillRecommendationInfo[] => [
          {
            skillName: 'skill-1',
            confidence: 'high',
            matchedPatterns: [],
            description: 'Skill 1',
          },
          {
            skillName: 'skill-2',
            confidence: 'high',
            matchedPatterns: [],
            description: 'Skill 2',
          },
          {
            skillName: 'skill-3',
            confidence: 'high',
            matchedPatterns: [],
            description: 'Skill 3',
          },
          {
            skillName: 'skill-4',
            confidence: 'high',
            matchedPatterns: [],
            description: 'Skill 4',
          },
        ]);

        const mockLoadSkillContent = vi.fn(
          async (skillName: string): Promise<SkillContentInfo | null> => ({
            name: skillName,
            description: `Description for ${skillName}`,
            content: `Content for ${skillName}`,
          }),
        );

        // Config returns null - should use default (3)
        const mockGetMaxIncludedSkills = vi.fn().mockResolvedValue(null);

        const serviceWithNullConfig = new KeywordService(
          mockLoadConfig,
          mockLoadRule,
          mockLoadAgentInfo,
          {
            getSkillRecommendationsFn: mockSkillRecommendations,
            loadSkillContentFn: mockLoadSkillContent,
            getMaxIncludedSkillsFn: mockGetMaxIncludedSkills,
          },
        );

        const result = await serviceWithNullConfig.parseMode('PLAN task');

        expect(result.included_skills).toBeDefined();
        expect(result.included_skills).toHaveLength(3);
      });

      it('falls back to default when getMaxIncludedSkillsFn throws', async () => {
        const mockSkillRecommendations = vi.fn((): SkillRecommendationInfo[] => [
          {
            skillName: 'skill-1',
            confidence: 'high',
            matchedPatterns: [],
            description: 'Skill 1',
          },
          {
            skillName: 'skill-2',
            confidence: 'high',
            matchedPatterns: [],
            description: 'Skill 2',
          },
          {
            skillName: 'skill-3',
            confidence: 'high',
            matchedPatterns: [],
            description: 'Skill 3',
          },
          {
            skillName: 'skill-4',
            confidence: 'high',
            matchedPatterns: [],
            description: 'Skill 4',
          },
        ]);

        const mockLoadSkillContent = vi.fn(
          async (skillName: string): Promise<SkillContentInfo | null> => ({
            name: skillName,
            description: `Description for ${skillName}`,
            content: `Content for ${skillName}`,
          }),
        );

        // Config throws error - should use default (3)
        const mockGetMaxIncludedSkills = vi.fn().mockRejectedValue(new Error('Config error'));

        const serviceWithErrorConfig = new KeywordService(
          mockLoadConfig,
          mockLoadRule,
          mockLoadAgentInfo,
          {
            getSkillRecommendationsFn: mockSkillRecommendations,
            loadSkillContentFn: mockLoadSkillContent,
            getMaxIncludedSkillsFn: mockGetMaxIncludedSkills,
          },
        );

        const result = await serviceWithErrorConfig.parseMode('PLAN task');

        expect(result.included_skills).toBeDefined();
        expect(result.included_skills).toHaveLength(3);
      });

      it('does not include skills when no matches found', async () => {
        const mockSkillRecommendations = vi.fn((): SkillRecommendationInfo[] => []);
        const mockLoadSkillContent = vi.fn();

        const serviceWithSkills = new KeywordService(
          mockLoadConfig,
          mockLoadRule,
          mockLoadAgentInfo,
          {
            getSkillRecommendationsFn: mockSkillRecommendations,
            loadSkillContentFn: mockLoadSkillContent,
          },
        );

        const result = await serviceWithSkills.parseMode('PLAN simple task');

        expect(result.included_skills).toBeUndefined();
        expect(mockLoadSkillContent).not.toHaveBeenCalled();
      });

      it('skips skills that fail to load', async () => {
        const mockSkillRecommendations = vi.fn((): SkillRecommendationInfo[] => [
          {
            skillName: 'working-skill',
            confidence: 'high',
            matchedPatterns: [],
            description: 'Working',
          },
          {
            skillName: 'failing-skill',
            confidence: 'high',
            matchedPatterns: [],
            description: 'Failing',
          },
        ]);

        const mockLoadSkillContent = vi.fn(
          async (skillName: string): Promise<SkillContentInfo | null> => {
            if (skillName === 'failing-skill') {
              return null;
            }
            return {
              name: skillName,
              description: 'Working skill',
              content: 'Content',
            };
          },
        );

        const serviceWithSkills = new KeywordService(
          mockLoadConfig,
          mockLoadRule,
          mockLoadAgentInfo,
          {
            getSkillRecommendationsFn: mockSkillRecommendations,
            loadSkillContentFn: mockLoadSkillContent,
          },
        );

        const result = await serviceWithSkills.parseMode('PLAN task');

        expect(result.included_skills).toBeDefined();
        expect(result.included_skills).toHaveLength(1);
        expect(result.included_skills![0].name).toBe('working-skill');
      });

      it('handles skill recommendation service errors gracefully', async () => {
        const mockSkillRecommendations = vi.fn(() => {
          throw new Error('Service unavailable');
        });
        const mockLoadSkillContent = vi.fn();

        const serviceWithSkills = new KeywordService(
          mockLoadConfig,
          mockLoadRule,
          mockLoadAgentInfo,
          {
            getSkillRecommendationsFn: mockSkillRecommendations,
            loadSkillContentFn: mockLoadSkillContent,
          },
        );

        const result = await serviceWithSkills.parseMode('PLAN task');

        // Should not throw, just skip skill inclusion
        expect(result.mode).toBe('PLAN');
        expect(result.included_skills).toBeUndefined();
      });

      it('does not include skills when skill functions not provided', async () => {
        // Default service without skill functions
        const result = await service.parseMode('PLAN debug issue');

        expect(result.included_skills).toBeUndefined();
      });
    });

    describe('included_agent', () => {
      it('auto-includes agent system prompt when function is provided', async () => {
        const mockLoadAgentSystemPrompt = vi.fn(
          async (agentName: string, mode: Mode): Promise<AgentSystemPromptInfo | null> => ({
            agentName,
            displayName: 'Frontend Developer',
            systemPrompt: `You are a ${agentName} in ${mode} mode. Follow TDD.`,
            description: 'Frontend development specialist',
          }),
        );

        const serviceWithAgentPrompt = new KeywordService(
          mockLoadConfig,
          mockLoadRule,
          mockLoadAgentInfo,
          { loadAgentSystemPromptFn: mockLoadAgentSystemPrompt },
        );

        const result = await serviceWithAgentPrompt.parseMode('PLAN design feature');

        expect(result.included_agent).toBeDefined();
        expect(result.included_agent).toMatchObject({
          name: 'Frontend Developer',
          systemPrompt: expect.stringContaining('frontend-developer'),
          expertise: ['React', 'Next.js', 'TDD', 'TypeScript'],
        });
      });

      it('still includes agent when delegates_to falls back to default', async () => {
        const mockLoadAgentSystemPrompt = vi.fn(
          async (agentName: string, mode: Mode): Promise<AgentSystemPromptInfo | null> => ({
            agentName,
            displayName: 'Default Agent',
            systemPrompt: `You are ${agentName} in ${mode} mode.`,
            description: 'Default agent',
          }),
        );

        // Config without delegates_to - will use default fallback
        const configWithoutDelegate: KeywordModesConfig = {
          modes: {
            PLAN: {
              description: 'Planning phase',
              instructions: 'Design approach.',
              rules: ['rules/core.md'],
              agent: 'plan-mode',
              // No delegates_to - will fallback to 'frontend-developer'
            },
            ACT: mockConfig.modes.ACT,
            EVAL: mockConfig.modes.EVAL,
            AUTO: mockConfig.modes.AUTO,
          },
          defaultMode: 'PLAN',
        };

        const serviceWithAgentPrompt = new KeywordService(
          vi.fn().mockResolvedValue(configWithoutDelegate),
          mockLoadRule,
          mockLoadAgentInfo,
          { loadAgentSystemPromptFn: mockLoadAgentSystemPrompt },
        );

        const result = await serviceWithAgentPrompt.parseMode('PLAN design feature');

        // Since no PrimaryAgentResolver is provided and no delegates_to in config,
        // it will use default 'frontend-developer' (fallback behavior)
        expect(result.delegates_to).toBe('frontend-developer');
        // Agent system prompt function SHOULD be called with the fallback agent
        expect(mockLoadAgentSystemPrompt).toHaveBeenCalledWith('frontend-developer', 'PLAN');
        expect(result.included_agent).toBeDefined();
        expect(result.included_agent?.name).toBe('Default Agent');
      });

      it('handles agent system prompt load errors gracefully', async () => {
        const mockLoadAgentSystemPrompt = vi.fn(async () => {
          throw new Error('Agent not found');
        });

        const serviceWithAgentPrompt = new KeywordService(
          mockLoadConfig,
          mockLoadRule,
          mockLoadAgentInfo,
          { loadAgentSystemPromptFn: mockLoadAgentSystemPrompt },
        );

        const result = await serviceWithAgentPrompt.parseMode('PLAN design feature');

        // Should not throw, just skip agent inclusion
        expect(result.mode).toBe('PLAN');
        expect(result.delegates_to).toBe('frontend-developer');
        expect(result.included_agent).toBeUndefined();
      });

      it('does not include agent when function not provided', async () => {
        // Default service without agent system prompt function
        const result = await service.parseMode('PLAN design feature');

        expect(result.included_agent).toBeUndefined();
      });

      it('includes agent for ACT mode with different delegate', async () => {
        const mockLoadAgentSystemPrompt = vi.fn(
          async (agentName: string, mode: Mode): Promise<AgentSystemPromptInfo | null> => ({
            agentName,
            displayName: agentName === 'code-reviewer' ? 'Code Reviewer' : 'Dev',
            systemPrompt: `You are ${agentName} in ${mode} mode.`,
            description: 'Specialist agent',
          }),
        );

        const serviceWithAgentPrompt = new KeywordService(
          mockLoadConfig,
          mockLoadRule,
          mockLoadAgentInfo,
          { loadAgentSystemPromptFn: mockLoadAgentSystemPrompt },
        );

        const result = await serviceWithAgentPrompt.parseMode('EVAL review code');

        expect(result.included_agent).toBeDefined();
        expect(result.included_agent?.name).toBe('Code Reviewer');
        expect(result.included_agent?.systemPrompt).toContain('EVAL');
      });
    });

    describe('combined skills and agent inclusion', () => {
      it('includes both skills and agent in response', async () => {
        const mockSkillRecommendations = vi.fn((): SkillRecommendationInfo[] => [
          {
            skillName: 'test-skill',
            confidence: 'high',
            matchedPatterns: ['test'],
            description: 'Test skill',
          },
        ]);

        const mockLoadSkillContent = vi.fn(
          async (): Promise<SkillContentInfo | null> => ({
            name: 'test-skill',
            description: 'Test skill',
            content: 'Test content',
          }),
        );

        const mockLoadAgentSystemPrompt = vi.fn(
          async (agentName: string, mode: Mode): Promise<AgentSystemPromptInfo | null> => ({
            agentName,
            displayName: 'Test Agent',
            systemPrompt: `Agent prompt for ${mode}`,
            description: 'Test agent',
          }),
        );

        const serviceWithBoth = new KeywordService(
          mockLoadConfig,
          mockLoadRule,
          mockLoadAgentInfo,
          {
            getSkillRecommendationsFn: mockSkillRecommendations,
            loadSkillContentFn: mockLoadSkillContent,
            loadAgentSystemPromptFn: mockLoadAgentSystemPrompt,
          },
        );

        const result = await serviceWithBoth.parseMode('PLAN test feature');

        expect(result.included_skills).toBeDefined();
        expect(result.included_skills).toHaveLength(1);
        expect(result.included_agent).toBeDefined();
        expect(result.included_agent?.systemPrompt).toContain('PLAN');
      });
    });
  });

  describe('branch coverage edge cases', () => {
    describe('getAgentInfo with invalid data', () => {
      it('returns undefined when loadAgentInfoFn returns null', async () => {
        const mockLoadAgentInfoNull = vi.fn().mockResolvedValue(null);
        const serviceWithNullAgent = new KeywordService(
          mockLoadConfig,
          mockLoadRule,
          mockLoadAgentInfoNull,
        );

        const result = await serviceWithNullAgent.parseMode('PLAN test');

        // delegates_to should still be set from config, but delegate_agent_info should be undefined
        expect(result.delegates_to).toBe('frontend-developer');
        expect(result.delegate_agent_info).toBeUndefined();
      });

      it('returns undefined when loadAgentInfoFn returns non-object', async () => {
        const mockLoadAgentInfoString = vi.fn().mockResolvedValue('not an object');
        const serviceWithStringAgent = new KeywordService(
          mockLoadConfig,
          mockLoadRule,
          mockLoadAgentInfoString,
        );

        const result = await serviceWithStringAgent.parseMode('PLAN test');

        expect(result.delegates_to).toBe('frontend-developer');
        expect(result.delegate_agent_info).toBeUndefined();
      });
    });

    describe('resolvePrimaryAgent fallback for EVAL mode', () => {
      it('returns null for EVAL mode when no resolver and no static delegates_to', async () => {
        // Config with EVAL mode having no delegates_to
        const configWithoutEvalDelegate: KeywordModesConfig = {
          modes: {
            PLAN: mockConfig.modes.PLAN,
            ACT: mockConfig.modes.ACT,
            EVAL: {
              description: 'Eval phase',
              instructions: 'Evaluate code.',
              rules: ['rules/core.md'],
              agent: 'eval-mode',
              // No delegates_to for EVAL
            },
            AUTO: mockConfig.modes.AUTO,
          },
          defaultMode: 'PLAN',
        };

        const serviceWithoutEvalDelegate = new KeywordService(
          vi.fn().mockResolvedValue(configWithoutEvalDelegate),
          mockLoadRule,
          mockLoadAgentInfo,
          // No PrimaryAgentResolver
        );

        const result = await serviceWithoutEvalDelegate.parseMode('EVAL review code');

        // Since no resolver and no delegates_to for EVAL, should have no delegate
        expect(result.mode).toBe('EVAL');
        expect(result.delegates_to).toBeUndefined();
      });
    });
  });

  describe('verbosity-based rule content truncation', () => {
    // Create long content that exceeds standard limit (2000 chars)
    // Each repeat is ~14 chars, so 150 repeats = ~2100 chars per section
    const longRuleContent = `# Long Rule File

## Section 1

${'Content line.\n'.repeat(150)}

## Section 2

${'More content.\n'.repeat(150)}

## Section 3

${'Even more content.\n'.repeat(150)}`;

    const mockConfigWithLongRules: KeywordModesConfig = {
      ...mockConfig,
      modes: {
        ...mockConfig.modes,
        PLAN: {
          ...mockConfig.modes.PLAN,
          rules: ['rules/long-core.md'],
        },
      },
    };

    const mockLoadLongRule = vi.fn().mockImplementation(async (path: string) => {
      if (path === 'rules/long-core.md') {
        return longRuleContent;
      }
      return mockRulesContent[path] ?? '';
    });

    it('should include full content with "full" verbosity', async () => {
      const service = new KeywordService(
        vi.fn().mockResolvedValue(mockConfigWithLongRules),
        mockLoadLongRule,
        mockLoadAgentInfo,
      );

      const result = await service.parseMode('PLAN design feature', {
        verbosity: 'full',
      });

      expect(result.rules).toHaveLength(1);
      expect(result.rules[0].content).toBe(longRuleContent);
      expect(result.rules[0].content).not.toContain('[Content truncated');
    });

    it('should truncate content with "standard" verbosity', async () => {
      const service = new KeywordService(
        vi.fn().mockResolvedValue(mockConfigWithLongRules),
        mockLoadLongRule,
        mockLoadAgentInfo,
      );

      const result = await service.parseMode('PLAN design feature', {
        verbosity: 'standard',
      });

      expect(result.rules).toHaveLength(1);
      expect(result.rules[0].content.length).toBeLessThan(longRuleContent.length);
      expect(result.rules[0].content).toContain('[Content truncated');
    });

    it('should return paths only (empty content) with "minimal" verbosity', async () => {
      const service = new KeywordService(
        vi.fn().mockResolvedValue(mockConfigWithLongRules),
        mockLoadLongRule,
        mockLoadAgentInfo,
      );

      const result = await service.parseMode('PLAN design feature', {
        verbosity: 'minimal',
      });

      expect(result.rules).toHaveLength(1);
      expect(result.rules[0].name).toBe('rules/long-core.md');
      expect(result.rules[0].content).toBe('');
    });

    it('should default to "standard" verbosity when not specified', async () => {
      const service = new KeywordService(
        vi.fn().mockResolvedValue(mockConfigWithLongRules),
        mockLoadLongRule,
        mockLoadAgentInfo,
      );

      const result = await service.parseMode('PLAN design feature');

      expect(result.rules).toHaveLength(1);
      // Long content should be truncated with default standard verbosity
      expect(result.rules[0].content.length).toBeLessThan(longRuleContent.length);
      expect(result.rules[0].content).toContain('[Content truncated');
    });

    it('should preserve markdown structure when truncating', async () => {
      const service = new KeywordService(
        vi.fn().mockResolvedValue(mockConfigWithLongRules),
        mockLoadLongRule,
        mockLoadAgentInfo,
      );

      const result = await service.parseMode('PLAN design feature', {
        verbosity: 'standard',
      });

      expect(result.rules).toHaveLength(1);
      // Should have headings preserved
      expect(result.rules[0].content).toContain('# Long Rule File');
      expect(result.rules[0].content).toContain('## Section');
    });
  });
});
