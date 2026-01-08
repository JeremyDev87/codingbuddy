import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
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
import { ConfigService } from '../config/config.service';
import { getPackageVersion } from '../shared/version.utils';
import type { CodingBuddyConfig } from '../config/config.schema';
import type { ToolHandler } from './handlers';
import { TOOL_HANDLERS } from './handlers';

@Injectable()
export class McpService implements OnModuleInit {
  private server: Server;

  constructor(
    private rulesService: RulesService,
    private configService: ConfigService,
    @Inject(TOOL_HANDLERS) private toolHandlers: ToolHandler[],
  ) {
    this.server = new Server(
      {
        name: 'codingbuddy-rules-server',
        version: getPackageVersion(),
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
    // Note: Do not log here - stdout is reserved for MCP JSON-RPC messages
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
    // Collect tool definitions from all handlers
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = this.toolHandlers.flatMap(handler =>
        handler.getToolDefinitions(),
      );
      return { tools };
    });

    // Delegate tool calls to handlers
    this.server.setRequestHandler(CallToolRequestSchema, async request => {
      const { name, arguments: args } = request.params;

      for (const handler of this.toolHandlers) {
        const result = await handler.handle(name, args);
        if (result !== null) {
          return result;
        }
      }

      throw new McpError(ErrorCode.MethodNotFound, `Tool not found: ${name}`);
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

          const expertise = agent.role.expertise.join(', ');
          const responsibilities =
            agent.role.responsibilities?.join('\n- ') ?? '';

          return {
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text: `Activate Agent: ${agent.name}\n\nDescription: ${agent.description}\n\nRole: ${agent.role.title}\nExpertise: ${expertise}\n\nResponsibilities:\n- ${responsibilities}\n\n${projectContext}\n\nCore Rules Context:\n${coreRules.substring(0, 1000)}... (truncated)`,
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
