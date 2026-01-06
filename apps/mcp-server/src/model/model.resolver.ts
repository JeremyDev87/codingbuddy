import type {
  ModelConfig,
  ResolvedModel,
  ResolveModelParams,
} from './model.types';

/**
 * System default model used when no configuration is provided
 */
export const SYSTEM_DEFAULT_MODEL = 'claude-sonnet-4-20250514';

/**
 * Known Claude model ID patterns for validation
 * Uses prefixes to allow future model versions
 */
export const KNOWN_MODEL_PREFIXES = [
  'claude-opus-4',
  'claude-sonnet-4',
  'claude-sonnet-3',
  'claude-haiku-3',
] as const;

/**
 * Get all prefixes including additional ones
 * @param additionalPrefixes - Optional additional prefixes to include
 */
export function getAllPrefixes(
  additionalPrefixes?: readonly string[],
): readonly string[] {
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
 * Check if a model ID matches known Claude model patterns
 * @param modelId - Model ID to check
 * @param additionalPrefixes - Optional additional prefixes to recognize
 */
export function isKnownModel(
  modelId: string,
  additionalPrefixes?: readonly string[],
): boolean {
  return getAllPrefixes(additionalPrefixes).some(prefix =>
    modelId.startsWith(prefix),
  );
}

/**
 * Check if a model config has a valid preferred value
 */
function hasValidPreferred(
  model?: ModelConfig,
): model is ModelConfig & { preferred: string } {
  return Boolean(model?.preferred);
}

/**
 * Resolve AI model based on priority order:
 * 1. Agent (highest)
 * 2. Mode
 * 3. Global Config
 * 4. System Default (lowest)
 *
 * @param params - Resolution parameters
 * @returns Resolved model with source information
 */
export function resolveModel(params: ResolveModelParams): ResolvedModel {
  const { agentModel, modeModel, globalDefaultModel, additionalPrefixes } =
    params;

  let model: string;
  let source: ResolvedModel['source'];

  // 1. Agent model (highest priority)
  if (hasValidPreferred(agentModel)) {
    model = agentModel.preferred;
    source = 'agent';
  }
  // 2. Mode model
  else if (hasValidPreferred(modeModel)) {
    model = modeModel.preferred;
    source = 'mode';
  }
  // 3. Global config
  else if (globalDefaultModel) {
    model = globalDefaultModel;
    source = 'global';
  }
  // 4. System default
  else {
    return { model: SYSTEM_DEFAULT_MODEL, source: 'system' };
  }

  // Add warning if model is not recognized (but still use it)
  const result: ResolvedModel = { model, source };
  if (!isKnownModel(model, additionalPrefixes)) {
    result.warning = formatUnknownModelWarning(model, additionalPrefixes);
  }

  return result;
}
