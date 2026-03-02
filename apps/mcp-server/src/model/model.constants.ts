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

/** OpenAI GPT-4o model */
export const GPT_4O = 'gpt-4o';

/**
 * OpenAI GPT-4o mini model
 * @deprecated Superseded by o4-mini. Kept for backward compatibility with existing consumers.
 */
export const GPT_4O_MINI = 'gpt-4o-mini';

/**
 * OpenAI o3-mini reasoning model
 * @deprecated Superseded by o4-mini. Kept for backward compatibility with existing consumers.
 */
export const O3_MINI = 'o3-mini';

/** OpenAI o1-mini reasoning model */
export const O1_MINI = 'o1-mini';

/** OpenAI o4-mini reasoning model */
export const O4_MINI = 'o4-mini';

/** OpenAI GPT-5 model */
export const GPT_5 = 'gpt-5';

/** Google Gemini 2.5 Pro model */
export const GEMINI_25_PRO = 'gemini-2.5-pro';

/** Google Gemini 2.5 Flash model */
export const GEMINI_25_FLASH = 'gemini-2.5-flash';

/** xAI Grok 3 model */
export const GROK_3 = 'grok-3';

/** DeepSeek Chat model */
export const DEEPSEEK_CHAT = 'deepseek-chat';

/** DeepSeek Reasoner model */
export const DEEPSEEK_REASONER = 'deepseek-reasoner';

/**
 * Default model for CLI and configuration
 * Using Sonnet as the balanced choice for most use cases
 */
export const DEFAULT_MODEL = CLAUDE_SONNET_4;
