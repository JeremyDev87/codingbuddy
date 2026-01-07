/**
 * Init Wizard
 *
 * Interactive wizard for comprehensive config setup
 * Handles all prompt sections and summary/edit flow
 */

import type { ProjectAnalysis } from '../../analyzer';
import { createConsoleUtils } from '../utils/console';
import {
  promptLanguageSelection,
  promptModelSelection,
  promptPrimaryAgentSelection,
  promptBasicSettings,
  promptTechStackSettings,
  promptArchitectureSettings,
  promptConventionsSettings,
  promptTestStrategySettings,
  DEFAULT_LANGUAGE,
  DEFAULT_MODEL_CHOICE,
  DEFAULT_PRIMARY_AGENT,
  DEFAULT_PROJECT_NAME,
  DEFAULT_DESCRIPTION,
  DEFAULT_COVERAGE,
  type BasicSettings,
  type TechStackSettings,
  type ArchitectureSettings,
  type ConventionsSettings,
  type TestStrategySettings,
  type ActPrimaryAgent,
} from './prompts';
import {
  renderConfigSummary,
  promptSummaryAction,
  type ConfigSummaryData,
  type SummaryAction,
} from './summary';

/**
 * Collected wizard data
 */
export interface WizardData {
  basic: BasicSettings & { language: string };
  techStack: TechStackSettings;
  architecture: ArchitectureSettings;
  conventions: ConventionsSettings;
  testStrategy: TestStrategySettings;
  ai: {
    defaultModel: string;
    primaryAgent: ActPrimaryAgent;
  };
}

/**
 * Options for wizard with detected defaults
 */
export interface WizardOptions {
  /** Use detected defaults without prompting */
  useDefaults?: boolean;
  /** Skip all prompts (CI mode) */
  skipPrompts?: boolean;
  /** Project analysis results */
  analysis: ProjectAnalysis;
}

/**
 * Extract detected values from project analysis
 */
function extractDetectedValues(analysis: ProjectAnalysis) {
  const packageInfo = analysis.packageInfo;
  const configFiles = analysis.configFiles;

  // Detect languages from file extensions and frameworks
  const detectedLanguages: string[] = [];
  if (
    packageInfo?.detectedFrameworks.some(f =>
      f.name.toLowerCase().includes('typescript'),
    )
  ) {
    detectedLanguages.push('TypeScript');
  }
  if (
    packageInfo?.dependencies['typescript'] ||
    packageInfo?.devDependencies['typescript']
  ) {
    if (!detectedLanguages.includes('TypeScript')) {
      detectedLanguages.push('TypeScript');
    }
  }
  detectedLanguages.push('JavaScript'); // Always include JS

  // Detect frontend frameworks
  const detectedFrontend: string[] = [];
  const deps = {
    ...packageInfo?.dependencies,
    ...packageInfo?.devDependencies,
  };
  if (deps['next']) detectedFrontend.push('Next.js');
  if (deps['react'] && !deps['next']) detectedFrontend.push('React');
  if (deps['vue']) detectedFrontend.push('Vue');
  if (deps['nuxt']) detectedFrontend.push('Nuxt');
  if (deps['svelte']) detectedFrontend.push('Svelte');
  if (deps['@angular/core']) detectedFrontend.push('Angular');

  // Detect backend frameworks
  const detectedBackend: string[] = [];
  if (deps['@nestjs/core']) detectedBackend.push('NestJS');
  if (deps['express']) detectedBackend.push('Express');
  if (deps['fastify']) detectedBackend.push('Fastify');

  // Detect tools
  const detectedTools: string[] = [];
  if (deps['vitest']) detectedTools.push('Vitest');
  if (deps['jest']) detectedTools.push('Jest');
  if (deps['eslint']) detectedTools.push('ESLint');
  if (deps['prettier']) detectedTools.push('Prettier');

  // Detect architecture pattern
  let detectedPattern = 'modular';
  if (
    analysis.directoryStructure.rootDirs.includes('apps') ||
    analysis.directoryStructure.rootDirs.includes('packages')
  ) {
    detectedPattern = 'monorepo';
  }

  // Detect conventions from prettier config
  const prettierConfig = configFiles.prettier;
  const detectedQuotes: 'single' | 'double' = prettierConfig?.singleQuote
    ? 'single'
    : 'double';
  const detectedSemicolons = prettierConfig?.semi ?? true;

  return {
    projectName: packageInfo?.name ?? DEFAULT_PROJECT_NAME,
    description: packageInfo?.description ?? DEFAULT_DESCRIPTION,
    languages: detectedLanguages,
    frontend: detectedFrontend,
    backend: detectedBackend,
    tools: detectedTools,
    pattern: detectedPattern,
    quotes: detectedQuotes,
    semicolons: detectedSemicolons,
  };
}

/**
 * Create default wizard data from detected values
 */
function createDefaultData(
  detected: ReturnType<typeof extractDetectedValues>,
): WizardData {
  return {
    basic: {
      language: DEFAULT_LANGUAGE,
      projectName: detected.projectName,
      description: detected.description,
    },
    techStack: {
      languages: detected.languages,
      frontend: detected.frontend,
      backend: detected.backend,
      tools: detected.tools,
    },
    architecture: {
      pattern: detected.pattern,
      componentStyle: 'feature-based',
    },
    conventions: {
      fileNaming: 'kebab-case',
      quotes: detected.quotes,
      semicolons: detected.semicolons,
    },
    testStrategy: {
      approach: 'tdd',
      coverage: DEFAULT_COVERAGE,
      mockingStrategy: 'minimal',
    },
    ai: {
      defaultModel: DEFAULT_MODEL_CHOICE,
      primaryAgent: DEFAULT_PRIMARY_AGENT,
    },
  };
}

/**
 * Run full wizard prompts
 */
async function runFullPrompts(
  detected: ReturnType<typeof extractDetectedValues>,
  console: ReturnType<typeof createConsoleUtils>,
): Promise<WizardData> {
  // 1. Basic settings
  console.log.step('📝', 'Basic Settings');
  const language = await promptLanguageSelection();
  const basic = await promptBasicSettings({
    detectedProjectName: detected.projectName,
    detectedDescription: detected.description,
  });

  // 2. Tech stack
  console.log.step('🛠️', 'Tech Stack');
  const techStack = await promptTechStackSettings({
    detectedLanguages: detected.languages,
    detectedFrontend: detected.frontend,
    detectedBackend: detected.backend,
    detectedTools: detected.tools,
  });

  // 3. Architecture
  console.log.step('🏗️', 'Architecture');
  const architecture = await promptArchitectureSettings({
    detectedPattern: detected.pattern,
  });

  // 4. Conventions
  console.log.step('📏', 'Conventions');
  const conventions = await promptConventionsSettings({
    detectedQuotes: detected.quotes,
    detectedSemicolons: detected.semicolons,
  });

  // 5. Test strategy
  console.log.step('🧪', 'Test Strategy');
  const testStrategy = await promptTestStrategySettings();

  // 6. AI settings
  console.log.step('🤖', 'AI Settings');
  const primaryAgent = await promptPrimaryAgentSelection();
  const defaultModel = await promptModelSelection();

  return {
    basic: { ...basic, language },
    techStack,
    architecture,
    conventions,
    testStrategy,
    ai: { defaultModel, primaryAgent },
  };
}

/**
 * Run section-specific prompts for editing
 */
async function runSectionPrompts(
  section: SummaryAction,
  currentData: WizardData,
  _detected: ReturnType<typeof extractDetectedValues>,
): Promise<WizardData> {
  const newData = { ...currentData };

  switch (section) {
    case 'edit-basic': {
      const language = await promptLanguageSelection();
      const basic = await promptBasicSettings({
        detectedProjectName: currentData.basic.projectName,
        detectedDescription: currentData.basic.description,
      });
      newData.basic = { ...basic, language };
      break;
    }
    case 'edit-tech-stack': {
      newData.techStack = await promptTechStackSettings({
        detectedLanguages: currentData.techStack.languages,
        detectedFrontend: currentData.techStack.frontend,
        detectedBackend: currentData.techStack.backend,
        detectedTools: currentData.techStack.tools,
      });
      break;
    }
    case 'edit-architecture': {
      newData.architecture = await promptArchitectureSettings({
        detectedPattern: currentData.architecture.pattern,
        detectedComponentStyle: currentData.architecture.componentStyle,
      });
      break;
    }
    case 'edit-conventions': {
      newData.conventions = await promptConventionsSettings({
        detectedFileNaming: currentData.conventions.fileNaming,
        detectedQuotes: currentData.conventions.quotes,
        detectedSemicolons: currentData.conventions.semicolons,
      });
      break;
    }
    case 'edit-test-strategy': {
      newData.testStrategy = await promptTestStrategySettings({
        detectedApproach: currentData.testStrategy.approach,
        detectedCoverage: currentData.testStrategy.coverage,
        detectedMockingStrategy: currentData.testStrategy.mockingStrategy,
      });
      break;
    }
    case 'edit-ai': {
      const primaryAgent = await promptPrimaryAgentSelection();
      const defaultModel = await promptModelSelection();
      newData.ai = { defaultModel, primaryAgent };
      break;
    }
  }

  return newData;
}

/**
 * Convert wizard data to summary display format
 */
function toSummaryData(data: WizardData): ConfigSummaryData {
  return {
    basic: data.basic,
    techStack: data.techStack,
    architecture: data.architecture,
    conventions: data.conventions,
    testStrategy: data.testStrategy,
    ai: data.ai,
  };
}

/**
 * Run the init wizard
 *
 * @returns Collected wizard data or null if cancelled
 */
export async function runInitWizard(
  options: WizardOptions,
): Promise<WizardData | null> {
  const console = createConsoleUtils();
  const detected = extractDetectedValues(options.analysis);

  let data: WizardData;

  // If useDefaults or skipPrompts, use detected values
  if (options.useDefaults || options.skipPrompts) {
    data = createDefaultData(detected);
    console.log.info('Using detected defaults...');
  } else {
    // Run full prompts
    data = await runFullPrompts(detected, console);
  }

  // Skip summary if skipPrompts
  if (options.skipPrompts) {
    return data;
  }

  // Summary and edit loop
  let confirmed = false;
  while (!confirmed) {
    // Show summary
    console.log.info('\n📋 Configuration Summary');
    console.log.info(renderConfigSummary(toSummaryData(data)));

    // Get action
    const action = await promptSummaryAction();

    if (action === 'confirm') {
      confirmed = true;
    } else if (action === 'cancel') {
      console.log.warn('Configuration cancelled.');
      return null;
    } else {
      // Edit section
      data = await runSectionPrompts(action, data, detected);
    }
  }

  return data;
}

/**
 * Convert wizard data to config object for rendering
 */
export function wizardDataToConfig(data: WizardData): Record<string, unknown> {
  return {
    language: data.basic.language,
    projectName: data.basic.projectName,
    description: data.basic.description,
    techStack: {
      languages: data.techStack.languages,
      frontend:
        data.techStack.frontend.length > 0
          ? data.techStack.frontend
          : undefined,
      backend:
        data.techStack.backend.length > 0 ? data.techStack.backend : undefined,
      tools: data.techStack.tools,
    },
    architecture: {
      pattern: data.architecture.pattern,
      componentStyle: data.architecture.componentStyle,
    },
    conventions: {
      naming: {
        files: data.conventions.fileNaming,
      },
      quotes: data.conventions.quotes,
      semicolons: data.conventions.semicolons,
    },
    testStrategy: {
      approach: data.testStrategy.approach,
      coverage: data.testStrategy.coverage,
      mockingStrategy: data.testStrategy.mockingStrategy,
    },
    ai: {
      defaultModel: data.ai.defaultModel,
      primaryAgent: data.ai.primaryAgent,
    },
  };
}
