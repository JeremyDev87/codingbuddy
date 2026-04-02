import { Injectable, Logger } from '@nestjs/common';
import type { ToolDefinition } from './base.handler';
import type { ToolResponse } from '../response.utils';
import { AbstractHandler } from './abstract-handler';
import { BriefingService } from '../../context/briefing.service';
import { createJsonResponse, createErrorResponse } from '../response.utils';
import { extractOptionalString } from '../../shared/validation.constants';

/**
 * MCP tool handler for creating session briefing documents.
 *
 * Exposes the `create_briefing` tool that captures current session state
 * (decisions, changed files, pending tasks) into a structured markdown
 * document for cross-session recovery.
 */
@Injectable()
export class BriefingHandler extends AbstractHandler {
  private readonly logger = new Logger(BriefingHandler.name);

  constructor(private readonly briefingService: BriefingService) {
    super();
  }

  protected getHandledTools(): string[] {
    return ['create_briefing'];
  }

  protected async handleTool(
    _toolName: string,
    args: Record<string, unknown> | undefined,
  ): Promise<ToolResponse> {
    try {
      const contextPath = extractOptionalString(args, 'contextPath');
      const projectRoot = extractOptionalString(args, 'projectRoot');

      const result = await this.briefingService.createBriefing({
        contextPath,
        projectRoot,
      });

      return createJsonResponse(result);
    } catch (error) {
      this.logger.error(`Briefing creation failed: ${error}`);
      return createErrorResponse(
        `Briefing creation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  getToolDefinitions(): ToolDefinition[] {
    return [
      {
        name: 'create_briefing',
        description:
          'Capture current session state into a briefing document for cross-session recovery',
        inputSchema: {
          type: 'object',
          properties: {
            contextPath: {
              type: 'string',
              description: 'Path to context.md file (default: docs/codingbuddy/context.md)',
            },
            projectRoot: {
              type: 'string',
              description: 'Project root directory (default: auto-detected)',
            },
          },
          required: [],
        },
      },
    ];
  }
}
