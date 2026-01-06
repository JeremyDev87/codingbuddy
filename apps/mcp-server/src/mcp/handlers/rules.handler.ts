import { Injectable } from '@nestjs/common';
import type { ToolHandler, ToolDefinition, ToolResult } from './base.handler';
import { RulesService } from '../../rules/rules.service';
import { createJsonResponse, createErrorResponse } from '../response.utils';
import { resolveModel } from '../../model';
import type { ModelConfig } from '../../model';
import { sanitizeHandlerArgs } from '../../shared/security.utils';
import { extractRequiredString } from '../../shared/validation.constants';

/**
 * Handler for rules-related tools
 * - search_rules: Search for rules and guidelines
 * - get_agent_details: Get detailed profile of a specific AI agent
 */
@Injectable()
export class RulesHandler implements ToolHandler {
  private readonly handledTools = ['search_rules', 'get_agent_details'];

  constructor(private readonly rulesService: RulesService) {}

  async handle(
    toolName: string,
    args: Record<string, unknown> | undefined,
  ): Promise<ToolResult | null> {
    if (!this.handledTools.includes(toolName)) {
      return null;
    }

    // Validate args for prototype pollution
    const validation = sanitizeHandlerArgs(args);
    if (!validation.safe) {
      return createErrorResponse(validation.error!);
    }

    switch (toolName) {
      case 'search_rules':
        return this.handleSearchRules(args);
      case 'get_agent_details':
        return this.handleGetAgentDetails(args);
      default:
        return null;
    }
  }

  getToolDefinitions(): ToolDefinition[] {
    return [
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
    ];
  }

  private async handleSearchRules(
    args: Record<string, unknown> | undefined,
  ): Promise<ToolResult> {
    const query = extractRequiredString(args, 'query');
    if (query === null) {
      return createErrorResponse('Missing required parameter: query');
    }
    const results = await this.rulesService.searchRules(query);
    return createJsonResponse(results);
  }

  private async handleGetAgentDetails(
    args: Record<string, unknown> | undefined,
  ): Promise<ToolResult> {
    const agentName = extractRequiredString(args, 'agentName');
    if (agentName === null) {
      return createErrorResponse('Missing required parameter: agentName');
    }
    try {
      const agent = await this.rulesService.getAgent(agentName);

      // Resolve model using 4-level priority: agent > mode > global > system
      // For get_agent_details, we only have agent context (no mode or global config)
      const agentModel = agent.model as ModelConfig | undefined;
      const resolvedModel = resolveModel({ agentModel });

      return createJsonResponse({
        ...agent,
        resolvedModel,
      });
    } catch {
      return createErrorResponse(`Agent '${agentName}' not found.`);
    }
  }
}
