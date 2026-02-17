import { Injectable } from '@nestjs/common';
import type { ToolDefinition } from './base.handler';
import type { ToolResponse } from '../response.utils';
import { AbstractHandler } from './abstract-handler';
import { ConventionsAnalyzer } from '../../analyzer/conventions.analyzer';
import { ConfigService } from '../../config/config.service';
import { createJsonResponse, createErrorResponse } from '../response.utils';
import { extractOptionalString } from '../../shared/validation.constants';
import { assertPathSafe } from '../../shared/security.utils';

/**
 * Handler for code conventions tools
 * - get_code_conventions: Get project code conventions from config files
 */
@Injectable()
export class ConventionsHandler extends AbstractHandler {
  constructor(
    private readonly conventionsAnalyzer: ConventionsAnalyzer,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  protected getHandledTools(): string[] {
    return ['get_code_conventions'];
  }

  protected async handleTool(
    toolName: string,
    args: Record<string, unknown> | undefined,
  ): Promise<ToolResponse> {
    switch (toolName) {
      case 'get_code_conventions':
        return this.handleGetCodeConventions(args);
      default:
        return createErrorResponse(`Unknown tool: ${toolName}`);
    }
  }

  getToolDefinitions(): ToolDefinition[] {
    return [
      {
        name: 'get_code_conventions',
        description:
          'Get project configuration including tech stack, architecture, conventions, and language settings',
        inputSchema: {
          type: 'object',
          properties: {
            projectRoot: {
              type: 'string',
              description: 'Project root directory (defaults to current working directory)',
            },
          },
          required: [],
        },
      },
    ];
  }

  /**
   * Handle get_code_conventions tool call
   */
  private async handleGetCodeConventions(
    args: Record<string, unknown> | undefined,
  ): Promise<ToolResponse> {
    try {
      const configProjectRoot = this.configService.getProjectRoot();
      const projectRootInput = extractOptionalString(args, 'projectRoot') ?? configProjectRoot;

      // Validate path to prevent path traversal attacks
      const projectRoot = assertPathSafe(projectRootInput, {
        basePath: configProjectRoot,
        allowAbsolute: true,
      });

      const conventions = await this.conventionsAnalyzer.analyzeProjectConventions(projectRoot);

      return createJsonResponse(conventions);
    } catch (error) {
      return createErrorResponse(
        `Failed to analyze code conventions: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
