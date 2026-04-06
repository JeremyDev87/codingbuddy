import { Injectable, Logger } from '@nestjs/common';
import type { ToolDefinition } from './base.handler';
import type { ToolResponse } from '../response.utils';
import { AbstractHandler } from './abstract-handler';
import { ReviewPrService } from '../../ship/review-pr.service';
import { createJsonResponse, createErrorResponse } from '../response.utils';

@Injectable()
export class ReviewPrHandler extends AbstractHandler {
  private readonly logger = new Logger(ReviewPrHandler.name);

  constructor(private readonly reviewPrService: ReviewPrService) {
    super();
  }

  protected getHandledTools(): string[] {
    return ['review_pr'];
  }

  protected async handleTool(
    _toolName: string,
    args: Record<string, unknown> | undefined,
  ): Promise<ToolResponse> {
    try {
      const prNumber = args?.pr_number;
      if (typeof prNumber !== 'number' || !Number.isFinite(prNumber) || prNumber <= 0) {
        return createErrorResponse('pr_number is required and must be a positive number');
      }

      const issueNumber =
        typeof args?.issue_number === 'number' && args.issue_number > 0
          ? args.issue_number
          : undefined;

      const timeout = typeof args?.timeout === 'number' && args.timeout > 0 ? args.timeout : 30000;

      const result = await this.reviewPrService.reviewPr({
        prNumber,
        issueNumber,
        timeout,
      });

      return createJsonResponse(result);
    } catch (error) {
      this.logger.error(`review_pr failed: ${error}`);
      return createErrorResponse(
        `review_pr failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  getToolDefinitions(): ToolDefinition[] {
    return [
      {
        name: 'review_pr',
        description:
          'Fetch PR metadata, diff, checklists, and specialist recommendations for EVAL-mode PR review. Returns structured data for comprehensive code review.',
        inputSchema: {
          type: 'object',
          properties: {
            pr_number: {
              type: 'number',
              description: 'PR number to review',
            },
            issue_number: {
              type: 'number',
              description: 'Optional linked issue number for spec compliance check',
            },
            timeout: {
              type: 'number',
              description: 'Timeout in milliseconds (default: 30000)',
            },
          },
          required: ['pr_number'],
        },
      },
    ];
  }
}
