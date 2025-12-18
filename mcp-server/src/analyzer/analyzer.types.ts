/**
 * Project Analyzer Types
 *
 * Type definitions for project analysis results
 */

/**
 * Complete project analysis result
 */
export interface ProjectAnalysis {
  /** Package.json information (null if not found) */
  packageInfo: PackageInfo | null;
  /** Directory structure analysis */
  directoryStructure: DirectoryAnalysis;
  /** Config files summary */
  configFiles: ConfigFilesSummary;
  /** Sampled source code files */
  codeSamples: CodeSample[];
  /** Detected architecture/framework patterns */
  detectedPatterns: string[];
}

/**
 * Parsed package.json information
 */
export interface PackageInfo {
  /** Package name */
  name: string;
  /** Package version */
  version: string;
  /** Package description */
  description?: string;
  /** Production dependencies */
  dependencies: Record<string, string>;
  /** Development dependencies */
  devDependencies: Record<string, string>;
  /** NPM scripts */
  scripts: Record<string, string>;
  /** Module type */
  type?: 'module' | 'commonjs';
  /** Detected frameworks */
  detectedFrameworks: DetectedFramework[];
}

/**
 * Detected framework/library information
 */
export interface DetectedFramework {
  /** Framework name */
  name: string;
  /** Framework category */
  category: FrameworkCategory;
  /** Version from package.json */
  version: string;
}

/**
 * Framework categories
 */
export type FrameworkCategory =
  | 'frontend'
  | 'backend'
  | 'fullstack'
  | 'testing'
  | 'build'
  | 'linting'
  | 'styling'
  | 'database'
  | 'other';

/**
 * Directory structure analysis result
 */
export interface DirectoryAnalysis {
  /** Root-level directories */
  rootDirs: string[];
  /** Root-level files */
  rootFiles: string[];
  /** All file paths (relative to project root) */
  allFiles: string[];
  /** Detected architecture patterns */
  patterns: ArchitecturePattern[];
  /** Total file count (excluding ignored) */
  totalFiles: number;
  /** Total directory count (excluding ignored) */
  totalDirs: number;
}

/**
 * Detected architecture pattern
 */
export interface ArchitecturePattern {
  /** Pattern name */
  name: string;
  /** Confidence level (0-1) */
  confidence: number;
  /** Directories that indicate this pattern */
  indicators: string[];
}

/**
 * Summary of config files found in the project
 */
export interface ConfigFilesSummary {
  /** TypeScript config summary */
  typescript?: TsConfigSummary;
  /** ESLint config summary */
  eslint?: EslintSummary;
  /** Prettier config summary */
  prettier?: PrettierSummary;
  /** List of all detected config files */
  detected: string[];
}

/**
 * TypeScript configuration summary
 */
export interface TsConfigSummary {
  /** Source file path */
  path: string;
  /** Strict mode enabled */
  strict?: boolean;
  /** Target ES version */
  target?: string;
  /** Module system */
  module?: string;
  /** Path aliases configured */
  hasPathAliases: boolean;
}

/**
 * ESLint configuration summary
 */
export interface EslintSummary {
  /** Source file path */
  path: string;
  /** Config format (legacy or flat) */
  format: 'legacy' | 'flat';
  /** Extended configs */
  extends?: string[];
  /** Plugins used */
  plugins?: string[];
}

/**
 * Prettier configuration summary
 */
export interface PrettierSummary {
  /** Source file path */
  path: string;
  /** Tab width */
  tabWidth?: number;
  /** Use semicolons */
  semi?: boolean;
  /** Use single quotes */
  singleQuote?: boolean;
  /** Trailing commas */
  trailingComma?: 'none' | 'es5' | 'all';
}

/**
 * Sampled source code file
 */
export interface CodeSample {
  /** Relative file path */
  path: string;
  /** Detected programming language */
  language: string;
  /** File category */
  category: CodeCategory;
  /** Preview content (first N lines) */
  preview: string;
  /** Total line count */
  lineCount: number;
}

/**
 * Source code file categories
 */
export type CodeCategory =
  | 'component'
  | 'page'
  | 'util'
  | 'hook'
  | 'api'
  | 'service'
  | 'model'
  | 'test'
  | 'config'
  | 'other';
