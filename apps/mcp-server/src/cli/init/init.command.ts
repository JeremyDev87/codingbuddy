/**
 * Init Command
 *
 * Main entry point for the `codingbuddy init` command
 * Uses template-based config generation by default (no API key required)
 * Optionally uses AI generation with --ai flag
 */

import { AnalyzerService } from '../../analyzer';
import { ConfigGenerator } from './config.generator';
import { findExistingConfig, writeConfig } from './config.writer';
import { createConsoleUtils } from '../utils/console';
import {
  selectTemplate,
  renderConfigAsJs,
  renderConfigAsJson,
} from './templates';
import { promptModelSelection, DEFAULT_MODEL_CHOICE } from './prompts';
import type { InitOptions, InitResult } from '../cli.types';

/**
 * Get API key from options or environment
 * Only used when --ai flag is specified
 */
export function getApiKey(options: InitOptions): string | null {
  if (options.apiKey) {
    return options.apiKey;
  }

  if (process.env.ANTHROPIC_API_KEY) {
    return process.env.ANTHROPIC_API_KEY;
  }

  return null;
}

/**
 * Run the init command with template-based generation (default)
 */
async function runTemplateInit(
  options: InitOptions,
  console: ReturnType<typeof createConsoleUtils>,
): Promise<InitResult> {
  // Step 1: Analyze project
  console.log.step('🔍', 'Analyzing project...');

  const analyzer = new AnalyzerService();
  const analysis = await analyzer.analyzeProject(options.projectRoot);

  console.log.success('Project analysis complete');

  // Log analysis summary
  if (analysis.packageInfo) {
    console.log.step('📦', `Package: ${analysis.packageInfo.name}`);
  }
  if (analysis.detectedPatterns.length > 0) {
    console.log.step('🏗️', `Patterns: ${analysis.detectedPatterns.join(', ')}`);
  }
  console.log.step('📁', `Files: ${analysis.directoryStructure.totalFiles}`);

  // Step 2: Select template based on analysis
  console.log.step('📋', 'Selecting template...');

  const { template, reason, detectedFrameworks } = selectTemplate(analysis);

  console.log.success(`Template: ${template.metadata.name}`);
  console.log.info(`  ${reason}`);
  if (detectedFrameworks.length > 0) {
    console.log.info(`  Detected: ${detectedFrameworks.join(', ')}`);
  }

  // Step 3: Select AI model
  let selectedModel = DEFAULT_MODEL_CHOICE;
  const shouldPrompt = !(options.skipPrompts ?? false);
  if (shouldPrompt) {
    console.log.step('🤖', 'Select AI model...');
    selectedModel = await promptModelSelection();
    console.log.success(`Model: ${selectedModel}`);
  }

  // Step 4: Render config with comments
  console.log.step('✨', 'Generating configuration...');

  const projectName = analysis.packageInfo?.name;
  const renderOptions = {
    projectName,
    language: options.language,
    defaultModel: selectedModel,
  };

  const configContent =
    options.format === 'json'
      ? renderConfigAsJson(template, renderOptions)
      : renderConfigAsJs(template, renderOptions);

  // Step 5: Write config file
  console.log.step('💾', 'Writing configuration file...');

  const configPath = await writeConfig(options.projectRoot, configContent, {
    format: options.format,
    raw: true, // Write as-is (already rendered)
  });

  console.log.success(`Configuration saved to ${configPath}`);

  // Success message
  console.log.success('');
  console.log.step('✅', `codingbuddy.config.${options.format} created!`);
  console.log.info('');
  console.log.info('Please review the generated configuration.');
  console.log.info('');
  console.log.info('💡 TIP: Use MCP tools to get config update suggestions');
  console.log.info('   as your project evolves.');

  return {
    success: true,
    configPath,
  };
}

/**
 * Run the init command with AI generation (requires API key)
 */
async function runAiInit(
  options: InitOptions,
  console: ReturnType<typeof createConsoleUtils>,
): Promise<InitResult> {
  // Check for API key
  const apiKey = getApiKey(options);
  if (!apiKey) {
    console.log.error('No API key provided for AI generation.');
    console.log.info(
      'Set ANTHROPIC_API_KEY environment variable or use --api-key option.',
    );
    console.log.info('');
    console.log.info(
      '💡 TIP: Run without --ai flag to use template-based generation',
    );
    console.log.info('   (no API key required)');
    return {
      success: false,
      error:
        'No API key provided. Set ANTHROPIC_API_KEY or remove --ai flag for template mode.',
    };
  }

  // Step 1: Analyze project
  console.log.step('🔍', 'Analyzing project...');

  const analyzer = new AnalyzerService();
  const analysis = await analyzer.analyzeProject(options.projectRoot);

  console.log.success('Project analysis complete');

  // Log analysis summary
  if (analysis.packageInfo) {
    console.log.step('📦', `Package: ${analysis.packageInfo.name}`);
  }
  if (analysis.detectedPatterns.length > 0) {
    console.log.step('🏗️', `Patterns: ${analysis.detectedPatterns.join(', ')}`);
  }
  console.log.step('📁', `Files: ${analysis.directoryStructure.totalFiles}`);

  // Step 2: Generate config with AI
  console.log.step('🤖', 'AI is generating configuration...');

  const generator = new ConfigGenerator({ apiKey });
  const config = await generator.generate(analysis);

  console.log.success('Configuration generated');

  // Step 3: Write config file
  console.log.step('💾', 'Writing configuration file...');

  const configPath = await writeConfig(options.projectRoot, config, {
    format: options.format,
  });

  console.log.success(`Configuration saved to ${configPath}`);

  // Success message
  console.log.success('');
  console.log.step('✅', `codingbuddy.config.${options.format} created!`);
  console.log.info('');
  console.log.info('Please review the generated configuration.');

  return {
    success: true,
    configPath,
  };
}

/**
 * Run the init command
 *
 * @param options - Command options
 * @returns Result of the init command
 */
export async function runInit(options: InitOptions): Promise<InitResult> {
  const console = createConsoleUtils();

  try {
    // Check for existing config
    const existingConfig = await findExistingConfig(options.projectRoot);
    if (existingConfig && !options.force) {
      console.log.error(`Configuration file already exists: ${existingConfig}`);
      console.log.info('Use --force to overwrite.');
      return {
        success: false,
        error: `Configuration file already exists: ${existingConfig}`,
      };
    }

    if (existingConfig && options.force) {
      console.log.warn(`Overwriting existing config: ${existingConfig}`);
    }

    // Choose generation method
    if (options.useAi) {
      return await runAiInit(options, console);
    }

    // Default: template-based generation
    return await runTemplateInit(options, console);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log.error(message);

    return {
      success: false,
      error: message,
    };
  }
}
