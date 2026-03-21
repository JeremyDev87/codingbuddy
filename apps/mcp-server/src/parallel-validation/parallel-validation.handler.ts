import { Injectable } from '@nestjs/common';
import type { ToolDefinition } from '../mcp/handlers/base.handler';
import type { ToolResponse } from '../mcp/response.utils';
import { AbstractHandler } from '../mcp/handlers/abstract-handler';
import { createJsonResponse, createErrorResponse } from '../mcp/response.utils';
import { extractFilePaths } from './extract-file-paths';
import { buildOverlapMatrix, type IssueFiles } from './overlap-matrix';
import { splitIntoWaves } from './wave-splitter';
import type { ValidationResult } from './parallel-validation.types';

@Injectable()
export class ParallelValidationHandler extends AbstractHandler {
  protected getHandledTools(): string[] {
    return ['validate_parallel_issues'];
  }

  getToolDefinitions(): ToolDefinition[] {
    return [
      {
        name: 'validate_parallel_issues',
        description:
          'Validate whether GitHub issues can be safely executed in parallel by checking file overlap. ' +
          'Returns overlap matrix, severity (OK/WARNING), and zero-conflict wave suggestions. ' +
          'Iron Rule: Issues modifying the same file MUST NOT run in the same wave.',
        inputSchema: {
          type: 'object',
          properties: {
            issues: {
              type: 'array',
              items: { type: 'number' },
              description: 'List of GitHub issue numbers to validate for parallel execution',
            },
            issueContents: {
              type: 'object',
              additionalProperties: { type: 'string' },
              description:
                'Map of issue number to issue body content. Key is issue number as string, value is the issue body markdown text.',
            },
          },
          required: ['issues'],
        },
      },
    ];
  }

  protected async handleTool(
    _toolName: string,
    args: Record<string, unknown> | undefined,
  ): Promise<ToolResponse> {
    const rawIssues = args?.issues;
    if (!Array.isArray(rawIssues)) {
      return createErrorResponse(
        'Missing or invalid required parameter: issues (must be an array of numbers)',
      );
    }

    const issueNumbers = rawIssues.map(Number).filter(n => !isNaN(n));
    const issueContents = (args?.issueContents ?? {}) as Record<string, string>;

    // Extract file paths from each issue's content
    const issueFiles: IssueFiles[] = issueNumbers.map(issue => ({
      issue,
      files: extractFilePaths(issueContents[String(issue)] ?? ''),
    }));

    // Build overlap matrix
    const overlapMatrix = buildOverlapMatrix(issueFiles);
    const hasOverlap = overlapMatrix.length > 0;

    // Suggest zero-conflict waves
    const suggestedWaves = splitIntoWaves(issueFiles);

    // Build result
    const overlappingPairs = overlapMatrix
      .map(e => `#${e.issueA} ↔ #${e.issueB}: ${e.overlappingFiles.join(', ')}`)
      .join('\n');

    const message = hasOverlap
      ? `⚠️ WARNING: File overlap detected! ${overlapMatrix.length} conflicting pair(s) found.\n` +
        `Iron Rule: Issues modifying the same file MUST NOT run in the same Wave.\n\n` +
        `Conflicts:\n${overlappingPairs}\n\n` +
        `Suggested waves: ${suggestedWaves.map((w, i) => `Wave ${i + 1}: [${w.map(n => '#' + n).join(', ')}]`).join(' → ')}`
      : `✅ OK: No file overlap detected. All ${issueNumbers.length} issues can run in parallel.`;

    const result: ValidationResult = {
      issues: issueFiles,
      overlapMatrix,
      hasOverlap,
      severity: hasOverlap ? 'WARNING' : 'OK',
      suggestedWaves,
      message,
    };

    return createJsonResponse(result);
  }
}
