import { Injectable } from '@nestjs/common';
import type { ToolDefinition } from './base.handler';
import type { ToolResponse } from '../response.utils';
import { AbstractHandler } from './abstract-handler';
import { ChecklistService } from '../../checklist/checklist.service';
import { ContextService } from '../../context/context.service';
import type { ChecklistDomain } from '../../checklist/checklist.types';
import { createJsonResponse, createErrorResponse } from '../response.utils';
import {
  extractRequiredString,
  extractStringArray,
  isValidMode,
  type ValidMode,
} from '../../shared/validation.constants';

/**
 * Handler for checklist and context analysis tools
 * - generate_checklist: Generate contextual checklists
 * - analyze_task: Analyze tasks for recommendations
 */
@Injectable()
export class ChecklistContextHandler extends AbstractHandler {
  constructor(
    private readonly checklistService: ChecklistService,
    private readonly contextService: ContextService,
  ) {
    super();
  }

  protected getHandledTools(): string[] {
    return ['generate_checklist', 'analyze_task'];
  }

  protected async handleTool(
    toolName: string,
    args: Record<string, unknown> | undefined,
  ): Promise<ToolResponse> {
    switch (toolName) {
      case 'generate_checklist':
        return this.handleGenerateChecklist(args);
      case 'analyze_task':
        return this.handleAnalyzeTask(args);
      default:
        return createErrorResponse(`Unknown tool: ${toolName}`);
    }
  }

  getToolDefinitions(): ToolDefinition[] {
    return [
      {
        name: 'generate_checklist',
        description:
          'Generate contextual checklists based on file patterns and domains. Automatically detects relevant checklist items from security, accessibility, performance, testing, code-quality, and SEO domains based on file patterns and import analysis.',
        inputSchema: {
          type: 'object',
          properties: {
            files: {
              type: 'array',
              items: { type: 'string' },
              description:
                'File paths to analyze for checklist generation (e.g., ["src/auth/login.ts", "src/api/users.ts"])',
            },
            domains: {
              type: 'array',
              items: {
                type: 'string',
                enum: [
                  'security',
                  'accessibility',
                  'performance',
                  'testing',
                  'code-quality',
                  'seo',
                ],
              },
              description:
                'Specific domains to generate checklists for. If not provided, domains are auto-detected from files.',
            },
          },
          required: [],
        },
      },
      {
        name: 'analyze_task',
        description:
          'Analyze a task to provide contextual recommendations including risk assessment, relevant checklists, specialist recommendations, and workflow suggestions. Use this at the start of PLAN mode to get comprehensive task analysis.',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description: "User's task description",
            },
            files: {
              type: 'array',
              items: { type: 'string' },
              description: 'Optional file paths related to the task',
            },
            mode: {
              type: 'string',
              enum: ['PLAN', 'ACT', 'EVAL'],
              description: 'Current workflow mode',
            },
          },
          required: ['prompt'],
        },
      },
    ];
  }

  private async handleGenerateChecklist(
    args: Record<string, unknown> | undefined,
  ): Promise<ToolResponse> {
    // Extract optional arrays using shared utilities
    const files = extractStringArray(args, 'files');
    const domains = extractStringArray(args, 'domains') as
      | ChecklistDomain[]
      | undefined;

    try {
      const result = await this.checklistService.generateChecklist({
        files,
        domains,
      });
      return createJsonResponse(result);
    } catch (error) {
      return createErrorResponse(
        `Failed to generate checklist: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private async handleAnalyzeTask(
    args: Record<string, unknown> | undefined,
  ): Promise<ToolResponse> {
    const prompt = extractRequiredString(args, 'prompt');
    if (prompt === null) {
      return createErrorResponse('Missing required parameter: prompt');
    }

    // Extract optional arrays and mode using shared utilities
    const files = extractStringArray(args, 'files');
    const rawMode = args?.mode;
    const mode = isValidMode(rawMode) ? (rawMode as ValidMode) : undefined;

    try {
      const result = await this.contextService.analyzeTask({
        prompt,
        files,
        mode,
      });
      return createJsonResponse(result);
    } catch (error) {
      return createErrorResponse(
        `Failed to analyze task: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
