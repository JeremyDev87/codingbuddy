/**
 * Shared Test Utilities for Strategy Tests
 *
 * Provides common factory functions to reduce duplication across
 * act-agent.strategy.spec.ts, plan-agent.strategy.spec.ts, and eval-agent.strategy.spec.ts
 */

import type { StrategyContext } from '../resolution-strategy.interface';

/**
 * Default available agents for ACT mode testing.
 * Includes all agent types that ACT mode may resolve to.
 */
export const ACT_MODE_AGENTS = [
  'frontend-developer',
  'backend-developer',
  'devops-engineer',
  'agent-architect',
  'tooling-engineer',
  'platform-engineer',
  'data-engineer',
  'mobile-developer',
  'ai-ml-engineer',
  'test-engineer',
] as const;

/**
 * Default available agents for PLAN mode testing.
 * Only includes agents valid for PLAN mode.
 */
export const PLAN_MODE_AGENTS = [
  'solution-architect',
  'technical-planner',
  'frontend-developer',
] as const;

/**
 * Default available agents for EVAL mode testing.
 * Only includes agents valid for EVAL mode.
 */
export const EVAL_MODE_AGENTS = [
  'frontend-developer',
  'backend-developer',
  'code-reviewer',
] as const;

/**
 * Create a StrategyContext for testing.
 *
 * @param overrides - Partial context to override defaults
 * @param defaultAgents - Default agents to use (defaults to ACT_MODE_AGENTS)
 * @returns A complete StrategyContext for testing
 *
 * @example
 * // Basic usage
 * const ctx = createStrategyContext({ prompt: 'Build an API' });
 *
 * // With custom agents
 * const ctx = createStrategyContext(
 *   { prompt: 'Design the system' },
 *   PLAN_MODE_AGENTS
 * );
 */
export function createStrategyContext(
  overrides: Partial<StrategyContext> = {},
  defaultAgents: readonly string[] = ACT_MODE_AGENTS,
): StrategyContext {
  return {
    prompt: 'test prompt',
    availableAgents: [...defaultAgents],
    ...overrides,
  };
}

/**
 * Create a StrategyContext for ACT mode testing.
 * Uses ACT_MODE_AGENTS as default available agents.
 */
export function createActContext(overrides: Partial<StrategyContext> = {}): StrategyContext {
  return createStrategyContext(overrides, ACT_MODE_AGENTS);
}

/**
 * Create a StrategyContext for PLAN mode testing.
 * Uses PLAN_MODE_AGENTS as default available agents.
 */
export function createPlanContext(overrides: Partial<StrategyContext> = {}): StrategyContext {
  return createStrategyContext(overrides, PLAN_MODE_AGENTS);
}

/**
 * Create a StrategyContext for EVAL mode testing.
 * Uses EVAL_MODE_AGENTS as default available agents.
 */
export function createEvalContext(overrides: Partial<StrategyContext> = {}): StrategyContext {
  return createStrategyContext(overrides, EVAL_MODE_AGENTS);
}
