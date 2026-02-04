/**
 * Model Configuration Types
 *
 * Types for AI model configuration and resolved model results.
 *
 * @since v4.0.0 - Simplified to 2-level priority (global > system).
 * Agent/Mode model configs are deprecated.
 */

/**
 * Model configuration in Agent/Mode JSON files
 *
 * @deprecated v4.0.0 - Agent/Mode model configs are no longer supported.
 * Model resolution now uses only global config (codingbuddy.config.json) or system default.
 * Kept for backward compatibility with external consumers.
 * **Will be removed in v5.0.0** - Migrate to global config before upgrading.
 */
export interface ModelConfig {
  /** Preferred model ID (e.g., 'claude-opus-4-20250514') */
  preferred: string;
  /** Reason for model selection (documentation purpose) */
  reason?: string;
}

/**
 * Type guard to check if a value is a valid ModelConfig
 *
 * @deprecated v4.0.0 - Agent/Mode model configs are no longer supported.
 * This type guard is kept for backward compatibility with external consumers.
 * **Will be removed in v5.0.0** - Migrate to global config before upgrading.
 *
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
 * @since v4.0.0 - Simplified to only 'global' | 'system' (removed 'agent' | 'mode')
 */
export type ModelSource = 'global' | 'system';

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
 * @since v4.0.0 - Simplified to only globalDefaultModel and additionalPrefixes
 */
export interface ResolveModelParams {
  /** Global config default model from codingbuddy.config.json */
  globalDefaultModel?: string;
  /** Additional model prefixes to recognize as valid (from config) */
  additionalPrefixes?: readonly string[];
}
