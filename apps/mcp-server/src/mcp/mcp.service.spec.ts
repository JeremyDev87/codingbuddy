import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RulesService } from '../rules/rules.service';
import { KeywordService } from '../keyword/keyword.service';
import { ConfigService, ProjectConfig } from '../config/config.service';
import type { CodingBuddyConfig } from '../config/config.schema';
import type { ProjectAnalysis } from '../analyzer';
import {
  ConfigDiffService,
  ConfigDiffResult,
} from '../config/config-diff.service';
import { AnalyzerService } from '../analyzer/analyzer.service';
import { SkillRecommendationService } from '../skill/skill-recommendation.service';
import type {
  RecommendSkillsResult,
  ListSkillsResult,
} from '../skill/skill-recommendation.types';
import { LanguageService } from '../shared/language.service';
import { AgentService } from '../agent/agent.service';
import type { AgentSystemPrompt, ParallelAgentSet } from '../agent/agent.types';
import { ChecklistService } from '../checklist/checklist.service';
import { ContextService } from '../context/context.service';
import { ModelResolverService } from '../model';
import { SessionService } from '../session/session.service';
import type { ToolHandler } from './handlers';
import {
  RulesHandler,
  ConfigHandler,
  SkillHandler,
  AgentHandler,
  ModeHandler,
  ChecklistContextHandler,
} from './handlers';

// Handler function type for MCP request handlers
type McpHandler = (request: unknown) => Promise<unknown>;

// Hoist the handlers map so it's available during vi.mock
const { handlers } = vi.hoisted(() => ({
  handlers: new Map<string, McpHandler>(),
}));

// Mock the MCP SDK Server
vi.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: class MockServer {
    constructor() {
      // Clear handlers on new instance
    }
    setRequestHandler(schema: unknown, handler: McpHandler) {
      // Extract method name from Zod schema (MCP SDK v1.25.1+ structure)
      const s = schema as {
        def?: { shape?: { method?: { def?: { values?: string[] } } } };
      };
      const method = s?.def?.shape?.method?.def?.values?.[0];
      if (method) {
        handlers.set(method, handler);
      }
    }
    async connect() {
      /* noop */
    }
  },
}));

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: class MockTransport {},
}));

// Mock analysis data
const mockAnalysis: ProjectAnalysis = {
  packageInfo: {
    name: 'test-app',
    version: '1.0.0',
    dependencies: { react: '^18.0.0' },
    devDependencies: {},
    scripts: {},
    detectedFrameworks: [
      { name: 'React', category: 'frontend', version: '^18.0.0' },
    ],
  },
  directoryStructure: {
    rootDirs: ['src'],
    rootFiles: ['package.json'],
    allFiles: [],
    patterns: [],
    totalFiles: 5,
    totalDirs: 2,
  },
  configFiles: { detected: [] },
  codeSamples: [],
  detectedPatterns: [],
};

const mockDiffResult: ConfigDiffResult = {
  isUpToDate: true,
  suggestions: [],
};

// Mock dependencies
const createMockRulesService = (): Partial<RulesService> => ({
  listAgents: vi
    .fn()
    .mockResolvedValue(['frontend-developer', 'code-reviewer']),
  getRuleContent: vi.fn().mockResolvedValue('# Core Rules\nSome content...'),
  getAgent: vi.fn().mockResolvedValue({
    name: 'Frontend Developer',
    description: 'Frontend development specialist',
    role: {
      title: 'Senior Frontend Developer',
      expertise: ['React', 'TypeScript'],
      responsibilities: ['Write clean code', 'Follow best practices'],
    },
  }),
  searchRules: vi.fn().mockResolvedValue([]),
});

const createMockKeywordService = (): Partial<KeywordService> => ({
  parseMode: vi.fn().mockImplementation(async (prompt: string) => {
    const trimmed = prompt.trim();
    const firstWord = trimmed.split(/\s+/)[0]?.toUpperCase();

    if (firstWord === 'ACT') {
      return {
        mode: 'ACT',
        originalPrompt: trimmed.slice(3).trim(),
        instructions: 'Red-Green-Refactor cycle',
        rules: [{ name: 'rules/core.md', content: 'Some rules' }],
        agent: 'act-mode',
        delegates_to: 'frontend-developer',
        delegate_agent_info: {
          name: 'Frontend Developer',
          description: 'React/Next.js frontend specialist',
          expertise: ['React', 'TypeScript'],
        },
      };
    } else if (firstWord === 'EVAL') {
      return {
        mode: 'EVAL',
        originalPrompt: trimmed.slice(4).trim(),
        instructions: 'Code quality review',
        rules: [{ name: 'rules/core.md', content: 'Some rules' }],
        agent: 'eval-mode',
        delegates_to: 'code-reviewer',
        delegate_agent_info: {
          name: 'Code Reviewer',
          description: 'Code quality evaluation specialist',
          expertise: ['Code Quality', 'SOLID Principles'],
        },
      };
    } else {
      return {
        mode: 'PLAN',
        originalPrompt: trimmed.startsWith('PLAN ')
          ? trimmed.slice(5)
          : trimmed,
        instructions: 'Plan the implementation',
        rules: [{ name: 'rules/core.md', content: 'Some rules' }],
        agent: 'plan-mode',
        delegates_to: 'frontend-developer',
        delegate_agent_info: {
          name: 'Frontend Developer',
          description: 'React/Next.js frontend specialist',
          expertise: ['React', 'TypeScript'],
        },
      };
    }
  }),
});

const createMockConfigService = (
  config: CodingBuddyConfig = {},
): Partial<ConfigService> => ({
  getProjectConfig: vi.fn().mockResolvedValue({
    settings: config,
    ignorePatterns: ['node_modules', '.git'],
    contextFiles: [],
    sources: {
      config: '/test/codingbuddy.config.js',
      ignore: null,
      context: null,
    },
  } as ProjectConfig),
  getSettings: vi.fn().mockResolvedValue(config),
  getLanguage: vi.fn().mockResolvedValue(config.language),
  getFormattedContext: vi.fn().mockResolvedValue(''),
  getProjectRoot: vi.fn().mockReturnValue('/test/project'),
  reload: vi.fn().mockResolvedValue({
    settings: config,
    ignorePatterns: ['node_modules', '.git'],
    contextFiles: [],
    sources: {
      config: '/test/codingbuddy.config.js',
      ignore: null,
      context: null,
    },
  } as ProjectConfig),
});

const createMockConfigDiffService = (): Partial<ConfigDiffService> => ({
  compareConfig: vi.fn().mockReturnValue(mockDiffResult),
  formatSuggestionsAsText: vi.fn().mockReturnValue(''),
});

const createMockAnalyzerService = (): Partial<AnalyzerService> => ({
  analyzeProject: vi.fn().mockResolvedValue(mockAnalysis),
});

const createMockSkillRecommendationService =
  (): Partial<SkillRecommendationService> => ({
    recommendSkills: vi.fn().mockReturnValue({
      recommendations: [
        {
          skillName: 'systematic-debugging',
          confidence: 'high',
          matchedPatterns: ['bug', 'debug'],
          description: 'Systematic approach to debugging',
        },
      ],
      originalPrompt: 'I have a bug in my code',
    } as RecommendSkillsResult),
    listSkills: vi.fn().mockReturnValue({
      skills: [
        {
          name: 'systematic-debugging',
          priority: 100,
          description: 'Systematic approach to debugging',
          concepts: ['bug', 'error', 'debug'],
        },
        {
          name: 'test-driven-development',
          priority: 90,
          description: 'Test-driven development workflow',
          concepts: ['test', 'tdd'],
        },
        {
          name: 'brainstorming',
          priority: 80,
          description: 'Explore requirements before implementation',
          concepts: ['design', 'feature'],
        },
      ],
      total: 3,
    } as ListSkillsResult),
  });

const createMockLanguageService = (): Partial<LanguageService> => ({
  getLanguageInstruction: vi
    .fn()
    .mockImplementation((languageCode: string) => ({
      language: languageCode || 'en',
      instruction: 'Always respond in Korean (한국어).',
      fallback: false,
    })),
  getSupportedLanguages: vi.fn().mockReturnValue([
    {
      code: 'ko',
      name: 'Korean',
      nativeName: '한국어',
      instruction: 'Always respond in Korean (한국어).',
    },
    { code: 'en', name: 'English', instruction: 'Always respond in English.' },
  ]),
  isLanguageSupported: vi.fn().mockReturnValue(true),
});

const createMockAgentService = (): Partial<AgentService> => ({
  getAgentSystemPrompt: vi.fn().mockResolvedValue({
    agentName: 'security-specialist',
    displayName: 'Security Specialist',
    systemPrompt:
      'You are a Security Specialist. Focus on vulnerability detection.',
    description: 'Security analysis for PLAN mode',
  } as AgentSystemPrompt),
  prepareParallelAgents: vi.fn().mockResolvedValue({
    agents: [
      {
        id: 'security-specialist',
        displayName: 'Security Specialist',
        taskPrompt: 'Security analysis prompt',
        description: 'Security analysis for PLAN mode',
      },
      {
        id: 'accessibility-specialist',
        displayName: 'Accessibility Specialist',
        taskPrompt: 'Accessibility analysis prompt',
        description: 'Accessibility analysis for PLAN mode',
      },
    ],
    parallelExecutionHint:
      'Use Task tool with subagent_type="general-purpose" and run_in_background=true',
  } as ParallelAgentSet),
  getRecommendedAgents: vi
    .fn()
    .mockReturnValue(['security-specialist', 'accessibility-specialist']),
});

const createMockChecklistService = (): Partial<ChecklistService> => ({
  generateChecklist: vi.fn().mockResolvedValue({
    checklists: [
      {
        domain: 'security',
        icon: '🔒',
        priority: 'high',
        items: [{ id: 'sec-1', text: 'Validate input', priority: 'high' }],
      },
    ],
    summary: { total: 1, critical: 0, high: 1, medium: 0, low: 0 },
    matchedTriggers: [],
  }),
  getAvailableDomains: vi
    .fn()
    .mockReturnValue([
      'security',
      'accessibility',
      'performance',
      'testing',
      'code-quality',
      'seo',
    ]),
  clearCache: vi.fn(),
});

const createMockContextService = (): Partial<ContextService> => ({
  analyzeTask: vi.fn().mockResolvedValue({
    analysis: {
      intent: 'feature_development',
      category: 'api',
      complexity: 'medium',
      keywords: ['auth', 'login'],
    },
    riskAssessment: {
      level: 'high',
      reason: 'API endpoints need security review',
      attentionAreas: ['input_validation', 'rate_limiting'],
    },
    checklists: [],
    checklistSummary: { total: 0, critical: 0, high: 0, medium: 0, low: 0 },
    matchedTriggers: [],
    recommendedSpecialists: [
      {
        name: 'security-specialist',
        reason: 'Review API security',
        priority: 1,
      },
    ],
    suggestedWorkflow: {
      phases: [
        { phase: 'Design', focus: ['Define requirements'] },
        { phase: 'Implementation', focus: ['Write code'] },
      ],
    },
    contextHints: {
      projectType: 'web_application',
      securityLevel: 'high',
      mustConsider: ['OWASP Top 10'],
    },
  }),
});

const createMockModelResolverService = (): Partial<ModelResolverService> => ({
  resolveForMode: vi.fn().mockResolvedValue({
    model: 'claude-sonnet-4-20250514',
    source: 'system',
  }),
  resolveForAgent: vi.fn().mockResolvedValue({
    model: 'claude-sonnet-4-20250514',
    source: 'system',
  }),
});

const createMockSessionService = (): Partial<SessionService> => ({
  createSession: vi.fn().mockResolvedValue({
    success: true,
    sessionId: 'test-session-id',
    filePath: 'docs/codingbuddy/sessions/test-session-id.md',
  }),
  getActiveSession: vi.fn().mockResolvedValue(null),
  getSession: vi.fn().mockResolvedValue(null),
  updateSession: vi.fn().mockResolvedValue({ success: true }),
});

// Import after mocks
import { McpService } from './mcp.service';

// Helper function to create McpService with handlers
interface CreateMcpServiceOptions {
  rulesService?: Partial<RulesService>;
  keywordService?: Partial<KeywordService>;
  configService?: Partial<ConfigService>;
  configDiffService?: Partial<ConfigDiffService>;
  analyzerService?: Partial<AnalyzerService>;
  skillRecommendationService?: Partial<SkillRecommendationService>;
  languageService?: Partial<LanguageService>;
  agentService?: Partial<AgentService>;
  checklistService?: Partial<ChecklistService>;
  contextService?: Partial<ContextService>;
  modelResolverService?: Partial<ModelResolverService>;
  sessionService?: Partial<SessionService>;
}

function createMcpServiceWithHandlers(
  defaults: CreateMcpServiceOptions,
  overrides: Partial<CreateMcpServiceOptions> = {},
): McpService {
  const services = { ...defaults, ...overrides };

  const toolHandlers: ToolHandler[] = [
    new RulesHandler(services.rulesService as RulesService),
    new ConfigHandler(
      services.configService as ConfigService,
      services.configDiffService as ConfigDiffService,
      services.analyzerService as AnalyzerService,
    ),
    new SkillHandler(
      services.skillRecommendationService as SkillRecommendationService,
    ),
    new AgentHandler(services.agentService as AgentService),
    new ModeHandler(
      services.keywordService as KeywordService,
      services.configService as ConfigService,
      services.languageService as LanguageService,
      services.modelResolverService as ModelResolverService,
      services.sessionService as SessionService,
    ),
    new ChecklistContextHandler(
      services.checklistService as ChecklistService,
      services.contextService as ContextService,
    ),
  ];

  return new McpService(
    services.rulesService as RulesService,
    services.configService as ConfigService,
    toolHandlers,
  );
}

describe('McpService', () => {
  let mockRulesService: Partial<RulesService>;
  let mockKeywordService: Partial<KeywordService>;
  let mockConfigService: Partial<ConfigService>;
  let mockConfigDiffService: Partial<ConfigDiffService>;
  let mockAnalyzerService: Partial<AnalyzerService>;
  let mockSkillRecommendationService: Partial<SkillRecommendationService>;
  let mockLanguageService: Partial<LanguageService>;
  let mockAgentService: Partial<AgentService>;
  let mockChecklistService: Partial<ChecklistService>;
  let mockContextService: Partial<ContextService>;
  let mockModelResolverService: Partial<ModelResolverService>;
  let mockSessionService: Partial<SessionService>;

  const testConfig: CodingBuddyConfig = {
    language: 'ko',
    projectName: 'Test Project',
    techStack: {
      frontend: ['React', 'TypeScript'],
    },
    architecture: {
      pattern: 'feature-sliced-design',
    },
  };

  // Default mock services container for helper function
  let defaultMocks: CreateMcpServiceOptions;

  beforeEach(() => {
    handlers.clear();
    mockRulesService = createMockRulesService();
    mockKeywordService = createMockKeywordService();
    mockConfigService = createMockConfigService(testConfig);
    mockConfigDiffService = createMockConfigDiffService();
    mockAnalyzerService = createMockAnalyzerService();
    mockSkillRecommendationService = createMockSkillRecommendationService();
    mockLanguageService = createMockLanguageService();
    mockAgentService = createMockAgentService();
    mockChecklistService = createMockChecklistService();
    mockContextService = createMockContextService();
    mockModelResolverService = createMockModelResolverService();
    mockSessionService = createMockSessionService();

    // Store default mocks for use in helper function
    defaultMocks = {
      rulesService: mockRulesService,
      keywordService: mockKeywordService,
      configService: mockConfigService,
      configDiffService: mockConfigDiffService,
      analyzerService: mockAnalyzerService,
      skillRecommendationService: mockSkillRecommendationService,
      languageService: mockLanguageService,
      agentService: mockAgentService,
      checklistService: mockChecklistService,
      contextService: mockContextService,
      modelResolverService: mockModelResolverService,
      sessionService: mockSessionService,
    };

    const mcpService = createMcpServiceWithHandlers(defaultMocks);
    mcpService.onModuleInit();
  });

  describe('Resources', () => {
    it('should list config://project resource', async () => {
      const handler = handlers.get('resources/list');
      expect(handler).toBeDefined();

      const result = (await handler!({})) as {
        resources: { uri: string; name: string }[];
      };
      const configResource = result.resources.find(
        r => r.uri === 'config://project',
      );

      expect(configResource).toBeDefined();
      expect(configResource!.name).toBe('Project Configuration');
    });

    it('should read config://project resource', async () => {
      const handler = handlers.get('resources/read');
      expect(handler).toBeDefined();

      const result = (await handler!({
        params: { uri: 'config://project' },
      })) as { contents: { uri: string; mimeType: string; text: string }[] };

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].uri).toBe('config://project');
      expect(result.contents[0].mimeType).toBe('application/json');

      const parsedContent = JSON.parse(result.contents[0].text);
      expect(parsedContent.settings.language).toBe('ko');
      expect(parsedContent.settings.projectName).toBe('Test Project');
    });

    it('should read rules:// resources', async () => {
      const handler = handlers.get('resources/read');
      expect(handler).toBeDefined();

      const result = (await handler!({
        params: { uri: 'rules://rules/core.md' },
      })) as { contents: { uri: string; text: string }[] };

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].text).toContain('Core Rules');
    });
  });

  describe('Tools', () => {
    it('should list get_project_config tool', async () => {
      const handler = handlers.get('tools/list');
      expect(handler).toBeDefined();

      const result = (await handler!({})) as {
        tools: { name: string; description: string }[];
      };
      const configTool = result.tools.find(
        t => t.name === 'get_project_config',
      );

      expect(configTool).toBeDefined();
      expect(configTool!.description).toContain('project configuration');
    });

    it('should call get_project_config tool', async () => {
      const handler = handlers.get('tools/call');
      expect(handler).toBeDefined();

      const result = (await handler!({
        params: { name: 'get_project_config', arguments: {} },
      })) as { content: { type: string; text: string }[] };

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.language).toBe('ko');
      expect(parsedContent.projectName).toBe('Test Project');
      expect(parsedContent.techStack.frontend).toContain('React');
    });

    it('should call search_rules tool', async () => {
      const handler = handlers.get('tools/call');
      expect(handler).toBeDefined();

      const result = (await handler!({
        params: { name: 'search_rules', arguments: { query: 'test' } },
      })) as { content: { type: string; text: string }[] };

      expect(result.content).toHaveLength(1);
      expect(mockRulesService.searchRules).toHaveBeenCalledWith('test');
    });

    it('should call get_agent_details tool', async () => {
      const handler = handlers.get('tools/call');
      expect(handler).toBeDefined();

      const result = (await handler!({
        params: {
          name: 'get_agent_details',
          arguments: { agentName: 'frontend-developer' },
        },
      })) as { content: { type: string; text: string }[] };

      expect(result.content).toHaveLength(1);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.name).toBe('Frontend Developer');
    });

    describe('source field in tool responses', () => {
      it('should include source field in search_rules results', async () => {
        vi.mocked(mockRulesService.searchRules!).mockResolvedValue([
          {
            file: 'rules/core.md',
            matches: ['Line 1: test content'],
            score: 1,
            source: 'default',
          },
          {
            file: 'custom-rules.md',
            matches: ['Line 5: custom test'],
            score: 1,
            source: 'custom',
          },
        ]);

        const handler = handlers.get('tools/call');
        expect(handler).toBeDefined();

        const result = (await handler!({
          params: { name: 'search_rules', arguments: { query: 'test' } },
        })) as { content: { type: string; text: string }[] };

        const parsed = JSON.parse(result.content[0].text);
        expect(parsed).toHaveLength(2);
        expect(parsed[0]).toHaveProperty('source', 'default');
        expect(parsed[1]).toHaveProperty('source', 'custom');
      });

      it('should include source field in get_agent_details result', async () => {
        vi.mocked(mockRulesService.getAgent!).mockResolvedValue({
          name: 'Frontend Developer',
          description: 'Frontend development specialist',
          role: {
            title: 'Senior Frontend Developer',
            expertise: ['React', 'TypeScript'],
            responsibilities: ['Write clean code', 'Follow best practices'],
          },
          source: 'default',
        });

        const handler = handlers.get('tools/call');
        expect(handler).toBeDefined();

        const result = (await handler!({
          params: {
            name: 'get_agent_details',
            arguments: { agentName: 'frontend-developer' },
          },
        })) as { content: { type: string; text: string }[] };

        const parsed = JSON.parse(result.content[0].text);
        expect(parsed).toHaveProperty('source', 'default');
      });

      it('should return source: custom for custom agents', async () => {
        vi.mocked(mockRulesService.getAgent!).mockResolvedValue({
          name: 'Custom Agent',
          description: 'Project-specific agent',
          role: {
            title: 'Custom Role',
            expertise: ['Project Knowledge'],
          },
          source: 'custom',
        });

        const handler = handlers.get('tools/call');
        expect(handler).toBeDefined();

        const result = (await handler!({
          params: {
            name: 'get_agent_details',
            arguments: { agentName: 'custom-agent' },
          },
        })) as { content: { type: string; text: string }[] };

        const parsed = JSON.parse(result.content[0].text);
        expect(parsed).toHaveProperty('source', 'custom');
      });
    });

    describe('resolvedModel field in get_agent_details', () => {
      it('should include resolvedModel with source: agent when agent has model.preferred', async () => {
        vi.mocked(mockRulesService.getAgent!).mockResolvedValue({
          name: 'Frontend Developer',
          description: 'Frontend development specialist',
          role: {
            title: 'Senior Frontend Developer',
            expertise: ['React', 'TypeScript'],
            responsibilities: ['Write clean code', 'Follow best practices'],
          },
          model: {
            preferred: 'claude-sonnet-4-20250514',
            reason: 'Balanced model optimized for code generation',
          },
          source: 'default',
        });

        const handler = handlers.get('tools/call');
        expect(handler).toBeDefined();

        const result = (await handler!({
          params: {
            name: 'get_agent_details',
            arguments: { agentName: 'frontend-developer' },
          },
        })) as { content: { type: string; text: string }[] };

        const parsed = JSON.parse(result.content[0].text);
        expect(parsed.resolvedModel).toEqual({
          model: 'claude-sonnet-4-20250514',
          source: 'agent',
        });
      });

      it('should include resolvedModel with source: system when agent has no model', async () => {
        vi.mocked(mockRulesService.getAgent!).mockResolvedValue({
          name: 'Legacy Agent',
          description: 'Agent without model config',
          role: {
            title: 'Legacy Role',
            expertise: ['Legacy Tech'],
          },
          source: 'default',
        });

        const handler = handlers.get('tools/call');
        expect(handler).toBeDefined();

        const result = (await handler!({
          params: {
            name: 'get_agent_details',
            arguments: { agentName: 'legacy-agent' },
          },
        })) as { content: { type: string; text: string }[] };

        const parsed = JSON.parse(result.content[0].text);
        expect(parsed.resolvedModel).toEqual({
          model: 'claude-sonnet-4-20250514',
          source: 'system',
        });
      });

      it('should include resolvedModel with source: system when agent model has no preferred', async () => {
        vi.mocked(mockRulesService.getAgent!).mockResolvedValue({
          name: 'Partial Model Agent',
          description: 'Agent with partial model config',
          role: {
            title: 'Partial Role',
            expertise: ['Partial Tech'],
          },
          model: {
            reason: 'Some reason but no preferred model',
          },
          source: 'default',
        });

        const handler = handlers.get('tools/call');
        expect(handler).toBeDefined();

        const result = (await handler!({
          params: {
            name: 'get_agent_details',
            arguments: { agentName: 'partial-model-agent' },
          },
        })) as { content: { type: string; text: string }[] };

        const parsed = JSON.parse(result.content[0].text);
        expect(parsed.resolvedModel).toEqual({
          model: 'claude-sonnet-4-20250514',
          source: 'system',
        });
      });

      it('should preserve original model field in response alongside resolvedModel', async () => {
        vi.mocked(mockRulesService.getAgent!).mockResolvedValue({
          name: 'Frontend Developer',
          description: 'Frontend development specialist',
          role: {
            title: 'Senior Frontend Developer',
            expertise: ['React', 'TypeScript'],
          },
          model: {
            preferred: 'claude-opus-4-20250514',
            reason: 'Best for complex reasoning',
          },
          source: 'default',
        });

        const handler = handlers.get('tools/call');
        expect(handler).toBeDefined();

        const result = (await handler!({
          params: {
            name: 'get_agent_details',
            arguments: { agentName: 'frontend-developer' },
          },
        })) as { content: { type: string; text: string }[] };

        const parsed = JSON.parse(result.content[0].text);
        // Original model field should be preserved
        expect(parsed.model).toEqual({
          preferred: 'claude-opus-4-20250514',
          reason: 'Best for complex reasoning',
        });
        // And resolvedModel should also be present
        expect(parsed.resolvedModel).toEqual({
          model: 'claude-opus-4-20250514',
          source: 'agent',
        });
      });
    });

    it('should list suggest_config_updates tool', async () => {
      const handler = handlers.get('tools/list');
      expect(handler).toBeDefined();

      const result = (await handler!({})) as {
        tools: { name: string; description: string }[];
      };
      const suggestTool = result.tools.find(
        t => t.name === 'suggest_config_updates',
      );

      expect(suggestTool).toBeDefined();
      expect(suggestTool!.description).toContain('config');
    });

    it('should call suggest_config_updates tool', async () => {
      const handler = handlers.get('tools/call');
      expect(handler).toBeDefined();

      const result = (await handler!({
        params: { name: 'suggest_config_updates', arguments: {} },
      })) as { content: { type: string; text: string }[] };

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent).toHaveProperty('isUpToDate');
      expect(parsedContent).toHaveProperty('suggestions');

      // Verify reload is called to get fresh config
      expect(mockConfigService.reload).toHaveBeenCalledTimes(1);
    });

    it('should include language setting in parse_mode response', async () => {
      const handler = handlers.get('tools/call');
      expect(handler).toBeDefined();

      const result = (await handler!({
        params: {
          name: 'parse_mode',
          arguments: { prompt: 'PLAN Create a login form' },
        },
      })) as { content: { type: string; text: string }[] };

      expect(result.content).toHaveLength(1);
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.language).toBe('ko');
      expect(parsedContent.languageInstruction).toBe(
        'Always respond in Korean (한국어).',
      );
      expect(parsedContent.mode).toBe('PLAN');
    });

    it('should include Mode Agent fields in parse_mode response', async () => {
      const handler = handlers.get('tools/call');
      expect(handler).toBeDefined();

      const result = (await handler!({
        params: {
          name: 'parse_mode',
          arguments: { prompt: 'ACT implement feature' },
        },
      })) as { content: { type: string; text: string }[] };

      expect(result.content).toHaveLength(1);
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.mode).toBe('ACT');
      expect(parsedContent.agent).toBe('act-mode');
      expect(parsedContent.delegates_to).toBe('frontend-developer');
      expect(parsedContent.delegate_agent_info).toEqual({
        name: 'Frontend Developer',
        description: 'React/Next.js frontend specialist',
        expertise: ['React', 'TypeScript'],
      });
    });

    it('should include EVAL mode agent information in parse_mode response', async () => {
      const handler = handlers.get('tools/call');
      expect(handler).toBeDefined();

      const result = (await handler!({
        params: {
          name: 'parse_mode',
          arguments: { prompt: 'EVAL review code quality' },
        },
      })) as { content: { type: string; text: string }[] };

      expect(result.content).toHaveLength(1);
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.mode).toBe('EVAL');
      expect(parsedContent.agent).toBe('eval-mode');
      expect(parsedContent.delegates_to).toBe('code-reviewer');
      expect(parsedContent.delegate_agent_info).toEqual({
        name: 'Code Reviewer',
        description: 'Code quality evaluation specialist',
        expertise: ['Code Quality', 'SOLID Principles'],
      });
    });

    describe('resolvedModel field in parse_mode', () => {
      it('should include resolvedModel with source: mode when mode agent has model.preferred', async () => {
        // Create service with modelResolverService returning mode source
        const customModelResolverService: Partial<ModelResolverService> = {
          resolveForMode: vi.fn().mockResolvedValue({
            model: 'claude-sonnet-4-20250514',
            source: 'mode',
          }),
        };
        handlers.clear();
        const mcpService = createMcpServiceWithHandlers(defaultMocks, {
          modelResolverService: customModelResolverService,
        });
        mcpService.onModuleInit();

        const handler = handlers.get('tools/call');
        expect(handler).toBeDefined();

        const result = (await handler!({
          params: {
            name: 'parse_mode',
            arguments: { prompt: 'PLAN Create a login form' },
          },
        })) as { content: { type: string; text: string }[] };

        expect(result.content).toHaveLength(1);
        const parsedContent = JSON.parse(result.content[0].text);
        expect(parsedContent.resolvedModel).toEqual({
          model: 'claude-sonnet-4-20250514',
          source: 'mode',
        });
      });

      it('should include resolvedModel with source: system when mode agent has no model', async () => {
        // Create service with modelResolverService returning system source
        const customModelResolverService: Partial<ModelResolverService> = {
          resolveForMode: vi.fn().mockResolvedValue({
            model: 'claude-sonnet-4-20250514',
            source: 'system',
          }),
        };
        handlers.clear();
        const mcpService = createMcpServiceWithHandlers(defaultMocks, {
          modelResolverService: customModelResolverService,
        });
        mcpService.onModuleInit();

        const handler = handlers.get('tools/call');
        expect(handler).toBeDefined();

        const result = (await handler!({
          params: {
            name: 'parse_mode',
            arguments: { prompt: 'PLAN Create a login form' },
          },
        })) as { content: { type: string; text: string }[] };

        expect(result.content).toHaveLength(1);
        const parsedContent = JSON.parse(result.content[0].text);
        expect(parsedContent.resolvedModel).toEqual({
          model: 'claude-sonnet-4-20250514',
          source: 'system',
        });
      });

      it('should include resolvedModel with source: system when mode agent loading fails', async () => {
        // Create service with modelResolverService returning system source (simulating agent load failure)
        const customModelResolverService: Partial<ModelResolverService> = {
          resolveForMode: vi.fn().mockResolvedValue({
            model: 'claude-sonnet-4-20250514',
            source: 'system',
          }),
        };
        handlers.clear();
        const mcpService = createMcpServiceWithHandlers(defaultMocks, {
          modelResolverService: customModelResolverService,
        });
        mcpService.onModuleInit();

        const handler = handlers.get('tools/call');
        expect(handler).toBeDefined();

        const result = (await handler!({
          params: {
            name: 'parse_mode',
            arguments: { prompt: 'PLAN Create a login form' },
          },
        })) as { content: { type: string; text: string }[] };

        expect(result.content).toHaveLength(1);
        const parsedContent = JSON.parse(result.content[0].text);
        expect(parsedContent.resolvedModel).toEqual({
          model: 'claude-sonnet-4-20250514',
          source: 'system',
        });
      });

      it('should include resolvedModel for ACT mode', async () => {
        // Create service with modelResolverService returning mode source for ACT
        const customModelResolverService: Partial<ModelResolverService> = {
          resolveForMode: vi.fn().mockResolvedValue({
            model: 'claude-opus-4-20250514',
            source: 'mode',
          }),
        };
        handlers.clear();
        const mcpService = createMcpServiceWithHandlers(defaultMocks, {
          modelResolverService: customModelResolverService,
        });
        mcpService.onModuleInit();

        const handler = handlers.get('tools/call');
        expect(handler).toBeDefined();

        const result = (await handler!({
          params: {
            name: 'parse_mode',
            arguments: { prompt: 'ACT implement feature' },
          },
        })) as { content: { type: string; text: string }[] };

        expect(result.content).toHaveLength(1);
        const parsedContent = JSON.parse(result.content[0].text);
        expect(parsedContent.resolvedModel).toEqual({
          model: 'claude-opus-4-20250514',
          source: 'mode',
        });
      });

      it('should include resolvedModel for EVAL mode', async () => {
        // Create service with modelResolverService returning mode source for EVAL
        const customModelResolverService: Partial<ModelResolverService> = {
          resolveForMode: vi.fn().mockResolvedValue({
            model: 'claude-sonnet-4-20250514',
            source: 'mode',
          }),
        };
        handlers.clear();
        const mcpService = createMcpServiceWithHandlers(defaultMocks, {
          modelResolverService: customModelResolverService,
        });
        mcpService.onModuleInit();

        const handler = handlers.get('tools/call');
        expect(handler).toBeDefined();

        const result = (await handler!({
          params: {
            name: 'parse_mode',
            arguments: { prompt: 'EVAL review code quality' },
          },
        })) as { content: { type: string; text: string }[] };

        expect(result.content).toHaveLength(1);
        const parsedContent = JSON.parse(result.content[0].text);
        expect(parsedContent.resolvedModel).toEqual({
          model: 'claude-sonnet-4-20250514',
          source: 'mode',
        });
      });

      it('should include resolvedModel even when no mode keyword is provided (defaults to PLAN)', async () => {
        // Create service with default modelResolverService (returns system default)
        const customModelResolverService: Partial<ModelResolverService> = {
          resolveForMode: vi.fn().mockResolvedValue({
            model: 'claude-sonnet-4-20250514',
            source: 'mode',
          }),
        };
        handlers.clear();
        const mcpService = createMcpServiceWithHandlers(defaultMocks, {
          modelResolverService: customModelResolverService,
        });
        mcpService.onModuleInit();

        const handler = handlers.get('tools/call');
        expect(handler).toBeDefined();

        const result = (await handler!({
          params: {
            name: 'parse_mode',
            arguments: { prompt: 'Create a login form' },
          },
        })) as { content: { type: string; text: string }[] };

        expect(result.content).toHaveLength(1);
        const parsedContent = JSON.parse(result.content[0].text);
        // Should still have resolvedModel even without explicit mode keyword
        expect(parsedContent.resolvedModel).toBeDefined();
      });

      it('should use global config when mode agent has no model', async () => {
        // Create service with modelResolverService returning global source
        const customModelResolverService: Partial<ModelResolverService> = {
          resolveForMode: vi.fn().mockResolvedValue({
            model: 'claude-opus-4-20250514',
            source: 'global',
          }),
        };
        handlers.clear();
        const mcpService = createMcpServiceWithHandlers(defaultMocks, {
          modelResolverService: customModelResolverService,
        });
        mcpService.onModuleInit();

        const handler = handlers.get('tools/call');
        expect(handler).toBeDefined();

        const result = (await handler!({
          params: {
            name: 'parse_mode',
            arguments: { prompt: 'PLAN Create a login form' },
          },
        })) as { content: { type: string; text: string }[] };

        expect(result.content).toHaveLength(1);
        const parsedContent = JSON.parse(result.content[0].text);
        expect(parsedContent.resolvedModel).toEqual({
          model: 'claude-opus-4-20250514',
          source: 'global',
        });
      });
    });

    describe('parse_mode tool description', () => {
      it('should contain MANDATORY keyword for enforcement', async () => {
        const handler = handlers.get('tools/list');
        expect(handler).toBeDefined();

        const result = (await handler!({})) as {
          tools: { name: string; description: string }[];
        };
        const parseModeTool = result.tools.find(t => t.name === 'parse_mode');

        expect(parseModeTool).toBeDefined();
        expect(parseModeTool!.description).toContain('MANDATORY');
      });

      it('should contain MUST directive for strict enforcement', async () => {
        const handler = handlers.get('tools/list');
        expect(handler).toBeDefined();

        const result = (await handler!({})) as {
          tools: { name: string; description: string }[];
        };
        const parseModeTool = result.tools.find(t => t.name === 'parse_mode');

        expect(parseModeTool).toBeDefined();
        expect(parseModeTool!.description).toContain(
          'MUST call this tool FIRST',
        );
      });

      it('should mention PLAN, ACT, EVAL keywords', async () => {
        const handler = handlers.get('tools/list');
        expect(handler).toBeDefined();

        const result = (await handler!({})) as {
          tools: { name: string; description: string }[];
        };
        const parseModeTool = result.tools.find(t => t.name === 'parse_mode');

        expect(parseModeTool).toBeDefined();
        expect(parseModeTool!.description).toContain('PLAN');
        expect(parseModeTool!.description).toContain('ACT');
        expect(parseModeTool!.description).toContain('EVAL');
      });

      it('should warn about protocol violation', async () => {
        const handler = handlers.get('tools/list');
        expect(handler).toBeDefined();

        const result = (await handler!({})) as {
          tools: { name: string; description: string }[];
        };
        const parseModeTool = result.tools.find(t => t.name === 'parse_mode');

        expect(parseModeTool).toBeDefined();
        expect(parseModeTool!.description).toContain('protocol violation');
      });

      it('should mention localized keyword equivalents (Korean, Japanese, Chinese, Spanish)', async () => {
        const handler = handlers.get('tools/list');
        expect(handler).toBeDefined();

        const result = (await handler!({})) as {
          tools: { name: string; description: string }[];
        };
        const parseModeTool = result.tools.find(t => t.name === 'parse_mode');

        expect(parseModeTool).toBeDefined();
        expect(parseModeTool!.description).toContain('localized equivalents');
        // Korean
        expect(parseModeTool!.description).toContain('계획');
        expect(parseModeTool!.description).toContain('실행');
        expect(parseModeTool!.description).toContain('평가');
        // Japanese
        expect(parseModeTool!.description).toContain('計画');
        expect(parseModeTool!.description).toContain('実行');
        expect(parseModeTool!.description).toContain('評価');
        // Chinese
        expect(parseModeTool!.description).toContain('计划');
        expect(parseModeTool!.description).toContain('执行');
        expect(parseModeTool!.description).toContain('评估');
        // Spanish
        expect(parseModeTool!.description).toContain('PLANIFICAR');
        expect(parseModeTool!.description).toContain('ACTUAR');
        expect(parseModeTool!.description).toContain('EVALUAR');
      });
    });
  });

  describe('Prompts', () => {
    it('should list activate_agent prompt', async () => {
      const handler = handlers.get('prompts/list');
      expect(handler).toBeDefined();

      const result = (await handler!({})) as { prompts: { name: string }[] };
      const agentPrompt = result.prompts.find(p => p.name === 'activate_agent');

      expect(agentPrompt).toBeDefined();
    });

    it('should include project context in activate_agent prompt', async () => {
      const handler = handlers.get('prompts/get');
      expect(handler).toBeDefined();

      const result = (await handler!({
        params: {
          name: 'activate_agent',
          arguments: { role: 'frontend-developer' },
        },
      })) as { messages: { content: { text: string } }[] };

      expect(result.messages).toHaveLength(1);
      const messageText = result.messages[0].content.text;

      // Should include agent info
      expect(messageText).toContain('Frontend Developer');
      expect(messageText).toContain('Write clean code');

      // Should include project context
      expect(messageText).toContain('Project Context');
      expect(messageText).toContain('Test Project');
      expect(messageText).toContain('ko');
      expect(messageText).toContain('React');
      expect(messageText).toContain('feature-sliced-design');
    });

    it('should work without project config (graceful fallback)', async () => {
      // Clear handlers and recreate with empty config
      handlers.clear();
      const emptyConfigService = createMockConfigService({});
      const serviceWithEmptyConfig = createMcpServiceWithHandlers(
        defaultMocks,
        {
          configService: emptyConfigService,
        },
      );
      serviceWithEmptyConfig.onModuleInit();

      const handler = handlers.get('prompts/get');
      expect(handler).toBeDefined();

      const result = (await handler!({
        params: {
          name: 'activate_agent',
          arguments: { role: 'frontend-developer' },
        },
      })) as { messages: { content: { text: string } }[] };

      // Should still work without config
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content.text).toContain('Frontend Developer');
    });
  });

  describe('formatProjectContext', () => {
    it('should format all config fields', async () => {
      handlers.clear();
      const fullConfigService = createMockConfigService({
        projectName: 'Full Project',
        language: 'en',
        techStack: {
          frontend: ['Vue', 'Vite'],
          backend: ['Node', 'Express'],
          languages: ['TypeScript'],
          database: ['PostgreSQL'],
        },
        architecture: {
          pattern: 'clean-architecture',
        },
        testStrategy: {
          approach: 'tdd',
        },
        conventions: {
          style: 'airbnb',
        },
      });

      const service = createMcpServiceWithHandlers(defaultMocks, {
        configService: fullConfigService,
      });
      service.onModuleInit();

      const handler = handlers.get('prompts/get');
      expect(handler).toBeDefined();

      const result = (await handler!({
        params: {
          name: 'activate_agent',
          arguments: { role: 'frontend-developer' },
        },
      })) as { messages: { content: { text: string } }[] };

      const text = result.messages[0].content.text;
      expect(text).toContain('Full Project');
      expect(text).toContain('en');
      expect(text).toContain('Vue');
      expect(text).toContain('Node');
      expect(text).toContain('TypeScript');
      expect(text).toContain('PostgreSQL');
      expect(text).toContain('clean-architecture');
      expect(text).toContain('tdd');
      expect(text).toContain('airbnb');
    });
  });

  describe('Error handling', () => {
    describe('Resources errors', () => {
      it('should throw error for invalid URI scheme', async () => {
        const handler = handlers.get('resources/read');
        expect(handler).toBeDefined();

        await expect(
          handler!({ params: { uri: 'invalid://something' } }),
        ).rejects.toThrow('Invalid URI scheme');
      });

      it('should throw error when rules resource not found', async () => {
        vi.mocked(mockRulesService.getRuleContent!).mockRejectedValue(
          new Error('File not found'),
        );

        const handler = handlers.get('resources/read');
        expect(handler).toBeDefined();

        await expect(
          handler!({ params: { uri: 'rules://nonexistent.md' } }),
        ).rejects.toThrow('Resource not found');
      });

      it('should throw error when config://project fails to load', async () => {
        handlers.clear();
        const failingConfigService = createMockConfigService({});
        vi.mocked(failingConfigService.getProjectConfig!).mockRejectedValue(
          new Error('Config load error'),
        );

        const service = createMcpServiceWithHandlers(
          {
            rulesService: mockRulesService,
            keywordService: mockKeywordService,
            configService: mockConfigService,
            configDiffService: mockConfigDiffService,
            analyzerService: mockAnalyzerService,
            skillRecommendationService: mockSkillRecommendationService,
            languageService: mockLanguageService,
            agentService: mockAgentService,
            checklistService: mockChecklistService,
            contextService: mockContextService,
            modelResolverService: mockModelResolverService,
          },
          { configService: failingConfigService },
        );
        service.onModuleInit();

        const handler = handlers.get('resources/read');
        expect(handler).toBeDefined();

        await expect(
          handler!({ params: { uri: 'config://project' } }),
        ).rejects.toThrow('Failed to load project configuration');
      });
    });

    describe('Tools errors', () => {
      it('should throw error for unknown tool', async () => {
        const handler = handlers.get('tools/call');
        expect(handler).toBeDefined();

        await expect(
          handler!({ params: { name: 'unknown_tool', arguments: {} } }),
        ).rejects.toThrow('Tool not found: unknown_tool');
      });

      it('should return error response when get_agent_details fails', async () => {
        vi.mocked(mockRulesService.getAgent!).mockRejectedValue(
          new Error('Agent not found'),
        );

        const handler = handlers.get('tools/call');
        expect(handler).toBeDefined();

        const result = (await handler!({
          params: {
            name: 'get_agent_details',
            arguments: { agentName: 'invalid' },
          },
        })) as { isError: boolean; content: { text: string }[] };

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("Agent 'invalid' not found");
      });

      it('should return error response when parse_mode fails', async () => {
        vi.mocked(mockKeywordService.parseMode!).mockRejectedValue(
          new Error('Parse error'),
        );

        const handler = handlers.get('tools/call');
        expect(handler).toBeDefined();

        const result = (await handler!({
          params: { name: 'parse_mode', arguments: { prompt: 'INVALID test' } },
        })) as { isError: boolean; content: { text: string }[] };

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Failed to parse mode');
      });

      it('should return error response when get_project_config fails', async () => {
        handlers.clear();
        const failingConfigService = createMockConfigService({});
        vi.mocked(failingConfigService.getSettings!).mockRejectedValue(
          new Error('Settings error'),
        );

        const service = createMcpServiceWithHandlers(defaultMocks, {
          configService: failingConfigService,
        });
        service.onModuleInit();

        const handler = handlers.get('tools/call');
        expect(handler).toBeDefined();

        const result = (await handler!({
          params: { name: 'get_project_config', arguments: {} },
        })) as { isError: boolean; content: { text: string }[] };

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain(
          'Failed to get project config',
        );
      });

      it('should use system default model when model resolution fails during parse_mode', async () => {
        handlers.clear();
        // Mock modelResolverService to return system default (simulating error recovery)
        const customModelResolverService = {
          resolveForMode: vi.fn().mockResolvedValue({
            model: 'claude-sonnet-4-20250514',
            source: 'system',
          }),
          resolveForAgent: vi.fn().mockResolvedValue({
            model: 'claude-sonnet-4-20250514',
            source: 'system',
          }),
        };

        const service = createMcpServiceWithHandlers(defaultMocks, {
          modelResolverService: customModelResolverService,
        });
        service.onModuleInit();

        const handler = handlers.get('tools/call');
        expect(handler).toBeDefined();

        const result = (await handler!({
          params: {
            name: 'parse_mode',
            arguments: { prompt: 'PLAN Create a login form' },
          },
        })) as { content: { type: string; text: string }[] };

        expect(result.content).toHaveLength(1);
        const parsedContent = JSON.parse(result.content[0].text);
        // Should still work, falling back to system default
        expect(parsedContent.resolvedModel).toBeDefined();
        expect(parsedContent.resolvedModel.source).toBe('system');
      });

      it('should return error response when suggest_config_updates fails', async () => {
        handlers.clear();
        const failingAnalyzerService = createMockAnalyzerService();
        vi.mocked(failingAnalyzerService.analyzeProject!).mockRejectedValue(
          new Error('Analysis failed'),
        );

        const service = createMcpServiceWithHandlers(defaultMocks, {
          analyzerService: failingAnalyzerService,
        });
        service.onModuleInit();

        const handler = handlers.get('tools/call');
        expect(handler).toBeDefined();

        const result = (await handler!({
          params: { name: 'suggest_config_updates', arguments: {} },
        })) as { isError: boolean; content: { text: string }[] };

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain(
          'Failed to suggest config updates',
        );
      });
    });

    describe('Prompts errors', () => {
      it('should throw error when agent not found in activate_agent', async () => {
        vi.mocked(mockRulesService.getAgent!).mockRejectedValue(
          new Error('Agent not found'),
        );

        const handler = handlers.get('prompts/get');
        expect(handler).toBeDefined();

        await expect(
          handler!({
            params: {
              name: 'activate_agent',
              arguments: { role: 'invalid-agent' },
            },
          }),
        ).rejects.toThrow("Agent 'invalid-agent' not found");
      });

      it('should throw error for unknown prompt', async () => {
        const handler = handlers.get('prompts/get');
        expect(handler).toBeDefined();

        await expect(
          handler!({ params: { name: 'unknown_prompt', arguments: {} } }),
        ).rejects.toThrow('Prompt not found');
      });
    });
  });

  describe('startStdio', () => {
    it('should connect server with StdioServerTransport', async () => {
      const service = createMcpServiceWithHandlers(defaultMocks);

      // Should not throw
      await expect(service.startStdio()).resolves.not.toThrow();
    });
  });

  describe('getServer', () => {
    it('should return the MCP server instance', () => {
      const service = createMcpServiceWithHandlers(defaultMocks);

      const server = service.getServer();
      expect(server).toBeDefined();
    });
  });

  // ============================================================================
  // recommend_skills Tool Tests (RED phase - tests should FAIL)
  // ============================================================================

  describe('recommend_skills tool', () => {
    describe('Tool Registration', () => {
      it('should list recommend_skills tool', async () => {
        const handler = handlers.get('tools/list');
        expect(handler).toBeDefined();

        const result = (await handler!({})) as {
          tools: { name: string; description: string; inputSchema: object }[];
        };
        const recommendTool = result.tools.find(
          t => t.name === 'recommend_skills',
        );

        expect(recommendTool).toBeDefined();
        expect(recommendTool!.description).toContain('skill');
      });

      it('should have correct inputSchema for recommend_skills', async () => {
        const handler = handlers.get('tools/list');
        expect(handler).toBeDefined();

        const result = (await handler!({})) as {
          tools: {
            name: string;
            inputSchema: { properties: object; required: string[] };
          }[];
        };
        const recommendTool = result.tools.find(
          t => t.name === 'recommend_skills',
        );

        expect(recommendTool).toBeDefined();
        expect(recommendTool!.inputSchema.properties).toHaveProperty('prompt');
        expect(recommendTool!.inputSchema.required).toContain('prompt');
      });
    });

    describe('Basic Functionality', () => {
      it('should return recommendations for debugging prompt', async () => {
        const handler = handlers.get('tools/call');
        expect(handler).toBeDefined();

        const result = (await handler!({
          params: {
            name: 'recommend_skills',
            arguments: { prompt: 'I have a bug in my code' },
          },
        })) as { content: { type: string; text: string }[] };

        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('text');

        const parsed = JSON.parse(result.content[0].text);
        expect(parsed.recommendations).toBeDefined();
        expect(parsed.recommendations.length).toBeGreaterThan(0);
        expect(parsed.recommendations[0].skillName).toBe(
          'systematic-debugging',
        );
        expect(
          mockSkillRecommendationService.recommendSkills,
        ).toHaveBeenCalledWith('I have a bug in my code');
      });

      it('should return empty recommendations for unrelated prompt', async () => {
        vi.mocked(
          mockSkillRecommendationService.recommendSkills!,
        ).mockReturnValue({
          recommendations: [],
          originalPrompt: 'What is the weather today?',
        });

        const handler = handlers.get('tools/call');
        expect(handler).toBeDefined();

        const result = (await handler!({
          params: {
            name: 'recommend_skills',
            arguments: { prompt: 'What is the weather today?' },
          },
        })) as { content: { type: string; text: string }[] };

        const parsed = JSON.parse(result.content[0].text);
        expect(parsed.recommendations).toEqual([]);
      });

      it('should include originalPrompt in response', async () => {
        const handler = handlers.get('tools/call');
        expect(handler).toBeDefined();

        const result = (await handler!({
          params: {
            name: 'recommend_skills',
            arguments: { prompt: 'I have a bug in my code' },
          },
        })) as { content: { type: string; text: string }[] };

        const parsed = JSON.parse(result.content[0].text);
        expect(parsed.originalPrompt).toBe('I have a bug in my code');
      });
    });

    describe('Multi-language Support', () => {
      it('should work with English prompt', async () => {
        vi.mocked(
          mockSkillRecommendationService.recommendSkills!,
        ).mockReturnValue({
          recommendations: [
            {
              skillName: 'systematic-debugging',
              confidence: 'high',
              matchedPatterns: ['bug'],
              description: 'Systematic approach to debugging',
            },
          ],
          originalPrompt: 'There is a bug in the login feature',
        });

        const handler = handlers.get('tools/call');
        expect(handler).toBeDefined();

        const result = (await handler!({
          params: {
            name: 'recommend_skills',
            arguments: { prompt: 'There is a bug in the login feature' },
          },
        })) as { content: { type: string; text: string }[] };

        const parsed = JSON.parse(result.content[0].text);
        expect(parsed.recommendations).toHaveLength(1);
        expect(parsed.recommendations[0].skillName).toBe(
          'systematic-debugging',
        );
      });

      it('should work with Korean prompt', async () => {
        vi.mocked(
          mockSkillRecommendationService.recommendSkills!,
        ).mockReturnValue({
          recommendations: [
            {
              skillName: 'systematic-debugging',
              confidence: 'high',
              matchedPatterns: ['버그'],
              description: 'Systematic approach to debugging',
            },
          ],
          originalPrompt: '로그인에 버그가 있습니다',
        });

        const handler = handlers.get('tools/call');
        expect(handler).toBeDefined();

        const result = (await handler!({
          params: {
            name: 'recommend_skills',
            arguments: { prompt: '로그인에 버그가 있습니다' },
          },
        })) as { content: { type: string; text: string }[] };

        const parsed = JSON.parse(result.content[0].text);
        expect(parsed.recommendations).toHaveLength(1);
        expect(
          mockSkillRecommendationService.recommendSkills,
        ).toHaveBeenCalledWith('로그인에 버그가 있습니다');
      });

      it('should work with Japanese prompt', async () => {
        vi.mocked(
          mockSkillRecommendationService.recommendSkills!,
        ).mockReturnValue({
          recommendations: [
            {
              skillName: 'systematic-debugging',
              confidence: 'high',
              matchedPatterns: ['バグ'],
              description: 'Systematic approach to debugging',
            },
          ],
          originalPrompt: 'ログイン機能にバグがある',
        });

        const handler = handlers.get('tools/call');
        expect(handler).toBeDefined();

        const result = (await handler!({
          params: {
            name: 'recommend_skills',
            arguments: { prompt: 'ログイン機能にバグがある' },
          },
        })) as { content: { type: string; text: string }[] };

        const parsed = JSON.parse(result.content[0].text);
        expect(parsed.recommendations).toHaveLength(1);
        expect(
          mockSkillRecommendationService.recommendSkills,
        ).toHaveBeenCalledWith('ログイン機能にバグがある');
      });
    });

    describe('Error Handling', () => {
      it('should throw error when prompt is missing', async () => {
        const handler = handlers.get('tools/call');
        expect(handler).toBeDefined();

        const result = (await handler!({
          params: {
            name: 'recommend_skills',
            arguments: {},
          },
        })) as { isError: boolean; content: { text: string }[] };

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('prompt');
      });

      it('should return error for empty prompt', async () => {
        const handler = handlers.get('tools/call');
        expect(handler).toBeDefined();

        const result = (await handler!({
          params: {
            name: 'recommend_skills',
            arguments: { prompt: '' },
          },
        })) as { isError: boolean; content: { text: string }[] };

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('prompt');
      });

      it('should return error when service throws', async () => {
        vi.mocked(
          mockSkillRecommendationService.recommendSkills!,
        ).mockImplementation(() => {
          throw new Error('Service error');
        });

        const handler = handlers.get('tools/call');
        expect(handler).toBeDefined();

        const result = (await handler!({
          params: {
            name: 'recommend_skills',
            arguments: { prompt: 'test prompt' },
          },
        })) as { isError: boolean; content: { text: string }[] };

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Failed to recommend skills');
      });
    });
  });

  // ============================================================================
  // list_skills Tool Tests
  // ============================================================================

  describe('list_skills tool', () => {
    describe('Tool Registration', () => {
      it('should list list_skills tool', async () => {
        const handler = handlers.get('tools/list');
        expect(handler).toBeDefined();

        const result = (await handler!({})) as {
          tools: { name: string; description: string; inputSchema: object }[];
        };
        const listTool = result.tools.find(t => t.name === 'list_skills');

        expect(listTool).toBeDefined();
        expect(listTool!.description).toContain('skills');
      });

      it('should have correct inputSchema for list_skills', async () => {
        const handler = handlers.get('tools/list');
        expect(handler).toBeDefined();

        const result = (await handler!({})) as {
          tools: {
            name: string;
            inputSchema: { properties: object; required: string[] };
          }[];
        };
        const listTool = result.tools.find(t => t.name === 'list_skills');

        expect(listTool).toBeDefined();
        expect(listTool!.inputSchema.properties).toHaveProperty('minPriority');
        expect(listTool!.inputSchema.properties).toHaveProperty('maxPriority');
        expect(listTool!.inputSchema.required).toEqual([]);
      });
    });

    describe('Basic Functionality', () => {
      it('should return all skills when called without options', async () => {
        const handler = handlers.get('tools/call');
        expect(handler).toBeDefined();

        const result = (await handler!({
          params: {
            name: 'list_skills',
            arguments: {},
          },
        })) as { content: { type: string; text: string }[] };

        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('text');

        const parsed = JSON.parse(result.content[0].text);
        expect(parsed.skills).toBeDefined();
        expect(parsed.skills.length).toBe(3);
        expect(parsed.total).toBe(3);
        expect(mockSkillRecommendationService.listSkills).toHaveBeenCalledWith(
          {},
        );
      });

      it('should filter by minPriority', async () => {
        vi.mocked(mockSkillRecommendationService.listSkills!).mockReturnValue({
          skills: [
            {
              name: 'systematic-debugging',
              priority: 100,
              description: 'Systematic approach to debugging',
              concepts: ['bug', 'error', 'debug'],
            },
            {
              name: 'test-driven-development',
              priority: 90,
              description: 'Test-driven development workflow',
              concepts: ['test', 'tdd'],
            },
          ],
          total: 2,
        } as ListSkillsResult);

        const handler = handlers.get('tools/call');
        expect(handler).toBeDefined();

        const result = (await handler!({
          params: {
            name: 'list_skills',
            arguments: { minPriority: 90 },
          },
        })) as { content: { type: string; text: string }[] };

        const parsed = JSON.parse(result.content[0].text);
        expect(parsed.skills.length).toBe(2);
        expect(parsed.total).toBe(2);
        expect(mockSkillRecommendationService.listSkills).toHaveBeenCalledWith({
          minPriority: 90,
        });
      });

      it('should filter by maxPriority', async () => {
        vi.mocked(mockSkillRecommendationService.listSkills!).mockReturnValue({
          skills: [
            {
              name: 'brainstorming',
              priority: 80,
              description: 'Explore requirements before implementation',
              concepts: ['design', 'feature'],
            },
          ],
          total: 1,
        } as ListSkillsResult);

        const handler = handlers.get('tools/call');
        expect(handler).toBeDefined();

        const result = (await handler!({
          params: {
            name: 'list_skills',
            arguments: { maxPriority: 80 },
          },
        })) as { content: { type: string; text: string }[] };

        const parsed = JSON.parse(result.content[0].text);
        expect(parsed.skills.length).toBe(1);
        expect(parsed.total).toBe(1);
        expect(mockSkillRecommendationService.listSkills).toHaveBeenCalledWith({
          maxPriority: 80,
        });
      });

      it('should filter by both minPriority and maxPriority', async () => {
        vi.mocked(mockSkillRecommendationService.listSkills!).mockReturnValue({
          skills: [
            {
              name: 'test-driven-development',
              priority: 90,
              description: 'Test-driven development workflow',
              concepts: ['test', 'tdd'],
            },
          ],
          total: 1,
        } as ListSkillsResult);

        const handler = handlers.get('tools/call');
        expect(handler).toBeDefined();

        const result = (await handler!({
          params: {
            name: 'list_skills',
            arguments: { minPriority: 85, maxPriority: 95 },
          },
        })) as { content: { type: string; text: string }[] };

        const parsed = JSON.parse(result.content[0].text);
        expect(parsed.skills.length).toBe(1);
        expect(mockSkillRecommendationService.listSkills).toHaveBeenCalledWith({
          minPriority: 85,
          maxPriority: 95,
        });
      });
    });

    describe('Error Handling', () => {
      it('should return error when service throws', async () => {
        vi.mocked(
          mockSkillRecommendationService.listSkills!,
        ).mockImplementation(() => {
          throw new Error('Service error');
        });

        const handler = handlers.get('tools/call');
        expect(handler).toBeDefined();

        const result = (await handler!({
          params: {
            name: 'list_skills',
            arguments: {},
          },
        })) as { isError: boolean; content: { text: string }[] };

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Failed to list skills');
      });

      it('should ignore non-number priority values', async () => {
        const handler = handlers.get('tools/call');
        expect(handler).toBeDefined();

        await handler!({
          params: {
            name: 'list_skills',
            arguments: { minPriority: 'invalid', maxPriority: null },
          },
        });

        // Should be called with empty options since non-number values are ignored
        expect(mockSkillRecommendationService.listSkills).toHaveBeenCalledWith(
          {},
        );
      });
    });
  });

  // ============================================================================
  // get_agent_system_prompt Tool Tests
  // ============================================================================

  describe('get_agent_system_prompt tool', () => {
    describe('Tool Registration', () => {
      it('should list get_agent_system_prompt tool', async () => {
        const handler = handlers.get('tools/list');
        expect(handler).toBeDefined();

        const result = (await handler!({})) as {
          tools: { name: string; description: string; inputSchema: object }[];
        };
        const agentPromptTool = result.tools.find(
          t => t.name === 'get_agent_system_prompt',
        );

        expect(agentPromptTool).toBeDefined();
        expect(agentPromptTool!.description).toContain('specialist agent');
        expect(agentPromptTool!.description).toContain('subagent');
      });

      it('should have correct inputSchema for get_agent_system_prompt', async () => {
        const handler = handlers.get('tools/list');
        expect(handler).toBeDefined();

        const result = (await handler!({})) as {
          tools: {
            name: string;
            inputSchema: {
              properties: Record<string, unknown>;
              required: string[];
            };
          }[];
        };
        const agentPromptTool = result.tools.find(
          t => t.name === 'get_agent_system_prompt',
        );

        expect(agentPromptTool).toBeDefined();
        expect(agentPromptTool!.inputSchema.properties).toHaveProperty(
          'agentName',
        );
        expect(agentPromptTool!.inputSchema.properties).toHaveProperty(
          'context',
        );
        expect(agentPromptTool!.inputSchema.required).toContain('agentName');
        expect(agentPromptTool!.inputSchema.required).toContain('context');
      });
    });

    describe('Basic Functionality', () => {
      it('should return agent system prompt with valid parameters', async () => {
        const handler = handlers.get('tools/call');
        expect(handler).toBeDefined();

        const result = (await handler!({
          params: {
            name: 'get_agent_system_prompt',
            arguments: {
              agentName: 'security-specialist',
              context: { mode: 'PLAN' },
            },
          },
        })) as { content: { type: string; text: string }[] };

        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('text');

        const parsed = JSON.parse(result.content[0].text);
        expect(parsed.agentName).toBe('security-specialist');
        expect(parsed.displayName).toBe('Security Specialist');
        expect(parsed.systemPrompt).toContain('Security Specialist');
        expect(parsed.description).toBeDefined();
        expect(mockAgentService.getAgentSystemPrompt).toHaveBeenCalledWith(
          'security-specialist',
          { mode: 'PLAN' },
        );
      });

      it('should pass targetFiles and taskDescription to service', async () => {
        const handler = handlers.get('tools/call');
        expect(handler).toBeDefined();

        await handler!({
          params: {
            name: 'get_agent_system_prompt',
            arguments: {
              agentName: 'accessibility-specialist',
              context: {
                mode: 'ACT',
                targetFiles: ['src/components/Button.tsx'],
                taskDescription: 'Review component accessibility',
              },
            },
          },
        });

        expect(mockAgentService.getAgentSystemPrompt).toHaveBeenCalledWith(
          'accessibility-specialist',
          {
            mode: 'ACT',
            targetFiles: ['src/components/Button.tsx'],
            taskDescription: 'Review component accessibility',
          },
        );
      });
    });

    describe('Error Handling', () => {
      it('should return error when agentName is missing', async () => {
        const handler = handlers.get('tools/call');
        expect(handler).toBeDefined();

        const result = (await handler!({
          params: {
            name: 'get_agent_system_prompt',
            arguments: {
              context: { mode: 'PLAN' },
            },
          },
        })) as { isError: boolean; content: { text: string }[] };

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('agentName');
      });

      it('should return error when context.mode is missing', async () => {
        const handler = handlers.get('tools/call');
        expect(handler).toBeDefined();

        const result = (await handler!({
          params: {
            name: 'get_agent_system_prompt',
            arguments: {
              agentName: 'security-specialist',
              context: {},
            },
          },
        })) as { isError: boolean; content: { text: string }[] };

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('context.mode');
      });

      it('should return error when mode is invalid', async () => {
        const handler = handlers.get('tools/call');
        expect(handler).toBeDefined();

        const result = (await handler!({
          params: {
            name: 'get_agent_system_prompt',
            arguments: {
              agentName: 'security-specialist',
              context: { mode: 'INVALID' },
            },
          },
        })) as { isError: boolean; content: { text: string }[] };

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Invalid mode');
      });

      it('should return error when service throws', async () => {
        vi.mocked(mockAgentService.getAgentSystemPrompt!).mockRejectedValue(
          new Error('Agent not found'),
        );

        const handler = handlers.get('tools/call');
        expect(handler).toBeDefined();

        const result = (await handler!({
          params: {
            name: 'get_agent_system_prompt',
            arguments: {
              agentName: 'invalid-agent',
              context: { mode: 'PLAN' },
            },
          },
        })) as { isError: boolean; content: { text: string }[] };

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain(
          'Failed to get agent system prompt',
        );
      });
    });
  });

  // ============================================================================
  // prepare_parallel_agents Tool Tests
  // ============================================================================

  describe('prepare_parallel_agents tool', () => {
    describe('Tool Registration', () => {
      it('should list prepare_parallel_agents tool', async () => {
        const handler = handlers.get('tools/list');
        expect(handler).toBeDefined();

        const result = (await handler!({})) as {
          tools: { name: string; description: string; inputSchema: object }[];
        };
        const parallelAgentsTool = result.tools.find(
          t => t.name === 'prepare_parallel_agents',
        );

        expect(parallelAgentsTool).toBeDefined();
        expect(parallelAgentsTool!.description).toContain('parallel');
        expect(parallelAgentsTool!.description).toContain('Task tool');
      });

      it('should have correct inputSchema for prepare_parallel_agents', async () => {
        const handler = handlers.get('tools/list');
        expect(handler).toBeDefined();

        const result = (await handler!({})) as {
          tools: {
            name: string;
            inputSchema: {
              properties: Record<string, unknown>;
              required: string[];
            };
          }[];
        };
        const parallelAgentsTool = result.tools.find(
          t => t.name === 'prepare_parallel_agents',
        );

        expect(parallelAgentsTool).toBeDefined();
        expect(parallelAgentsTool!.inputSchema.properties).toHaveProperty(
          'mode',
        );
        expect(parallelAgentsTool!.inputSchema.properties).toHaveProperty(
          'specialists',
        );
        expect(parallelAgentsTool!.inputSchema.properties).toHaveProperty(
          'targetFiles',
        );
        expect(parallelAgentsTool!.inputSchema.properties).toHaveProperty(
          'sharedContext',
        );
        expect(parallelAgentsTool!.inputSchema.required).toContain('mode');
        expect(parallelAgentsTool!.inputSchema.required).toContain(
          'specialists',
        );
      });
    });

    describe('Basic Functionality', () => {
      it('should return parallel agents with valid parameters', async () => {
        const handler = handlers.get('tools/call');
        expect(handler).toBeDefined();

        const result = (await handler!({
          params: {
            name: 'prepare_parallel_agents',
            arguments: {
              mode: 'PLAN',
              specialists: ['security-specialist', 'accessibility-specialist'],
            },
          },
        })) as { content: { type: string; text: string }[] };

        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('text');

        const parsed = JSON.parse(result.content[0].text);
        expect(parsed.agents).toHaveLength(2);
        expect(parsed.agents[0].id).toBe('security-specialist');
        expect(parsed.agents[1].id).toBe('accessibility-specialist');
        expect(parsed.parallelExecutionHint).toContain('Task tool');
        expect(mockAgentService.prepareParallelAgents).toHaveBeenCalledWith(
          'PLAN',
          ['security-specialist', 'accessibility-specialist'],
          undefined,
          undefined,
        );
      });

      it('should pass targetFiles and sharedContext to service', async () => {
        const handler = handlers.get('tools/call');
        expect(handler).toBeDefined();

        await handler!({
          params: {
            name: 'prepare_parallel_agents',
            arguments: {
              mode: 'EVAL',
              specialists: ['security-specialist'],
              targetFiles: ['src/api/auth.ts', 'src/api/login.ts'],
              sharedContext: 'Review authentication implementation',
            },
          },
        });

        expect(mockAgentService.prepareParallelAgents).toHaveBeenCalledWith(
          'EVAL',
          ['security-specialist'],
          ['src/api/auth.ts', 'src/api/login.ts'],
          'Review authentication implementation',
        );
      });
    });

    describe('Error Handling', () => {
      it('should return error when mode is missing', async () => {
        const handler = handlers.get('tools/call');
        expect(handler).toBeDefined();

        const result = (await handler!({
          params: {
            name: 'prepare_parallel_agents',
            arguments: {
              specialists: ['security-specialist'],
            },
          },
        })) as { isError: boolean; content: { text: string }[] };

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('mode');
      });

      it('should return error when mode is invalid', async () => {
        const handler = handlers.get('tools/call');
        expect(handler).toBeDefined();

        const result = (await handler!({
          params: {
            name: 'prepare_parallel_agents',
            arguments: {
              mode: 'INVALID',
              specialists: ['security-specialist'],
            },
          },
        })) as { isError: boolean; content: { text: string }[] };

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Invalid mode');
      });

      it('should return error when specialists is missing', async () => {
        const handler = handlers.get('tools/call');
        expect(handler).toBeDefined();

        const result = (await handler!({
          params: {
            name: 'prepare_parallel_agents',
            arguments: {
              mode: 'PLAN',
            },
          },
        })) as { isError: boolean; content: { text: string }[] };

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('specialists');
      });

      it('should return error when specialists is empty array', async () => {
        const handler = handlers.get('tools/call');
        expect(handler).toBeDefined();

        const result = (await handler!({
          params: {
            name: 'prepare_parallel_agents',
            arguments: {
              mode: 'PLAN',
              specialists: [],
            },
          },
        })) as { isError: boolean; content: { text: string }[] };

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('specialists');
      });

      it('should return error when service throws', async () => {
        vi.mocked(mockAgentService.prepareParallelAgents!).mockRejectedValue(
          new Error('Service error'),
        );

        const handler = handlers.get('tools/call');
        expect(handler).toBeDefined();

        const result = (await handler!({
          params: {
            name: 'prepare_parallel_agents',
            arguments: {
              mode: 'PLAN',
              specialists: ['invalid-agent'],
            },
          },
        })) as { isError: boolean; content: { text: string }[] };

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain(
          'Failed to prepare parallel agents',
        );
      });
    });
  });
});
