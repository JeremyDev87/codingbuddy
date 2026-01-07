/**
 * Tech Stack Prompt
 *
 * Interactive CLI prompts for selecting tech stack
 * Uses checkbox for multi-select options
 */

import { checkbox } from '@inquirer/prompts';

/**
 * Choice option with name and value
 */
export interface StackChoice {
  name: string;
  value: string;
  checked?: boolean;
}

/**
 * Tech stack settings collected from user
 */
export interface TechStackSettings {
  languages: string[];
  frontend: string[];
  backend: string[];
  tools: string[];
}

/**
 * Available programming language choices
 */
export const LANGUAGE_CHOICES: StackChoice[] = [
  { name: 'TypeScript', value: 'TypeScript' },
  { name: 'JavaScript', value: 'JavaScript' },
  { name: 'Python', value: 'Python' },
  { name: 'Go', value: 'Go' },
  { name: 'Rust', value: 'Rust' },
  { name: 'Java', value: 'Java' },
];

/**
 * Available frontend framework choices
 */
export const FRONTEND_CHOICES: StackChoice[] = [
  { name: 'React', value: 'React' },
  { name: 'Next.js', value: 'Next.js' },
  { name: 'Vue', value: 'Vue' },
  { name: 'Nuxt', value: 'Nuxt' },
  { name: 'Svelte', value: 'Svelte' },
  { name: 'Angular', value: 'Angular' },
];

/**
 * Available backend framework choices
 */
export const BACKEND_CHOICES: StackChoice[] = [
  { name: 'NestJS', value: 'NestJS' },
  { name: 'Express', value: 'Express' },
  { name: 'Fastify', value: 'Fastify' },
  { name: 'FastAPI', value: 'FastAPI' },
  { name: 'Django', value: 'Django' },
  { name: 'Spring Boot', value: 'Spring Boot' },
];

/**
 * Available tool choices
 */
export const TOOL_CHOICES: StackChoice[] = [
  { name: 'Vitest', value: 'Vitest' },
  { name: 'Jest', value: 'Jest' },
  { name: 'ESLint', value: 'ESLint' },
  { name: 'Prettier', value: 'Prettier' },
  { name: 'Docker', value: 'Docker' },
  { name: 'GitHub Actions', value: 'GitHub Actions' },
];

/**
 * Options for tech stack prompt
 */
export interface TechStackPromptOptions {
  /** Pre-selected languages (from project detection) */
  detectedLanguages?: string[];
  /** Pre-selected frontend frameworks */
  detectedFrontend?: string[];
  /** Pre-selected backend frameworks */
  detectedBackend?: string[];
  /** Pre-selected tools */
  detectedTools?: string[];
}

/**
 * Get choices with detected items pre-checked
 */
function getChoicesWithDefaults(
  choices: StackChoice[],
  detected: string[] = [],
): StackChoice[] {
  return choices.map(choice => ({
    ...choice,
    checked: detected.includes(choice.value),
  }));
}

/**
 * Prompt user for tech stack settings
 *
 * @param options - Options with detected defaults
 * @returns TechStackSettings with user's choices
 */
export async function promptTechStackSettings(
  options: TechStackPromptOptions = {},
): Promise<TechStackSettings> {
  const languages = await checkbox({
    message: 'Select programming languages:',
    choices: getChoicesWithDefaults(
      LANGUAGE_CHOICES,
      options.detectedLanguages,
    ),
  });

  const frontend = await checkbox({
    message: 'Select frontend frameworks:',
    choices: getChoicesWithDefaults(FRONTEND_CHOICES, options.detectedFrontend),
  });

  const backend = await checkbox({
    message: 'Select backend frameworks:',
    choices: getChoicesWithDefaults(BACKEND_CHOICES, options.detectedBackend),
  });

  const tools = await checkbox({
    message: 'Select tools:',
    choices: getChoicesWithDefaults(TOOL_CHOICES, options.detectedTools),
  });

  return {
    languages,
    frontend,
    backend,
    tools,
  };
}
