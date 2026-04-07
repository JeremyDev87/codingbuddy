/**
 * Planning Stage Router — Discover → Design → Plan staged flow (#1372).
 *
 * Builds on the Clarification Gate (#1371) to introduce three explicit
 * planning stages instead of jumping from prompt to implementation plan:
 *
 *   1. DISCOVER  — surface questions, constraints, option space
 *   2. DESIGN    — synthesize candidate approaches, trade-offs, risks
 *   3. PLAN      — produce a concrete implementation plan
 *
 * The router maps the Clarification Gate's output plus caller-supplied
 * stage context into a `PlanningStageMetadata` object that is included
 * in the parse_mode response for PLAN/AUTO modes.
 *
 * Like the Clarification Gate, this module is intentionally pure and
 * free of NestJS dependencies so it can be unit tested in isolation.
 */

import type { ClarificationMetadata } from './clarification-gate';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The three stages of the planning flow. */
export type PlanningStage = 'discover' | 'design' | 'plan';

/** Progression tracking across the three planning stages. */
export interface StageProgression {
  /** Stages already completed before the current one. */
  completedStages: PlanningStage[];
  /** The stage currently active. */
  currentStage: PlanningStage;
  /** Stages remaining after the current one. */
  remainingStages: PlanningStage[];
}

/** Metadata emitted alongside the clarification fields in the PLAN response. */
export interface PlanningStageMetadata {
  /** Current planning stage. */
  currentStage: PlanningStage;
  /** Human-readable description of what this stage produces. */
  stageDescription: string;
  /** Next stage the flow will transition to (undefined when at terminal 'plan'). */
  nextStage?: 'design' | 'plan';
  /** Action the user must take to move to the next stage. */
  stageTransitionHint?: string;
  /** Recommended primary agent for this stage. */
  recommendedAgent?: string;
  /** Recommended supporting skill for this stage. */
  recommendedSkill?: string;
  /** Progression metadata showing completed / current / remaining stages. */
  stageProgression?: StageProgression;
}

/** Options to override automatic stage resolution. */
export interface PlanningStageOptions {
  /**
   * Explicit stage hint from the caller. When `'design'` the router skips
   * the DISCOVER stage and routes directly to DESIGN (the caller is stating
   * that clarification is resolved and direction is confirmed).
   */
  stageHint?: PlanningStage;
}

// ---------------------------------------------------------------------------
// Stage descriptions & transition hints (i18n-ready strings)
// ---------------------------------------------------------------------------

const STAGE_DESCRIPTIONS: Record<PlanningStage, string> = {
  discover:
    'Discover: Surface questions, constraints, and the option space before committing to an approach.',
  design: 'Design: Synthesize candidate approaches, compare trade-offs, and identify open risks.',
  plan: 'Plan: Produce a concrete, step-by-step implementation plan.',
};

const STAGE_TRANSITION_HINTS: Record<'discover' | 'design', string> = {
  discover: 'Answer the clarification question(s) or confirm the direction to proceed to Design.',
  design: 'Confirm the preferred approach to proceed to the concrete implementation Plan.',
};

const STAGE_AGENTS: Record<PlanningStage, string> = {
  discover: 'solution-architect',
  design: 'solution-architect',
  plan: 'technical-planner',
};

const STAGE_SKILLS: Record<PlanningStage, string | undefined> = {
  discover: 'brainstorming',
  design: undefined,
  plan: 'writing-plans',
};

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Resolve the current planning stage based on the Clarification Gate output
 * and optional caller-supplied hints.
 *
 * Routing rules (evaluated in order):
 * 1. If `stageHint` is provided → use it directly (caller knows best).
 * 2. If `clarification.clarificationNeeded === true` → `discover`.
 * 3. Default → `discover` (staged default — always start at discover).
 *
 * The user advances through stages by passing `planning_stage` parameter:
 *   First call (no hint) → discover
 *   User confirms direction → passes `planning_stage: "design"` → design
 *   User confirms approach → passes `planning_stage: "plan"` → plan
 */
export function resolvePlanningStage(
  clarification: ClarificationMetadata,
  options: PlanningStageOptions = {},
): PlanningStageMetadata {
  const stage = resolveStage(clarification, options);

  return {
    currentStage: stage,
    stageDescription: STAGE_DESCRIPTIONS[stage],
    ...(stage !== 'plan' && { nextStage: getNextStage(stage) }),
    ...(stage !== 'plan' && {
      stageTransitionHint: STAGE_TRANSITION_HINTS[stage],
    }),
    recommendedAgent: STAGE_AGENTS[stage],
    ...(STAGE_SKILLS[stage] && { recommendedSkill: STAGE_SKILLS[stage] }),
    stageProgression: buildStageProgression(stage),
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function resolveStage(
  clarification: ClarificationMetadata,
  options: PlanningStageOptions,
): PlanningStage {
  // 1. Explicit caller override
  if (options.stageHint) {
    return options.stageHint;
  }

  // 2. Ambiguous → discover
  if (clarification.clarificationNeeded) {
    return 'discover';
  }

  // 3. Staged default — always start at discover regardless of planReady.
  //    The user advances through stages via the planning_stage parameter.
  return 'discover';
}

function getNextStage(stage: 'discover' | 'design'): 'design' | 'plan' {
  return stage === 'discover' ? 'design' : 'plan';
}

/** Canonical ordered list of all planning stages. */
const ALL_STAGES: readonly PlanningStage[] = ['discover', 'design', 'plan'];

/**
 * Build stage progression metadata showing which stages are completed,
 * which is current, and which remain.
 */
function buildStageProgression(currentStage: PlanningStage): StageProgression {
  const currentIndex = ALL_STAGES.indexOf(currentStage);
  return {
    completedStages: ALL_STAGES.slice(0, currentIndex) as PlanningStage[],
    currentStage,
    remainingStages: ALL_STAGES.slice(currentIndex + 1) as PlanningStage[],
  };
}
