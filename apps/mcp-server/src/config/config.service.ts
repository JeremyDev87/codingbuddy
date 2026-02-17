import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { existsSync, statSync } from 'fs';
import { stat, realpath } from 'fs/promises';
import * as path from 'path';
import {
  loadConfig,
  findProjectRoot,
  clearProjectRootCache,
  type ConfigLoadResult,
  ConfigLoadError,
} from './config.loader';
import {
  loadIgnoreFile,
  getDefaultIgnorePatterns,
  shouldIgnore,
  clearRegexCache,
  type IgnoreParseResult,
} from './ignore.parser';
import {
  loadContextFiles,
  formatContextForAI,
  type ContextLoadResult,
  type ContextFile,
} from './context.loader';
import type { CodingBuddyConfig } from './config.schema';

/**
 * Complete project configuration including all loaded data
 */
export interface ProjectConfig {
  /** Main configuration from codingbuddy.config.json */
  settings: CodingBuddyConfig;
  /** Ignore patterns from .codingignore + defaults */
  ignorePatterns: string[];
  /** Context files from .codingbuddy/ */
  contextFiles: ContextFile[];
  /** Metadata about loaded sources */
  sources: {
    config: string | null;
    ignore: string | null;
    context: string | null;
  };
}

@Injectable()
export class ConfigService implements OnModuleInit {
  private readonly logger = new Logger(ConfigService.name);
  private projectRoot: string;
  private projectConfig: ProjectConfig | null = null;
  private isLoaded = false;

  constructor() {
    // Priority: env var (validated) > auto-detect from cwd
    // Auto-detection searches for codingbuddy.config.* or package.json
    // starting from cwd and traversing up to parent directories
    this.projectRoot = this.resolveProjectRoot();
  }

  /**
   * Resolve project root with validation
   * Priority: validated env var > auto-detect
   */
  private resolveProjectRoot(): string {
    const envRoot = process.env.CODINGBUDDY_PROJECT_ROOT;

    if (envRoot) {
      const normalizedPath = path.resolve(envRoot);

      // Validate: path must exist and be a directory
      if (existsSync(normalizedPath)) {
        try {
          const stat = statSync(normalizedPath);
          if (stat.isDirectory()) {
            this.logger.log(`Using project root from CODINGBUDDY_PROJECT_ROOT: ${normalizedPath}`);
            return normalizedPath;
          }
          this.logger.warn(
            `CODINGBUDDY_PROJECT_ROOT is not a directory: ${normalizedPath}, falling back to auto-detect`,
          );
        } catch {
          this.logger.warn(
            `Failed to stat CODINGBUDDY_PROJECT_ROOT: ${normalizedPath}, falling back to auto-detect`,
          );
        }
      } else {
        this.logger.warn(
          `CODINGBUDDY_PROJECT_ROOT path does not exist: ${normalizedPath}, falling back to auto-detect`,
        );
      }
    }

    return findProjectRoot();
  }

  async onModuleInit(): Promise<void> {
    await this.loadProjectConfig();
  }

  /**
   * Set the project root directory without validation
   * @deprecated Use setProjectRootAndReload() instead for proper validation and config reload.
   * This method bypasses security validations and should only be used for testing.
   * @param root - Path to the project root directory
   */
  setProjectRoot(root: string): void {
    this.projectRoot = root;
    this.isLoaded = false;
    this.projectConfig = null;
  }

  /**
   * Set the project root directory with validation and reload config
   * @param root - Path to the project root directory
   * @throws Error if path does not exist, is not a directory, or contains invalid characters
   */
  async setProjectRootAndReload(root: string): Promise<void> {
    // Security: Reject null bytes (null byte injection attack)
    if (root.includes('\x00')) {
      throw new Error('Path contains null bytes (possible null byte injection)');
    }

    const normalizedPath = path.resolve(root);

    // Validate: path must exist and be a directory (using async operations)
    let pathStat;
    try {
      pathStat = await stat(normalizedPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`Project root does not exist: ${normalizedPath}`);
      }
      throw error;
    }

    if (!pathStat.isDirectory()) {
      throw new Error(`Project root is not a directory: ${normalizedPath}`);
    }

    // Security: Resolve symlinks to get the real path
    // This prevents symlink attacks where a symlink points to sensitive directories
    let resolvedPath: string;
    try {
      resolvedPath = await realpath(normalizedPath);
    } catch {
      // If realpath fails, use normalized path but log warning
      this.logger.warn(`Failed to resolve symlinks for ${normalizedPath}, using as-is`);
      resolvedPath = normalizedPath;
    }

    // Clear the findProjectRoot cache to prevent stale results
    clearProjectRootCache();

    // Set new project root (use resolved real path)
    this.projectRoot = resolvedPath;
    this.isLoaded = false;
    this.projectConfig = null;

    // Reload config from new location
    await this.loadProjectConfig();

    this.logger.log(`Project root changed to: ${resolvedPath}`);
  }

  /**
   * Get the current project root
   */
  getProjectRoot(): string {
    return this.projectRoot;
  }

  /**
   * Load all project configuration
   */
  async loadProjectConfig(): Promise<ProjectConfig> {
    // Clear cached regex patterns to prevent stale patterns after project root change
    clearRegexCache();

    this.logger.log(`Loading project config from: ${this.projectRoot}`);

    // Load config file
    let configResult: ConfigLoadResult;
    try {
      configResult = await loadConfig(this.projectRoot);
      if (configResult.source) {
        this.logger.log(`Loaded config from: ${configResult.source}`);
      } else {
        this.logger.log('No config file found, using defaults');
      }
      // Log deprecation warnings and other config warnings
      if (configResult.warnings.length > 0) {
        for (const warning of configResult.warnings) {
          this.logger.warn(warning);
        }
      }
    } catch (error) {
      if (error instanceof ConfigLoadError) {
        this.logger.error(`Config load error: ${error.message}`);
      }
      configResult = { config: {}, source: null, warnings: [] };
    }

    // Load ignore patterns
    const ignoreResult: IgnoreParseResult = await loadIgnoreFile(this.projectRoot);
    const allIgnorePatterns = [...getDefaultIgnorePatterns(), ...ignoreResult.patterns];
    if (ignoreResult.source) {
      this.logger.log(`Loaded ignore patterns from: ${ignoreResult.source}`);
    }

    // Load context files
    const contextResult: ContextLoadResult = await loadContextFiles(this.projectRoot);
    if (contextResult.source) {
      this.logger.log(
        `Loaded ${contextResult.files.length} context files from: ${contextResult.source}`,
      );
    }
    if (contextResult.errors.length > 0) {
      this.logger.warn(`Context loading errors: ${contextResult.errors.join(', ')}`);
    }

    this.projectConfig = {
      settings: configResult.config,
      ignorePatterns: allIgnorePatterns,
      contextFiles: contextResult.files,
      sources: {
        config: configResult.source,
        ignore: ignoreResult.source,
        context: contextResult.source,
      },
    };

    this.isLoaded = true;
    return this.projectConfig;
  }

  /**
   * Get the loaded project configuration
   */
  async getProjectConfig(): Promise<ProjectConfig> {
    if (!this.isLoaded || !this.projectConfig) {
      return this.loadProjectConfig();
    }
    return this.projectConfig;
  }

  /**
   * Get the main settings from config file
   */
  async getSettings(): Promise<CodingBuddyConfig> {
    const config = await this.getProjectConfig();
    return config.settings;
  }

  /**
   * Get all ignore patterns
   */
  async getIgnorePatterns(): Promise<string[]> {
    const config = await this.getProjectConfig();
    return config.ignorePatterns;
  }

  /**
   * Check if a path should be ignored
   */
  async shouldIgnorePath(relativePath: string): Promise<boolean> {
    const patterns = await this.getIgnorePatterns();
    return shouldIgnore(relativePath, patterns);
  }

  /**
   * Get all context files
   */
  async getContextFiles(): Promise<ContextFile[]> {
    const config = await this.getProjectConfig();
    return config.contextFiles;
  }

  /**
   * Get formatted context for AI consumption
   */
  async getFormattedContext(): Promise<string> {
    const files = await this.getContextFiles();
    return formatContextForAI(files);
  }

  /**
   * Get the response language from config
   */
  async getLanguage(): Promise<string | undefined> {
    const settings = await this.getSettings();
    return settings.language;
  }

  /**
   * Get context document limits for DoS prevention.
   * Returns configured values or defaults.
   */
  async getContextLimits(): Promise<{
    maxArrayItems: number;
    maxItemLength: number;
  }> {
    const settings = await this.getSettings();
    return {
      maxArrayItems: settings.context?.maxArrayItems ?? 100,
      maxItemLength: settings.context?.maxItemLength ?? 2000,
    };
  }

  /**
   * Reload configuration from disk
   */
  async reload(): Promise<ProjectConfig> {
    this.isLoaded = false;
    this.projectConfig = null;
    return this.loadProjectConfig();
  }

  /**
   * Check if configuration has been loaded
   */
  isConfigLoaded(): boolean {
    return this.isLoaded;
  }
}
