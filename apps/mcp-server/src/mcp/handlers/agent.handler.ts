import { Injectable } from '@nestjs/common';
import type { ToolDefinition } from './base.handler';
import type { ToolResponse } from '../response.utils';
import { AbstractHandler } from './abstract-handler';
import { AgentService } from '../../agent/agent.service';
import { AgentStackService } from '../../agent/agent-stack.service';
import type { InlineAgentDefinition } from '../../agent/agent.types';
import type { Mode } from '../../keyword/keyword.types';
import { isValidVerbosity } from '../../shared/verbosity.types';
import { createJsonResponse, createErrorResponse } from '../response.utils';
import {
  extractRequiredString,
  extractStringArray,
  extractOptionalString,
  isValidMode,
  isRecordObject,
} from '../../shared/validation.constants';
import { ImpactEventService } from '../../impact';
import { RuleEventCollector } from '../../rules/rule-event-collector';

/**
 * Handler for agent-related tools
 * - get_agent_system_prompt: Get complete system prompt for a specialist agent
 * - prepare_parallel_agents: Prepare multiple agents for parallel execution
 * - dispatch_agents: Get Task-tool-ready dispatch parameters for agents
 */
@Injectable()
export class AgentHandler extends AbstractHandler {
  constructor(
    private readonly agentService: AgentService,
    private readonly agentStackService: AgentStackService,
    private readonly impactEventService: ImpactEventService,
    private readonly ruleEventCollector: RuleEventCollector,
  ) {
    super();
  }

  protected getHandledTools(): string[] {
    return [
      'get_agent_system_prompt',
      'prepare_parallel_agents',
      'dispatch_agents',
      'list_agent_stacks',
    ];
  }

  protected async handleTool(
    toolName: string,
    args: Record<string, unknown> | undefined,
  ): Promise<ToolResponse> {
    switch (toolName) {
      case 'get_agent_system_prompt':
        return this.handleGetAgentSystemPrompt(args);
      case 'prepare_parallel_agents':
        return this.handlePrepareParallelAgents(args);
      case 'dispatch_agents':
        return this.handleDispatchAgents(args);
      case 'list_agent_stacks':
        return this.handleListAgentStacks(args);
      default:
        return createErrorResponse(`Unknown tool: ${toolName}`);
    }
  }

  getToolDefinitions(): ToolDefinition[] {
    return [
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
                  enum: ['PLAN', 'ACT', 'EVAL', 'AUTO'],
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
              enum: ['PLAN', 'ACT', 'EVAL', 'AUTO'],
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
              description: 'Shared context or task description for all agents',
            },
            verbosity: {
              type: 'string',
              enum: ['minimal', 'standard', 'full'],
              description:
                'Response detail level: minimal (name only), standard (summary, default), full (complete prompt)',
            },
          },
          required: ['mode', 'specialists'],
        },
      },
      {
        name: 'dispatch_agents',
        description:
          'Get Task-tool-ready dispatch parameters for agents. Returns structured data that can be directly used with Claude Code Task tool, eliminating manual prompt assembly. Use this to bridge the gap between agent recommendation and execution.',
        inputSchema: {
          type: 'object',
          properties: {
            mode: {
              type: 'string',
              enum: ['PLAN', 'ACT', 'EVAL', 'AUTO'],
              description: 'Current workflow mode',
            },
            primaryAgent: {
              type: 'string',
              description:
                'Primary agent to dispatch (e.g., "security-specialist", "frontend-developer")',
            },
            specialists: {
              type: 'array',
              items: { type: 'string' },
              description:
                'List of specialist agents for parallel execution (e.g., ["security-specialist", "accessibility-specialist"])',
            },
            targetFiles: {
              type: 'array',
              items: { type: 'string' },
              description: 'Files to analyze or review',
            },
            taskDescription: {
              type: 'string',
              description: 'Description of the task for agent context',
            },
            includeParallel: {
              type: 'boolean',
              description: 'Whether to include parallel specialist agents (default: false)',
            },
            executionStrategy: {
              type: 'string',
              enum: ['subagent', 'taskmaestro', 'teams', 'taskmaestro+teams'],
              description:
                'Execution strategy for specialist agents. "subagent" (default) uses Claude Code Agent tool with run_in_background. "taskmaestro" returns tmux pane assignments for /taskmaestro skill. "teams" uses Claude Code native teams with shared TaskList coordination. "taskmaestro+teams" uses TaskMaestro as outer transport with Teams as inner coordination.',
            },
            agentStack: {
              type: 'string',
              description:
                'Agent stack name to resolve primary + specialists from a preset (e.g., "api-development"). Overrides primaryAgent and specialists when provided. Tip: use the suggestedStack value from parse_mode response to auto-select the best stack for the current context.',
            },
            inlineAgents: {
              type: 'object',
              description:
                'Inline agent definitions keyed by agent ID. These take highest priority in resolution (inline > custom local > primary). Each value must have name, description, and role fields.',
              additionalProperties: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  role: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      expertise: { type: 'array', items: { type: 'string' } },
                    },
                    required: ['title', 'expertise'],
                  },
                },
                required: ['name', 'description', 'role'],
              },
            },
          },
          required: ['mode'],
        },
      },
      {
        name: 'list_agent_stacks',
        description:
          'List available agent stack presets. Each stack defines a primary agent and specialist combination for common workflows.',
        inputSchema: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              description:
                'Optional category filter (e.g., "development", "review", "data", "security")',
            },
          },
        },
      },
    ];
  }

  private async handleDispatchAgents(
    args: Record<string, unknown> | undefined,
  ): Promise<ToolResponse> {
    const mode = args?.mode;
    if (!isValidMode(mode)) {
      return createErrorResponse(
        mode === undefined || mode === null
          ? 'Missing required parameter: mode (PLAN, ACT, EVAL, or AUTO)'
          : `Invalid mode: ${mode}. Must be PLAN, ACT, EVAL, or AUTO`,
      );
    }

    const agentStack = extractOptionalString(args, 'agentStack');
    let primaryAgent = extractOptionalString(args, 'primaryAgent');
    let specialists = extractStringArray(args, 'specialists');
    const targetFiles = extractStringArray(args, 'targetFiles');
    const taskDescription = extractOptionalString(args, 'taskDescription');
    let includeParallel = args?.includeParallel === true;
    const executionStrategy =
      (args?.executionStrategy as
        | 'subagent'
        | 'taskmaestro'
        | 'teams'
        | 'taskmaestro+teams'
        | undefined) ?? 'subagent';
    const inlineAgents = this.extractInlineAgents(args);

    // Resolve agent stack if provided
    if (agentStack) {
      try {
        const stack = await this.agentStackService.resolveStack(agentStack);
        primaryAgent = primaryAgent ?? stack.primary_agent;
        specialists = specialists?.length ? specialists : stack.specialist_agents;
        includeParallel = includeParallel || stack.specialist_agents.length > 0;
      } catch (error) {
        return createErrorResponse(
          `Failed to resolve agent stack: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    try {
      const result = await this.agentService.dispatchAgents({
        mode: mode as Mode,
        primaryAgent,
        specialists,
        targetFiles,
        taskDescription,
        includeParallel,
        executionStrategy,
        inlineAgents,
      });

      // Ensure visibility is always present for real-time specialist execution tracking
      if (!result.visibility) {
        result.visibility = {
          reportTo: 'team-lead',
          format: 'structured',
          includeProgress: true,
          messages: {
            onStart:
              'Report start via SendMessage to team-lead with specialist name and task scope',
            onFinding:
              'Report each finding via SendMessage to team-lead with severity and description',
            onComplete:
              'Report completion summary via SendMessage to team-lead with total findings count',
          },
        };
      }

      try {
        this.impactEventService.logEvent('default', 'agent_dispatched', {
          agent: primaryAgent ?? undefined,
          detail: executionStrategy,
        });
      } catch {
        // Never break handler execution
      }

      try {
        const timestamp = new Date().toISOString();
        if (primaryAgent) {
          this.ruleEventCollector.record({
            type: 'specialist_dispatched',
            timestamp,
            domain: primaryAgent,
          });
        }
        if (result.parallelAgents) {
          for (const agent of result.parallelAgents as { name: string }[]) {
            this.ruleEventCollector.record({
              type: 'specialist_dispatched',
              timestamp,
              domain: agent.name,
            });
          }
        }
      } catch {
        // Fire-and-forget: never break handler execution
      }

      return createJsonResponse(result);
    } catch (error) {
      return createErrorResponse(
        `Failed to dispatch agents: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private async handleGetAgentSystemPrompt(
    args: Record<string, unknown> | undefined,
  ): Promise<ToolResponse> {
    const agentName = extractRequiredString(args, 'agentName');
    if (agentName === null) {
      return createErrorResponse('Missing required parameter: agentName');
    }

    const rawContext = args?.context;
    if (!isRecordObject(rawContext)) {
      return createErrorResponse(
        'Missing required parameter: context (must be an object with mode)',
      );
    }
    const context = rawContext;

    const mode = context.mode;
    if (!isValidMode(mode)) {
      return createErrorResponse(
        mode === undefined || mode === null
          ? 'Missing required parameter: context.mode (PLAN, ACT, EVAL, or AUTO)'
          : `Invalid mode: ${mode}. Must be PLAN, ACT, EVAL, or AUTO`,
      );
    }

    const targetFiles = extractStringArray(context, 'targetFiles');
    const taskDescription = extractOptionalString(context, 'taskDescription');
    const inlineAgents = this.extractInlineAgents(args);

    try {
      const result = await this.agentService.getAgentSystemPrompt(
        agentName,
        {
          mode: mode as Mode,
          targetFiles,
          taskDescription,
        },
        inlineAgents,
      );
      return createJsonResponse(result);
    } catch (error) {
      return createErrorResponse(
        `Failed to get agent system prompt: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private async handlePrepareParallelAgents(
    args: Record<string, unknown> | undefined,
  ): Promise<ToolResponse> {
    const mode = args?.mode;
    if (!isValidMode(mode)) {
      return createErrorResponse(
        mode === undefined || mode === null
          ? 'Missing required parameter: mode (PLAN, ACT, EVAL, or AUTO)'
          : `Invalid mode: ${mode}. Must be PLAN, ACT, EVAL, or AUTO`,
      );
    }

    const specialists = extractStringArray(args, 'specialists');
    if (!specialists || specialists.length === 0) {
      return createErrorResponse('Missing required parameter: specialists (array of agent names)');
    }

    const targetFiles = extractStringArray(args, 'targetFiles');
    const sharedContext = extractOptionalString(args, 'sharedContext');
    const verbosityStr = extractOptionalString(args, 'verbosity');
    const verbosity =
      verbosityStr === undefined
        ? undefined
        : isValidVerbosity(verbosityStr)
          ? verbosityStr
          : 'standard';
    const inlineAgents = this.extractInlineAgents(args);

    try {
      const result = await this.agentService.prepareParallelAgents(
        mode as Mode,
        specialists,
        targetFiles,
        sharedContext,
        verbosity,
        inlineAgents,
      );
      return createJsonResponse(result);
    } catch (error) {
      return createErrorResponse(
        `Failed to prepare parallel agents: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private async handleListAgentStacks(
    args: Record<string, unknown> | undefined,
  ): Promise<ToolResponse> {
    const category = extractOptionalString(args, 'category');

    try {
      const stacks = await this.agentStackService.listStacks(category);
      return createJsonResponse({ stacks });
    } catch (error) {
      return createErrorResponse(
        `Failed to list agent stacks: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Extract and validate inlineAgents from tool args.
   * Returns undefined if not present or not a valid object.
   */
  private extractInlineAgents(
    args: Record<string, unknown> | undefined,
  ): Record<string, InlineAgentDefinition> | undefined {
    const raw = args?.inlineAgents;
    if (!isRecordObject(raw)) return undefined;
    return raw as Record<string, InlineAgentDefinition>;
  }
}
