import type { ResolvedModel, ResolveModelParams } from './model.types';
import { DEFAULT_MODEL } from './model.constants';

/**
 * System default model used when no configuration is provided.
 *
 * @deprecated v4.0.0 - External consumers should use DEFAULT_MODEL from model.constants.ts.
 * Internal usage within model.resolver.ts is acceptable and intentional.
 * This export is kept for backward compatibility with existing consumers.
 * **Will be removed in v5.0.0** - Migrate to DEFAULT_MODEL from model.constants.ts.
 */
export const SYSTEM_DEFAULT_MODEL = DEFAULT_MODEL;

/**
 * Known model ID patterns for validation (multi-provider)
 *
 * Uses provider-level prefixes for automatic future model compatibility.
 * When a new model version is released (e.g., gpt-6, gemini-4),
 * it is automatically recognized without code changes.
 */
export const KNOWN_MODEL_PREFIXES = [
  // Anthropic
  'claude-',
  // OpenAI
  'gpt-',
  'o1', // No trailing dash: matches both standalone 'o1' and 'o1-mini'/'o1-preview'
  'o3', // No trailing dash: matches both standalone 'o3' and 'o3-mini'
  'o4', // No trailing dash: matches both standalone 'o4' and 'o4-mini'
  'chatgpt-',
  // Google
  'gemini-',
  // xAI
  'grok-',
  // DeepSeek
  'deepseek-',
  // Mistral
  'mistral-',
  'codestral-',
  // Meta
  'llama-',
  // Cohere
  'command-',
  // Alibaba
  'qwen-',
  // Microsoft
  'phi-',
] as const;

/**
 * Haiku model prefix - used for deprecation warning
 */
const HAIKU_PREFIX = 'claude-haiku';

/**
 * Check if a model ID is a Haiku model (deprecated)
 */
function isHaikuModel(modelId: string): boolean {
  return modelId.startsWith(HAIKU_PREFIX);
}

/**
 * Deprecation warning message for Haiku models
 */
const HAIKU_DEPRECATION_WARNING =
  'Claude Haiku is not recommended for coding tasks. Consider using Claude Sonnet 4 (balanced) or Claude Opus 4 (most capable) instead.';

/**
 * Get all prefixes including additional ones
 * @param additionalPrefixes - Optional additional prefixes to include
 */
export function getAllPrefixes(additionalPrefixes?: readonly string[]): readonly string[] {
  if (!additionalPrefixes || additionalPrefixes.length === 0) {
    return KNOWN_MODEL_PREFIXES;
  }
  return [...KNOWN_MODEL_PREFIXES, ...additionalPrefixes];
}

/**
 * Format warning message for unknown model IDs
 * @param modelId - The unknown model ID
 * @param additionalPrefixes - Optional additional prefixes to include in message
 */
export function formatUnknownModelWarning(
  modelId: string,
  additionalPrefixes?: readonly string[],
): string {
  return `Unknown model ID: "${modelId}". Known prefixes: ${getAllPrefixes(additionalPrefixes).join(', ')}`;
}

/**
 * Check if a model ID matches known model patterns (multi-provider)
 * @param modelId - Model ID to check
 * @param additionalPrefixes - Optional additional prefixes to recognize
 */
export function isKnownModel(modelId: string, additionalPrefixes?: readonly string[]): boolean {
  return getAllPrefixes(additionalPrefixes).some(prefix => modelId.startsWith(prefix));
}

/**
 * Resolve AI model based on priority order:
 * 1. Global Config (highest)
 * 2. System Default (lowest)
 *
 * @since v4.0.0 - Simplified to 2-level priority (removed agent/mode)
 * @param params - Resolution parameters
 * @returns Resolved model with source information
 */
export function resolveModel(params: ResolveModelParams): ResolvedModel {
  const { globalDefaultModel, additionalPrefixes } = params;

  // 1. Global config (highest priority)
  if (globalDefaultModel) {
    const result: ResolvedModel = {
      model: globalDefaultModel,
      source: 'global',
    };

    // Add warning if model is not recognized (but still use it)
    if (!isKnownModel(globalDefaultModel, additionalPrefixes)) {
      result.warning = formatUnknownModelWarning(globalDefaultModel, additionalPrefixes);
    }
    // Add deprecation warning for Haiku models (even though they're recognized)
    else if (isHaikuModel(globalDefaultModel)) {
      result.warning = HAIKU_DEPRECATION_WARNING;
    }

    return result;
  }

  // 2. System default
  return { model: SYSTEM_DEFAULT_MODEL, source: 'system' };
}
