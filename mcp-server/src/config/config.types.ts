/**
 * CodingBuddy Configuration Types
 *
 * This file re-exports types from config.schema.ts where they are
 * inferred from Zod schemas (single source of truth).
 *
 * All fields are optional to lower the barrier to entry.
 * Users can specify only the settings they need.
 *
 * @example
 * ```javascript
 * // codingbuddy.config.js
 * module.exports = {
 *   language: 'ko',
 *   projectName: 'my-app',
 *   techStack: {
 *     frontend: ['React', 'TypeScript'],
 *     backend: ['NestJS']
 *   }
 * };
 * ```
 *
 * @see {@link CodingBuddyConfig} for the main configuration interface
 * @see {@link TechStackConfig} for technology stack options
 * @see {@link ArchitectureConfig} for architecture settings
 * @see {@link ConventionsConfig} for coding conventions
 * @see {@link TestStrategyConfig} for testing configuration
 */

// Re-export all types from schema (single source of truth)
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

// Re-export type guard
export { isCodingBuddyConfig } from './config.schema';
