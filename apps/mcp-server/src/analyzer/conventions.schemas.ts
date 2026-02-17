/**
 * Zod schemas for validating configuration files
 *
 * These schemas provide runtime validation for parsed JSON config files
 * to prevent unexpected properties and type mismatches.
 */

import { z } from 'zod';

// ============================================================================
// TypeScript Configuration Schema
// ============================================================================

export const TypeScriptConfigSchema = z.object({
  compilerOptions: z
    .object({
      strict: z.boolean().optional(),
      noImplicitAny: z.boolean().optional(),
      strictNullChecks: z.boolean().optional(),
      strictFunctionTypes: z.boolean().optional(),
      strictBindCallApply: z.boolean().optional(),
      noImplicitThis: z.boolean().optional(),
      alwaysStrict: z.boolean().optional(),
      target: z.string().optional(),
      module: z.string().optional(),
      moduleResolution: z.string().optional(),
      esModuleInterop: z.boolean().optional(),
      paths: z.record(z.string(), z.array(z.string())).optional(),
    })
    .passthrough() // Allow additional compiler options
    .optional(),
  extends: z.string().optional(),
  include: z.array(z.string()).optional(),
  exclude: z.array(z.string()).optional(),
});

// ============================================================================
// ESLint Configuration Schema
// ============================================================================

export const ESLintConfigSchema = z.object({
  parser: z.string().optional(),
  parserOptions: z
    .object({
      ecmaVersion: z.union([z.number(), z.literal('latest')]).optional(),
      sourceType: z.enum(['script', 'module']).optional(),
      ecmaFeatures: z
        .object({
          jsx: z.boolean().optional(),
          globalReturn: z.boolean().optional(),
          impliedStrict: z.boolean().optional(),
        })
        .passthrough()
        .optional(),
    })
    .passthrough()
    .optional(),
  rules: z.record(z.string(), z.any()).optional(), // Rules are too dynamic to strictly type
  extends: z.union([z.string(), z.array(z.string())]).optional(),
  plugins: z.array(z.string()).optional(),
  env: z.record(z.string(), z.boolean()).optional(),
});

// ============================================================================
// Prettier Configuration Schema
// ============================================================================

export const PrettierConfigSchema = z.object({
  printWidth: z.number().optional(),
  tabWidth: z.number().optional(),
  useTabs: z.boolean().optional(),
  semi: z.boolean().optional(),
  singleQuote: z.boolean().optional(),
  quoteProps: z.enum(['as-needed', 'consistent', 'preserve']).optional(),
  jsxSingleQuote: z.boolean().optional(),
  trailingComma: z.enum(['none', 'es5', 'all']).optional(),
  bracketSpacing: z.boolean().optional(),
  bracketSameLine: z.boolean().optional(),
  arrowParens: z.enum(['avoid', 'always']).optional(),
  endOfLine: z.enum(['lf', 'crlf', 'cr', 'auto']).optional(),
});

// ============================================================================
// MarkdownLint Configuration Schema
// ============================================================================

export const MarkdownLintConfigSchema = z.record(
  z.string(),
  z.union([
    z.boolean(),
    z
      .object({
        style: z.string().optional(),
      })
      .passthrough(),
  ]),
);
