/**
 * Conventions Prompt
 *
 * Interactive CLI prompts for coding conventions
 */

import { select } from '@inquirer/prompts';

/**
 * Choice option
 */
export interface ConvChoice<T = string> {
  name: string;
  value: T;
  description?: string;
}

/**
 * Conventions settings collected from user
 */
export interface ConventionsSettings {
  fileNaming: string;
  quotes: 'single' | 'double';
  semicolons: boolean;
}

/**
 * File naming convention choices
 */
export const FILE_NAMING_CHOICES: ConvChoice[] = [
  {
    name: 'kebab-case',
    value: 'kebab-case',
    description: 'my-component.ts (recommended for most projects)',
  },
  {
    name: 'camelCase',
    value: 'camelCase',
    description: 'myComponent.ts',
  },
  {
    name: 'PascalCase',
    value: 'PascalCase',
    description: 'MyComponent.ts (common for React components)',
  },
  {
    name: 'snake_case',
    value: 'snake_case',
    description: 'my_component.ts (common for Python)',
  },
];

/**
 * Quote style choices
 */
export const QUOTES_CHOICES: ConvChoice<'single' | 'double'>[] = [
  {
    name: 'Single quotes',
    value: 'single',
    description: "const x = 'hello'",
  },
  {
    name: 'Double quotes',
    value: 'double',
    description: 'const x = "hello"',
  },
];

/**
 * Semicolon style choices
 */
export const SEMICOLONS_CHOICES: ConvChoice<boolean>[] = [
  {
    name: 'With semicolons',
    value: true,
    description: 'const x = 1;',
  },
  {
    name: 'Without semicolons',
    value: false,
    description: 'const x = 1',
  },
];

/**
 * Options for conventions prompt
 */
export interface ConventionsPromptOptions {
  /** Detected file naming convention */
  detectedFileNaming?: string;
  /** Detected quote style */
  detectedQuotes?: 'single' | 'double';
  /** Detected semicolon usage */
  detectedSemicolons?: boolean;
}

/**
 * Prompt user for coding conventions
 */
export async function promptConventionsSettings(
  options: ConventionsPromptOptions = {},
): Promise<ConventionsSettings> {
  const fileNaming = await select({
    message: 'Select file naming convention:',
    choices: FILE_NAMING_CHOICES,
    default: options.detectedFileNaming ?? 'kebab-case',
  });

  const quotes = await select({
    message: 'Select quote style:',
    choices: QUOTES_CHOICES,
    default: options.detectedQuotes ?? 'single',
  });

  const semicolons = await select({
    message: 'Use semicolons?',
    choices: SEMICOLONS_CHOICES,
    default: options.detectedSemicolons ?? true,
  });

  return {
    fileNaming,
    quotes,
    semicolons,
  };
}
