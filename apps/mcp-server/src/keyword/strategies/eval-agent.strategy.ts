/**
 * EVAL Mode Agent Resolution Strategy
 *
 * EVAL mode always uses the code-reviewer agent for evaluation tasks.
 * This is the simplest strategy with no decision logic.
 */

import { EVAL_PRIMARY_AGENT } from '../keyword.types';
import type { PrimaryAgentResolutionResult } from '../keyword.types';
import type {
  ResolutionStrategy,
  StrategyContext,
} from './resolution-strategy.interface';

/**
 * Creates the EVAL mode resolution result.
 * Always returns code-reviewer with full confidence.
 */
function createEvalResult(): PrimaryAgentResolutionResult {
  return {
    agentName: EVAL_PRIMARY_AGENT,
    source: 'default',
    confidence: 1.0,
    reason: 'EVAL mode always uses code-reviewer',
  };
}

/**
 * EVAL Agent Strategy
 *
 * Simple strategy that always returns the code-reviewer agent.
 * EVAL mode is designed for code review and evaluation tasks.
 */
export class EvalAgentStrategy implements ResolutionStrategy {
  async resolve(_ctx: StrategyContext): Promise<PrimaryAgentResolutionResult> {
    return createEvalResult();
  }
}
