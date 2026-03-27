import { z } from 'zod';

// ============================================================================
// Deep (Optional) Schemas
// ============================================================================

export const TechDetailSchema = z.object({
  version: z.string().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  notes: z.string().optional(),
});

export const ArchitectureLayerSchema = z.object({
  name: z.string(),
  path: z.string(),
  description: z.string().optional(),
  dependencies: z.array(z.string()).optional(),
});

export const NamingConventionSchema = z.object({
  files: z.enum(['kebab-case', 'camelCase', 'PascalCase', 'snake_case']).optional(),
  components: z.enum(['PascalCase', 'kebab-case']).optional(),
  functions: z.enum(['camelCase', 'snake_case']).optional(),
  variables: z.enum(['camelCase', 'snake_case']).optional(),
  constants: z.enum(['UPPER_SNAKE_CASE', 'camelCase']).optional(),
  types: z.enum(['PascalCase']).optional(),
  interfaces: z.enum(['PascalCase', 'IPascalCase']).optional(),
});

// ============================================================================
// Nested Schemas (Main Configuration Sections)
// ============================================================================

export const TechStackConfigSchema = z.object({
  languages: z.array(z.string()).optional(),
  frontend: z.array(z.string()).optional(),
  backend: z.array(z.string()).optional(),
  database: z.array(z.string()).optional(),
  infrastructure: z.array(z.string()).optional(),
  tools: z.array(z.string()).optional(),
  details: z.record(z.string(), TechDetailSchema).optional(),
});

export const ArchitectureConfigSchema = z.object({
  pattern: z.string().optional(),
  structure: z.array(z.string()).optional(),
  componentStyle: z.enum(['flat', 'grouped', 'feature-based']).optional(),
  layers: z.array(ArchitectureLayerSchema).optional(),
});

export const ConventionsConfigSchema = z.object({
  style: z.string().optional(),
  naming: NamingConventionSchema.optional(),
  importOrder: z.array(z.string()).optional(),
  maxLineLength: z.number().int().positive().optional(),
  semicolons: z.boolean().optional(),
  quotes: z.enum(['single', 'double']).optional(),
  rules: z.record(z.string(), z.unknown()).optional(),
});

export const TestStrategyConfigSchema = z.object({
  approach: z.enum(['tdd', 'bdd', 'test-after', 'mixed']).optional(),
  frameworks: z.array(z.string()).optional(),
  coverage: z.number().min(0).max(100).optional(),
  unitTestPattern: z.enum(['colocated', 'separate']).optional(),
  e2eDirectory: z.string().optional(),
  mockingStrategy: z.enum(['minimal', 'extensive', 'no-mocks']).optional(),
});

const AIConfigSchema = z.object({
  defaultModel: z.string().optional(),
  primaryAgent: z.string().optional(),
  /**
   * Override default dispatch strength for parallel specialist agents.
   * - "auto": Always dispatch specialists automatically
   * - "recommend": Suggest dispatch (default for PLAN/ACT)
   * - "skip": Do not dispatch specialists
   *
   * Default varies by mode: EVAL="auto", PLAN/ACT="recommend"
   *
   * @example
   * ```javascript
   * ai: {
   *   dispatchStrength: 'auto',
   * }
   * ```
   */
  dispatchStrength: z.enum(['auto', 'recommend', 'skip']).optional(),
  /**
   * List of agent names to exclude from automatic resolution.
   * Useful for project-specific exclusions (e.g., exclude mobile-developer for backend-only projects).
   *
   * @example
   * ```javascript
   * ai: {
   *   primaryAgent: 'agent-architect',
   *   excludeAgents: ['mobile-developer', 'frontend-developer'],
   * }
   * ```
   */
  excludeAgents: z.array(z.string()).optional(),
  /**
   * Maximum number of skills to auto-include in parse_mode response.
   * Limits response size while providing relevant skill content.
   * Default: 3
   *
   * @example
   * ```javascript
   * ai: {
   *   maxIncludedSkills: 5,
   * }
   * ```
   */
  maxIncludedSkills: z.number().int().min(0).max(10).optional(),
  /**
   * Enable/disable automatic plan-reviewer gate after PLAN completion.
   * When enabled, parse_mode PLAN response includes a planReviewGate recommendation.
   * Default: true (enabled)
   *
   * @example
   * ```javascript
   * ai: {
   *   planReviewGate: false, // disable plan review gate
   * }
   * ```
   */
  planReviewGate: z.boolean().optional(),
  /**
   * Enable/disable agent discussion integration in EVAL mode.
   * When enabled, parse_mode EVAL response includes agentDiscussion config
   * for structuring specialist findings as AgentOpinion protocol.
   * Default: true (enabled)
   */
  agentDiscussion: z.boolean().optional(),
});

const AutoConfigSchema = z.object({
  maxIterations: z.number().int().min(1).max(10).default(3),
});

/**
 * Context document configuration for DoS prevention limits.
 * Limits array sizes and string lengths to prevent memory exhaustion.
 */
const ContextConfigSchema = z.object({
  /** Maximum items per array (decisions, notes, etc.). Default: 100 */
  maxArrayItems: z.number().int().min(10).max(1000).default(100),
  /** Maximum characters per array item string. Default: 2000 */
  maxItemLength: z.number().int().min(100).max(10000).default(2000),
});

// ============================================================================
// Main Configuration Schema
// ============================================================================

export const CodingBuddyConfigSchema = z.object({
  // Basic Settings
  language: z.string().optional(),
  projectName: z.string().optional(),
  description: z.string().optional(),
  repository: z.string().url().optional(),

  // Feature Flags
  eco: z.boolean().default(true).optional(),
  tui: z.boolean().default(true).optional(),
  tone: z.enum(['casual', 'formal']).default('casual').optional(),

  // Technical Configuration
  techStack: TechStackConfigSchema.optional(),
  architecture: ArchitectureConfigSchema.optional(),
  conventions: ConventionsConfigSchema.optional(),
  testStrategy: TestStrategyConfigSchema.optional(),

  // AI Configuration
  ai: AIConfigSchema.optional(),

  // AUTO mode settings
  auto: AutoConfigSchema.optional(),

  // Context document limits (DoS prevention)
  context: ContextConfigSchema.optional(),

  // Upstream Repository Mapping (for cross-repo issue creation)
  upstreamRepos: z.record(z.string(), z.string()).optional(),

  // Additional Context
  keyFiles: z.array(z.string()).optional(),
  avoid: z.array(z.string()).optional(),
  custom: z.record(z.string(), z.unknown()).optional(),
});

// ============================================================================
// Inferred Types from Schemas (Single Source of Truth)
// ============================================================================

export type TechDetail = z.infer<typeof TechDetailSchema>;
export type ArchitectureLayer = z.infer<typeof ArchitectureLayerSchema>;
export type NamingConvention = z.infer<typeof NamingConventionSchema>;
export type TechStackConfig = z.infer<typeof TechStackConfigSchema>;
export type ArchitectureConfig = z.infer<typeof ArchitectureConfigSchema>;
export type ConventionsConfig = z.infer<typeof ConventionsConfigSchema>;
export type TestStrategyConfig = z.infer<typeof TestStrategyConfigSchema>;
export type CodingBuddyConfig = z.infer<typeof CodingBuddyConfigSchema>;

// ============================================================================
// Validation Functions
// ============================================================================

export interface ValidationResult {
  success: boolean;
  data?: CodingBuddyConfig;
  errors?: ValidationError[];
}

export interface ValidationError {
  path: string;
  message: string;
}

/**
 * Validate a configuration object against the schema
 */
export function validateConfig(config: unknown): ValidationResult {
  const result = CodingBuddyConfigSchema.safeParse(config);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  const errors: ValidationError[] = result.error.issues.map(issue => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));

  return {
    success: false,
    errors,
  };
}

/**
 * Parse and validate a configuration, throwing on error
 */
export function parseConfig(config: unknown): CodingBuddyConfig {
  return CodingBuddyConfigSchema.parse(config);
}

/**
 * Type guard using Zod validation
 */
export function isCodingBuddyConfig(value: unknown): value is CodingBuddyConfig {
  return CodingBuddyConfigSchema.safeParse(value).success;
}
