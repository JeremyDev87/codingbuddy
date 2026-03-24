/**
 * Pipeline Service — Sequential Task Pipeline Execution Engine
 *
 * Runs pipeline stages sequentially, passing output from stage N as input to stage N+1.
 * Supports resume-on-failure: resumes from the failed stage, not from the beginning.
 */

import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { PipelineDefinition, PipelineExecution, PipelineStageResult } from './pipeline.types';
import { executeStage } from './pipeline.executors';

@Injectable()
export class PipelineService {
  private readonly executions = new Map<string, PipelineExecution>();

  /**
   * Run a pipeline from the beginning.
   * Executes stages sequentially, passing output between stages.
   * Stops on first stage failure.
   */
  async runPipeline(definition: PipelineDefinition): Promise<PipelineExecution> {
    const executionId = randomUUID();
    const startedAt = new Date().toISOString();

    const execution = await this.executeFromStage(executionId, definition, 0, [], startedAt);
    this.executions.set(executionId, execution);
    return execution;
  }

  /**
   * Get the status of a pipeline execution.
   */
  getStatus(executionId: string): PipelineExecution | undefined {
    return this.executions.get(executionId);
  }

  /**
   * Resume a failed pipeline from the failed stage.
   * Preserves results from completed stages and re-executes from the failure point.
   *
   * @param executionId - ID of the failed execution
   * @param updatedDefinition - Updated pipeline definition (may have fixed stages)
   */
  async resumePipeline(
    executionId: string,
    updatedDefinition: PipelineDefinition,
  ): Promise<PipelineExecution> {
    const existing = this.executions.get(executionId);
    if (!existing) {
      throw new Error('Execution not found');
    }
    if (existing.status !== 'failed') {
      throw new Error('Pipeline is not in a failed state');
    }

    // Find the index of the failed stage
    const failedIndex = existing.stageResults.findIndex(r => r.status === 'failed');
    const preservedResults = existing.stageResults.slice(0, failedIndex);

    const execution = await this.executeFromStage(
      executionId,
      updatedDefinition,
      failedIndex,
      [...preservedResults],
      existing.startedAt,
    );
    this.executions.set(executionId, execution);
    return execution;
  }

  /**
   * Execute pipeline stages starting from a given index.
   */
  private async executeFromStage(
    executionId: string,
    definition: PipelineDefinition,
    startIndex: number,
    previousResults: PipelineStageResult[],
    startedAt: string,
  ): Promise<PipelineExecution> {
    const stageResults: PipelineStageResult[] = [...previousResults];

    // Get last output from previous results for data passing
    let lastOutput: string | undefined;
    if (previousResults.length > 0) {
      const lastResult = previousResults[previousResults.length - 1];
      lastOutput = lastResult.output?.trim();
    }

    for (let i = startIndex; i < definition.stages.length; i++) {
      const stage = definition.stages[i];

      // Update in-progress execution state
      const inProgress: PipelineExecution = {
        id: executionId,
        pipelineId: definition.id,
        status: 'running',
        currentStageIndex: i,
        stageResults: [...stageResults],
        startedAt,
      };
      this.executions.set(executionId, inProgress);

      const result = await executeStage(stage, lastOutput);
      stageResults.push(result);

      if (result.status === 'failed') {
        return {
          id: executionId,
          pipelineId: definition.id,
          status: 'failed',
          currentStageIndex: i,
          stageResults,
          startedAt,
          completedAt: new Date().toISOString(),
        };
      }

      lastOutput = result.output?.trim();
    }

    return {
      id: executionId,
      pipelineId: definition.id,
      status: 'completed',
      currentStageIndex: definition.stages.length - 1,
      stageResults,
      startedAt,
      completedAt: new Date().toISOString(),
    };
  }
}
