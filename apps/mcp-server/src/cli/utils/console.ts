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
 * ANSI color codes
 */
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

/**
 * Create console utilities instance
 */
export function createConsoleUtils(): ConsoleUtils {
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
