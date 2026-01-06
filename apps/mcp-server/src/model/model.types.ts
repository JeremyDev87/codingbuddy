/**
 * Model Configuration Types
 *
 * Types for AI model configuration in Agent/Mode JSON files
 * and resolved model results.
 */

/**
 * Model configuration in Agent/Mode JSON files
 */
export interface ModelConfig {
  /** Preferred model ID (e.g., 'claude-opus-4-20250514') */
  preferred: string;
  /** Reason for model selection (documentation purpose) */
  reason?: string;
}

/**
 * Type guard to check if a value is a valid ModelConfig
 * @param value - Value to check
 * @returns True if value is a valid ModelConfig with a non-empty preferred string
 */
export function isModelConfig(value: unknown): value is ModelConfig {
  return (
    typeof value === 'object' &&
    value !== null &&
    'preferred' in value &&
    typeof (value as ModelConfig).preferred === 'string' &&
    (value as ModelConfig).preferred.length > 0
  );
}

/**
 * Source of the resolved model
 */
export type ModelSource = 'agent' | 'mode' | 'global' | 'system';

/**
 * Result of model resolution with source tracking
 */
export interface ResolvedModel {
  /** Resolved model ID */
  model: string;
  /** Where the model was resolved from */
  source: ModelSource;
  /** Warning message if model ID is not recognized */
  warning?: string;
}

/**
 * Parameters for resolveModel function
 */
export interface ResolveModelParams {
  /** Agent profile model config (e.g., frontend-developer.json) */
  agentModel?: ModelConfig;
  /** Mode agent model config (e.g., plan-mode.json) */
  modeModel?: ModelConfig;
  /** Global config default model from codingbuddy.config.js */
  globalDefaultModel?: string;
  /** Additional model prefixes to recognize as valid (from config) */
  additionalPrefixes?: readonly string[];
}
