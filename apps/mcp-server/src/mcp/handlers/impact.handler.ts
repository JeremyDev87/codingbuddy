import { Injectable } from '@nestjs/common';
import type { ToolDefinition } from './base.handler';
import type { ToolResponse } from '../response.utils';
import { AbstractHandler } from './abstract-handler';
import { ImpactReportService } from '../../impact/impact-report.service';
import { createJsonResponse } from '../response.utils';

@Injectable()
export class ImpactHandler extends AbstractHandler {
  constructor(private readonly reportService: ImpactReportService) {
    super();
  }

  protected getHandledTools(): string[] {
    return ['get_session_impact'];
  }

  protected async handleTool(
    toolName: string,
    args: Record<string, unknown> | undefined,
  ): Promise<ToolResponse> {
    const sessionId =
      typeof args?.sessionId === 'string' && args.sessionId.length > 0 ? args.sessionId : 'current';

    const summary = this.reportService.getSessionSummary(sessionId);
    return createJsonResponse(summary);
  }

  getToolDefinitions(): ToolDefinition[] {
    return [
      {
        name: 'get_session_impact',
        description:
          'Get impact summary for a session including events, issues prevented, agents dispatched, and checklists generated.',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: {
              type: 'string',
              description:
                'Optional session ID for session-isolated context. Omit for legacy single-file behavior.',
            },
          },
        },
      },
    ];
  }
}
