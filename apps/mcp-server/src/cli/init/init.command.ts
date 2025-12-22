/**
 * Init Command
 *
 * Main entry point for the `codingbuddy init` command
 */

import { AnalyzerService } from '../../analyzer';
import { ConfigGenerator } from './config.generator';
import { findExistingConfig, writeConfig } from './config.writer';
import { createConsoleUtils } from '../utils/console';
import type { InitOptions, InitResult } from '../cli.types';

/**
 * Get API key from options or environment
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
 * Run the init command
 *
 * @param options - Command options
 * @returns Result of the init command
 */
export async function runInit(options: InitOptions): Promise<InitResult> {
  const console = createConsoleUtils();

  try {
    // Check for API key
    const apiKey = getApiKey(options);
    if (!apiKey) {
      console.log.error('No API key provided.');
      console.log.info(
        'Set ANTHROPIC_API_KEY environment variable or use --api-key option.',
      );
      return {
        success: false,
        error:
          'No API key provided. Set ANTHROPIC_API_KEY environment variable.',
      };
    }

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
      console.log.step(
        '🏗️',
        `Patterns: ${analysis.detectedPatterns.join(', ')}`,
      );
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
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log.error(message);

    return {
      success: false,
      error: message,
    };
  }
}
