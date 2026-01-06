/**
 * Language Selection Prompt
 *
 * Interactive CLI prompt for response language selection
 */

import { select } from '@inquirer/prompts';
import {
  SUPPORTED_LANGUAGES,
  SUPPORTED_LANGUAGE_CODES,
  DEFAULT_LANGUAGE_CODE,
} from '../../../keyword/keyword.types';

/**
 * Language choice option for the CLI prompt
 */
export interface LanguageChoice {
  name: string;
  value: string;
  description?: string;
}

/**
 * Default language - re-exported from keyword.types for backward compatibility
 */
export const DEFAULT_LANGUAGE = DEFAULT_LANGUAGE_CODE;

/**
 * Get available language choices for the CLI prompt
 *
 * Uses centralized SUPPORTED_LANGUAGES from keyword.types.ts
 */
export function getLanguageChoices(): LanguageChoice[] {
  return SUPPORTED_LANGUAGE_CODES.map(code => {
    const info = SUPPORTED_LANGUAGES[code];
    // Format: "한국어 (Korean)" or just "English" if names are the same
    const name =
      info.nativeName === info.name
        ? info.name
        : `${info.nativeName} (${info.name})`;
    return {
      name,
      value: code,
      description: info.description,
    };
  });
}

/**
 * Prompt user to select response language
 * @param message - Custom message for the prompt
 * @returns Selected language code
 */
export async function promptLanguageSelection(
  message = 'Select response language:',
): Promise<string> {
  const choices = getLanguageChoices();

  return select({
    message,
    choices,
    default: DEFAULT_LANGUAGE,
  });
}
