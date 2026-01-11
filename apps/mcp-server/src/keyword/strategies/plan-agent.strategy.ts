/**
 * PLAN Mode Agent Resolution Strategy
 *
 * Resolves the appropriate planning agent based on prompt analysis.
 * PLAN mode uses solution-architect or technical-planner.
 *
 * Resolution Priority:
 * 1. Explicit agent request in prompt
 * 2. Architecture-focused keywords → solution-architect
 * 3. Planning-focused keywords → technical-planner
 * 4. Both patterns match → solution-architect (architecture precedence)
 * 5. Default → solution-architect
 */

import { Logger } from '@nestjs/common';
import { DEFAULT_ACT_AGENT, PLAN_PRIMARY_AGENTS } from '../keyword.types';
import type { PrimaryAgentResolutionResult } from '../keyword.types';
import { EXPLICIT_PATTERNS } from '../patterns';
import type {
  ResolutionStrategy,
  StrategyContext,
} from './resolution-strategy.interface';

/** Architecture-focused keywords */
const ARCHITECTURE_PATTERNS =
  /아키텍처|architecture|시스템\s*설계|system\s*design|구조|structure|API\s*설계|마이크로서비스|microservice|기술\s*선택|technology/i;

/** Planning/task-focused keywords */
const PLANNING_PATTERNS =
  /계획|plan|단계|step|태스크|task|TDD|구현\s*순서|implementation\s*order|리팩토링|refactor/i;

/**
 * Create a resolution result object.
 */
function createResult(
  agentName: string,
  source: 'explicit' | 'intent' | 'default',
  confidence: number,
  reason: string,
): PrimaryAgentResolutionResult {
  return { agentName, source, confidence, reason };
}

/**
 * Parse explicit agent request from prompt.
 */
function parseExplicitRequest(
  prompt: string,
  availableAgents: string[],
): PrimaryAgentResolutionResult | null {
  for (const pattern of EXPLICIT_PATTERNS) {
    const match = prompt.match(pattern);
    if (match?.[1]) {
      const agentName = match[1].toLowerCase();
      const isAvailable = availableAgents.includes(agentName);
      const isAllowed = (PLAN_PRIMARY_AGENTS as readonly string[]).includes(
        agentName,
      );
      if (isAvailable && isAllowed) {
        return createResult(
          agentName,
          'explicit',
          1.0,
          `Explicit request for ${agentName} in prompt`,
        );
      }
    }
  }
  return null;
}

/**
 * Choose between solution-architect and technical-planner based on prompt.
 */
function choosePlanAgent(
  prompt: string,
  availableAgents: string[],
): PrimaryAgentResolutionResult {
  const hasArchitectureIntent = ARCHITECTURE_PATTERNS.test(prompt);
  const hasPlanningIntent = PLANNING_PATTERNS.test(prompt);

  // Priority 1: Architecture-only → solution-architect
  if (hasArchitectureIntent && !hasPlanningIntent) {
    if (availableAgents.includes('solution-architect')) {
      return createResult(
        'solution-architect',
        'intent',
        0.9,
        'Architecture-focused task detected in PLAN mode',
      );
    }
  }

  // Priority 2: Planning-only → technical-planner
  if (hasPlanningIntent && !hasArchitectureIntent) {
    if (availableAgents.includes('technical-planner')) {
      return createResult(
        'technical-planner',
        'intent',
        0.9,
        'Planning/implementation-focused task detected in PLAN mode',
      );
    }
  }

  // Priority 3: Both patterns match → solution-architect (architecture precedence)
  if (hasArchitectureIntent && hasPlanningIntent) {
    if (availableAgents.includes('solution-architect')) {
      return createResult(
        'solution-architect',
        'intent',
        0.85,
        'Both architecture and planning detected; architecture takes precedence',
      );
    }
  }

  // Priority 4: Neither matches → default to solution-architect
  const defaultPlanAgent = availableAgents.includes('solution-architect')
    ? 'solution-architect'
    : availableAgents.includes('technical-planner')
      ? 'technical-planner'
      : DEFAULT_ACT_AGENT;

  return createResult(
    defaultPlanAgent,
    'default',
    1.0,
    'PLAN mode default: solution-architect for high-level design',
  );
}

/**
 * PLAN Agent Strategy
 *
 * Resolves the appropriate planning agent based on prompt analysis.
 */
export class PlanAgentStrategy implements ResolutionStrategy {
  private readonly logger = new Logger(PlanAgentStrategy.name);

  async resolve(ctx: StrategyContext): Promise<PrimaryAgentResolutionResult> {
    const { prompt, availableAgents } = ctx;

    // Check for explicit PLAN agent request
    const explicit = parseExplicitRequest(prompt, availableAgents);
    if (explicit) {
      this.logger.debug(`Explicit PLAN agent request: ${explicit.agentName}`);
      return explicit;
    }

    // Analyze prompt to choose between solution-architect and technical-planner
    const result = choosePlanAgent(prompt, availableAgents);
    this.logger.debug(
      `PLAN agent resolved: ${result.agentName} (${result.reason})`,
    );
    return result;
  }
}
