import { promises as fs } from 'fs';
import * as path from 'path';
import { Injectable, Logger } from '@nestjs/common';
import {
  isIndentStyle,
  isEndOfLine,
  isCharset,
  parseIndentSize,
  parseTabWidth,
  parseMaxLineLength,
  MAX_CONFIG_FILE_SIZE,
} from '../shared/validation.constants';
import { containsDangerousKeys } from '../shared/security.utils';
import { LRUCache } from '../shared/lru-cache';
import {
  TypeScriptConfigSchema,
  ESLintConfigSchema,
  PrettierConfigSchema,
  MarkdownLintConfigSchema,
} from './conventions.schemas';
import {
  ProjectConventions,
  EditorConfigConventions,
  TypeScriptConventions,
  ESLintConventions,
  PrettierConventions,
  MarkdownLintConventions,
  DEFAULT_EDITOR_CONFIG,
  DEFAULT_TYPESCRIPT_CONFIG,
  DEFAULT_ESLINT_CONFIG,
  DEFAULT_PRETTIER_CONFIG,
  DEFAULT_MARKDOWNLINT_CONFIG,
} from './conventions.types';
import { parseTsConfig } from './config.analyzer';

@Injectable()
export class ConventionsAnalyzer {
  private readonly logger = new Logger(ConventionsAnalyzer.name);
  /**
   * LRU cache for parsed convention results
   * PERF-003: Cache config parsing results to avoid redundant file I/O
   */
  private readonly conventionsCache = new LRUCache<string, ProjectConventions>({
    maxSize: 10, // Cache up to 10 project roots
    ttl: 5 * 60 * 1000, // 5 minutes TTL
  });

  /**
   * File size violation tracking for anomaly detection
   * SEC-005: Detects potential DoS attacks or misconfigurations
   * Tracks violations per file path with timestamps
   */
  private readonly sizeViolations = new Map<string, number[]>();
  private readonly VIOLATION_THRESHOLD = 3; // violations
  private readonly VIOLATION_WINDOW = 60 * 1000; // 1 minute

  /**
   * Get modification times for config files
   * Used for cache invalidation when files change
   */
  private async getConfigMtimes(projectRoot: string): Promise<Map<string, number>> {
    const mtimes = new Map<string, number>();
    const configFiles = [
      'tsconfig.json',
      'eslint.config.js',
      '.eslintrc.json',
      '.eslintrc',
      '.prettierrc',
      '.prettierrc.json',
      '.editorconfig',
      '.markdownlint.json',
    ];

    for (const file of configFiles) {
      const filePath = path.join(projectRoot, file);
      try {
        const stats = await fs.stat(filePath);
        mtimes.set(filePath, stats.mtimeMs);
      } catch {
        // File doesn't exist, skip
      }
    }

    return mtimes;
  }

  /**
   * Track file size violations and detect potential attacks
   * SEC-005: Rate limiting detection for file size violations
   *
   * @param filePath - Path to file that exceeded size limit
   * @param actualSize - Actual file size in bytes
   * @param maxSize - Maximum allowed size in bytes
   */
  private trackSizeViolation(filePath: string, actualSize: number, maxSize: number): void {
    const now = Date.now();

    // Get existing violations for this file
    const violations = this.sizeViolations.get(filePath) || [];

    // Remove violations outside the time window (older than 1 minute)
    const recentViolations = violations.filter(
      timestamp => now - timestamp < this.VIOLATION_WINDOW,
    );

    // Add current violation
    recentViolations.push(now);
    this.sizeViolations.set(filePath, recentViolations);

    // Check if threshold exceeded
    if (recentViolations.length >= this.VIOLATION_THRESHOLD) {
      this.logger.warn(
        'Potential DoS attack or misconfiguration detected: Frequent file size violations',
        {
          filePath,
          violationCount: recentViolations.length,
          timeWindow: `${this.VIOLATION_WINDOW / 1000}s`,
          actualSize,
          maxSize,
          recommendation: 'Review file sizes or increase limit if legitimate use case',
        },
      );

      // Clear violations after warning to prevent log flooding
      this.sizeViolations.delete(filePath);
    }

    // Periodic cleanup: Remove entries with no recent violations
    if (this.sizeViolations.size > 100) {
      for (const [path, timestamps] of this.sizeViolations.entries()) {
        const recent = timestamps.filter(t => now - t < this.VIOLATION_WINDOW);
        if (recent.length === 0) {
          this.sizeViolations.delete(path);
        }
      }
    }
  }

  /**
   * Common error handling pattern for config file parsing
   * CQ-002: Extracted to reduce duplication and ensure consistency
   * SEC-003, ACC-002: Added structured logging for parse failures
   * SEC-004: DoS protection via 1MB file size limit
   *
   * ## DoS Protection Rationale (SEC-004)
   *
   * **Why 1MB limit?**
   * - Legitimate config files (tsconfig.json, .eslintrc, etc.) are typically < 100KB
   * - 1MB provides 10x headroom for complex monorepo configurations
   * - Prevents memory exhaustion attacks via malicious payloads
   *
   * **Attack Vectors Prevented:**
   * 1. **Memory Exhaustion**: Attacker creates 100MB+ config file to OOM the server
   * 2. **CPU DoS**: Large JSON parsing consumes excessive CPU time
   * 3. **Disk I/O Flooding**: Reading massive files blocks event loop
   *
   * **Real-World Sizes:**
   * - Simple tsconfig.json: ~500 bytes - 5KB
   * - Complex monorepo tsconfig.json: 10KB - 50KB
   * - Large ESLint config with many rules: 20KB - 80KB
   * - Edge case legitimate configs: < 200KB
   *
   * **Behavior on Violation:**
   * - Returns default config (fail-safe)
   * - Logs warning with file path and actual size
   * - No error thrown (graceful degradation)
   */
  private async parseConfigWithDefaults<T>(
    filePath: string,
    parser: (content: string, filePath: string) => T | Promise<T>,
    defaultConfig: T,
    configType: string,
  ): Promise<T> {
    try {
      // SEC-004: Limit config file size to prevent DoS attacks
      const stats = await fs.stat(filePath);
      if (stats.size > MAX_CONFIG_FILE_SIZE) {
        this.logger.warn('Config file exceeds size limit', {
          configType,
          filePath,
          size: stats.size,
          maxSize: MAX_CONFIG_FILE_SIZE,
        });

        // SEC-005: Track violations for anomaly detection
        this.trackSizeViolation(filePath, stats.size, MAX_CONFIG_FILE_SIZE);

        return defaultConfig;
      }

      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = await parser(content, filePath);
      return parsed;
    } catch (error) {
      // Log parse failure with structured information for debugging
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorCode = (error as NodeJS.ErrnoException)?.code;

      // Only log if it's not a simple "file not found" case
      if (errorCode !== 'ENOENT') {
        this.logger.warn('Failed to parse config file', {
          configType,
          filePath,
          errorCode,
          errorMessage,
        });
      } else {
        this.logger.debug(`Config file not found, using defaults: ${filePath}`, {
          configType,
          filePath,
        });
      }

      // File doesn't exist or can't be read/parsed, return defaults
      return defaultConfig;
    }
  }

  /**
   * Parse INI content and extract key-value pairs from [*] section
   * CQ-002: Extracted to reduce complexity in parseEditorConfig
   * @param content - Raw .editorconfig file content
   * @returns Key-value pairs from the [*] section
   */
  private parseIniContent(content: string): Record<string, string> {
    const result: Record<string, string> = {};
    const lines = content.split('\n');
    let inSection = false;

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip comments and empty lines
      if (trimmed.startsWith('#') || trimmed.startsWith(';') || !trimmed) {
        continue;
      }

      // Check for [*] section (universal settings)
      if (trimmed === '[*]') {
        inSection = true;
        continue;
      }

      // Check for other sections
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        inSection = false;
        continue;
      }

      // Parse key-value pairs in [*] section
      if (inSection && trimmed.includes('=')) {
        const [key, value] = trimmed.split('=').map(s => s.trim());
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Parse a single key-value pair from EditorConfig
   * CQ-002: Extracted to reduce cyclomatic complexity in parseEditorConfig
   */
  private parseEditorConfigKeyValue(
    config: EditorConfigConventions,
    key: string,
    value: string,
  ): void {
    switch (key) {
      case 'indent_style':
        if (isIndentStyle(value)) {
          config.indent_style = value;
        }
        break;
      case 'indent_size': {
        const parsed = parseIndentSize(value);
        if (parsed.success && parsed.value !== undefined) {
          config.indent_size = parsed.value;
        }
        break;
      }
      case 'tab_width': {
        const parsed = parseTabWidth(value);
        if (parsed.success && parsed.value !== undefined) {
          config.tab_width = parsed.value;
        }
        break;
      }
      case 'end_of_line':
        if (isEndOfLine(value)) {
          config.end_of_line = value;
        }
        break;
      case 'charset':
        if (isCharset(value)) {
          config.charset = value;
        }
        break;
      case 'trim_trailing_whitespace':
        config.trim_trailing_whitespace = value === 'true';
        break;
      case 'insert_final_newline':
        config.insert_final_newline = value === 'true';
        break;
      case 'max_line_length': {
        const parsed = parseMaxLineLength(value);
        if (parsed.success && parsed.value !== undefined) {
          config.max_line_length = parsed.value;
        }
        break;
      }
    }
  }

  /**
   * Parse .editorconfig file
   */
  async parseEditorConfig(filePath: string): Promise<EditorConfigConventions> {
    return this.parseConfigWithDefaults(
      filePath,
      content => {
        const config: EditorConfigConventions = {};

        // Extract all key-value pairs from [*] section
        const keyValuePairs = this.parseIniContent(content);

        // Parse each key-value pair into typed config
        for (const [key, value] of Object.entries(keyValuePairs)) {
          this.parseEditorConfigKeyValue(config, key, value);
        }

        return { ...DEFAULT_EDITOR_CONFIG, ...config };
      },
      DEFAULT_EDITOR_CONFIG,
      'editorconfig',
    );
  }

  /**
   * Parse .markdownlint.json file
   */
  async parseMarkdownLint(filePath: string): Promise<MarkdownLintConventions> {
    return this.parseConfigWithDefaults(
      filePath,
      content => {
        const parsed = JSON.parse(content);

        // Check for prototype pollution before any processing
        const dangerousPath = containsDangerousKeys(parsed);
        if (dangerousPath) {
          this.logger.warn('Dangerous key detected in MarkdownLint config', {
            filePath,
            dangerousPath,
          });
          return DEFAULT_MARKDOWNLINT_CONFIG;
        }

        // Validate with Zod schema
        const validationResult = MarkdownLintConfigSchema.safeParse(parsed);
        if (!validationResult.success) {
          this.logger.warn('MarkdownLint config validation failed', {
            filePath,
            errors: validationResult.error.issues,
          });
          return DEFAULT_MARKDOWNLINT_CONFIG;
        }

        const config = validationResult.data;
        return { ...DEFAULT_MARKDOWNLINT_CONFIG, ...config };
      },
      DEFAULT_MARKDOWNLINT_CONFIG,
      'markdownlint',
    );
  }

  /**
   * Parse tsconfig.json for TypeScript conventions
   */
  async parseTypeScriptConfig(filePath: string): Promise<TypeScriptConventions> {
    return this.parseConfigWithDefaults(
      filePath,
      (content, filePath) => {
        const summary = parseTsConfig(content, filePath);

        if (!summary) {
          return DEFAULT_TYPESCRIPT_CONFIG;
        }

        // Parse and validate JSON
        const parsed = JSON.parse(content);

        // Check for prototype pollution before any processing
        const dangerousPath = containsDangerousKeys(parsed);
        if (dangerousPath) {
          this.logger.warn('Dangerous key detected in TypeScript config', {
            filePath,
            dangerousPath,
          });
          return DEFAULT_TYPESCRIPT_CONFIG;
        }

        // Validate with Zod schema
        const validationResult = TypeScriptConfigSchema.safeParse(parsed);
        if (!validationResult.success) {
          this.logger.warn('TypeScript config validation failed', {
            filePath,
            errors: validationResult.error.issues,
          });
          return DEFAULT_TYPESCRIPT_CONFIG;
        }

        const config = validationResult.data;
        const compilerOptions = config.compilerOptions ?? {};

        return {
          strict: compilerOptions.strict,
          noImplicitAny: compilerOptions.noImplicitAny,
          strictNullChecks: compilerOptions.strictNullChecks,
          strictFunctionTypes: compilerOptions.strictFunctionTypes,
          strictBindCallApply: compilerOptions.strictBindCallApply,
          noImplicitThis: compilerOptions.noImplicitThis,
          alwaysStrict: compilerOptions.alwaysStrict,
          target: compilerOptions.target,
          module: compilerOptions.module,
          moduleResolution: compilerOptions.moduleResolution,
          esModuleInterop: compilerOptions.esModuleInterop,
          paths: compilerOptions.paths,
        };
      },
      DEFAULT_TYPESCRIPT_CONFIG,
      'typescript',
    );
  }

  /**
   * Parse ESLint config for linting conventions
   */
  async parseESLintConfig(filePath: string): Promise<ESLintConventions> {
    return this.parseConfigWithDefaults(
      filePath,
      (content, filePath) => {
        // Determine config type based on filename
        const configType = filePath.includes('eslint.config.') ? 'flat' : 'legacy';

        // For JSON configs, parse directly
        if (filePath.endsWith('.json') || filePath === '.eslintrc' || !filePath.includes('.')) {
          const parsed = JSON.parse(content);

          // Check for prototype pollution before any processing
          const dangerousPath = containsDangerousKeys(parsed);
          if (dangerousPath) {
            this.logger.warn('Dangerous key detected in ESLint config', {
              filePath,
              dangerousPath,
            });
            return {
              configType,
              parser: 'unknown (dangerous keys detected)',
              rules: {},
            };
          }

          // Validate with Zod schema
          const validationResult = ESLintConfigSchema.safeParse(parsed);
          if (!validationResult.success) {
            this.logger.warn('ESLint config validation failed', {
              filePath,
              errors: validationResult.error.issues,
            });
            return {
              configType,
              parser: 'unknown (validation failed)',
              rules: {},
            };
          }

          const config = validationResult.data;
          return {
            configType,
            parser: config.parser,
            parserOptions: config.parserOptions,
            rules: config.rules,
            extends: config.extends,
          };
        }

        // For JS configs, we can't parse without executing
        // Return basic info and note it's a JS config
        return {
          configType,
          parser: 'unknown (JS config)',
          rules: {},
        };
      },
      DEFAULT_ESLINT_CONFIG,
      'eslint',
    );
  }

  /**
   * Parse Prettier config for formatting conventions
   */
  async parsePrettierConfig(filePath: string): Promise<PrettierConventions> {
    return this.parseConfigWithDefaults(
      filePath,
      content => {
        const parsed = JSON.parse(content);

        // Check for prototype pollution before any processing
        const dangerousPath = containsDangerousKeys(parsed);
        if (dangerousPath) {
          this.logger.warn('Dangerous key detected in Prettier config', {
            filePath,
            dangerousPath,
          });
          return DEFAULT_PRETTIER_CONFIG;
        }

        // Validate with Zod schema
        const validationResult = PrettierConfigSchema.safeParse(parsed);
        if (!validationResult.success) {
          this.logger.warn('Prettier config validation failed', {
            filePath,
            errors: validationResult.error.issues,
          });
          return DEFAULT_PRETTIER_CONFIG;
        }

        const config = validationResult.data;
        return { ...DEFAULT_PRETTIER_CONFIG, ...config };
      },
      DEFAULT_PRETTIER_CONFIG,
      'prettier',
    );
  }

  /**
   * Find config file in project root
   */
  private async findConfigFile(projectRoot: string, patterns: string[]): Promise<string | null> {
    for (const pattern of patterns) {
      const filePath = path.join(projectRoot, pattern);
      try {
        await fs.access(filePath);
        return filePath;
      } catch {
        // File doesn't exist, try next pattern
      }
    }
    return null;
  }

  /**
   * Analyze all project conventions
   * PERF-001: Parallelized config file parsing for better performance
   * PERF-003: Added LRU cache with mtime-based invalidation to avoid redundant file I/O
   */
  async analyzeProjectConventions(projectRoot: string): Promise<ProjectConventions> {
    // Verify project root exists
    try {
      await fs.access(projectRoot);
    } catch {
      throw new Error(`Project root does not exist: ${projectRoot}`);
    }

    // Check cache first
    const mtimes = await this.getConfigMtimes(projectRoot);
    const cached = this.conventionsCache.get(projectRoot, mtimes);
    if (cached) {
      this.logger.debug('Returning cached conventions', { projectRoot });
      return cached;
    }

    // Parallelize config file finding and parsing for better performance
    const [typescript, eslint, prettier, editorconfig, markdownlint] = await Promise.all([
      // TypeScript config
      this.findConfigFile(projectRoot, ['tsconfig.json'])
        .then(tsConfigPath => tsConfigPath || path.join(projectRoot, 'tsconfig.json'))
        .then(tsConfigPath => this.parseTypeScriptConfig(tsConfigPath)),

      // ESLint config
      this.findConfigFile(projectRoot, ['eslint.config.js', '.eslintrc.json', '.eslintrc'])
        .then(eslintConfigPath => eslintConfigPath || path.join(projectRoot, 'eslint.config.js'))
        .then(eslintConfigPath => this.parseESLintConfig(eslintConfigPath)),

      // Prettier config
      this.findConfigFile(projectRoot, ['.prettierrc', '.prettierrc.json'])
        .then(prettierConfigPath => prettierConfigPath || path.join(projectRoot, '.prettierrc'))
        .then(prettierConfigPath => this.parsePrettierConfig(prettierConfigPath)),

      // EditorConfig
      this.parseEditorConfig(path.join(projectRoot, '.editorconfig')),

      // MarkdownLint
      this.parseMarkdownLint(path.join(projectRoot, '.markdownlint.json')),
    ]);

    const result: ProjectConventions = {
      projectRoot,
      typescript,
      eslint,
      prettier,
      editorconfig,
      markdownlint,
    };

    // Store in cache with file mtimes
    this.conventionsCache.set(projectRoot, result, mtimes);
    this.logger.debug('Cached conventions', {
      projectRoot,
      mtimes: mtimes.size,
    });

    return result;
  }
}
