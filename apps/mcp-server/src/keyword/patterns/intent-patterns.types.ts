/**
 * Intent Pattern Type Definitions
 *
 * These types define the structure for pattern-based agent resolution.
 * Used by PrimaryAgentResolver to match user prompts to appropriate agents.
 */

/**
 * An intent pattern for detecting user intent from prompts.
 *
 * @example
 * {
 *   pattern: /nestjs|nest\.js/i,
 *   confidence: 0.95,
 *   description: 'NestJS framework'
 * }
 */
export type IntentPattern = {
  readonly pattern: RegExp;
  readonly confidence: number;
  readonly description: string;
};

/**
 * A check configuration that maps patterns to a specific agent.
 *
 * @example
 * {
 *   agent: 'backend-developer',
 *   patterns: BACKEND_INTENT_PATTERNS,
 *   category: 'Backend'
 * }
 */
export type IntentPatternCheck = {
  readonly agent: string;
  readonly patterns: ReadonlyArray<IntentPattern>;
  readonly category: string;
};

/**
 * A context pattern for file path-based agent resolution.
 *
 * @example
 * {
 *   pattern: /\.tsx?$/i,
 *   agent: 'frontend-developer',
 *   confidence: 0.7
 * }
 */
export type ContextPattern = {
  readonly pattern: RegExp;
  readonly agent: string;
  readonly confidence: number;
};
