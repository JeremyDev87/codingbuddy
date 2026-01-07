/**
 * Architecture Prompt
 *
 * Interactive CLI prompts for architecture settings
 */

import { select } from '@inquirer/prompts';

/**
 * Choice option
 */
export interface ArchChoice {
  name: string;
  value: string;
  description?: string;
}

/**
 * Architecture settings collected from user
 */
export interface ArchitectureSettings {
  pattern: string;
  componentStyle: string;
}

/**
 * Architecture pattern choices
 */
export const PATTERN_CHOICES: ArchChoice[] = [
  {
    name: 'Monorepo',
    value: 'monorepo',
    description: 'Multiple packages in one repository (apps/, packages/)',
  },
  {
    name: 'Modular',
    value: 'modular',
    description: 'Feature-based modules with clear boundaries',
  },
  {
    name: 'Layered',
    value: 'layered',
    description: 'Traditional layers (presentation, business, data)',
  },
  {
    name: 'Clean Architecture',
    value: 'clean',
    description: 'Domain-centric with dependency inversion',
  },
  {
    name: 'Microservices',
    value: 'microservices',
    description: 'Distributed services architecture',
  },
];

/**
 * Component style choices
 */
export const COMPONENT_STYLE_CHOICES: ArchChoice[] = [
  {
    name: 'Feature-based',
    value: 'feature-based',
    description: 'Group by feature (auth/, users/, products/)',
  },
  {
    name: 'Flat',
    value: 'flat',
    description: 'All components in one directory',
  },
  {
    name: 'Grouped',
    value: 'grouped',
    description: 'Group by type (components/, hooks/, utils/)',
  },
];

/**
 * Options for architecture prompt
 */
export interface ArchitecturePromptOptions {
  /** Detected architecture pattern */
  detectedPattern?: string;
  /** Detected component style */
  detectedComponentStyle?: string;
}

/**
 * Prompt user for architecture settings
 */
export async function promptArchitectureSettings(
  options: ArchitecturePromptOptions = {},
): Promise<ArchitectureSettings> {
  const pattern = await select({
    message: 'Select architecture pattern:',
    choices: PATTERN_CHOICES,
    default: options.detectedPattern ?? 'modular',
  });

  const componentStyle = await select({
    message: 'Select component organization style:',
    choices: COMPONENT_STYLE_CHOICES,
    default: options.detectedComponentStyle ?? 'feature-based',
  });

  return {
    pattern,
    componentStyle,
  };
}
