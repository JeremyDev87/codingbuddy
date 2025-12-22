#!/usr/bin/env node
/**
 * CodingBuddy CLI
 *
 * Main entry point for CLI commands
 */

import { runInit } from './init';
import type { InitOptions } from './cli.types';

// Package version (injected at build time or read from package.json)
const VERSION = '1.0.0';

/**
 * Parsed command line arguments
 */
export interface ParsedArgs {
  command: 'init' | 'help' | 'version';
  options: Partial<InitOptions>;
}

/**
 * Parse command line arguments
 */
export function parseArgs(args: string[]): ParsedArgs {
  const options: Partial<InitOptions> = {
    projectRoot: process.cwd(),
    format: 'js',
    force: false,
  };

  // Check for help/version flags first
  if (args.includes('--help') || args.includes('-h')) {
    return { command: 'help', options };
  }

  if (args.includes('--version') || args.includes('-v')) {
    return { command: 'version', options };
  }

  // Get command
  const command = args[0];

  if (command !== 'init') {
    return { command: 'help', options };
  }

  // Parse remaining arguments
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--force' || arg === '-f') {
      options.force = true;
    } else if (arg === '--format') {
      const format = args[++i];
      if (format === 'js' || format === 'json') {
        options.format = format;
      }
    } else if (arg === '--api-key') {
      options.apiKey = args[++i];
    } else if (!arg.startsWith('-')) {
      // Positional argument = project root
      options.projectRoot = arg;
    }
  }

  return { command: 'init', options };
}

/**
 * Print usage information
 */
export function printUsage(): void {
  const usage = `
CodingBuddy CLI - AI-powered project configuration generator

Usage:
  codingbuddy init [path] [options]    Initialize configuration
  codingbuddy --help                   Show this help
  codingbuddy --version                Show version

Options:
  --format <js|json>    Output format (default: js)
  --force, -f           Overwrite existing config
  --api-key <key>       Anthropic API key (or set ANTHROPIC_API_KEY env)

Examples:
  codingbuddy init                     Initialize in current directory
  codingbuddy init ./my-project        Initialize in specific directory
  codingbuddy init --format json       Generate JSON config
  codingbuddy init --force             Overwrite existing config

Environment:
  ANTHROPIC_API_KEY    API key for AI generation
`;

  process.stdout.write(usage + '\n');
}

/**
 * Print version
 */
export function printVersion(): void {
  process.stdout.write(`codingbuddy v${VERSION}\n`);
}

/**
 * Main CLI entry point
 */
export async function main(
  args: string[] = process.argv.slice(2),
): Promise<void> {
  const { command, options } = parseArgs(args);

  switch (command) {
    case 'help':
      printUsage();
      break;

    case 'version':
      printVersion();
      break;

    case 'init': {
      const result = await runInit(options as InitOptions);
      if (!result.success) {
        process.exitCode = 1;
      }
      break;
    }
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exitCode = 1;
  });
}
