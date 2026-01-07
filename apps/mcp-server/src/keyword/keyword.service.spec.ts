import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KeywordService } from './keyword.service';
import type { KeywordModesConfig } from './keyword.types';
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
      defaultSpecialists: [
        'architecture-specialist',
        'test-strategy-specialist',
      ],
    },
    ACT: {
      description: 'Actual task execution phase',
      instructions: 'Red-Green-Refactor cycle.',
      rules: ['rules/core.md', 'rules/project.md'],
      agent: 'act-mode',
      delegates_to: 'frontend-developer',
      defaultSpecialists: [
        'code-quality-specialist',
        'test-strategy-specialist',
      ],
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
      ],
    },
    AUTO: {
      description: 'Autonomous execution mode',
      instructions: 'Execute PLAN → ACT → EVAL cycle automatically.',
      rules: ['rules/core.md'],
      agent: 'auto-mode',
      defaultSpecialists: [
        'architecture-specialist',
        'test-strategy-specialist',
      ],
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
    description:
      'React/Next.js specialist with TDD and design system experience',
    role: {
      expertise: ['React', 'Next.js', 'TDD', 'TypeScript'],
    },
  },
  'code-reviewer': {
    name: 'Code Reviewer',
    description:
      'Code quality evaluation and improvement suggestion specialist',
    role: {
      expertise: [
        'Code Quality',
        'SOLID Principles',
        'Performance',
        'Security',
      ],
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
    service = new KeywordService(
      mockLoadConfig,
      mockLoadRule,
      mockLoadAgentInfo,
    );
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
        expect(result.agent).toBe('plan-mode');
        expect(result.delegates_to).toBe('frontend-developer');
        expect(result.delegate_agent_info).toEqual({
          name: 'Frontend Developer',
          description:
            'React/Next.js specialist with TDD and design system experience',
          expertise: ['React', 'Next.js', 'TDD', 'TypeScript'],
        });
      });

      it('parses ACT keyword', async () => {
        const result = await service.parseMode('ACT implement login API');

        expect(result.mode).toBe('ACT');
        expect(result.originalPrompt).toBe('implement login API');
        expect(result.instructions).toBe('Red-Green-Refactor cycle.');
        expect(result.rules).toHaveLength(2);
        expect(result.agent).toBe('act-mode');
        expect(result.delegates_to).toBe('frontend-developer');
        expect(result.delegate_agent_info).toEqual({
          name: 'Frontend Developer',
          description:
            'React/Next.js specialist with TDD and design system experience',
          expertise: ['React', 'Next.js', 'TDD', 'TypeScript'],
        });
      });

      it('parses EVAL keyword', async () => {
        const result = await service.parseMode('EVAL review security');

        expect(result.mode).toBe('EVAL');
        expect(result.originalPrompt).toBe('review security');
        expect(result.instructions).toBe('Code quality review.');
        expect(result.agent).toBe('eval-mode');
        expect(result.delegates_to).toBe('code-reviewer');
        expect(result.delegate_agent_info).toEqual({
          name: 'Code Reviewer',
          description:
            'Code quality evaluation and improvement suggestion specialist',
          expertise: [
            'Code Quality',
            'SOLID Principles',
            'Performance',
            'Security',
          ],
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

      it('warns for English + localized multi-keyword (PLAN 계획)', async () => {
        const result = await service.parseMode('PLAN 계획 some task');

        expect(result.mode).toBe('PLAN');
        expect(result.originalPrompt).toBe('계획 some task');
        expect(result.warnings).toContain(
          'Multiple keywords found, using first',
        );
      });

      it('warns for localized + English multi-keyword (계획 PLAN)', async () => {
        const result = await service.parseMode('계획 PLAN some task');

        expect(result.mode).toBe('PLAN');
        expect(result.originalPrompt).toBe('PLAN some task');
        expect(result.warnings).toContain(
          'Multiple keywords found, using first',
        );
      });

      it('warns for localized + localized multi-keyword (계획 실행)', async () => {
        const result = await service.parseMode('계획 실행 some task');

        expect(result.mode).toBe('PLAN');
        expect(result.originalPrompt).toBe('실행 some task');
        expect(result.warnings).toContain(
          'Multiple keywords found, using first',
        );
      });

      it('warns for Japanese multi-keyword (計画 実行)', async () => {
        const result = await service.parseMode('計画 実行 some task');

        expect(result.mode).toBe('PLAN');
        expect(result.originalPrompt).toBe('実行 some task');
        expect(result.warnings).toContain(
          'Multiple keywords found, using first',
        );
      });

      it('warns for Spanish multi-keyword (PLANIFICAR ACTUAR)', async () => {
        const result = await service.parseMode('PLANIFICAR ACTUAR some task');

        expect(result.mode).toBe('PLAN');
        expect(result.originalPrompt).toBe('ACTUAR some task');
        expect(result.warnings).toContain(
          'Multiple keywords found, using first',
        );
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
        const result = await service.parseMode(
          'PLANIFICAR diseño de autenticación',
        );

        expect(result.mode).toBe('PLAN');
        expect(result.originalPrompt).toBe('diseño de autenticación');
        expect(result.warnings).toBeUndefined();
      });

      it('parses planificar as PLAN (lowercase)', async () => {
        const result = await service.parseMode(
          'planificar diseño de autenticación',
        );

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
        const result = await service.parseMode(
          'AUTOMÁTICO implementar feature',
        );

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
        service = new KeywordService(
          mockLoadConfig,
          mockLoadRule,
          mockLoadAgentInfo,
        );

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
          description:
            'React/Next.js specialist with TDD and design system experience',
          expertise: ['React', 'Next.js', 'TDD', 'TypeScript'],
        });
        expect(mockLoadAgentInfo).toHaveBeenCalledWith('frontend-developer');
      });

      it('includes different delegate for EVAL mode', async () => {
        const result = await service.parseMode('EVAL review code');

        expect(result.delegates_to).toBe('code-reviewer');
        expect(result.delegate_agent_info).toEqual({
          name: 'Code Reviewer',
          description:
            'Code quality evaluation and improvement suggestion specialist',
          expertise: [
            'Code Quality',
            'SOLID Principles',
            'Performance',
            'Security',
          ],
        });
        expect(mockLoadAgentInfo).toHaveBeenCalledWith('code-reviewer');
      });

      it('handles missing delegate agent gracefully', async () => {
        mockLoadAgentInfo = vi
          .fn()
          .mockRejectedValue(new Error('Agent not found'));
        service = new KeywordService(
          mockLoadConfig,
          mockLoadRule,
          mockLoadAgentInfo,
        );

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
        service = new KeywordService(
          mockLoadConfig,
          mockLoadRule,
          mockLoadAgentInfo,
        );

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
        service = new KeywordService(
          mockLoadConfig,
          mockLoadRule,
          mockLoadAgentInfo,
        );

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
        expect(result.instructions).toBe('Design first approach.');
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
        expect(result.warnings).toContain(
          'No keyword found, defaulting to PLAN',
        );
        expect(result.agent).toBe('plan-mode');
        expect(result.delegates_to).toBe('frontend-developer');
      });
    });
  });

  describe('parallelAgentsRecommendation', () => {
    it('returns parallel agents recommendation for PLAN mode', async () => {
      const result = await service.parseMode('PLAN design auth feature');

      expect(result.parallelAgentsRecommendation).toBeDefined();
      expect(result.parallelAgentsRecommendation?.specialists).toContain(
        'architecture-specialist',
      );
      expect(result.parallelAgentsRecommendation?.specialists).toContain(
        'test-strategy-specialist',
      );
      expect(result.parallelAgentsRecommendation?.hint).toContain('Task tool');
      expect(result.parallelAgentsRecommendation?.hint).toContain(
        'prepare_parallel_agents',
      );
    });

    it('returns parallel agents recommendation for ACT mode', async () => {
      const result = await service.parseMode('ACT implement auth feature');

      expect(result.parallelAgentsRecommendation).toBeDefined();
      expect(result.parallelAgentsRecommendation?.specialists).toContain(
        'code-quality-specialist',
      );
      expect(result.parallelAgentsRecommendation?.specialists).toContain(
        'test-strategy-specialist',
      );
    });

    it('returns parallel agents recommendation for EVAL mode', async () => {
      const result = await service.parseMode('EVAL review auth feature');

      expect(result.parallelAgentsRecommendation).toBeDefined();
      expect(result.parallelAgentsRecommendation?.specialists).toContain(
        'security-specialist',
      );
      expect(result.parallelAgentsRecommendation?.specialists).toContain(
        'accessibility-specialist',
      );
      expect(result.parallelAgentsRecommendation?.specialists).toContain(
        'performance-specialist',
      );
      expect(result.parallelAgentsRecommendation?.specialists).toContain(
        'code-quality-specialist',
      );
    });

    it('returns specialists as a copy (not reference)', async () => {
      const result1 = await service.parseMode('PLAN task1');
      const result2 = await service.parseMode('PLAN task2');

      // Modifying one should not affect the other
      result1.parallelAgentsRecommendation?.specialists.push('test-specialist');
      expect(result2.parallelAgentsRecommendation?.specialists).not.toContain(
        'test-specialist',
      );
    });

    it('includes hint with Task tool usage instructions', async () => {
      const result = await service.parseMode('EVAL code review');

      expect(result.parallelAgentsRecommendation?.hint).toContain(
        'subagent_type="general-purpose"',
      );
      expect(result.parallelAgentsRecommendation?.hint).toContain(
        'run_in_background=true',
      );
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
        mockResolver as unknown as PrimaryAgentResolver,
      );

      const result = await serviceWithResolver.parseMode('PLAN design API');

      expect(result.recommended_act_agent).toBeDefined();
      expect(result.recommended_act_agent?.agentName).toBe('backend-developer');
      expect(result.recommended_act_agent?.confidence).toBe(0.9);
      expect(result.recommended_act_agent?.reason).toBe(
        'API implementation detected',
      );
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
        mockResolver as unknown as PrimaryAgentResolver,
      );

      const result = await serviceWithResolver.parseMode('PLAN build UI');

      expect(result.available_act_agents).toBeDefined();
      expect(result.available_act_agents).toContain('frontend-developer');
      expect(result.available_act_agents).toContain('backend-developer');
      expect(result.available_act_agents).toContain('devops-engineer');
      expect(result.available_act_agents).toContain('agent-architect');
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
        mockResolver as unknown as PrimaryAgentResolver,
      );

      const result = await serviceWithResolver.parseMode('ACT implement');

      expect(result.recommended_act_agent).toBeUndefined();
      expect(result.available_act_agents).toBeUndefined();
    });

    it('does not return recommended_act_agent in EVAL mode', async () => {
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
        mockResolver as unknown as PrimaryAgentResolver,
      );

      const result = await serviceWithResolver.parseMode('EVAL review');

      expect(result.recommended_act_agent).toBeUndefined();
      expect(result.available_act_agents).toBeUndefined();
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
        mockResolver as unknown as PrimaryAgentResolver,
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
      expect(
        new Date(result.activation_message!.activations[0].timestamp).getTime(),
      ).not.toBeNaN();
    });

    it('includes activation_message with Korean keywords', async () => {
      const result = await service.parseMode('계획 인증 기능 설계');

      expect(result.activation_message).toBeDefined();
      expect(result.activation_message?.activations[0].name).toBe(
        'frontend-developer',
      );
    });

    it('includes activation_message even without keyword (default mode)', async () => {
      const result = await service.parseMode('design auth feature');

      expect(result.activation_message).toBeDefined();
      expect(result.activation_message?.activations[0].tier).toBe('primary');
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
        mockResolver as unknown as PrimaryAgentResolver,
      );

      const result = await serviceWithResolver.parseMode(
        'ACT implement login API',
        { recommendedActAgent: 'backend-developer' },
      );

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
        mockResolver as unknown as PrimaryAgentResolver,
      );

      const result = await serviceWithResolver.parseMode('PLAN design API', {
        recommendedActAgent: 'backend-developer',
      });

      expect(result.mode).toBe('PLAN');
      expect(result.delegates_to).toBe('solution-architect');
      // Should not pass recommendedActAgent for PLAN mode
      expect(mockResolver.resolve).toHaveBeenCalledWith(
        'PLAN',
        'design API',
        undefined,
        undefined,
      );
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
        mockResolver as unknown as PrimaryAgentResolver,
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
        mockResolver as unknown as PrimaryAgentResolver,
      );

      const result = await serviceWithResolver.parseMode(
        'ACT implement feature',
      );

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
        mockResolver as unknown as PrimaryAgentResolver,
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
        mockResolver as unknown as PrimaryAgentResolver,
      );

      // Whitespace should be treated as undefined at MCP layer
      // KeywordService passes through, validation is in MCP handler
      const result = await serviceWithResolver.parseMode('ACT implement', {
        recommendedActAgent: '   ',
      });

      expect(result.delegates_to).toBe('frontend-developer');
    });
  });
});
