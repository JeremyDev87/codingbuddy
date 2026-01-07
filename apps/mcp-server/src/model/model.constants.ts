/**
 * Model Constants
 *
 * Centralized model ID constants to ensure consistency across the codebase.
 * Update these when new model versions are released.
 */

/**
 * Claude Opus 4 - Most capable model, best for complex tasks
 */
export const CLAUDE_OPUS_4 = 'claude-opus-4-20250514';

/**
 * Claude Sonnet 4 - Balanced performance and cost (recommended default)
 */
export const CLAUDE_SONNET_4 = 'claude-sonnet-4-20250514';

/**
 * Claude Haiku 3.5 - Fastest, most cost-effective
 * @deprecated Not recommended for coding tasks due to limited capability
 */
export const CLAUDE_HAIKU_35 = 'claude-haiku-3-5-20241022';

/**
 * Default model for CLI and configuration
 * Using Sonnet as the balanced choice for most use cases
 */
export const DEFAULT_MODEL = CLAUDE_SONNET_4;
