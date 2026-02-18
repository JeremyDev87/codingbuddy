import { Injectable } from '@nestjs/common';
import type { ToolDefinition } from './base.handler';
import type { ToolResponse } from '../response.utils';
import { AbstractHandler } from './abstract-handler';
import { createJsonResponse, createErrorResponse } from '../response.utils';
import { restartTui } from '../../cli/restart-tui';

/**
 * Handler for TUI-related tools.
 * - restart_tui: Restart the TUI client when it becomes unresponsive or blank
 */
@Injectable()
export class TuiHandler extends AbstractHandler {
  protected getHandledTools(): string[] {
    return ['restart_tui'];
  }

  protected async handleTool(
    _toolName: string,
    _args: Record<string, unknown> | undefined,
  ): Promise<ToolResponse> {
    try {
      const result = await restartTui();
      if (!result.success) {
        return createErrorResponse(result.reason);
      }
      return createJsonResponse(result);
    } catch (error) {
      return createErrorResponse(
        `Failed to restart TUI: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  getToolDefinitions(): ToolDefinition[] {
    return [
      {
        name: 'restart_tui',
        description:
          'Restart the TUI client when it becomes unresponsive or shows a blank screen. ' +
          'Terminates any existing TUI client and spawns a fresh one in a new terminal window. ' +
          'Returns { success, reason, pid? }.',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
    ];
  }
}
