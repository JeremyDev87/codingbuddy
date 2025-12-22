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
  /** Anthropic API key */
  apiKey?: string;
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
