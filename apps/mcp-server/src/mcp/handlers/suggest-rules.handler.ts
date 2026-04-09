import { Injectable } from '@nestjs/common';
import { execFile } from 'child_process';
import { join } from 'path';
import { AbstractHandler } from './abstract-handler';
import type { ToolDefinition } from './base.handler';
import type { ToolResponse } from '../response.utils';
import { createJsonResponse, createErrorResponse } from '../response.utils';
import { extractOptionalString } from '../../shared/validation.constants';

const PIPELINE_SCRIPT = join(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'packages',
  'claude-code-plugin',
  'hooks',
  'lib',
  'suggest_pipeline.py',
);

const PIPELINE_TIMEOUT_MS = 30_000;

interface PipelineSuggestion {
  title: string;
  description: string;
  rule_content: string;
  pattern: {
    tool_name: string;
    input_summary: string;
    failure_count: number;
    session_count: number;
    first_seen: number;
    last_seen: number;
  };
}

@Injectable()
export class SuggestRulesHandler extends AbstractHandler {
  protected getHandledTools(): string[] {
    return ['suggest_rules'];
  }

  protected async handleTool(
    _toolName: string,
    args: Record<string, unknown> | undefined,
  ): Promise<ToolResponse> {
    const pipelineArgs = this.buildPipelineArgs(args);

    let stdout: string;
    try {
      stdout = await this.runPipeline(pipelineArgs);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return createErrorResponse(`Pipeline execution failed: ${message}`);
    }

    let suggestions: PipelineSuggestion[];
    try {
      suggestions = JSON.parse(stdout);
    } catch {
      return createErrorResponse(`Failed to parse pipeline output: ${stdout.slice(0, 200)}`);
    }

    return createJsonResponse({
      generatedAt: Date.now(),
      count: suggestions.length,
      suggestions,
    });
  }

  getToolDefinitions(): ToolDefinition[] {
    return [
      {
        name: 'suggest_rules',
        description:
          'Analyze execution history for repeated failure patterns and generate draft rule suggestions. ' +
          'Rules are proposed for human review — never auto-applied. ' +
          'Powered by PatternDetector → RuleSuggester pipeline.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            minOccurrences: {
              type: 'number',
              description: 'Minimum number of failures to count as a pattern (default: 3)',
            },
            days: {
              type: 'number',
              description: 'How many days back to search (default: 30)',
            },
            dbPath: {
              type: 'string',
              description: 'Path to history.db file. Defaults to ~/.codingbuddy/history.db',
            },
          },
          required: [],
        },
      },
    ];
  }

  private buildPipelineArgs(args: Record<string, unknown> | undefined): string[] {
    const pipelineArgs: string[] = [];

    const dbPath = extractOptionalString(args, 'dbPath');
    if (dbPath) {
      pipelineArgs.push('--db-path', dbPath);
    }

    const minOccurrences = args?.minOccurrences;
    if (typeof minOccurrences === 'number' && Number.isInteger(minOccurrences)) {
      pipelineArgs.push('--min-occurrences', String(minOccurrences));
    }

    const days = args?.days;
    if (typeof days === 'number' && Number.isInteger(days)) {
      pipelineArgs.push('--days', String(days));
    }

    return pipelineArgs;
  }

  private runPipeline(pipelineArgs: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      execFile(
        'python3',
        [PIPELINE_SCRIPT, ...pipelineArgs],
        { timeout: PIPELINE_TIMEOUT_MS },
        (err, stdout, stderr) => {
          if (err) {
            reject(new Error(`${err.message}${stderr ? `: ${stderr}` : ''}`));
            return;
          }
          resolve(stdout.trim());
        },
      );
    });
  }
}
