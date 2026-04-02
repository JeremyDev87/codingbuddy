import { Injectable, Logger } from '@nestjs/common';
import type { ToolDefinition } from './base.handler';
import type { ToolResponse } from '../response.utils';
import { AbstractHandler } from './abstract-handler';
import { QualityReportService } from '../../ship/quality-report.service';
import { createJsonResponse, createErrorResponse } from '../response.utils';
import { extractStringArray } from '../../shared/validation.constants';

@Injectable()
export class QualityReportHandler extends AbstractHandler {
  private readonly logger = new Logger(QualityReportHandler.name);

  constructor(private readonly qualityReportService: QualityReportService) {
    super();
  }

  protected getHandledTools(): string[] {
    return ['pr_quality_report'];
  }

  protected async handleTool(
    _toolName: string,
    args: Record<string, unknown> | undefined,
  ): Promise<ToolResponse> {
    try {
      const changedFiles = extractStringArray(args, 'changedFiles');
      if (!changedFiles || changedFiles.length === 0) {
        return createJsonResponse(
          await this.qualityReportService.generateReport({ changedFiles: [] }),
        );
      }

      const timeout = typeof args?.timeout === 'number' && args.timeout > 0 ? args.timeout : 30000;

      const result = await this.qualityReportService.generateReport({
        changedFiles,
        timeout,
      });

      return createJsonResponse(result);
    } catch (error) {
      this.logger.error(`Quality report failed: ${error}`);
      return createErrorResponse(
        `Quality report failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  getToolDefinitions(): ToolDefinition[] {
    return [
      {
        name: 'pr_quality_report',
        description:
          'Run specialist agents on changed files and generate a Quality Report for PR description',
        inputSchema: {
          type: 'object',
          properties: {
            changedFiles: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of changed file paths to analyze',
            },
            timeout: {
              type: 'number',
              description: 'Timeout in milliseconds (default: 30000)',
            },
          },
          required: ['changedFiles'],
        },
      },
    ];
  }
}
