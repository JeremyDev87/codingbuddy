import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RulesService } from '../rules/rules.service';
import { KeywordService } from '../keyword/keyword.service';
import { ConfigService, ProjectConfig } from '../config/config.service';
import type { CodingBuddyConfig } from '../config/config.schema';

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
      // Extract method name from Zod schema
      const s = schema as {
        shape?: { method?: { _def?: { value?: string } } };
      };
      const method = s?.shape?.method?._def?.value;
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

// Mock dependencies
const createMockRulesService = (): Partial<RulesService> => ({
  listAgents: vi
    .fn()
    .mockResolvedValue(['frontend-developer', 'code-reviewer']),
  getRuleContent: vi.fn().mockResolvedValue('# Core Rules\nSome content...'),
  getAgent: vi.fn().mockResolvedValue({
    id: 'frontend-developer',
    name: 'Frontend Developer',
    role: 'Frontend development specialist',
    goals: ['Write clean code', 'Follow best practices'],
    workflow: ['Analyze requirements', 'Implement solution'],
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
});

// Import after mocks
import { McpService } from './mcp.service';

describe('McpService', () => {
  let mockRulesService: Partial<RulesService>;
  let mockKeywordService: Partial<KeywordService>;
  let mockConfigService: Partial<ConfigService>;

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

    const mcpService = new McpService(
      mockRulesService as RulesService,
      mockKeywordService as KeywordService,
      mockConfigService as ConfigService,
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
      );

      const server = service.getServer();
      expect(server).toBeDefined();
    });
  });
});
