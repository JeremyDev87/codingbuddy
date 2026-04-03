/**
 * Plugin Create Command
 *
 * CLI command handler for `codingbuddy create-plugin <name>`.
 * Scaffolds a new plugin project with minimal or full template.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { createConsoleUtils } from '../utils/console';

// ============================================================================
// Types
// ============================================================================

export interface CreatePluginOptions {
  name: string;
  outputDir: string;
  template: 'minimal' | 'full';
  description?: string;
  author?: string;
}

export interface CreatePluginResult {
  success: boolean;
  pluginDir?: string;
  error?: string;
}

export interface TemplateContext {
  name: string;
  description: string;
  author: string;
}

// ============================================================================
// Validation
// ============================================================================

const PLUGIN_NAME_REGEX = /^[a-z][a-z0-9-]*$/;

export function validatePluginName(name: string): boolean {
  return PLUGIN_NAME_REGEX.test(name);
}

// ============================================================================
// Author detection
// ============================================================================

function getDefaultAuthor(): string {
  try {
    return execSync('git config user.name', { encoding: 'utf-8' }).trim();
  } catch {
    return 'unknown';
  }
}

// ============================================================================
// Template generators
// ============================================================================

export function generateMinimalTemplate(ctx: TemplateContext): Record<string, string> {
  const manifest = {
    name: ctx.name,
    version: '1.0.0',
    description: ctx.description,
    author: ctx.author,
    provides: {
      agents: [],
      rules: [],
      skills: [],
      checklists: [],
    },
  };

  const readme = `# ${ctx.name}

${ctx.description}

## Installation

\`\`\`bash
codingbuddy install ./${ctx.name}
\`\`\`

## Author

${ctx.author}
`;

  const gitignore = `node_modules/
dist/
.DS_Store
`;

  return {
    'plugin.json': JSON.stringify(manifest, null, 2),
    'README.md': readme,
    '.gitignore': gitignore,
  };
}

export function generateFullTemplate(ctx: TemplateContext): Record<string, string> {
  const minimalFiles = generateMinimalTemplate(ctx);

  const manifest = JSON.parse(minimalFiles['plugin.json']);
  manifest.provides = {
    agents: ['agents/example-agent.json'],
    rules: ['rules/example-rule.md'],
    skills: ['skills/example-skill.md'],
    checklists: ['checklists/example-checklist.json'],
  };

  const exampleAgent = {
    name: 'Example Agent',
    description: `Example specialist agent for ${ctx.name}`,
    role: {
      title: 'Example Specialist',
      expertise: ['example-domain'],
    },
    activation_message: {
      formatted: '🤖 example-agent [Example Specialist]',
    },
  };

  const exampleSkill = `# Example Skill

## Purpose

An example skill provided by ${ctx.name}.

## Instructions

Describe the skill instructions here.
`;

  const exampleRule = `# Example Rule

## Description

An example rule provided by ${ctx.name}.

## Guidelines

- Guideline 1
- Guideline 2
`;

  const exampleChecklist = {
    name: 'Example Checklist',
    description: `Example checklist from ${ctx.name}`,
    items: [
      {
        id: 'example-1',
        text: 'Check example condition',
        severity: 'medium',
      },
    ],
  };

  return {
    ...minimalFiles,
    'plugin.json': JSON.stringify(manifest, null, 2),
    'agents/example-agent.json': JSON.stringify(exampleAgent, null, 2),
    'skills/example-skill.md': exampleSkill,
    'rules/example-rule.md': exampleRule,
    'checklists/example-checklist.json': JSON.stringify(exampleChecklist, null, 2),
  };
}

// ============================================================================
// Command runner
// ============================================================================

export async function runCreatePlugin(options: CreatePluginOptions): Promise<CreatePluginResult> {
  const console = createConsoleUtils();

  if (!validatePluginName(options.name)) {
    const msg = `Invalid plugin name "${options.name}". Must match /^[a-z][a-z0-9-]*$/`;
    console.log.error(msg);
    return { success: false, error: msg };
  }

  const pluginDir = path.join(options.outputDir, options.name);

  if (fs.existsSync(pluginDir)) {
    const msg = `Directory "${pluginDir}" already exists`;
    console.log.error(msg);
    return { success: false, error: msg };
  }

  const author = options.author ?? getDefaultAuthor();
  const description = options.description ?? `A CodingBuddy plugin: ${options.name}`;

  const ctx: TemplateContext = {
    name: options.name,
    description,
    author,
  };

  const files =
    options.template === 'full' ? generateFullTemplate(ctx) : generateMinimalTemplate(ctx);

  console.log.step('🔧', `Scaffolding plugin "${options.name}" (${options.template} template)...`);

  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = path.join(pluginDir, filePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, 'utf-8');
  }

  console.log.success(`Plugin "${options.name}" created at ${pluginDir}`);
  return { success: true, pluginDir };
}
