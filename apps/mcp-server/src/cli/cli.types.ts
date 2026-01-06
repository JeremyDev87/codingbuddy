/**
 * CLI Types
 *
 * Type definitions for CLI commands and utilities
 */

/**
 * CLI command handler function
 */
export type CommandHandler = (args: string[]) => Promise<void>;

/**
 * CLI command definition
 */
export interface CliCommand {
  name: string;
  description: string;
  handler: CommandHandler;
}

/**
 * Init command options
 */
export interface InitOptions {
  /** Project root directory */
  projectRoot: string;
  /** Output format for config file */
  format: 'js' | 'json';
  /** Force overwrite existing config */
  force: boolean;
  /** Use AI to generate config (requires API key) */
  useAi?: boolean;
  /** Anthropic API key (only used with --ai flag) */
  apiKey?: string;
  /** Response language for AI and comments */
  language?: string;
  /**
   * Skip interactive prompts (for CI environments)
   * @default false - When false or undefined, interactive prompts are shown
   */
  skipPrompts?: boolean;
}

/**
 * Init command result
 */
export interface InitResult {
  success: boolean;
  configPath?: string;
  error?: string;
}

/**
 * Console output levels
 */
export type LogLevel = 'info' | 'success' | 'warn' | 'error';
