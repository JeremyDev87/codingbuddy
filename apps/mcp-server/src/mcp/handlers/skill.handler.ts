import { Injectable } from '@nestjs/common';
import type { ToolHandler, ToolDefinition, ToolResult } from './base.handler';
import { SkillRecommendationService } from '../../skill/skill-recommendation.service';
import type { ListSkillsOptions } from '../../skill/skill-recommendation.types';
import { createJsonResponse, createErrorResponse } from '../response.utils';
import { sanitizeHandlerArgs } from '../../shared/security.utils';
import { extractRequiredString } from '../../shared/validation.constants';

/**
 * Handler for skill-related tools
 * - recommend_skills: Recommend skills based on user prompt
 * - list_skills: List all available skills
 */
@Injectable()
export class SkillHandler implements ToolHandler {
  private readonly handledTools = ['recommend_skills', 'list_skills'];

  constructor(
    private readonly skillRecommendationService: SkillRecommendationService,
  ) {}

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
      case 'recommend_skills':
        return this.handleRecommendSkills(args);
      case 'list_skills':
        return this.handleListSkills(args);
      default:
        return null;
    }
  }

  getToolDefinitions(): ToolDefinition[] {
    return [
      {
        name: 'recommend_skills',
        description:
          'Recommend skills based on user prompt with multi-language support',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description: 'User prompt to analyze for skill recommendations',
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
    ];
  }

  private handleRecommendSkills(
    args: Record<string, unknown> | undefined,
  ): ToolResult {
    const prompt = extractRequiredString(args, 'prompt');
    if (prompt === null) {
      return createErrorResponse('Missing required parameter: prompt');
    }
    try {
      const result = this.skillRecommendationService.recommendSkills(prompt);
      return createJsonResponse(result);
    } catch (error) {
      return createErrorResponse(
        `Failed to recommend skills: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private handleListSkills(
    args: Record<string, unknown> | undefined,
  ): ToolResult {
    try {
      const options: ListSkillsOptions = {};

      if (typeof args?.minPriority === 'number') {
        options.minPriority = args.minPriority;
      }
      if (typeof args?.maxPriority === 'number') {
        options.maxPriority = args.maxPriority;
      }

      const result = this.skillRecommendationService.listSkills(options);
      return createJsonResponse(result);
    } catch (error) {
      return createErrorResponse(
        `Failed to list skills: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
