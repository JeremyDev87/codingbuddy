/**
 * Model Selection Prompt
 *
 * Interactive CLI prompt for AI model selection
 */

import { select, input } from '@inquirer/prompts';
import {
  CLAUDE_OPUS_4,
  CLAUDE_SONNET_4,
  DEFAULT_MODEL,
  GPT_4O,
  GPT_5,
  O4_MINI,
  GEMINI_25_PRO,
  GEMINI_25_FLASH,
  GROK_3,
  DEEPSEEK_CHAT,
} from '../../../model';

/**
 * Model choice option for the CLI prompt
 */
export interface ModelChoice {
  name: string;
  value: string;
  description?: string;
}

/**
 * Default model choice - re-exported from model constants for convenience
 */
export const DEFAULT_MODEL_CHOICE = DEFAULT_MODEL;

/**
 * Get available model choices for the CLI prompt
 *
 * Returns choices grouped by provider: Anthropic, OpenAI, Google, xAI, DeepSeek, and a custom escape hatch.
 */
export function getModelChoices(): ModelChoice[] {
  return [
    // Anthropic (default)
    {
      name: 'Claude Sonnet 4 (Recommended)',
      value: CLAUDE_SONNET_4,
      description: 'Balanced performance and cost · Anthropic',
    },
    {
      name: 'Claude Opus 4',
      value: CLAUDE_OPUS_4,
      description: 'Most capable · Anthropic',
    },
    // OpenAI
    {
      name: 'GPT-5',
      value: GPT_5,
      description: 'Latest flagship model · OpenAI',
    },
    {
      name: 'GPT-4o',
      value: GPT_4O,
      description: 'Multimodal model · OpenAI',
    },
    {
      name: 'o4-mini',
      value: O4_MINI,
      description: 'Fast reasoning model · OpenAI',
    },
    // Google
    {
      name: 'Gemini 2.5 Pro',
      value: GEMINI_25_PRO,
      description: 'Advanced reasoning · Google',
    },
    {
      name: 'Gemini 2.5 Flash',
      value: GEMINI_25_FLASH,
      description: 'Fast and efficient · Google',
    },
    // xAI
    {
      name: 'Grok 3',
      value: GROK_3,
      description: 'Multimodal reasoning · xAI',
    },
    // DeepSeek
    {
      name: 'DeepSeek Chat',
      value: DEEPSEEK_CHAT,
      description: 'Cost-efficient coding model · DeepSeek',
    },
    // Escape hatch
    {
      name: 'Other (enter manually)',
      value: '__custom__',
      description: 'Any model ID not listed above',
    },
  ];
}

/**
 * Prompt user to select an AI model interactively.
 *
 * If the user selects "Other", a follow-up text input prompt collects a free-text model ID.
 */
export async function promptModelSelection(message = 'Select default AI model:'): Promise<string> {
  const choices = getModelChoices();

  const selected = await select({
    message,
    choices,
    default: DEFAULT_MODEL_CHOICE,
  });

  if (selected === '__custom__') {
    return input({
      message: 'Enter model ID:',
      validate: (value: string) => value.trim().length > 0 || 'Model ID cannot be empty',
    });
  }

  return selected;
}
