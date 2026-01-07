import { Injectable } from '@nestjs/common';
import type { ToolDefinition } from './base.handler';
import type { ToolResponse } from '../response.utils';
import { AbstractHandler } from './abstract-handler';
import { ConfigService } from '../../config/config.service';
import { ConfigDiffService } from '../../config/config-diff.service';
import { AnalyzerService } from '../../analyzer/analyzer.service';
import { createJsonResponse, createErrorResponse } from '../response.utils';
import { extractOptionalString } from '../../shared/validation.constants';

/**
 * Handler for configuration-related tools
 * - get_project_config: Get project configuration
 * - suggest_config_updates: Analyze and suggest config updates
 */
@Injectable()
export class ConfigHandler extends AbstractHandler {
  constructor(
    private readonly configService: ConfigService,
    private readonly configDiffService: ConfigDiffService,
    private readonly analyzerService: AnalyzerService,
  ) {
    super();
  }

  protected getHandledTools(): string[] {
    return ['get_project_config', 'suggest_config_updates'];
  }

  protected async handleTool(
    toolName: string,
    args: Record<string, unknown> | undefined,
  ): Promise<ToolResponse> {
    if (toolName === 'get_project_config') {
      return this.handleGetProjectConfig();
    }

    if (toolName === 'suggest_config_updates') {
      return this.handleSuggestConfigUpdates(args);
    }

    // This should never be reached because AbstractHandler validates tool names
    return createErrorResponse(`Unknown tool: ${toolName}`);
  }

  getToolDefinitions(): ToolDefinition[] {
    return [
      {
        name: 'get_project_config',
        description:
          'Get project configuration including tech stack, architecture, conventions, and language settings',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'suggest_config_updates',
        description:
          'Analyze the project and suggest config updates based on detected changes (new frameworks, dependencies, patterns)',
        inputSchema: {
          type: 'object',
          properties: {
            projectRoot: {
              type: 'string',
              description:
                'Project root directory (defaults to current working directory)',
            },
          },
          required: [],
        },
      },
    ];
  }

  private async handleGetProjectConfig(): Promise<ToolResponse> {
    try {
      const settings = await this.configService.getSettings();
      return createJsonResponse(settings);
    } catch (error) {
      return createErrorResponse(
        `Failed to get project config: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private async handleSuggestConfigUpdates(
    args: Record<string, unknown> | undefined,
  ): Promise<ToolResponse> {
    try {
      const projectRoot =
        extractOptionalString(args, 'projectRoot') ?? process.cwd();

      // Analyze project
      const analysis = await this.analyzerService.analyzeProject(projectRoot);

      // Reload config from disk to get latest changes
      await this.configService.reload();

      // Get current config
      const currentConfig = await this.configService.getSettings();

      // Compare and get suggestions
      const result = this.configDiffService.compareConfig(
        analysis,
        currentConfig,
      );

      return createJsonResponse(result);
    } catch (error) {
      return createErrorResponse(
        `Failed to suggest config updates: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
