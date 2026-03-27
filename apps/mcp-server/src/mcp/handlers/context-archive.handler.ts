import { Injectable } from '@nestjs/common';
import type { ToolDefinition } from './base.handler';
import type { ToolResponse } from '../response.utils';
import { AbstractHandler } from './abstract-handler';
import { ContextArchiveService } from '../../context/context-archive.service';
import { createJsonResponse, createErrorResponse } from '../response.utils';
import { extractOptionalString } from '../../shared/validation.constants';
import { ARCHIVE_DIR, MAX_ARCHIVE_RESULTS } from '../../context/context-archive.types';

/**
 * Handler for context archive tools.
 *
 * Tools:
 * - get_context_history: List recent archived context documents
 * - search_context_archives: Search archives by keyword
 * - cleanup_context_archives: Remove old archives (summarize first)
 */
@Injectable()
export class ContextArchiveHandler extends AbstractHandler {
  constructor(private readonly archiveService: ContextArchiveService) {
    super();
  }

  protected getHandledTools(): string[] {
    return ['get_context_history', 'search_context_archives', 'cleanup_context_archives'];
  }

  protected async handleTool(
    toolName: string,
    args: Record<string, unknown> | undefined,
  ): Promise<ToolResponse> {
    switch (toolName) {
      case 'get_context_history':
        return this.handleGetHistory(args);
      case 'search_context_archives':
        return this.handleSearch(args);
      case 'cleanup_context_archives':
        return this.handleCleanup(args);
      default:
        return createErrorResponse(`Unknown tool: ${toolName}`);
    }
  }

  getToolDefinitions(): ToolDefinition[] {
    return [
      {
        name: 'get_context_history',
        description: `List recent archived context documents from ${ARCHIVE_DIR}/. Each archive is a previous session's context.md saved before PLAN mode reset. Returns metadata (title, date, size) for cross-session decision tracking.`,
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: `Maximum number of entries to return (default: 10, max: ${MAX_ARCHIVE_RESULTS})`,
            },
          },
          required: [],
        },
      },
      {
        name: 'search_context_archives',
        description: `Search across all archived context documents by keyword. Finds past decisions, notes, and tasks from previous sessions. Returns matching lines with surrounding context.`,
        inputSchema: {
          type: 'object',
          properties: {
            keyword: {
              type: 'string',
              description: 'Search term (case-insensitive)',
            },
            limit: {
              type: 'number',
              description: `Maximum number of archives to search (default: ${MAX_ARCHIVE_RESULTS})`,
            },
          },
          required: ['keyword'],
        },
      },
      {
        name: 'cleanup_context_archives',
        description: `Auto-cleanup old archived contexts. Archives older than the specified days are summarized into _summary.md and deleted. Keeps recent archives intact.`,
        inputSchema: {
          type: 'object',
          properties: {
            maxAgeDays: {
              type: 'number',
              description: 'Maximum age in days before cleanup (default: 30)',
            },
          },
          required: [],
        },
      },
    ];
  }

  private async handleGetHistory(
    args: Record<string, unknown> | undefined,
  ): Promise<ToolResponse> {
    const limit = typeof args?.limit === 'number' ? args.limit : 10;

    if (limit < 1) {
      return createErrorResponse('limit must be >= 1');
    }

    const result = await this.archiveService.getHistory(limit);

    return createJsonResponse({
      ...result,
      archiveDir: ARCHIVE_DIR,
      message:
        result.totalCount === 0
          ? 'No archived contexts found. Archives are created automatically when PLAN mode resets context.md.'
          : `Found ${result.totalCount} archived context(s)`,
    });
  }

  private async handleSearch(
    args: Record<string, unknown> | undefined,
  ): Promise<ToolResponse> {
    const keyword = extractOptionalString(args, 'keyword');
    if (!keyword || keyword.trim().length === 0) {
      return createErrorResponse('Missing required parameter: keyword');
    }

    const limit = typeof args?.limit === 'number' ? args.limit : MAX_ARCHIVE_RESULTS;
    const result = await this.archiveService.searchArchives(keyword, limit);

    return createJsonResponse({
      ...result,
      message:
        result.results.length === 0
          ? `No archives found matching "${keyword}"`
          : `Found matches in ${result.results.length} archive(s)`,
    });
  }

  private async handleCleanup(
    args: Record<string, unknown> | undefined,
  ): Promise<ToolResponse> {
    const maxAgeDays = typeof args?.maxAgeDays === 'number' ? args.maxAgeDays : 30;

    if (maxAgeDays < 1) {
      return createErrorResponse('maxAgeDays must be >= 1');
    }

    const result = await this.archiveService.cleanupOldArchives(maxAgeDays);

    return createJsonResponse({
      ...result,
      message:
        result.summarizedCount === 0
          ? 'No archives needed cleanup'
          : `Cleaned up ${result.summarizedCount} old archive(s), ${result.remainingCount} remaining`,
    });
  }
}
