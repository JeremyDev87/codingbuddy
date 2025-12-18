// Types (inferred from Zod schemas - single source of truth)
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

// Schemas
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

// Validation
export type { ValidationResult, ValidationError } from './config.schema';

export {
  validateConfig,
  parseConfig,
  getDefaultConfig,
  mergeWithDefaults,
  isCodingBuddyConfig,
} from './config.schema';
