/**
 * Sequential Task Pipeline Engine — Type Definitions
 *
 * Defines the core types for pipeline definition, execution, and status tracking.
 * Pipelines chain stages sequentially, passing output from stage N as input to stage N+1.
 */

// ============================================================================
// Stage Types
// ============================================================================

/**
 * Types of pipeline stages.
 * - 'command': Execute a shell command
 * - 'agent': Execute an agent prompt
 * - 'skill': Execute a skill invocation
 */
export type PipelineStageType = 'command' | 'agent' | 'skill';

/**
 * Configuration for a command stage.
 * Executes a shell command with the previous stage's output available as PIPELINE_INPUT env var.
 */
export interface CommandStageConfig {
  readonly command: string;
}

/**
 * Configuration for an agent stage.
 * Sends a prompt to an agent with the previous stage's output as context.
 */
export interface AgentStageConfig {
  readonly agentName: string;
  readonly prompt: string;
}

/**
 * Configuration for a skill stage.
 * Invokes a skill with the previous stage's output as context.
 */
export interface SkillStageConfig {
  readonly skillName: string;
  readonly args?: string;
}

/**
 * Union type for stage-specific configuration.
 */
export type PipelineStageConfig = CommandStageConfig | AgentStageConfig | SkillStageConfig;

// ============================================================================
// Pipeline Definition
// ============================================================================

/**
 * A single stage in a pipeline definition.
 */
export interface PipelineStage {
  readonly id: string;
  readonly name: string;
  readonly type: PipelineStageType;
  readonly config: PipelineStageConfig;
}

/**
 * Complete pipeline definition with ordered stages.
 */
export interface PipelineDefinition {
  readonly id: string;
  readonly name: string;
  readonly stages: readonly PipelineStage[];
}

// ============================================================================
// Execution Status
// ============================================================================

/**
 * Status of an individual pipeline stage execution.
 */
export type PipelineStageStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

/**
 * Result of executing a single pipeline stage.
 */
export interface PipelineStageResult {
  readonly stageId: string;
  readonly status: PipelineStageStatus;
  readonly output?: string;
  readonly error?: string;
  readonly startedAt: string;
  readonly completedAt?: string;
  readonly durationMs?: number;
}

/**
 * Overall pipeline execution status.
 */
export type PipelineExecutionStatus = 'running' | 'completed' | 'failed' | 'paused';

/**
 * Tracks the state of a pipeline execution.
 */
export interface PipelineExecution {
  readonly id: string;
  readonly pipelineId: string;
  readonly status: PipelineExecutionStatus;
  readonly currentStageIndex: number;
  readonly stageResults: readonly PipelineStageResult[];
  readonly startedAt: string;
  readonly completedAt?: string;
}

// ============================================================================
// Type Guards
// ============================================================================

const VALID_STAGE_TYPES: readonly PipelineStageType[] = ['command', 'agent', 'skill'];

/**
 * Check if a value is a valid pipeline stage type.
 */
export function isValidStageType(value: unknown): value is PipelineStageType {
  return typeof value === 'string' && VALID_STAGE_TYPES.includes(value as PipelineStageType);
}

/**
 * Check if a value is a valid pipeline stage.
 */
export function isValidPipelineStage(value: unknown): value is PipelineStage {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    obj.id.length > 0 &&
    typeof obj.name === 'string' &&
    obj.name.length > 0 &&
    isValidStageType(obj.type) &&
    typeof obj.config === 'object' &&
    obj.config !== null
  );
}

/**
 * Check if a value is a valid pipeline definition.
 */
export function isValidPipelineDefinition(value: unknown): value is PipelineDefinition {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    obj.id.length > 0 &&
    typeof obj.name === 'string' &&
    obj.name.length > 0 &&
    Array.isArray(obj.stages) &&
    obj.stages.every((stage: unknown) => isValidPipelineStage(stage))
  );
}
