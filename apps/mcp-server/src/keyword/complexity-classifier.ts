/**
 * Complexity Classifier for SRP (Structured Reasoning Process)
 *
 * Pure functions for classifying task complexity to determine
 * whether SRP should be applied in PLAN mode.
 *
 * @module complexity-classifier
 */

import { ComplexityClassification, SrpOverride, TaskComplexity } from './keyword.types';
import { renderSrpTemplate } from './srp-template';
import {
  COMPLEX_INDICATORS,
  SIMPLE_INDICATORS,
  NEGATION_PATTERNS,
  isNegatedMatch,
  type ComplexityIndicator,
} from './complexity-indicators';

// Re-export indicators for external testing/customization
export {
  COMPLEX_INDICATORS,
  SIMPLE_INDICATORS,
  NEGATION_PATTERNS,
  isNegatedMatch,
  type ComplexityIndicator,
};

/**
 * Telemetry data for complexity classification decisions.
 * Used for analytics and debugging purposes.
 */
export interface ComplexityTelemetry {
  /** Timestamp of classification */
  timestamp: number;
  /** Prompt length (truncated for privacy) */
  promptLength: number;
  /** Final complexity result */
  complexity: TaskComplexity;
  /** Whether SRP was applied */
  applySrp: boolean;
  /** Classification confidence */
  confidence: number;
  /** Raw COMPLEX score */
  complexScore: number;
  /** Raw SIMPLE score */
  simpleScore: number;
  /** Number of matched COMPLEX indicators */
  complexMatches: number;
  /** Number of matched SIMPLE indicators */
  simpleMatches: number;
  /** Override applied (if any) */
  override?: SrpOverride;
}

/**
 * Optional telemetry callback for classification decisions.
 * Can be used for logging, analytics, or monitoring.
 *
 * @example
 * ```typescript
 * // Basic logging
 * const logTelemetry: TelemetryCallback = (t) => {
 *   console.log(`[SRP] ${t.complexity} (confidence: ${t.confidence.toFixed(2)})`);
 * };
 *
 * // Analytics integration
 * const trackTelemetry: TelemetryCallback = (t) => {
 *   analytics.track('srp_classification', {
 *     complexity: t.complexity,
 *     confidence: t.confidence,
 *     applySrp: t.applySrp,
 *     promptLength: t.promptLength,
 *   });
 * };
 *
 * // Batch collection for analysis
 * const telemetryBatch: ComplexityTelemetry[] = [];
 * const collectTelemetry: TelemetryCallback = (t) => {
 *   telemetryBatch.push(t);
 *   if (telemetryBatch.length >= 100) {
 *     sendBatchToServer(telemetryBatch);
 *     telemetryBatch.length = 0;
 *   }
 * };
 *
 * // Usage with classifyComplexity
 * classifyComplexity('Design the auth system', { onTelemetry: logTelemetry });
 * ```
 */
export type TelemetryCallback = (telemetry: ComplexityTelemetry) => void;

/**
 * Configuration for complexity classification thresholds.
 * Extracted to a separate object for easy testing and future configurability.
 */
export interface ComplexityConfig {
  /**
   * Threshold for COMPLEX classification.
   * If COMPLEX score exceeds this and SIMPLE score doesn't, task is COMPLEX.
   */
  complexThreshold: number;

  /**
   * Threshold for SIMPLE classification.
   * If SIMPLE score exceeds this and COMPLEX score doesn't, task is SIMPLE.
   */
  simpleThreshold: number;

  /**
   * Default confidence when no indicators match.
   */
  defaultConfidence: number;

  /**
   * Maximum confidence cap to prevent overconfidence.
   */
  maxConfidence: number;
}

/**
 * Default complexity configuration.
 * These values have been tuned based on testing with various prompts.
 */
export const DEFAULT_COMPLEXITY_CONFIG: ComplexityConfig = {
  complexThreshold: 0.08,
  simpleThreshold: 0.1,
  defaultConfidence: 0.6,
  maxConfidence: 0.95,
};

/**
 * Extract SRP override flag from prompt.
 *
 * @param prompt - User prompt to check
 * @returns Override flag and cleaned prompt
 */
export function extractSrpOverride(prompt: string): {
  override: SrpOverride;
  cleanedPrompt: string;
} {
  // Check for --srp flag (force SRP)
  if (/--srp\b/i.test(prompt)) {
    return {
      override: 'force',
      cleanedPrompt: prompt.replace(/--srp\b/gi, '').trim(),
    };
  }

  // Check for --no-srp flag (skip SRP)
  if (/--no-srp\b/i.test(prompt)) {
    return {
      override: 'skip',
      cleanedPrompt: prompt.replace(/--no-srp\b/gi, '').trim(),
    };
  }

  return {
    override: 'auto',
    cleanedPrompt: prompt,
  };
}

/**
 * Calculate complexity score based on indicator matches.
 * Applies negation detection to avoid false positives.
 *
 * @param prompt - User prompt to analyze
 * @param indicators - List of indicators to match
 * @param checkNegation - Whether to check for negation patterns (default: true)
 * @returns Score (0-1) and list of matched indicators
 */
function calculateScore(
  prompt: string,
  indicators: ComplexityIndicator[],
  checkNegation = true,
): { score: number; matched: string[] } {
  const matched: string[] = [];
  let totalWeight = 0;
  let matchedWeight = 0;

  for (const indicator of indicators) {
    totalWeight += indicator.weight;

    // Reset lastIndex for global regex patterns
    indicator.pattern.lastIndex = 0;
    const match = indicator.pattern.exec(prompt);

    if (match) {
      // Check if the match is negated (only for COMPLEX indicators)
      const matchEnd = match.index + match[0].length;
      if (checkNegation && isNegatedMatch(prompt, match.index, matchEnd)) {
        continue; // Skip negated matches
      }
      matched.push(indicator.description);
      matchedWeight += indicator.weight;
    }
  }

  // Normalize score to 0-1 range
  const score = totalWeight > 0 ? matchedWeight / totalWeight : 0;
  return { score, matched };
}

/**
 * Options for complexity classification.
 */
export interface ClassifyOptions {
  /** Configuration for thresholds */
  config?: ComplexityConfig;
  /** Optional telemetry callback for analytics/logging */
  onTelemetry?: TelemetryCallback;
}

/**
 * Result of score calculations.
 */
interface ScoreResults {
  complexResult: { score: number; matched: string[] };
  simpleResult: { score: number; matched: string[] };
}

/**
 * Intermediate result from complexity determination.
 */
interface ComplexityResult {
  complexity: TaskComplexity;
  reason: string;
  confidence: number;
  matchedIndicators: string[];
}

/**
 * Calculate scores for both COMPLEX and SIMPLE indicators.
 *
 * @param prompt - Cleaned prompt to analyze
 * @returns Score results for both indicator types
 */
function calculateScores(prompt: string): ScoreResults {
  // Check negation only for COMPLEX (negated commands should be SIMPLE)
  const complexResult = calculateScore(prompt, COMPLEX_INDICATORS, true);
  // Don't check negation for SIMPLE indicators
  const simpleResult = calculateScore(prompt, SIMPLE_INDICATORS, false);

  return { complexResult, simpleResult };
}

/**
 * Determine complexity classification based on scores.
 *
 * @param scores - Score results from calculateScores
 * @param config - Configuration thresholds
 * @returns Complexity determination result
 */
function determineComplexity(scores: ScoreResults, config: ComplexityConfig): ComplexityResult {
  const { complexResult, simpleResult } = scores;

  if (complexResult.score > config.complexThreshold && complexResult.score > simpleResult.score) {
    return {
      complexity: 'COMPLEX',
      reason: `Task requires structured reasoning: ${complexResult.matched.slice(0, 3).join(', ')}`,
      confidence: Math.min(config.maxConfidence, 0.5 + complexResult.score * 0.5),
      matchedIndicators: complexResult.matched,
    };
  }

  if (simpleResult.score > config.simpleThreshold && simpleResult.score > complexResult.score) {
    return {
      complexity: 'SIMPLE',
      reason: `Task is straightforward: ${simpleResult.matched.slice(0, 3).join(', ')}`,
      confidence: Math.min(config.maxConfidence, 0.5 + simpleResult.score * 0.5),
      matchedIndicators: simpleResult.matched,
    };
  }

  if (complexResult.score > simpleResult.score) {
    // Borderline case, lean towards COMPLEX for safety
    return {
      complexity: 'COMPLEX',
      reason: 'Borderline complexity - applying SRP for safety',
      confidence: 0.5 + (complexResult.score - simpleResult.score) * 0.5,
      matchedIndicators: complexResult.matched,
    };
  }

  // Default to SIMPLE if no clear indicators
  return {
    complexity: 'SIMPLE',
    reason: 'No significant complexity indicators detected',
    confidence: config.defaultConfidence,
    matchedIndicators: simpleResult.matched,
  };
}

/**
 * Apply override to complexity result.
 *
 * @param result - Base complexity result
 * @param override - Override flag
 * @returns Updated result with override applied
 */
function applyOverride(
  result: ComplexityResult,
  override: SrpOverride,
): { applySrp: boolean; reason: string } {
  if (override === 'force') {
    return {
      applySrp: true,
      reason: `[Override: --srp] ${result.reason}`,
    };
  }

  if (override === 'skip') {
    return {
      applySrp: false,
      reason: `[Override: --no-srp] ${result.reason}`,
    };
  }

  return {
    applySrp: result.complexity === 'COMPLEX',
    reason: result.reason,
  };
}

/**
 * Classify task complexity for SRP application.
 *
 * @param prompt - User prompt to classify
 * @param options - Optional configuration and telemetry callback
 * @returns ComplexityClassification with all relevant metadata
 *
 * @example
 * ```typescript
 * const result = classifyComplexity('How should we design the auth system?');
 * // { complexity: 'COMPLEX', applySrp: true, ... }
 *
 * const simple = classifyComplexity('What is the return type of this function?');
 * // { complexity: 'SIMPLE', applySrp: false, ... }
 *
 * const forced = classifyComplexity('Fix typo --srp');
 * // { complexity: 'SIMPLE', applySrp: true, override: 'force', ... }
 *
 * // With custom config
 * const custom = classifyComplexity('prompt', {
 *   config: { ...DEFAULT_COMPLEXITY_CONFIG, complexThreshold: 0.05 }
 * });
 *
 * // With telemetry
 * classifyComplexity('design system', {
 *   onTelemetry: (t) => console.log('Classification:', t.complexity, t.confidence)
 * });
 * ```
 */
export function classifyComplexity(
  prompt: string,
  options?: ClassifyOptions | ComplexityConfig,
): ComplexityClassification {
  // Support both old signature (config only) and new signature (options object)
  const resolvedOptions: ClassifyOptions =
    options && 'complexThreshold' in options ? { config: options } : (options ?? {});

  const config = resolvedOptions.config ?? DEFAULT_COMPLEXITY_CONFIG;
  const onTelemetry = resolvedOptions.onTelemetry;

  // 1. Extract override flag
  const { override, cleanedPrompt } = extractSrpOverride(prompt);

  // 2. Calculate scores for both COMPLEX and SIMPLE indicators
  const scores = calculateScores(cleanedPrompt);

  // 3. Determine complexity based on scores
  const complexityResult = determineComplexity(scores, config);

  // 4. Apply override if present
  const { applySrp, reason } = applyOverride(complexityResult, override);

  const result: ComplexityClassification = {
    complexity: complexityResult.complexity,
    reason,
    confidence: complexityResult.confidence,
    matchedIndicators: complexityResult.matchedIndicators,
    applySrp,
    ...(override !== 'auto' && { override }),
  };

  // 5. Emit telemetry if callback provided
  if (onTelemetry) {
    onTelemetry({
      timestamp: Date.now(),
      promptLength: prompt.length,
      complexity: complexityResult.complexity,
      applySrp,
      confidence: complexityResult.confidence,
      complexScore: scores.complexResult.score,
      simpleScore: scores.simpleResult.score,
      complexMatches: scores.complexResult.matched.length,
      simpleMatches: scores.simpleResult.matched.length,
      ...(override !== 'auto' && { override }),
    });
  }

  return result;
}

/**
 * Generate SRP instructions for COMPLEX tasks.
 *
 * Uses the SRP template from srp-template.ts for maintainability.
 *
 * @param classification - Complexity classification result
 * @returns SRP instructions string or undefined for SIMPLE tasks
 */
export function generateSrpInstructions(
  classification: ComplexityClassification,
): string | undefined {
  if (!classification.applySrp) {
    return undefined;
  }

  return renderSrpTemplate(classification);
}
