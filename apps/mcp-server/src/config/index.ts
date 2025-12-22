// ============================================================================
// Types (inferred from Zod schemas - single source of truth)
// ============================================================================

export type {
  CodingBuddyConfig,
  TechStackConfig,
  ArchitectureConfig,
  ConventionsConfig,
  TestStrategyConfig,
  TechDetail,
  ArchitectureLayer,
  NamingConvention,
} from './config.schema';

// ============================================================================
// Schemas
// ============================================================================

export {
  CodingBuddyConfigSchema,
  TechStackConfigSchema,
  ArchitectureConfigSchema,
  ConventionsConfigSchema,
  TestStrategyConfigSchema,
  TechDetailSchema,
  ArchitectureLayerSchema,
  NamingConventionSchema,
} from './config.schema';

// ============================================================================
// Schema Validation
// ============================================================================

export type { ValidationResult, ValidationError } from './config.schema';

export {
  validateConfig,
  parseConfig,
  isCodingBuddyConfig,
} from './config.schema';

// ============================================================================
// Config Loader
// ============================================================================

export type { ConfigLoadResult } from './config.loader';

export {
  CONFIG_FILE_NAMES,
  ConfigLoadError,
  findConfigFile,
  loadConfig,
  hasConfigFile,
} from './config.loader';

// ============================================================================
// Ignore Parser
// ============================================================================

export type { IgnoreParseResult } from './ignore.parser';

export {
  IGNORE_FILE_NAME,
  parseIgnoreContent,
  loadIgnoreFile,
  patternToRegex,
  shouldIgnore,
  filterIgnored,
  getDefaultIgnorePatterns,
} from './ignore.parser';

// ============================================================================
// Context Loader
// ============================================================================

export type {
  ContextFile,
  ContextFileType,
  ContextLoadResult,
} from './context.loader';

export {
  CONTEXT_DIR_NAME,
  KNOWN_SUBDIRS,
  loadContextFiles,
  formatContextForAI,
  hasContextDir,
} from './context.loader';

// ============================================================================
// Service & Module
// ============================================================================

export type { ProjectConfig } from './config.service';

export { ConfigService } from './config.service';
export { CodingBuddyConfigModule } from './config.module';
