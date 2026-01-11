/**
 * Resolution Strategy Interface
 *
 * Defines the contract for agent resolution strategies.
 * Each mode (PLAN, ACT, EVAL) has its own strategy implementation.
 */

import type {
  PrimaryAgentResolutionResult,
  ResolutionContext,
} from '../keyword.types';

/**
 * Project config interface for Primary Agent configuration.
 */
export interface ProjectConfig {
  primaryAgent?: string;
  excludeAgents?: string[];
}

/**
 * Function type for loading project config.
 */
export type GetProjectConfigFn = () => Promise<ProjectConfig | null>;

/**
 * Function type for listing available primary agents.
 */
export type ListPrimaryAgentsFn = () => Promise<string[]>;

/**
 * Context passed to resolution strategies.
 */
export interface StrategyContext {
  readonly prompt: string;
  readonly availableAgents: string[];
  readonly context?: ResolutionContext;
  readonly recommendedActAgent?: string;
}

/**
 * Dependencies injected into resolution strategies.
 */
export interface StrategyDependencies {
  readonly getProjectConfig: GetProjectConfigFn;
  readonly listPrimaryAgents: ListPrimaryAgentsFn;
}

/**
 * Resolution Strategy Interface
 *
 * Implementing classes handle agent resolution for a specific mode.
 *
 * @example
 * class PlanAgentStrategy implements ResolutionStrategy {
 *   resolve(ctx: StrategyContext): Promise<PrimaryAgentResolutionResult> {
 *     // PLAN mode resolution logic
 *   }
 * }
 */
export interface ResolutionStrategy {
  /**
   * Resolve the appropriate agent for the given context.
   *
   * @param ctx - The strategy context containing prompt and available agents
   * @returns The resolution result with agent name, source, confidence, and reason
   */
  resolve(ctx: StrategyContext): Promise<PrimaryAgentResolutionResult>;
}
