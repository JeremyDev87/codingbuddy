/**
 * Template Renderer
 *
 * Renders config templates to JSON format
 *
 * Only JSON format is supported to ensure compatibility with both
 * CommonJS and ESM projects.
 */

import type { CodingBuddyConfig } from '../../../config';
import type { ConfigTemplate, TemplateRenderOptions } from './template.types';

/**
 * Render a config template as JSON
 */
export function renderConfigAsJson(
  template: ConfigTemplate,
  options: TemplateRenderOptions = {},
): string {
  const config = applyOverrides(template.config, options);

  // Build ai config from options
  const aiConfig: Record<string, string> = {};
  if (options.defaultModel) {
    aiConfig.defaultModel = options.defaultModel;
  }
  if (options.primaryAgent) {
    aiConfig.primaryAgent = options.primaryAgent;
  }

  // Add ai config if any options are provided
  const configWithAi = Object.keys(aiConfig).length > 0 ? { ...config, ai: aiConfig } : config;

  return JSON.stringify(configWithAi, null, 2);
}

/**
 * Apply overrides to config
 */
function applyOverrides(
  config: CodingBuddyConfig,
  options: TemplateRenderOptions,
): CodingBuddyConfig {
  return {
    ...config,
    ...(options.language && { language: options.language }),
    ...(options.projectName && { projectName: options.projectName }),
  };
}
