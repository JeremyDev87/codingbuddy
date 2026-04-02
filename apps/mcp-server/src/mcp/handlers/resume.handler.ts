import { Injectable, Logger } from '@nestjs/common';
import type { ToolDefinition } from './base.handler';
import type { ToolResponse } from '../response.utils';
import { AbstractHandler } from './abstract-handler';
import { BriefingLoaderService } from '../../context/briefing-loader.service';
import { createJsonResponse, createErrorResponse } from '../response.utils';
import { extractOptionalString } from '../../shared/validation.constants';

/**
 * MCP tool handler for resuming sessions from briefing documents.
 *
 * Exposes the `resume_session` tool that loads a briefing document,
 * restores the session context (context.md), and returns a summary
 * for the AI to display to the user.
 */
@Injectable()
export class ResumeHandler extends AbstractHandler {
  private readonly logger = new Logger(ResumeHandler.name);

  constructor(private readonly briefingLoaderService: BriefingLoaderService) {
    super();
  }

  protected getHandledTools(): string[] {
    return ['resume_session'];
  }

  protected async handleTool(
    _toolName: string,
    args: Record<string, unknown> | undefined,
  ): Promise<ToolResponse> {
    try {
      const briefingPath = extractOptionalString(args, 'briefingPath');

      const result = await this.briefingLoaderService.restoreContext(briefingPath);

      return createJsonResponse(result);
    } catch (error) {
      this.logger.error(`Session resume failed: ${error}`);
      return createErrorResponse(
        `Session resume failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  getToolDefinitions(): ToolDefinition[] {
    return [
      {
        name: 'resume_session',
        description: 'Load a previous session briefing to restore context and continue work',
        inputSchema: {
          type: 'object',
          properties: {
            briefingPath: {
              type: 'string',
              description:
                'Path to a specific briefing file. If omitted, loads the most recent briefing from docs/codingbuddy/briefings/',
            },
          },
          required: [],
        },
      },
    ];
  }
}
