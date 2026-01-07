/**
 * Basic Settings Prompt
 *
 * Interactive CLI prompts for project name and description
 */

import { input } from '@inquirer/prompts';

/**
 * Basic settings collected from user
 */
export interface BasicSettings {
  projectName: string;
  description: string;
}

/**
 * Default project name when none detected
 */
export const DEFAULT_PROJECT_NAME = 'my-project';

/**
 * Default description when none detected
 */
export const DEFAULT_DESCRIPTION = '';

/**
 * Maximum length for npm package names
 */
const MAX_PROJECT_NAME_LENGTH = 214;

/**
 * Maximum length for project descriptions
 */
const MAX_DESCRIPTION_LENGTH = 250;

/**
 * Pattern for valid npm package names
 * - Lowercase letters, numbers, hyphens, underscores
 * - Cannot start with dot or underscore
 * - Scoped packages: @scope/name
 */
const PROJECT_NAME_PATTERN =
  /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9][a-z0-9-._~]*$/;

/**
 * Validate project name follows npm package naming conventions
 *
 * @param name - The project name to validate
 * @returns true if valid, error message string if invalid
 */
export function validateProjectName(name: string): true | string {
  if (!name || name.trim() === '') {
    return 'Project name is required';
  }

  if (name.length > MAX_PROJECT_NAME_LENGTH) {
    return `Project name must be ${MAX_PROJECT_NAME_LENGTH} characters or less`;
  }

  if (!PROJECT_NAME_PATTERN.test(name)) {
    return 'Project name must be lowercase, alphanumeric, with hyphens or underscores only (e.g., my-project, @scope/my-package)';
  }

  return true;
}

/**
 * Validate project description
 *
 * @param description - The description to validate
 * @returns true if valid, error message string if invalid
 */
export function validateDescription(description: string): true | string {
  // Empty description is allowed
  if (!description) {
    return true;
  }

  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return `Description must be ${MAX_DESCRIPTION_LENGTH} characters or less`;
  }

  // Check for control characters (newlines, tabs, etc.)
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f\x7f]/.test(description)) {
    return 'Description cannot contain control characters (newlines, tabs, etc.)';
  }

  return true;
}

/**
 * Options for basic settings prompt
 */
export interface BasicPromptOptions {
  /** Detected project name from package.json */
  detectedProjectName?: string;
  /** Detected description from package.json */
  detectedDescription?: string;
}

/**
 * Prompt user for basic project settings (project name and description)
 *
 * @param options - Options with detected defaults
 * @returns BasicSettings with user's choices
 */
export async function promptBasicSettings(
  options: BasicPromptOptions = {},
): Promise<BasicSettings> {
  const projectName = await input({
    message: 'Project name:',
    default: options.detectedProjectName ?? DEFAULT_PROJECT_NAME,
    validate: validateProjectName,
  });

  const description = await input({
    message: 'Project description:',
    default: options.detectedDescription ?? DEFAULT_DESCRIPTION,
    validate: validateDescription,
  });

  return {
    projectName,
    description,
  };
}
