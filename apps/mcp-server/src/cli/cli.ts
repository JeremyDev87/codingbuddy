#!/usr/bin/env node
/**
 * CodingBuddy CLI
 *
 * Main entry point for CLI commands
 */

import { runInit } from './init';
import { bootstrap } from '../main';
import { getPackageVersion } from '../shared/version.utils';
import type {
  InitOptions,
  TuiOptions,
  InstallOptions,
  UninstallOptions,
  SearchOptions,
  UpdateOptions,
} from './cli.types';

/**
 * Parsed command line arguments
 */
export interface ParsedArgs {
  command:
    | 'init'
    | 'install'
    | 'plugins'
    | 'uninstall'
    | 'search'
    | 'update'
    | 'mcp'
    | 'tui'
    | 'help'
    | 'version';
  options: Partial<InitOptions> &
    Partial<TuiOptions> &
    Partial<InstallOptions> &
    Partial<UninstallOptions> &
    Partial<SearchOptions> &
    Partial<UpdateOptions>;
}

/**
 * Parse command line arguments
 */
export function parseArgs(args: string[]): ParsedArgs {
  const options: Partial<InitOptions> = {
    projectRoot: process.cwd(),
    force: false,
    useDefaults: false,
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

  if (command === 'mcp') {
    return { command: 'mcp', options };
  }

  if (command === 'tui') {
    const restart = args.includes('--restart');
    return { command: 'tui', options: { ...options, restart } };
  }

  if (command === 'install') {
    const installSource = args[1];
    const installForce = args.includes('--force') || args.includes('-f');
    return {
      command: 'install',
      options: { ...options, installSource, installForce },
    };
  }

  if (command === 'plugins') {
    return { command: 'plugins', options };
  }

  if (command === 'search') {
    const searchQuery = args.slice(1).join(' ');
    return {
      command: 'search',
      options: { ...options, searchQuery },
    };
  }

  if (command === 'uninstall') {
    const uninstallName = args[1];
    const uninstallYes = args.includes('--yes') || args.includes('-y');
    return {
      command: 'uninstall',
      options: { ...options, uninstallName, uninstallYes },
    };
  }

  if (command === 'update') {
    const updatePluginName = args[1];
    return {
      command: 'update',
      options: { ...options, updatePluginName },
    };
  }

  if (command !== 'init') {
    return { command: 'help', options };
  }

  // Parse remaining arguments
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--force' || arg === '-f') {
      options.force = true;
    } else if (arg === '--yes' || arg === '-y') {
      options.useDefaults = true;
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
  codingbuddy install <git-url>        Install a plugin from git repository
  codingbuddy search <query>           Search plugins in the registry
  codingbuddy plugins                  List installed plugins
  codingbuddy update [name]            Check and update outdated plugins
  codingbuddy uninstall <name>         Uninstall a plugin
  codingbuddy mcp                      Start MCP server (stdio mode)
  codingbuddy tui                      Monitor agent execution in real-time
  codingbuddy tui --restart            Restart TUI client (fixes blank screen)
  codingbuddy --help                   Show this help
  codingbuddy --version                Show version

Options:
  --force, -f           Overwrite existing config / force install
  --yes, -y             Accept detected defaults (quick setup)
  --api-key <key>       Anthropic API key (or set ANTHROPIC_API_KEY env)

Examples:
  codingbuddy init                     Initialize in current directory
  codingbuddy init ./my-project        Initialize in specific directory
  codingbuddy init --force             Overwrite existing config
  codingbuddy install github:user/repo Install a community plugin
  codingbuddy search nextjs            Search for Next.js plugins
  codingbuddy plugins                  List all installed plugins
  codingbuddy update                    Check all plugins for updates
  codingbuddy update my-plugin         Update a specific plugin
  codingbuddy uninstall my-plugin      Remove a plugin
  codingbuddy uninstall my-plugin -y   Remove without confirmation
  codingbuddy mcp                      Start MCP server for AI assistants

Note:
  Configuration is always saved as codingbuddy.config.json (JSON format only).
  This ensures compatibility with both CommonJS and ESM projects.

Environment:
  ANTHROPIC_API_KEY    API key for AI generation
  MCP_TRANSPORT        MCP transport mode: stdio (default) or sse
  PORT                 HTTP port for SSE mode (default: 3000)
`;

  process.stdout.write(usage + '\n');
}

/**
 * Print version
 */
export function printVersion(): void {
  process.stdout.write(`codingbuddy v${getPackageVersion()}\n`);
}

/**
 * Print security warning for API key in CLI arguments
 */
function printApiKeyWarning(): void {
  const warning = `
⚠️  Security Warning: API key passed via command line argument.
    This may expose your key in shell history and process lists.
    Consider using the ANTHROPIC_API_KEY environment variable instead:

    export ANTHROPIC_API_KEY="your-key-here"
    codingbuddy init
`;
  process.stderr.write(warning);
}

/**
 * Main CLI entry point
 */
export async function main(args: string[] = process.argv.slice(2)): Promise<void> {
  const { command, options } = parseArgs(args);

  // Security warning for API key in CLI args
  if (options.apiKey) {
    printApiKeyWarning();
  }

  switch (command) {
    case 'help':
      printUsage();
      break;

    case 'version':
      printVersion();
      break;

    case 'mcp':
      await bootstrap();
      break;

    case 'tui': {
      const { runTui } = await import('./run-tui');
      await runTui({ restart: options.restart ?? false });
      break;
    }

    case 'search': {
      const { runSearch } = await import('./plugin/search.command');
      if (!options.searchQuery) {
        process.stderr.write('Error: Missing query. Usage: codingbuddy search <query>\n');
        process.exitCode = 1;
        break;
      }
      const searchResult = await runSearch({ query: options.searchQuery });
      if (!searchResult.success) {
        process.exitCode = 1;
      }
      break;
    }

    case 'install': {
      const { runInstall } = await import('./plugin/install.command');
      if (!options.installSource) {
        process.stderr.write('Error: Missing git URL. Usage: codingbuddy install <git-url>\n');
        process.exitCode = 1;
        break;
      }
      const installResult = await runInstall({
        source: options.installSource,
        projectRoot: options.projectRoot ?? process.cwd(),
        force: options.installForce ?? false,
      });
      if (!installResult.success) {
        process.exitCode = 1;
      }
      break;
    }

    case 'plugins': {
      const { runPlugins } = await import('./plugin/plugins.command');
      const pluginsResult = runPlugins({
        projectRoot: options.projectRoot ?? process.cwd(),
      });
      if (!pluginsResult.success) {
        process.exitCode = 1;
      }
      break;
    }

    case 'uninstall': {
      const { runUninstall } = await import('./plugin/uninstall.command');
      if (!options.uninstallName) {
        process.stderr.write('Error: Missing plugin name. Usage: codingbuddy uninstall <name>\n');
        process.exitCode = 1;
        break;
      }
      const uninstallResult = runUninstall({
        pluginName: options.uninstallName,
        projectRoot: options.projectRoot ?? process.cwd(),
        yes: options.uninstallYes ?? false,
      });
      if (!uninstallResult.success && !uninstallResult.confirmationRequired) {
        process.exitCode = 1;
      }
      if (uninstallResult.confirmationRequired) {
        process.stderr.write('Confirmation required. Use --yes or -y to skip.\n');
        process.exitCode = 1;
      }
      break;
    }

    case 'update': {
      const { runUpdate } = await import('./plugin/update.command');
      const updateResult = await runUpdate({
        projectRoot: options.projectRoot ?? process.cwd(),
        pluginName: options.updatePluginName,
      });
      if (!updateResult.success) {
        process.exitCode = 1;
      }
      break;
    }

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
