import { Injectable } from '@nestjs/common';
import type { ToolDefinition } from './base.handler';
import type { ToolResponse } from '../response.utils';
import { AbstractHandler } from './abstract-handler';
import { BriefingService } from '../../context/briefing.service';
import { createJsonResponse, createErrorResponse } from '../response.utils';
import { extractOptionalString } from '../../shared/validation.constants';
import { BRIEFING_DIR } from '../../context/briefing.types';

/**
 * Handler for the create_briefing MCP tool.
 *
 * Captures current session state into a structured briefing document
 * for cross-session recovery.
 */
@Injectable()
export class BriefingHandler extends AbstractHandler {
  constructor(private readonly briefingService: BriefingService) {
    super();
  }

  protected getHandledTools(): string[] {
    return ['create_briefing'];
  }

  protected async handleTool(
    toolName: string,
    args: Record<string, unknown> | undefined,
  ): Promise<ToolResponse> {
    switch (toolName) {
      case 'create_briefing':
        return this.handleCreateBriefing(args);
      default:
        return createErrorResponse(`Unknown tool: ${toolName}`);
    }
  }

  getToolDefinitions(): ToolDefinition[] {
    return [
      {
        name: 'create_briefing',
        description:
          'Capture current session state into a briefing document for cross-session recovery. ' +
          `Reads context.md, extracts decisions/tasks, checks git diff, and writes to ${BRIEFING_DIR}/.`,
        inputSchema: {
          type: 'object',
          properties: {
            contextPath: {
              type: 'string',
              description: 'Path to context.md file (default: docs/codingbuddy/context.md)',
            },
            projectRoot: {
              type: 'string',
              description: 'Project root directory (defaults to auto-detected root)',
            },
          },
          required: [],
        },
      },
    ];
  }

  private async handleCreateBriefing(
    args: Record<string, unknown> | undefined,
  ): Promise<ToolResponse> {
    try {
      const contextPath = extractOptionalString(args, 'contextPath');
      const projectRoot = extractOptionalString(args, 'projectRoot');

      const result = await this.briefingService.createBriefing({
        contextPath,
        projectRoot,
      });

      return createJsonResponse({
        ...result,
        message: `Briefing created at ${result.filePath}`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return createErrorResponse(`Failed to create briefing: ${message}`);
    }
  }
}
