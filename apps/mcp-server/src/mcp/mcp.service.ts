import { Injectable, OnModuleInit, Logger, Inject } from '@nestjs/common';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { RulesService } from '../rules/rules.service';
import { KeywordService } from '../keyword/keyword.service';
import { KEYWORD_SERVICE } from '../keyword/keyword.module';
import { ConfigService } from '../config/config.service';
import type { CodingBuddyConfig } from '../config/config.schema';

@Injectable()
export class McpService implements OnModuleInit {
  private server: Server;
  private readonly logger = new Logger(McpService.name);

  constructor(
    private rulesService: RulesService,
    @Inject(KEYWORD_SERVICE) private keywordService: KeywordService,
    private configService: ConfigService,
  ) {
    this.server = new Server(
      {
        name: 'codingbuddy-rules-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
          prompts: {},
        },
      },
    );
  }

  onModuleInit() {
    this.registerResources();
    this.registerTools();
    this.registerPrompts();
  }

  async startStdio() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    this.logger.log('MCP Server connected via Stdio');
  }

  getServer() {
    return this.server;
  }

  private registerResources() {
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      const agents = await this.rulesService.listAgents();
      const coreRules = [
        'rules/core.md',
        'rules/project.md',
        'rules/augmented-coding.md',
      ];

      return {
        resources: [
          // Project configuration resource
          {
            uri: 'config://project',
            name: 'Project Configuration',
            mimeType: 'application/json',
            description:
              'Project-specific configuration including tech stack, architecture, and conventions',
          },
          ...coreRules.map(rule => ({
            uri: `rules://${rule}`,
            name: rule,
            mimeType: 'text/markdown',
            description: `Core rule file: ${rule}`,
          })),
          ...agents.map(agent => ({
            uri: `rules://agents/${agent}.json`,
            name: `Agent: ${agent}`,
            mimeType: 'application/json',
            description: `Agent definition for ${agent}`,
          })),
        ],
      };
    });

    this.server.setRequestHandler(ReadResourceRequestSchema, async request => {
      const uri = request.params.uri;

      // Handle config://project resource
      if (uri === 'config://project') {
        try {
          const projectConfig = await this.configService.getProjectConfig();
          return {
            contents: [
              {
                uri: uri,
                mimeType: 'application/json',
                text: JSON.stringify(projectConfig, null, 2),
              },
            ],
          };
        } catch {
          throw new McpError(
            ErrorCode.InternalError,
            'Failed to load project configuration',
          );
        }
      }

      // Handle rules:// resources
      if (!uri.startsWith('rules://')) {
        throw new McpError(ErrorCode.InvalidRequest, 'Invalid URI scheme');
      }

      const relativePath = uri.replace('rules://', '');
      try {
        const content = await this.rulesService.getRuleContent(relativePath);
        return {
          contents: [
            {
              uri: uri,
              mimeType: relativePath.endsWith('.json')
                ? 'application/json'
                : 'text/markdown',
              text: content,
            },
          ],
        };
      } catch {
        throw new McpError(
          ErrorCode.InvalidRequest,
          `Resource not found: ${uri}`,
        );
      }
    });
  }

  private registerTools() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'search_rules',
            description: 'Search for rules and guidelines',
            inputSchema: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'Search query' },
              },
              required: ['query'],
            },
          },
          {
            name: 'get_agent_details',
            description: 'Get detailed profile of a specific AI agent',
            inputSchema: {
              type: 'object',
              properties: {
                agentName: { type: 'string', description: 'Name of the agent' },
              },
              required: ['agentName'],
            },
          },
          {
            name: 'parse_mode',
            description:
              'Parse workflow mode keyword from prompt and return mode-specific rules with project language setting',
            inputSchema: {
              type: 'object',
              properties: {
                prompt: {
                  type: 'string',
                  description:
                    'User prompt that may start with PLAN/ACT/EVAL keyword',
                },
              },
              required: ['prompt'],
            },
          },
          {
            name: 'get_project_config',
            description:
              'Get project configuration including tech stack, architecture, conventions, and language settings',
            inputSchema: {
              type: 'object',
              properties: {},
              required: [],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async request => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'search_rules':
          return this.handleSearchRules(args);
        case 'get_agent_details':
          return this.handleGetAgentDetails(args);
        case 'parse_mode':
          return this.handleParseMode(args);
        case 'get_project_config':
          return this.handleGetProjectConfig();
        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Tool not found: ${name}`,
          );
      }
    });
  }

  private registerPrompts() {
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return {
        prompts: [
          {
            name: 'activate_agent',
            description:
              'Activate a specific specialist agent with project context',
            arguments: [
              {
                name: 'role',
                description: 'Role name (e.g. frontend-developer)',
                required: true,
              },
            ],
          },
        ],
      };
    });

    this.server.setRequestHandler(GetPromptRequestSchema, async request => {
      if (request.params.name === 'activate_agent') {
        const role = String(request.params.arguments?.role);
        try {
          const agent = await this.rulesService.getAgent(role);
          const coreRules =
            await this.rulesService.getRuleContent('rules/core.md');
          const settings = await this.configService.getSettings();
          const projectContext = this.formatProjectContext(settings);

          return {
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text: `Activate Agent: ${agent.name}\n\nRole: ${agent.role}\n\nGoals:\n${agent.goals.join('\n')}\n\nWorkflow:\n${agent.workflow.join('\n')}\n\n${projectContext}\n\nCore Rules Context:\n${coreRules.substring(0, 1000)}... (truncated)`,
                },
              },
            ],
          };
        } catch {
          throw new McpError(
            ErrorCode.InvalidRequest,
            `Agent '${role}' not found.`,
          );
        }
      }
      throw new McpError(ErrorCode.MethodNotFound, 'Prompt not found');
    });
  }

  // ============================================================================
  // Tool Handlers
  // ============================================================================

  private async handleSearchRules(args: Record<string, unknown> | undefined) {
    const query = String(args?.query);
    const results = await this.rulesService.searchRules(query);
    return this.jsonResponse(results);
  }

  private async handleGetAgentDetails(
    args: Record<string, unknown> | undefined,
  ) {
    const agentName = String(args?.agentName);
    try {
      const agent = await this.rulesService.getAgent(agentName);
      return this.jsonResponse(agent);
    } catch {
      return this.errorResponse(`Agent '${agentName}' not found.`);
    }
  }

  private async handleParseMode(args: Record<string, unknown> | undefined) {
    const prompt = String(args?.prompt ?? '');
    try {
      const result = await this.keywordService.parseMode(prompt);
      const language = await this.configService.getLanguage();
      return this.jsonResponse({ ...result, language });
    } catch (error) {
      return this.errorResponse(
        `Failed to parse mode: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private async handleGetProjectConfig() {
    try {
      const settings = await this.configService.getSettings();
      return this.jsonResponse(settings);
    } catch (error) {
      return this.errorResponse(
        `Failed to get project config: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // ============================================================================
  // Response Helpers
  // ============================================================================

  private jsonResponse(data: unknown) {
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    };
  }

  private errorResponse(message: string) {
    return {
      isError: true,
      content: [{ type: 'text', text: message }],
    };
  }

  // ============================================================================
  // Formatters
  // ============================================================================

  /**
   * Format project configuration as context string for AI prompts
   */
  private formatProjectContext(settings: CodingBuddyConfig): string {
    const sections: string[] = ['Project Context:'];

    if (settings.projectName) {
      sections.push(`- Project: ${settings.projectName}`);
    }

    if (settings.language) {
      sections.push(`- Response Language: ${settings.language}`);
    }

    if (settings.techStack) {
      const techItems: string[] = [];
      if (settings.techStack.frontend?.length) {
        techItems.push(`Frontend: ${settings.techStack.frontend.join(', ')}`);
      }
      if (settings.techStack.backend?.length) {
        techItems.push(`Backend: ${settings.techStack.backend.join(', ')}`);
      }
      if (settings.techStack.languages?.length) {
        techItems.push(`Languages: ${settings.techStack.languages.join(', ')}`);
      }
      if (settings.techStack.database?.length) {
        techItems.push(`Database: ${settings.techStack.database.join(', ')}`);
      }
      if (techItems.length > 0) {
        sections.push(`- Tech Stack: ${techItems.join('; ')}`);
      }
    }

    if (settings.architecture?.pattern) {
      sections.push(`- Architecture: ${settings.architecture.pattern}`);
    }

    if (settings.testStrategy?.approach) {
      sections.push(`- Test Strategy: ${settings.testStrategy.approach}`);
    }

    if (settings.conventions?.style) {
      sections.push(`- Code Style: ${settings.conventions.style}`);
    }

    // Return empty string if no meaningful context
    if (sections.length === 1) {
      return '';
    }

    return sections.join('\n');
  }
}
