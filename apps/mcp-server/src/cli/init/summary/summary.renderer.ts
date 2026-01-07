/**
 * Summary Renderer
 *
 * Renders configuration summary as a formatted table for CLI display
 */

/**
 * Configuration summary data structure
 */
export interface ConfigSummaryData {
  basic: {
    language: string;
    projectName: string;
    description: string;
  };
  techStack: {
    languages: string[];
    frontend: string[];
    backend: string[];
    tools: string[];
  };
  architecture: {
    pattern: string;
    componentStyle: string;
  };
  conventions: {
    fileNaming: string;
    quotes: 'single' | 'double';
    semicolons: boolean;
  };
  testStrategy: {
    approach: string;
    coverage: number;
    mockingStrategy: string;
  };
  ai: {
    defaultModel: string;
    primaryAgent: string;
  };
}

/**
 * Format array as comma-separated string or "(none)" if empty
 */
function formatArray(arr: string[]): string {
  return arr.length > 0 ? arr.join(', ') : '(none)';
}

/**
 * Render configuration summary as formatted text
 */
export function renderConfigSummary(data: ConfigSummaryData): string {
  const lines: string[] = [];

  lines.push('');
  lines.push('  [Basic]');
  lines.push(`    Language:     ${data.basic.language}`);
  lines.push(`    Project:      ${data.basic.projectName}`);
  lines.push(`    Description:  ${data.basic.description || '(none)'}`);

  lines.push('');
  lines.push('  [Tech Stack]');
  lines.push(`    Languages:    ${formatArray(data.techStack.languages)}`);
  lines.push(`    Frontend:     ${formatArray(data.techStack.frontend)}`);
  lines.push(`    Backend:      ${formatArray(data.techStack.backend)}`);
  lines.push(`    Tools:        ${formatArray(data.techStack.tools)}`);

  lines.push('');
  lines.push('  [Architecture]');
  lines.push(`    Pattern:      ${data.architecture.pattern}`);
  lines.push(`    Style:        ${data.architecture.componentStyle}`);

  lines.push('');
  lines.push('  [Conventions]');
  lines.push(`    Files:        ${data.conventions.fileNaming}`);
  lines.push(`    Quotes:       ${data.conventions.quotes}`);
  lines.push(`    Semicolons:   ${data.conventions.semicolons ? 'yes' : 'no'}`);

  lines.push('');
  lines.push('  [Test Strategy]');
  lines.push(`    Approach:     ${data.testStrategy.approach}`);
  lines.push(`    Coverage:     ${data.testStrategy.coverage}%`);
  lines.push(`    Mocking:      ${data.testStrategy.mockingStrategy}`);

  lines.push('');
  lines.push('  [AI]');
  lines.push(`    Model:        ${data.ai.defaultModel}`);
  lines.push(`    Agent:        ${data.ai.primaryAgent}`);

  lines.push('');

  return lines.join('\n');
}
