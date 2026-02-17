/**
 * Template Selector
 *
 * Selects the appropriate config template based on project analysis
 */

import type { ProjectAnalysis } from '../../../analyzer';
import type { FrameworkType, ConfigTemplate, TemplateSelectionResult } from './template.types';
import { TEMPLATES } from './frameworks';

/**
 * Framework detection priority (higher = more specific)
 *
 * Supported templates: nextjs, react, nestjs, express, node, default
 * Frameworks without dedicated templates fall back to 'default'
 */
const FRAMEWORK_PRIORITY: Record<string, { template: FrameworkType; priority: number }> = {
  // Fullstack frameworks (highest priority)
  next: { template: 'nextjs', priority: 100 },
  nuxt: { template: 'default', priority: 100 },

  // Backend frameworks
  '@nestjs/core': { template: 'nestjs', priority: 90 },
  nestjs: { template: 'nestjs', priority: 90 },
  express: { template: 'express', priority: 80 },
  fastify: { template: 'express', priority: 80 },
  koa: { template: 'express', priority: 80 },

  // Frontend frameworks
  react: { template: 'react', priority: 70 },
  vue: { template: 'default', priority: 70 },
  svelte: { template: 'default', priority: 70 },
  angular: { template: 'default', priority: 70 },
};

/**
 * Select the best template based on project analysis
 */
export function selectTemplate(analysis: ProjectAnalysis): TemplateSelectionResult {
  const detectedFrameworks: string[] = [];
  let selectedTemplate: FrameworkType = 'default';
  let highestPriority = -1;
  let reason = 'No specific framework detected, using default template';

  // Check detected frameworks from package.json
  if (analysis.packageInfo?.detectedFrameworks) {
    for (const framework of analysis.packageInfo.detectedFrameworks) {
      const frameworkKey = framework.name.toLowerCase();
      detectedFrameworks.push(framework.name);

      const mapping = FRAMEWORK_PRIORITY[frameworkKey];
      if (mapping && mapping.priority > highestPriority) {
        highestPriority = mapping.priority;
        selectedTemplate = mapping.template;
        reason = `Detected ${framework.name} (${framework.category})`;
      }
    }
  }

  // Check detected patterns if no framework found
  if (selectedTemplate === 'default' && analysis.detectedPatterns.length > 0) {
    const patterns = analysis.detectedPatterns.map(p => p.toLowerCase());

    if (patterns.some(p => p.includes('node'))) {
      selectedTemplate = 'node';
      reason = 'Detected Node.js project pattern';
    }
  }

  const template = getTemplateById(selectedTemplate);

  if (!template) {
    throw new Error(`Template not found: ${selectedTemplate}`);
  }

  return {
    template,
    reason,
    detectedFrameworks,
  };
}

/**
 * Get a template by its ID
 */
export function getTemplateById(id: FrameworkType): ConfigTemplate | undefined {
  return TEMPLATES.find(t => t.metadata.id === id);
}

/**
 * Get all available templates
 */
export function getAllTemplates(): ConfigTemplate[] {
  return [...TEMPLATES];
}
