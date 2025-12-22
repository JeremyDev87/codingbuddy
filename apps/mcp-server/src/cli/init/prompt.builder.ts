/**
 * Prompt Builder
 *
 * Converts project analysis results into AI prompts
 */

import type {
  ProjectAnalysis,
  PackageInfo,
  DirectoryAnalysis,
  ConfigFilesSummary,
  CodeSample,
} from '../../analyzer';

/**
 * Build the system prompt for AI configuration generation
 */
export function buildSystemPrompt(): string {
  return `You are CodingBuddy, an AI assistant that generates project configuration files.

Your task is to analyze the provided project information and generate an optimal CodingBuddyConfig configuration.

## Output Requirements

1. Output ONLY valid JSON that conforms to the CodingBuddyConfig schema
2. Do not include any explanation or markdown - just the raw JSON object
3. All fields are optional - only include what's relevant to the project

## CodingBuddyConfig Schema

\`\`\`typescript
interface CodingBuddyConfig {
  // Basic Settings
  language?: string;        // Response language (e.g., 'ko', 'en')
  projectName?: string;     // Project name
  description?: string;     // Project description
  repository?: string;      // Repository URL

  // Technical Configuration
  techStack?: {
    languages?: string[];
    frontend?: string[];
    backend?: string[];
    database?: string[];
    infrastructure?: string[];
    tools?: string[];
  };

  architecture?: {
    pattern?: string;       // e.g., 'Next.js App Router', 'NestJS Modular'
    structure?: string[];   // Directory structure
    componentStyle?: 'flat' | 'grouped' | 'feature-based';
  };

  conventions?: {
    style?: string;
    naming?: {
      files?: 'kebab-case' | 'camelCase' | 'PascalCase' | 'snake_case';
      components?: 'PascalCase' | 'kebab-case';
      functions?: 'camelCase' | 'snake_case';
      variables?: 'camelCase' | 'snake_case';
      constants?: 'UPPER_SNAKE_CASE' | 'camelCase';
    };
    importOrder?: string[];
    maxLineLength?: number;
    semicolons?: boolean;
    quotes?: 'single' | 'double';
  };

  testStrategy?: {
    approach?: 'tdd' | 'bdd' | 'test-after' | 'mixed';
    frameworks?: string[];
    coverage?: number;
    unitTestPattern?: 'colocated' | 'separate';
    mockingStrategy?: 'minimal' | 'extensive' | 'no-mocks';
  };

  // Additional Context
  keyFiles?: string[];      // Important files to reference
  avoid?: string[];         // Patterns/practices to avoid
}
\`\`\`

## Guidelines

- Infer settings from the project analysis
- Use detected frameworks to determine tech stack
- Use config file analysis to determine conventions
- Use directory patterns to determine architecture
- Use test framework detection to suggest test strategy
- Keep the config concise - only include relevant sections`;
}

/**
 * Build the user prompt with project analysis
 */
export function buildAnalysisPrompt(analysis: ProjectAnalysis): string {
  const sections: string[] = [];

  sections.push('# Project Analysis Results\n');

  // Package Information
  sections.push('## Package Information\n');
  if (analysis.packageInfo) {
    sections.push(formatPackageInfo(analysis.packageInfo));
  } else {
    sections.push('No package.json found in the project.\n');
  }

  // Directory Structure
  sections.push('\n## Directory Structure\n');
  sections.push(formatDirectoryStructure(analysis.directoryStructure));

  // Config Files
  sections.push('\n## Configuration Files\n');
  sections.push(formatConfigFiles(analysis.configFiles));

  // Code Samples
  sections.push('\n## Code Samples\n');
  if (analysis.codeSamples.length > 0) {
    sections.push(formatCodeSamples(analysis.codeSamples));
  } else {
    sections.push('No code samples available.\n');
  }

  // Detected Patterns
  sections.push('\n## Detected Patterns\n');
  if (analysis.detectedPatterns.length > 0) {
    sections.push(analysis.detectedPatterns.map(p => `- ${p}`).join('\n'));
  } else {
    sections.push('No specific patterns detected.');
  }

  sections.push('\n\n---\n');
  sections.push(
    'Based on this analysis, generate a CodingBuddyConfig JSON object.',
  );

  return sections.join('');
}

/**
 * Format package info section
 */
export function formatPackageInfo(info: PackageInfo): string {
  const lines: string[] = [];

  lines.push(`- **Name**: ${info.name}`);
  lines.push(`- **Version**: ${info.version}`);

  if (info.description) {
    lines.push(`- **Description**: ${info.description}`);
  }

  if (info.type) {
    lines.push(`- **Module Type**: ${info.type}`);
  }

  // Detected Frameworks
  if (info.detectedFrameworks.length > 0) {
    lines.push('\n### Detected Frameworks');
    for (const fw of info.detectedFrameworks) {
      lines.push(`- ${fw.name} (${fw.category}): ${fw.version}`);
    }
  }

  // Scripts
  const scriptNames = Object.keys(info.scripts);
  if (scriptNames.length > 0) {
    lines.push('\n### Scripts');
    for (const name of scriptNames) {
      lines.push(`- \`${name}\`: ${info.scripts[name]}`);
    }
  }

  // Key dependencies
  const deps = Object.keys(info.dependencies);
  if (deps.length > 0) {
    lines.push('\n### Key Dependencies');
    lines.push(
      deps
        .slice(0, 10)
        .map(d => `\`${d}\``)
        .join(', '),
    );
  }

  return lines.join('\n');
}

/**
 * Format directory structure section
 */
export function formatDirectoryStructure(dir: DirectoryAnalysis): string {
  const lines: string[] = [];

  lines.push(`- **Total Files**: ${dir.totalFiles}`);
  lines.push(`- **Total Directories**: ${dir.totalDirs}`);

  // Root directories
  lines.push('\n### Root Directories');
  lines.push(dir.rootDirs.map(d => `\`${d}\``).join(', '));

  // Architecture patterns
  if (dir.patterns.length > 0) {
    lines.push('\n### Architecture Patterns');
    for (const pattern of dir.patterns) {
      lines.push(`- **${pattern.name}** (confidence: ${pattern.confidence})`);
      lines.push(`  - Indicators: ${pattern.indicators.join(', ')}`);
    }
  }

  return lines.join('\n');
}

/**
 * Format config files section
 */
export function formatConfigFiles(config: ConfigFilesSummary): string {
  const lines: string[] = [];

  lines.push(`Detected config files: ${config.detected.join(', ')}\n`);

  // TypeScript
  if (config.typescript) {
    lines.push('### TypeScript Configuration');
    lines.push(`- Path: \`${config.typescript.path}\``);
    if (config.typescript.strict !== undefined) {
      lines.push(
        `- Strict mode: ${config.typescript.strict ? 'enabled' : 'disabled'}`,
      );
    }
    if (config.typescript.target) {
      lines.push(`- Target: ${config.typescript.target}`);
    }
    if (config.typescript.module) {
      lines.push(`- Module: ${config.typescript.module}`);
    }
    if (config.typescript.hasPathAliases) {
      lines.push('- Has path aliases configured');
    }
  }

  // ESLint
  if (config.eslint) {
    lines.push('\n### ESLint Configuration');
    lines.push(`- Path: \`${config.eslint.path}\``);
    lines.push(`- Format: ${config.eslint.format}`);
    if (config.eslint.extends && config.eslint.extends.length > 0) {
      lines.push(`- Extends: ${config.eslint.extends.join(', ')}`);
    }
    if (config.eslint.plugins && config.eslint.plugins.length > 0) {
      lines.push(`- Plugins: ${config.eslint.plugins.join(', ')}`);
    }
  }

  // Prettier
  if (config.prettier) {
    lines.push('\n### Prettier Configuration');
    lines.push(`- Path: \`${config.prettier.path}\``);
    if (config.prettier.tabWidth !== undefined) {
      lines.push(`- Tab width: ${config.prettier.tabWidth}`);
    }
    if (config.prettier.semi !== undefined) {
      lines.push(`- Semicolons: ${config.prettier.semi ? 'yes' : 'no'}`);
    }
    if (config.prettier.singleQuote !== undefined) {
      lines.push(
        `- Quotes: ${config.prettier.singleQuote ? 'single' : 'double'}`,
      );
    }
    if (config.prettier.trailingComma) {
      lines.push(`- Trailing comma: ${config.prettier.trailingComma}`);
    }
  }

  return lines.join('\n');
}

/**
 * Format code samples section
 */
export function formatCodeSamples(samples: CodeSample[]): string {
  const lines: string[] = [];

  for (const sample of samples) {
    lines.push(`### ${sample.path}`);
    lines.push(`- Language: ${sample.language}`);
    lines.push(`- Category: ${sample.category}`);
    lines.push(`- Lines: ${sample.lineCount}`);
    lines.push('\n```' + sample.language);
    lines.push(sample.preview);
    lines.push('```\n');
  }

  return lines.join('\n');
}
