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
  spinner: {
    start(message: string): void;
    succeed(message: string): void;
    fail(message: string): void;
    stop(): void;
  };
  formatConfig(config: unknown): string;
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
  dim: '\x1b[2m',
};

/**
 * Spinner frames for animation
 */
const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

/**
 * Create console utilities instance
 */
export function createConsoleUtils(): ConsoleUtils {
  let spinnerInterval: ReturnType<typeof setInterval> | null = null;
  let spinnerMessage = '';
  let frameIndex = 0;

  const clearLine = () => {
    process.stdout.write('\r\x1b[K');
  };

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

  const spinner = {
    start(message: string): void {
      spinnerMessage = message;
      frameIndex = 0;

      // Initial render
      process.stdout.write(`${colors.cyan}${spinnerFrames[frameIndex]}${colors.reset} ${spinnerMessage}`);

      // Start animation
      spinnerInterval = setInterval(() => {
        frameIndex = (frameIndex + 1) % spinnerFrames.length;
        clearLine();
        process.stdout.write(`${colors.cyan}${spinnerFrames[frameIndex]}${colors.reset} ${spinnerMessage}`);
      }, 80);
    },

    succeed(message: string): void {
      if (spinnerInterval) {
        clearInterval(spinnerInterval);
        spinnerInterval = null;
      }
      clearLine();
      process.stdout.write(`${colors.green}✓${colors.reset} ${message}\n`);
    },

    fail(message: string): void {
      if (spinnerInterval) {
        clearInterval(spinnerInterval);
        spinnerInterval = null;
      }
      clearLine();
      process.stderr.write(`${colors.red}✗${colors.reset} ${message}\n`);
    },

    stop(): void {
      if (spinnerInterval) {
        clearInterval(spinnerInterval);
        spinnerInterval = null;
      }
      clearLine();
    },
  };

  const formatConfig = (config: unknown): string => {
    return JSON.stringify(config, null, 2);
  };

  return {
    log,
    spinner,
    formatConfig,
  };
}

/**
 * Default console utils instance
 */
export const consoleUtils = createConsoleUtils();
