import { Injectable, Logger } from '@nestjs/common';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import type { ToolDefinition } from './base.handler';
import type { ToolResponse } from '../response.utils';
import { AbstractHandler } from './abstract-handler';
import { ConfigService } from '../../config/config.service';
import { createJsonResponse, createErrorResponse } from '../response.utils';
import { extractOptionalString } from '../../shared/validation.constants';

/** Known valid fields for Claude Code plugin.json */
const VALID_PLUGIN_FIELDS = new Set(['name', 'version', 'description', 'author']);

/** Required fields for Claude Code plugin.json */
const REQUIRED_PLUGIN_FIELDS = ['name', 'version', 'description'];

interface ValidationIssue {
  field: string;
  severity: 'error' | 'warning';
  message: string;
  suggestion?: string;
}

@Injectable()
export class PluginValidationHandler extends AbstractHandler {
  private readonly logger = new Logger(PluginValidationHandler.name);

  constructor(private readonly configService: ConfigService) {
    super();
  }

  protected getHandledTools(): string[] {
    return ['validate_plugin_manifest'];
  }

  protected async handleTool(
    _toolName: string,
    args: Record<string, unknown> | undefined,
  ): Promise<ToolResponse> {
    const inputPath = extractOptionalString(args, 'path') || '.claude-plugin/plugin.json';

    try {
      const projectRoot = this.configService.getProjectRoot();
      const fullPath = resolve(projectRoot, inputPath);

      let raw: string;
      try {
        raw = await readFile(fullPath, 'utf-8');
      } catch {
        return createJsonResponse({
          valid: false,
          path: fullPath,
          issues: [
            {
              field: '_file',
              severity: 'error',
              message: `File not found: ${inputPath}`,
              suggestion:
                'Create .claude-plugin/plugin.json with name, version, and description fields.',
            },
          ],
        });
      }

      let manifest: Record<string, unknown>;
      try {
        manifest = JSON.parse(raw);
      } catch {
        return createJsonResponse({
          valid: false,
          path: fullPath,
          issues: [
            {
              field: '_file',
              severity: 'error',
              message: 'Invalid JSON syntax',
              suggestion: 'Fix JSON syntax errors in the file.',
            },
          ],
        });
      }

      const issues: ValidationIssue[] = [];

      // Check required fields
      for (const field of REQUIRED_PLUGIN_FIELDS) {
        if (!(field in manifest)) {
          issues.push({
            field,
            severity: 'error',
            message: `Missing required field: ${field}`,
            suggestion: `Add "${field}" to plugin.json.`,
          });
        }
      }

      // Check for unknown fields
      for (const key of Object.keys(manifest)) {
        if (!VALID_PLUGIN_FIELDS.has(key)) {
          issues.push({
            field: key,
            severity: 'error',
            message: `Unknown field: ${key}`,
            suggestion: `Remove "${key}" from plugin.json. Valid fields: ${[...VALID_PLUGIN_FIELDS].join(', ')}.`,
          });
        }
      }

      // Validate version format
      if (
        typeof manifest.version === 'string' &&
        !/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(manifest.version)
      ) {
        issues.push({
          field: 'version',
          severity: 'error',
          message: `Invalid version format: ${manifest.version}`,
          suggestion: 'Use semver format: X.Y.Z (e.g., 1.0.0)',
        });
      }

      // Validate name format
      if (typeof manifest.name === 'string' && !/^[a-z0-9][a-z0-9-]*$/.test(manifest.name)) {
        issues.push({
          field: 'name',
          severity: 'warning',
          message: `Name should be kebab-case: ${manifest.name}`,
          suggestion: 'Use lowercase letters, numbers, and hyphens.',
        });
      }

      const valid = issues.filter(i => i.severity === 'error').length === 0;

      return createJsonResponse({
        valid,
        path: fullPath,
        fields: Object.keys(manifest),
        issues,
      });
    } catch (error) {
      this.logger.error(`Plugin validation failed: ${error}`);
      return createErrorResponse(
        `Plugin validation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  getToolDefinitions(): ToolDefinition[] {
    return [
      {
        name: 'validate_plugin_manifest',
        description:
          'Validate a Claude Code plugin manifest (plugin.json) against the known schema. Returns validation results with actionable fix suggestions.',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description:
                'Path to plugin.json. Defaults to .claude-plugin/plugin.json in project root.',
            },
          },
          required: [],
        },
      },
    ];
  }
}
