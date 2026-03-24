/**
 * Pipeline Handler — MCP Tool Handler for Pipeline Operations
 *
 * Provides run_pipeline, pipeline_status, and resume_pipeline tools
 * for the Sequential Task Pipeline Engine.
 */

import { Injectable } from '@nestjs/common';
import { AbstractHandler } from './abstract-handler';
import type { ToolDefinition } from './base.handler';
import type { ToolResponse } from '../response.utils';
import { createJsonResponse, createErrorResponse } from '../response.utils';
import { PipelineService } from '../../pipeline/pipeline.service';
import { isValidPipelineDefinition } from '../../pipeline/pipeline.types';
import type { PipelineDefinition } from '../../pipeline/pipeline.types';
import { extractRequiredString } from '../../shared/validation.constants';

@Injectable()
export class PipelineHandler extends AbstractHandler {
  constructor(private readonly pipelineService: PipelineService) {
    super();
  }

  protected getHandledTools(): string[] {
    return ['run_pipeline', 'pipeline_status', 'resume_pipeline'];
  }

  protected async handleTool(
    toolName: string,
    args: Record<string, unknown> | undefined,
  ): Promise<ToolResponse> {
    switch (toolName) {
      case 'run_pipeline':
        return this.handleRunPipeline(args);
      case 'pipeline_status':
        return this.handlePipelineStatus(args);
      case 'resume_pipeline':
        return this.handleResumePipeline(args);
      default:
        return createErrorResponse(`Unknown tool: ${toolName}`);
    }
  }

  getToolDefinitions(): ToolDefinition[] {
    return [
      {
        name: 'run_pipeline',
        description:
          'Run a sequential task pipeline. Stages execute in order, with each stage receiving the previous stage output as input.',
        inputSchema: {
          type: 'object',
          properties: {
            pipeline: {
              type: 'object',
              description:
                'Pipeline definition with id, name, and stages array. Each stage has id, name, type (command|agent|skill), and config.',
            },
          },
          required: ['pipeline'],
        },
      },
      {
        name: 'pipeline_status',
        description: 'Get the status of a pipeline execution including stage results and progress.',
        inputSchema: {
          type: 'object',
          properties: {
            executionId: {
              type: 'string',
              description: 'The execution ID returned from run_pipeline.',
            },
          },
          required: ['executionId'],
        },
      },
      {
        name: 'resume_pipeline',
        description:
          'Resume a failed pipeline from the failed stage. Preserves completed stage results and re-executes from the failure point.',
        inputSchema: {
          type: 'object',
          properties: {
            executionId: {
              type: 'string',
              description: 'The execution ID of the failed pipeline.',
            },
            pipeline: {
              type: 'object',
              description: 'Updated pipeline definition (may have fixed stages).',
            },
          },
          required: ['executionId', 'pipeline'],
        },
      },
    ];
  }

  private async handleRunPipeline(
    args: Record<string, unknown> | undefined,
  ): Promise<ToolResponse> {
    const pipeline = args?.pipeline;
    if (!pipeline || typeof pipeline !== 'object') {
      return createErrorResponse('Missing required parameter: pipeline');
    }

    if (!isValidPipelineDefinition(pipeline)) {
      return createErrorResponse(
        'Invalid pipeline definition: must have non-empty id, name, and valid stages',
      );
    }

    const execution = await this.pipelineService.runPipeline(pipeline as PipelineDefinition);
    return createJsonResponse(execution);
  }

  private async handlePipelineStatus(
    args: Record<string, unknown> | undefined,
  ): Promise<ToolResponse> {
    const executionId = extractRequiredString(args, 'executionId');
    if (executionId === null) {
      return createErrorResponse('Missing required parameter: executionId');
    }

    const status = this.pipelineService.getStatus(executionId);
    if (!status) {
      return createErrorResponse(`Execution '${executionId}' not found`);
    }

    return createJsonResponse(status);
  }

  private async handleResumePipeline(
    args: Record<string, unknown> | undefined,
  ): Promise<ToolResponse> {
    const executionId = extractRequiredString(args, 'executionId');
    if (executionId === null) {
      return createErrorResponse('Missing required parameter: executionId');
    }

    const pipeline = args?.pipeline;
    if (!pipeline || typeof pipeline !== 'object') {
      return createErrorResponse('Missing required parameter: pipeline');
    }

    if (!isValidPipelineDefinition(pipeline)) {
      return createErrorResponse('Invalid pipeline definition');
    }

    try {
      const execution = await this.pipelineService.resumePipeline(
        executionId,
        pipeline as PipelineDefinition,
      );
      return createJsonResponse(execution);
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  }
}
