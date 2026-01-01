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
  parseMode: vi.fn().mockResolvedValue({
    mode: 'PLAN',
    cleanedPrompt: 'Create a login form',
    instructions: 'Plan the implementation',
    rules: { core: 'Some rules' },
    warnings: [],
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

// Import after mocks
import { McpService } from './mcp.service';

describe('McpService', () => {
  let mockRulesService: Partial<RulesService>;
  let mockKeywordService: Partial<KeywordService>;
  let mockConfigService: Partial<ConfigService>;
  let mockConfigDiffService: Partial<ConfigDiffService>;
  let mockAnalyzerService: Partial<AnalyzerService>;
  let mockSkillRecommendationService: Partial<SkillRecommendationService>;

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

  beforeEach(() => {
    handlers.clear();
    mockRulesService = createMockRulesService();
    mockKeywordService = createMockKeywordService();
    mockConfigService = createMockConfigService(testConfig);
    mockConfigDiffService = createMockConfigDiffService();
    mockAnalyzerService = createMockAnalyzerService();
    mockSkillRecommendationService = createMockSkillRecommendationService();

    const mcpService = new McpService(
      mockRulesService as RulesService,
      mockKeywordService as KeywordService,
      mockConfigService as ConfigService,
      mockConfigDiffService as ConfigDiffService,
      mockAnalyzerService as AnalyzerService,
      mockSkillRecommendationService as SkillRecommendationService,
    );
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
      expect(parsedContent.mode).toBe('PLAN');
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
      const serviceWithEmptyConfig = new McpService(
        mockRulesService as RulesService,
        mockKeywordService as KeywordService,
        emptyConfigService as ConfigService,
        mockConfigDiffService as ConfigDiffService,
        mockAnalyzerService as AnalyzerService,
        mockSkillRecommendationService as SkillRecommendationService,
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

      const service = new McpService(
        mockRulesService as RulesService,
        mockKeywordService as KeywordService,
        fullConfigService as ConfigService,
        mockConfigDiffService as ConfigDiffService,
        mockAnalyzerService as AnalyzerService,
        mockSkillRecommendationService as SkillRecommendationService,
      );
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

        const service = new McpService(
          mockRulesService as RulesService,
          mockKeywordService as KeywordService,
          failingConfigService as ConfigService,
          mockConfigDiffService as ConfigDiffService,
          mockAnalyzerService as AnalyzerService,
          mockSkillRecommendationService as SkillRecommendationService,
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

        const service = new McpService(
          mockRulesService as RulesService,
          mockKeywordService as KeywordService,
          failingConfigService as ConfigService,
          mockConfigDiffService as ConfigDiffService,
          mockAnalyzerService as AnalyzerService,
          mockSkillRecommendationService as SkillRecommendationService,
        );
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
      const service = new McpService(
        mockRulesService as RulesService,
        mockKeywordService as KeywordService,
        mockConfigService as ConfigService,
        mockConfigDiffService as ConfigDiffService,
        mockAnalyzerService as AnalyzerService,
        mockSkillRecommendationService as SkillRecommendationService,
      );

      // Should not throw
      await expect(service.startStdio()).resolves.not.toThrow();
    });
  });

  describe('getServer', () => {
    it('should return the MCP server instance', () => {
      const service = new McpService(
        mockRulesService as RulesService,
        mockKeywordService as KeywordService,
        mockConfigService as ConfigService,
        mockConfigDiffService as ConfigDiffService,
        mockAnalyzerService as AnalyzerService,
        mockSkillRecommendationService as SkillRecommendationService,
      );

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

      it('should return empty recommendations for empty prompt', async () => {
        vi.mocked(
          mockSkillRecommendationService.recommendSkills!,
        ).mockReturnValue({
          recommendations: [],
          originalPrompt: '',
        });

        const handler = handlers.get('tools/call');
        expect(handler).toBeDefined();

        const result = (await handler!({
          params: {
            name: 'recommend_skills',
            arguments: { prompt: '' },
          },
        })) as { content: { type: string; text: string }[] };

        const parsed = JSON.parse(result.content[0].text);
        expect(parsed.recommendations).toEqual([]);
        expect(parsed.originalPrompt).toBe('');
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
});
