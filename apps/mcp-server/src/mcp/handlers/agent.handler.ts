import { Injectable } from '@nestjs/common';
import type { ToolDefinition } from './base.handler';
import type { ToolResponse } from '../response.utils';
import { AbstractHandler } from './abstract-handler';
import { AgentService } from '../../agent/agent.service';
import type { Mode } from '../../keyword/keyword.types';
import { createJsonResponse, createErrorResponse } from '../response.utils';
import {
  extractRequiredString,
  extractStringArray,
  extractOptionalString,
  isValidMode,
} from '../../shared/validation.constants';

/**
 * Handler for agent-related tools
 * - get_agent_system_prompt: Get complete system prompt for a specialist agent
 * - prepare_parallel_agents: Prepare multiple agents for parallel execution
 */
@Injectable()
export class AgentHandler extends AbstractHandler {
  constructor(private readonly agentService: AgentService) {
    super();
  }

  protected getHandledTools(): string[] {
    return ['get_agent_system_prompt', 'prepare_parallel_agents'];
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
              description: 'Shared context or task description for all agents',
            },
          },
          required: ['mode', 'specialists'],
        },
      },
    ];
  }

  private async handleGetAgentSystemPrompt(
    args: Record<string, unknown> | undefined,
  ): Promise<ToolResponse> {
    const agentName = extractRequiredString(args, 'agentName');
    if (agentName === null) {
      return createErrorResponse('Missing required parameter: agentName');
    }

    const context = args?.context as Record<string, unknown> | undefined;
    if (!context) {
      return createErrorResponse(
        'Missing required parameter: context.mode (PLAN, ACT, or EVAL)',
      );
    }

    const mode = context.mode;
    if (!isValidMode(mode)) {
      return createErrorResponse(
        mode === undefined || mode === null
          ? 'Missing required parameter: context.mode (PLAN, ACT, or EVAL)'
          : `Invalid mode: ${mode}. Must be PLAN, ACT, or EVAL`,
      );
    }

    const targetFiles = extractStringArray(context, 'targetFiles');
    const taskDescription = extractOptionalString(context, 'taskDescription');

    try {
      const result = await this.agentService.getAgentSystemPrompt(agentName, {
        mode: mode as Mode,
        targetFiles,
        taskDescription,
      });
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
          ? 'Missing required parameter: mode (PLAN, ACT, or EVAL)'
          : `Invalid mode: ${mode}. Must be PLAN, ACT, or EVAL`,
      );
    }

    const specialists = extractStringArray(args, 'specialists');
    if (!specialists || specialists.length === 0) {
      return createErrorResponse(
        'Missing required parameter: specialists (array of agent names)',
      );
    }

    const targetFiles = extractStringArray(args, 'targetFiles');
    const sharedContext = extractOptionalString(args, 'sharedContext');

    try {
      const result = await this.agentService.prepareParallelAgents(
        mode as Mode,
        specialists,
        targetFiles,
        sharedContext,
      );
      return createJsonResponse(result);
    } catch (error) {
      return createErrorResponse(
        `Failed to prepare parallel agents: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
