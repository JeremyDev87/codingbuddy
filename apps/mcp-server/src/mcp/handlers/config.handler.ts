import { Injectable } from '@nestjs/common';
import type { ToolDefinition } from './base.handler';
import type { ToolResponse } from '../response.utils';
import { AbstractHandler } from './abstract-handler';
import { ConfigService } from '../../config/config.service';
import { ConfigDiffService } from '../../config/config-diff.service';
import { AnalyzerService } from '../../analyzer/analyzer.service';
import { createJsonResponse, createErrorResponse } from '../response.utils';
import { extractOptionalString } from '../../shared/validation.constants';
import { assertPathSafe } from '../../shared/security.utils';

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
    return ['get_project_config', 'suggest_config_updates', 'set_project_root'];
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

    if (toolName === 'set_project_root') {
      return this.handleSetProjectRoot(args);
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
              description: 'Project root directory (defaults to current working directory)',
            },
          },
          required: [],
        },
      },
      {
        name: 'set_project_root',
        description:
          '[DEPRECATED - Will be removed in v2.0.0] Set the project root directory. Use this when the MCP server is launched from a different directory than the target project. RECOMMENDED: Configure project root in mcp-servers settings or use --project-root CLI flag instead.',
        inputSchema: {
          type: 'object',
          properties: {
            projectRoot: {
              type: 'string',
              description: 'The absolute path to the project root directory',
            },
          },
          required: ['projectRoot'],
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
      const configProjectRoot = this.configService.getProjectRoot();
      const projectRootInput = extractOptionalString(args, 'projectRoot') ?? configProjectRoot;

      // Security: Validate path to prevent path traversal attacks
      const projectRoot = assertPathSafe(projectRootInput, {
        basePath: configProjectRoot,
        allowAbsolute: true,
      });

      // Analyze project
      const analysis = await this.analyzerService.analyzeProject(projectRoot);

      // Reload config from disk to get latest changes
      await this.configService.reload();

      // Get current config
      const currentConfig = await this.configService.getSettings();

      // Compare and get suggestions
      const result = this.configDiffService.compareConfig(analysis, currentConfig);

      return createJsonResponse(result);
    } catch (error) {
      return createErrorResponse(
        `Failed to suggest config updates: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private async handleSetProjectRoot(
    args: Record<string, unknown> | undefined,
  ): Promise<ToolResponse> {
    try {
      const projectRootInput = extractOptionalString(args, 'projectRoot');

      // Validate projectRoot is provided and not empty/whitespace
      if (!projectRootInput || projectRootInput.trim() === '') {
        return createErrorResponse('projectRoot is required and must be a non-empty string');
      }

      // Security: Validate path to prevent path traversal attacks
      // For set_project_root, we use the current project root as the base path
      // and allow absolute paths since this is meant to change the project root
      const currentProjectRoot = this.configService.getProjectRoot();
      const projectRoot = assertPathSafe(projectRootInput, {
        basePath: currentProjectRoot,
        allowAbsolute: true,
      });

      // Set the project root and reload config
      await this.configService.setProjectRootAndReload(projectRoot);

      return createJsonResponse({
        success: true,
        projectRoot: this.configService.getProjectRoot(),
        message: `Project root set to: ${this.configService.getProjectRoot()}`,
        deprecationWarning:
          '[DEPRECATED] set_project_root will be removed in v2.0.0. Configure project root in mcp-servers settings or use --project-root CLI flag instead.',
      });
    } catch (error) {
      return createErrorResponse(
        `Failed to set project root: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
