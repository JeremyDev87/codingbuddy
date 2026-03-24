/**
 * Pipeline Stage Executors — Pure Functions
 *
 * Each executor handles a specific stage type and returns a PipelineStageResult.
 * Output from one stage becomes input to the next stage in the pipeline.
 */

import { execSync } from 'child_process';
import type {
  PipelineStage,
  PipelineStageResult,
  CommandStageConfig,
  AgentStageConfig,
  SkillStageConfig,
} from './pipeline.types';

/**
 * Execute a single pipeline stage and return the result.
 *
 * @param stage - The stage definition to execute
 * @param input - Optional output from the previous stage
 * @returns The stage execution result with status, output, timing
 */
export async function executeStage(
  stage: PipelineStage,
  input?: string,
): Promise<PipelineStageResult> {
  const startedAt = new Date().toISOString();
  const startTime = Date.now();

  try {
    let output: string;

    switch (stage.type) {
      case 'command':
        output = executeCommandStage(stage.config as CommandStageConfig, input);
        break;
      case 'agent':
        output = executeAgentStage(stage.config as AgentStageConfig, input);
        break;
      case 'skill':
        output = executeSkillStage(stage.config as SkillStageConfig, input);
        break;
      default:
        return {
          stageId: stage.id,
          status: 'failed',
          error: `Unknown stage type: ${(stage as { type: string }).type}`,
          startedAt,
          completedAt: new Date().toISOString(),
          durationMs: Date.now() - startTime,
        };
    }

    return {
      stageId: stage.id,
      status: 'completed',
      output,
      startedAt,
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      stageId: stage.id,
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
      startedAt,
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
    };
  }
}

/**
 * Execute a shell command stage.
 * Previous stage output is available via PIPELINE_INPUT env var.
 */
function executeCommandStage(config: CommandStageConfig, input?: string): string {
  const env = { ...process.env };
  if (input !== undefined) {
    env.PIPELINE_INPUT = input;
  }
  const result = execSync(config.command, {
    encoding: 'utf-8',
    env,
    timeout: 60_000,
  });
  return result;
}

/**
 * Format an agent stage invocation.
 * Returns a structured prompt string with agent name, prompt, and input context.
 */
function executeAgentStage(config: AgentStageConfig, input?: string): string {
  const parts = [`[Agent: ${config.agentName}]`, `[Prompt: ${config.prompt}]`];
  if (input !== undefined) {
    parts.push(`[Input: ${input}]`);
  }
  return parts.join('\n');
}

/**
 * Format a skill stage invocation.
 * Returns a structured skill invocation string with name, args, and input context.
 */
function executeSkillStage(config: SkillStageConfig, input?: string): string {
  const parts = [`[Skill: ${config.skillName}]`];
  if (config.args) {
    parts.push(`[Args: ${config.args}]`);
  }
  if (input !== undefined) {
    parts.push(`[Input: ${input}]`);
  }
  return parts.join('\n');
}
