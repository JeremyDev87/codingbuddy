/**
 * Template Renderer
 *
 * Renders config templates to JavaScript or JSON format with comments
 */

import type { CodingBuddyConfig } from '../../../config';
import type { ConfigTemplate, TemplateRenderOptions } from './template.types';

/**
 * Render a config template as JavaScript with comments
 */
export function renderConfigAsJs(
  template: ConfigTemplate,
  options: TemplateRenderOptions = {},
): string {
  const config = applyOverrides(template.config, options);
  const comments = template.comments;

  const lines: string[] = [];

  // Header
  if (comments.header) {
    lines.push(comments.header);
    lines.push('');
  }

  lines.push('module.exports = {');

  // Language
  if (comments.language) {
    lines.push(`  ${comments.language}`);
  }
  lines.push(`  language: '${config.language || 'ko'}',`);
  lines.push('');

  // Project Info
  if (comments.projectInfo) {
    lines.push(`  ${comments.projectInfo}`);
  }
  if (config.projectName) {
    lines.push(`  projectName: '${config.projectName}',`);
  }
  if (config.description) {
    lines.push(`  description: '${config.description}',`);
  }
  lines.push('');

  // Tech Stack
  if (config.techStack && Object.keys(config.techStack).length > 0) {
    if (comments.techStack) {
      lines.push(`  ${comments.techStack}`);
    }
    lines.push('  techStack: {');
    lines.push(...renderTechStack(config.techStack));
    lines.push('  },');
    lines.push('');
  }

  // Architecture
  if (config.architecture && Object.keys(config.architecture).length > 0) {
    if (comments.architecture) {
      lines.push(`  ${comments.architecture}`);
    }
    lines.push('  architecture: {');
    lines.push(...renderArchitecture(config.architecture));
    lines.push('  },');
    lines.push('');
  }

  // Conventions
  if (config.conventions && Object.keys(config.conventions).length > 0) {
    if (comments.conventions) {
      lines.push(`  ${comments.conventions}`);
    }
    lines.push('  conventions: {');
    lines.push(...renderConventions(config.conventions));
    lines.push('  },');
    lines.push('');
  }

  // Test Strategy
  if (config.testStrategy && Object.keys(config.testStrategy).length > 0) {
    if (comments.testStrategy) {
      lines.push(`  ${comments.testStrategy}`);
    }
    lines.push('  testStrategy: {');
    lines.push(...renderTestStrategy(config.testStrategy));
    lines.push('  },');
    lines.push('');
  }

  // AI Configuration (from options.defaultModel)
  if (options.defaultModel) {
    lines.push('  // AI Model Configuration');
    lines.push('  ai: {');
    lines.push(`    defaultModel: '${options.defaultModel}',`);
    lines.push('  },');
  }

  lines.push('};');

  // Footer
  if (comments.footer) {
    lines.push('');
    lines.push(comments.footer);
  }

  return lines.join('\n');
}

/**
 * Render a config template as JSON
 */
export function renderConfigAsJson(
  template: ConfigTemplate,
  options: TemplateRenderOptions = {},
): string {
  const config = applyOverrides(template.config, options);

  // Add ai config if defaultModel is provided
  const configWithAi = options.defaultModel
    ? { ...config, ai: { defaultModel: options.defaultModel } }
    : config;

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

/**
 * Render tech stack section
 */
function renderTechStack(techStack: CodingBuddyConfig['techStack']): string[] {
  const lines: string[] = [];

  if (techStack?.languages?.length) {
    lines.push(`    languages: [${formatStringArray(techStack.languages)}],`);
  }
  if (techStack?.frontend?.length) {
    lines.push(`    frontend: [${formatStringArray(techStack.frontend)}],`);
  }
  if (techStack?.backend?.length) {
    lines.push(`    backend: [${formatStringArray(techStack.backend)}],`);
  }
  if (techStack?.database?.length) {
    lines.push(`    database: [${formatStringArray(techStack.database)}],`);
  }
  if (techStack?.infrastructure?.length) {
    lines.push(
      `    infrastructure: [${formatStringArray(techStack.infrastructure)}],`,
    );
  }
  if (techStack?.tools?.length) {
    lines.push(`    tools: [${formatStringArray(techStack.tools)}],`);
  }

  return lines;
}

/**
 * Render architecture section
 */
function renderArchitecture(arch: CodingBuddyConfig['architecture']): string[] {
  const lines: string[] = [];

  if (arch?.pattern) {
    lines.push(`    pattern: '${arch.pattern}',`);
  }
  if (arch?.componentStyle) {
    lines.push(`    componentStyle: '${arch.componentStyle}',`);
  }
  if (arch?.structure?.length) {
    lines.push(`    structure: [${formatStringArray(arch.structure)}],`);
  }

  return lines;
}

/**
 * Render conventions section
 */
function renderConventions(conv: CodingBuddyConfig['conventions']): string[] {
  const lines: string[] = [];

  if (conv?.naming) {
    lines.push('    naming: {');
    if (conv.naming.files) {
      lines.push(`      files: '${conv.naming.files}',`);
    }
    if (conv.naming.components) {
      lines.push(`      components: '${conv.naming.components}',`);
    }
    if (conv.naming.functions) {
      lines.push(`      functions: '${conv.naming.functions}',`);
    }
    if (conv.naming.variables) {
      lines.push(`      variables: '${conv.naming.variables}',`);
    }
    lines.push('    },');
  }

  if (conv?.quotes) {
    lines.push(`    quotes: '${conv.quotes}',`);
  }
  if (conv?.semicolons !== undefined) {
    lines.push(`    semicolons: ${conv.semicolons},`);
  }

  return lines;
}

/**
 * Render test strategy section
 */
function renderTestStrategy(test: CodingBuddyConfig['testStrategy']): string[] {
  const lines: string[] = [];

  if (test?.approach) {
    lines.push(`    approach: '${test.approach}',`);
  }
  if (test?.coverage !== undefined) {
    lines.push(`    coverage: ${test.coverage},`);
  }
  if (test?.mockingStrategy) {
    lines.push(`    mockingStrategy: '${test.mockingStrategy}',`);
  }
  if (test?.frameworks?.length) {
    lines.push(`    frameworks: [${formatStringArray(test.frameworks)}],`);
  }

  return lines;
}

/**
 * Format string array for JS output
 */
function formatStringArray(arr: string[]): string {
  return arr.map(s => `'${s}'`).join(', ');
}
