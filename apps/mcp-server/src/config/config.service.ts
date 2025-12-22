import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  loadConfig,
  type ConfigLoadResult,
  ConfigLoadError,
} from './config.loader';
import {
  loadIgnoreFile,
  getDefaultIgnorePatterns,
  shouldIgnore,
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
  /** Main configuration from codingbuddy.config.js */
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
    // Default to cwd, can be overridden via setProjectRoot
    this.projectRoot = process.env.CODINGBUDDY_PROJECT_ROOT ?? process.cwd();
  }

  async onModuleInit(): Promise<void> {
    await this.loadProjectConfig();
  }

  /**
   * Set the project root directory
   */
  setProjectRoot(root: string): void {
    this.projectRoot = root;
    this.isLoaded = false;
    this.projectConfig = null;
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
    } catch (error) {
      if (error instanceof ConfigLoadError) {
        this.logger.error(`Config load error: ${error.message}`);
      }
      configResult = { config: {}, source: null, warnings: [] };
    }

    // Load ignore patterns
    const ignoreResult: IgnoreParseResult = await loadIgnoreFile(
      this.projectRoot,
    );
    const allIgnorePatterns = [
      ...getDefaultIgnorePatterns(),
      ...ignoreResult.patterns,
    ];
    if (ignoreResult.source) {
      this.logger.log(`Loaded ignore patterns from: ${ignoreResult.source}`);
    }

    // Load context files
    const contextResult: ContextLoadResult = await loadContextFiles(
      this.projectRoot,
    );
    if (contextResult.source) {
      this.logger.log(
        `Loaded ${contextResult.files.length} context files from: ${contextResult.source}`,
      );
    }
    if (contextResult.errors.length > 0) {
      this.logger.warn(
        `Context loading errors: ${contextResult.errors.join(', ')}`,
      );
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
