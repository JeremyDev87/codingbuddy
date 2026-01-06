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
import { ConfigDiffService } from '../config/config-diff.service';
import { AnalyzerService } from '../analyzer/analyzer.service';
import { SkillRecommendationService } from '../skill/skill-recommendation.service';
import type { ListSkillsOptions } from '../skill/skill-recommendation.types';
import type { CodingBuddyConfig } from '../config/config.schema';
import { LanguageService } from '../shared/language.service';
import { AgentService } from '../agent/agent.service';
import type { Mode } from '../keyword/keyword.types';

@Injectable()
export class McpService implements OnModuleInit {
  private server: Server;
  private readonly logger = new Logger(McpService.name);

  constructor(
    private rulesService: RulesService,
    @Inject(KEYWORD_SERVICE) private keywordService: KeywordService,
    private configService: ConfigService,
    private configDiffService: ConfigDiffService,
    private analyzerService: AnalyzerService,
    private skillRecommendationService: SkillRecommendationService,
    private languageService: LanguageService,
    private agentService: AgentService,
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
              'MANDATORY: When user message starts with PLAN, ACT, or EVAL keyword (or localized equivalents: Korean 계획/실행/평가, Japanese 計画/実行/評価, Chinese 计划/执行/评估, Spanish PLANIFICAR/ACTUAR/EVALUAR), you MUST call this tool FIRST before any other action. This tool parses the workflow mode and returns critical rules that MUST be followed. Failure to call this tool when these keywords are present is a protocol violation.',
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
          {
            name: 'suggest_config_updates',
            description:
              'Analyze the project and suggest config updates based on detected changes (new frameworks, dependencies, patterns)',
            inputSchema: {
              type: 'object',
              properties: {
                projectRoot: {
                  type: 'string',
                  description:
                    'Project root directory (defaults to current working directory)',
                },
              },
              required: [],
            },
          },
          {
            name: 'recommend_skills',
            description:
              'Recommend skills based on user prompt with multi-language support',
            inputSchema: {
              type: 'object',
              properties: {
                prompt: {
                  type: 'string',
                  description:
                    'User prompt to analyze for skill recommendations',
                },
              },
              required: ['prompt'],
            },
          },
          {
            name: 'list_skills',
            description: 'List all available skills with optional filtering',
            inputSchema: {
              type: 'object',
              properties: {
                minPriority: {
                  type: 'number',
                  description: 'Minimum priority threshold (inclusive)',
                },
                maxPriority: {
                  type: 'number',
                  description: 'Maximum priority threshold (inclusive)',
                },
              },
              required: [],
            },
          },
          {
            name: 'get_agent_system_prompt',
            description:
              'Get complete system prompt for a specialist agent to be executed as a Claude Code subagent. Use this to prepare an agent for parallel execution via Task tool.',
            inputSchema: {
              type: 'object',
              properties: {
                agentName: {
                  type: 'string',
                  description:
                    'Name of the specialist agent (e.g., security-specialist, accessibility-specialist)',
                },
                context: {
                  type: 'object',
                  description: 'Context for the agent',
                  properties: {
                    mode: {
                      type: 'string',
                      enum: ['PLAN', 'ACT', 'EVAL'],
                      description: 'Current workflow mode',
                    },
                    targetFiles: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'Files to analyze or review',
                    },
                    taskDescription: {
                      type: 'string',
                      description: 'Description of the task',
                    },
                  },
                  required: ['mode'],
                },
              },
              required: ['agentName', 'context'],
            },
          },
          {
            name: 'prepare_parallel_agents',
            description:
              'Prepare multiple specialist agents for parallel execution via Claude Code Task tool. Returns prompts and hints for launching agents concurrently.',
            inputSchema: {
              type: 'object',
              properties: {
                mode: {
                  type: 'string',
                  enum: ['PLAN', 'ACT', 'EVAL'],
                  description: 'Current workflow mode',
                },
                specialists: {
                  type: 'array',
                  items: { type: 'string' },
                  description:
                    'List of specialist agent names (e.g., ["security-specialist", "accessibility-specialist"])',
                },
                targetFiles: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Files to analyze or review',
                },
                sharedContext: {
                  type: 'string',
                  description:
                    'Shared context or task description for all agents',
                },
              },
              required: ['mode', 'specialists'],
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
        case 'suggest_config_updates':
          return this.handleSuggestConfigUpdates(args);
        case 'recommend_skills':
          return this.handleRecommendSkills(args);
        case 'list_skills':
          return this.handleListSkills(args);
        case 'get_agent_system_prompt':
          return this.handleGetAgentSystemPrompt(args);
        case 'prepare_parallel_agents':
          return this.handlePrepareParallelAgents(args);
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
      const languageInstructionResult =
        this.languageService.getLanguageInstruction(language || 'en');

      return this.jsonResponse({
        ...result,
        language,
        languageInstruction: languageInstructionResult.instruction,
      });
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

  private async handleSuggestConfigUpdates(
    args: Record<string, unknown> | undefined,
  ) {
    try {
      const projectRoot = String(args?.projectRoot ?? process.cwd());

      // Analyze project
      const analysis = await this.analyzerService.analyzeProject(projectRoot);

      // Reload config from disk to get latest changes
      await this.configService.reload();

      // Get current config
      const currentConfig = await this.configService.getSettings();

      // Compare and get suggestions
      const result = this.configDiffService.compareConfig(
        analysis,
        currentConfig,
      );

      return this.jsonResponse(result);
    } catch (error) {
      return this.errorResponse(
        `Failed to suggest config updates: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private handleRecommendSkills(args: Record<string, unknown> | undefined) {
    const prompt = args?.prompt;
    if (typeof prompt !== 'string') {
      return this.errorResponse('Missing required parameter: prompt');
    }
    try {
      const result = this.skillRecommendationService.recommendSkills(prompt);
      return this.jsonResponse(result);
    } catch (error) {
      return this.errorResponse(
        `Failed to recommend skills: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private handleListSkills(args: Record<string, unknown> | undefined) {
    try {
      const options: ListSkillsOptions = {};

      if (typeof args?.minPriority === 'number') {
        options.minPriority = args.minPriority;
      }
      if (typeof args?.maxPriority === 'number') {
        options.maxPriority = args.maxPriority;
      }

      const result = this.skillRecommendationService.listSkills(options);
      return this.jsonResponse(result);
    } catch (error) {
      return this.errorResponse(
        `Failed to list skills: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private async handleGetAgentSystemPrompt(
    args: Record<string, unknown> | undefined,
  ) {
    const agentName = args?.agentName;
    const context = args?.context as
      | {
          mode: Mode;
          targetFiles?: string[];
          taskDescription?: string;
        }
      | undefined;

    if (typeof agentName !== 'string') {
      return this.errorResponse('Missing required parameter: agentName');
    }
    if (!context || typeof context.mode !== 'string') {
      return this.errorResponse(
        'Missing required parameter: context.mode (PLAN, ACT, or EVAL)',
      );
    }
    if (!['PLAN', 'ACT', 'EVAL'].includes(context.mode)) {
      return this.errorResponse(
        `Invalid mode: ${context.mode}. Must be PLAN, ACT, or EVAL`,
      );
    }

    try {
      const result = await this.agentService.getAgentSystemPrompt(agentName, {
        mode: context.mode as Mode,
        targetFiles: context.targetFiles,
        taskDescription: context.taskDescription,
      });
      return this.jsonResponse(result);
    } catch (error) {
      return this.errorResponse(
        `Failed to get agent system prompt: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private async handlePrepareParallelAgents(
    args: Record<string, unknown> | undefined,
  ) {
    const mode = args?.mode as string | undefined;
    const specialists = args?.specialists as string[] | undefined;
    const targetFiles = args?.targetFiles as string[] | undefined;
    const sharedContext = args?.sharedContext as string | undefined;

    if (typeof mode !== 'string') {
      return this.errorResponse(
        'Missing required parameter: mode (PLAN, ACT, or EVAL)',
      );
    }
    if (!['PLAN', 'ACT', 'EVAL'].includes(mode)) {
      return this.errorResponse(
        `Invalid mode: ${mode}. Must be PLAN, ACT, or EVAL`,
      );
    }
    if (!Array.isArray(specialists) || specialists.length === 0) {
      return this.errorResponse(
        'Missing required parameter: specialists (array of agent names)',
      );
    }

    try {
      const result = await this.agentService.prepareParallelAgents(
        mode as Mode,
        specialists,
        targetFiles,
        sharedContext,
      );
      return this.jsonResponse(result);
    } catch (error) {
      return this.errorResponse(
        `Failed to prepare parallel agents: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
