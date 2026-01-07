/**
 * Console Utilities
 *
 * Provides formatted console output for CLI commands
 */

/**
 * Console utilities interface
 */
export interface ConsoleUtils {
  log: {
    info(message: string): void;
    success(message: string): void;
    warn(message: string): void;
    error(message: string): void;
    step(emoji: string, message: string): void;
  };
}

/**
 * Determine if colors should be enabled based on environment variables
 * @see https://no-color.org/
 * @see https://force-color.org/
 *
 * Priority: FORCE_COLOR > NO_COLOR > default (enabled)
 * - FORCE_COLOR=1 (or any truthy value): force colors on
 * - FORCE_COLOR=0: force colors off
 * - NO_COLOR (any value): disable colors
 */
function shouldDisableColors(): boolean {
  const forceColor = process.env.FORCE_COLOR;

  // FORCE_COLOR takes precedence
  if (forceColor !== undefined) {
    // FORCE_COLOR=0 disables colors
    return forceColor === '0';
  }

  // NO_COLOR disables colors
  return process.env.NO_COLOR !== undefined;
}

/**
 * Get ANSI color codes, respecting NO_COLOR environment variable
 */
function getColors(): Record<string, string> {
  if (shouldDisableColors()) {
    return {
      reset: '',
      green: '',
      yellow: '',
      red: '',
      cyan: '',
    };
  }

  return {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
  };
}

/**
 * Create console utilities instance
 */
export function createConsoleUtils(): ConsoleUtils {
  const colors = getColors();

  const log = {
    info(message: string): void {
      process.stdout.write(`${colors.cyan}ℹ${colors.reset} ${message}\n`);
    },

    success(message: string): void {
      process.stdout.write(`${colors.green}✓${colors.reset} ${message}\n`);
    },

    warn(message: string): void {
      process.stdout.write(`${colors.yellow}⚠${colors.reset} ${message}\n`);
    },

    error(message: string): void {
      process.stderr.write(`${colors.red}✗${colors.reset} ${message}\n`);
    },

    step(emoji: string, message: string): void {
      process.stdout.write(`${emoji} ${message}\n`);
    },
  };

  return { log };
}

/**
 * Default console utils instance
 */
export const consoleUtils = createConsoleUtils();
