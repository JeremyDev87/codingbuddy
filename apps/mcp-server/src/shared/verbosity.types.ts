/**
 * Verbosity Type Definitions
 *
 * Defines verbosity levels and configurations for controlling the amount of detail
 * in responses, including rules content, agent prompts, and context sections.
 */

/**
 * Verbosity levels for response detail control
 *
 * - minimal: Paths and metadata only, summaries for prompts
 * - standard: Truncated content with key information (default)
 * - full: Complete content without truncation
 */
export type VerbosityLevel = 'minimal' | 'standard' | 'full';

/**
 * Configuration for verbosity level behavior
 */
export interface VerbosityConfig {
  /** Verbosity level identifier */
  level: VerbosityLevel;

  /** Whether to include full rules content (false = paths only) */
  includeRulesContent: boolean;

  /** Whether to include full skill content (false = metadata only) */
  includeSkillContent: boolean;

  /** Whether to include full agent prompt (false = summary only) */
  includeAgentPrompt: boolean;

  /** Maximum expertise items to include (-1 = unlimited) */
  maxExpertiseItems: number;

  /** Maximum context sections to include (-1 = unlimited) */
  maxContextSections: number;
}

/**
 * Preset configurations for each verbosity level
 *
 * @example
 * ```typescript
 * const config = VERBOSITY_PRESETS.standard;
 * console.log(config.includeRulesContent); // true
 * ```
 */
export const VERBOSITY_PRESETS: Record<VerbosityLevel, VerbosityConfig> = {
  minimal: {
    level: 'minimal',
    includeRulesContent: false, // Paths only
    includeSkillContent: false, // Metadata only
    includeAgentPrompt: false, // Summary only
    maxExpertiseItems: 3,
    maxContextSections: 1,
  },
  standard: {
    level: 'standard',
    includeRulesContent: true, // Truncated content
    includeSkillContent: true, // Truncated content
    includeAgentPrompt: false, // Summary only
    maxExpertiseItems: 5,
    maxContextSections: 2,
  },
  full: {
    level: 'full',
    includeRulesContent: true, // Full content
    includeSkillContent: true, // Full content
    includeAgentPrompt: true, // Full prompt
    maxExpertiseItems: -1, // Unlimited
    maxContextSections: -1, // Unlimited
  },
};

/**
 * Get verbosity configuration for a specific level
 *
 * @param level - Verbosity level (defaults to 'standard')
 * @returns Configuration for the specified verbosity level
 *
 * @example
 * ```typescript
 * const config = getVerbosityConfig('minimal');
 * console.log(config.includeRulesContent); // false
 *
 * const defaultConfig = getVerbosityConfig();
 * console.log(defaultConfig.level); // 'standard'
 * ```
 */
export function getVerbosityConfig(
  level: VerbosityLevel = 'standard',
): VerbosityConfig {
  return VERBOSITY_PRESETS[level];
}

/**
 * Check if a numeric value represents unlimited (-1)
 *
 * @param value - Numeric value to check
 * @returns true if value is -1 (unlimited), false otherwise
 *
 * @example
 * ```typescript
 * isUnlimited(-1)  // true
 * isUnlimited(5)   // false
 * isUnlimited(0)   // false
 * ```
 */
export function isUnlimited(value: number): boolean {
  return value === -1;
}

/**
 * Valid verbosity levels for type guard validation
 */
const VALID_VERBOSITY_LEVELS = ['minimal', 'standard', 'full'] as const;

/**
 * Type guard to check if a value is a valid VerbosityLevel
 *
 * @param value - Value to check
 * @returns true if value is a valid VerbosityLevel, false otherwise
 *
 * @example
 * ```typescript
 * isValidVerbosity('standard')  // true
 * isValidVerbosity('minimal')   // true
 * isValidVerbosity('invalid')   // false
 * isValidVerbosity(undefined)   // false
 * ```
 */
export function isValidVerbosity(value: unknown): value is VerbosityLevel {
  return (
    typeof value === 'string' &&
    VALID_VERBOSITY_LEVELS.includes(value as VerbosityLevel)
  );
}
