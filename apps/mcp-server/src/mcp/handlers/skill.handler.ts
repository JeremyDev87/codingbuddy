import { Injectable } from '@nestjs/common';
import type { ToolDefinition } from './base.handler';
import type { ToolResponse } from '../response.utils';
import { AbstractHandler } from './abstract-handler';
import { SkillRecommendationService } from '../../skill/skill-recommendation.service';
import { RulesService } from '../../rules/rules.service';
import type { ListSkillsOptions } from '../../skill/skill-recommendation.types';
import { createJsonResponse, createErrorResponse } from '../response.utils';
import { extractRequiredString } from '../../shared/validation.constants';

/**
 * Handler for skill-related tools
 * - recommend_skills: Recommend skills based on user prompt
 * - list_skills: List all available skills
 * - get_skill: Get skill content by name
 */
@Injectable()
export class SkillHandler extends AbstractHandler {
  constructor(
    private readonly skillRecommendationService: SkillRecommendationService,
    private readonly rulesService: RulesService,
  ) {
    super();
  }

  protected getHandledTools(): string[] {
    return ['recommend_skills', 'list_skills', 'get_skill'];
  }

  protected async handleTool(
    toolName: string,
    args: Record<string, unknown> | undefined,
  ): Promise<ToolResponse> {
    switch (toolName) {
      case 'recommend_skills':
        return this.handleRecommendSkills(args);
      case 'list_skills':
        return this.handleListSkills(args);
      case 'get_skill':
        return this.handleGetSkill(args);
      default:
        return createErrorResponse(`Unknown tool: ${toolName}`);
    }
  }

  getToolDefinitions(): ToolDefinition[] {
    return [
      {
        name: 'recommend_skills',
        description: 'Recommend skills based on user prompt with multi-language support',
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
      {
        name: 'get_skill',
        description:
          'Get skill content by name. Returns the full skill definition including name, description, and instructions content.',
        inputSchema: {
          type: 'object',
          properties: {
            skillName: {
              type: 'string',
              description:
                'Name of the skill (e.g., brainstorming, test-driven-development, systematic-debugging)',
            },
          },
          required: ['skillName'],
        },
      },
    ];
  }

  private handleRecommendSkills(args: Record<string, unknown> | undefined): ToolResponse {
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

  private handleListSkills(args: Record<string, unknown> | undefined): ToolResponse {
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

  private async handleGetSkill(args: Record<string, unknown> | undefined): Promise<ToolResponse> {
    const skillName = extractRequiredString(args, 'skillName');
    if (skillName === null) {
      return createErrorResponse('Missing required parameter: skillName');
    }

    try {
      const skill = await this.rulesService.getSkill(skillName);
      return createJsonResponse(skill);
    } catch (error) {
      return createErrorResponse(
        error instanceof Error ? error.message : `Skill '${skillName}' not found.`,
      );
    }
  }
}
