/**
 * Model Selection Prompt
 *
 * Interactive CLI prompt for AI model selection
 */

import { select } from '@inquirer/prompts';
import {
  CLAUDE_OPUS_4,
  CLAUDE_SONNET_4,
  CLAUDE_HAIKU_35,
  DEFAULT_MODEL,
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
 */
export function getModelChoices(): ModelChoice[] {
  return [
    {
      name: 'Claude Sonnet 4 (Recommended)',
      value: CLAUDE_SONNET_4,
      description: 'Balanced performance and cost',
    },
    {
      name: 'Claude Opus 4',
      value: CLAUDE_OPUS_4,
      description: 'Most capable, best for complex tasks',
    },
    {
      name: 'Claude Haiku 3.5',
      value: CLAUDE_HAIKU_35,
      description: 'Fastest, most cost-effective',
    },
  ];
}

/**
 * Prompt user to select a default model
 * @param message - Custom message for the prompt
 * @returns Selected model ID
 */
export async function promptModelSelection(
  message = 'Select default AI model:',
): Promise<string> {
  const choices = getModelChoices();

  return select({
    message,
    choices,
    default: DEFAULT_MODEL_CHOICE,
  });
}
