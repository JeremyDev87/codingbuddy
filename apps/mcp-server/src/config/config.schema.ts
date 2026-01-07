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
  files: z
    .enum(['kebab-case', 'camelCase', 'PascalCase', 'snake_case'])
    .optional(),
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

export const AIConfigSchema = z.object({
  defaultModel: z.string().optional(),
  primaryAgent: z.string().optional(),
});

export const AutoConfigSchema = z.object({
  maxIterations: z.number().int().min(1).max(10).default(3),
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

  // Technical Configuration
  techStack: TechStackConfigSchema.optional(),
  architecture: ArchitectureConfigSchema.optional(),
  conventions: ConventionsConfigSchema.optional(),
  testStrategy: TestStrategyConfigSchema.optional(),

  // AI Configuration
  ai: AIConfigSchema.optional(),

  // AUTO 모드 설정
  auto: AutoConfigSchema.optional(),

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
export type AIConfig = z.infer<typeof AIConfigSchema>;
export type AutoConfig = z.infer<typeof AutoConfigSchema>;
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
export function isCodingBuddyConfig(
  value: unknown,
): value is CodingBuddyConfig {
  return CodingBuddyConfigSchema.safeParse(value).success;
}
