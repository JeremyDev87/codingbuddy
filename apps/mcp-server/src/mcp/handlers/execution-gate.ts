/**
 * Execution Gate — delay expensive specialist dispatch until clarification
 * is confirmed (#1378).
 *
 * When a request is still ambiguous (discover/design stage or
 * clarificationNeeded=true), dispatching specialists and tool-heavy
 * execution creates unnecessary cost and noise. This gate holds
 * expensive work until the user has confirmed direction.
 *
 * Like the Clarification Gate and Planning Stage, this module is
 * intentionally pure and free of NestJS dependencies.
 */

import type { ClarificationMetadata } from './clarification-gate';
import type { PlanningStageMetadata } from './planning-stage';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Execution gate metadata included in the PLAN/AUTO parse_mode response. */
export interface ExecutionGate {
  /** True when expensive execution (specialist dispatch, tool-heavy work) is held. */
  gated: boolean;
  /** Human-readable reason for the current gate state. */
  reason: string;
  /** What must happen for the gate to open. Undefined when not gated. */
  unblockCondition?: string;
  /** Specialists that would have been dispatched but are deferred. Present only when gated. */
  deferredSpecialists?: string[];
}

/** Inputs consumed by the execution gate evaluator. */
export interface ExecutionGateInput {
  /** Clarification metadata from the Clarification Gate (#1371). */
  clarification: ClarificationMetadata;
  /** Planning stage metadata from the Stage Router (#1372). */
  planningStage?: PlanningStageMetadata;
  /** Specialists that would normally be dispatched. */
  specialists?: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GATED_STAGES = new Set(['discover', 'design']);

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Evaluate whether expensive execution should be gated based on
 * clarification status and planning stage.
 *
 * Gating rules (evaluated in order):
 * 1. `planReady=true` → ungated (request is clear enough to execute).
 * 2. `clarificationNeeded=true` → gated (ambiguous).
 * 3. `currentStage` in {discover, design} → gated (still exploring).
 * 4. Otherwise → ungated.
 */
export function evaluateExecutionGate(input: ExecutionGateInput): ExecutionGate {
  const { clarification, planningStage, specialists } = input;

  // 1. planReady → always ungated
  if (clarification.planReady) {
    return {
      gated: false,
      reason: 'Request is clear — full specialist dispatch permitted.',
    };
  }

  // 2. clarificationNeeded → gated
  if (clarification.clarificationNeeded) {
    return buildGatedResult(
      'Request is ambiguous — specialist dispatch deferred until clarification is resolved.',
      'Resolve clarification questions or provide an explicit override (e.g., "just do it").',
      specialists,
    );
  }

  // 3. Stage-based gating (discover/design)
  if (planningStage && GATED_STAGES.has(planningStage.currentStage)) {
    const stageName = planningStage.currentStage;
    return buildGatedResult(
      `Currently in ${stageName} stage — specialist dispatch deferred until plan stage.`,
      stageName === 'discover'
        ? 'Confirm direction to proceed through Design to Plan.'
        : 'Confirm approach to proceed to Plan.',
      specialists,
    );
  }

  // 4. Fallback — ungated
  return {
    gated: false,
    reason: 'Execution permitted — no gating conditions active.',
  };
}

// ---------------------------------------------------------------------------
// Response suppression (#1422)
// ---------------------------------------------------------------------------

/** Minimal parallel-agent recommendation shape for gating. */
interface GatedParallelRecommendation {
  specialists: string[];
  hint: string;
  dispatch?: string;
  suggestedStack?: string;
  stackBased?: boolean;
}

/**
 * Fields from the parse_mode response that may need suppression while gated.
 * Uses a generic for dispatchReady and executionPlan so the caller can pass
 * the concrete types from keyword.types without coupling this module to them.
 */
export interface GatedResponseFields<D = unknown, E = unknown> {
  dispatchReady?: D;
  parallelAgentsRecommendation?: GatedParallelRecommendation;
  executionPlan?: E;
}

/** Return type mirrors the input but with suppressed fields. */
export type SuppressedResponseFields<D = unknown, E = unknown> = GatedResponseFields<D, E>;

/**
 * Suppress or downgrade dispatch-ready metadata when the execution gate
 * is active (#1422).
 *
 * When `gate.gated === true`:
 * - `dispatchReady` is removed (no Task-tool-ready params leak).
 * - `executionPlan` is removed (no execution plan metadata leaks).
 * - `parallelAgentsRecommendation.dispatch` is downgraded to `"deferred"`.
 * - Specialist names and hint are preserved for transparency.
 *
 * When `gate` is undefined or ungated, all fields pass through unchanged.
 *
 * This function is pure and does NOT mutate its inputs.
 */
export function suppressDispatchWhileGated<D, E>(
  gate: ExecutionGate | undefined,
  fields: GatedResponseFields<D, E>,
): SuppressedResponseFields<D, E> {
  // No gate or ungated → pass through
  if (!gate || !gate.gated) {
    return fields;
  }

  // Gated → suppress expensive dispatch metadata
  const result: SuppressedResponseFields<D, E> = {};

  // dispatchReady: fully removed (no dispatch params should leak)
  // result.dispatchReady stays undefined

  // executionPlan: fully removed
  // result.executionPlan stays undefined

  // parallelAgentsRecommendation: keep specialist names, downgrade dispatch
  if (fields.parallelAgentsRecommendation) {
    result.parallelAgentsRecommendation = {
      ...fields.parallelAgentsRecommendation,
      dispatch: 'deferred',
    };
  }

  return result;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildGatedResult(
  reason: string,
  unblockCondition: string,
  specialists?: string[],
): ExecutionGate {
  return {
    gated: true,
    reason,
    unblockCondition,
    ...(specialists?.length && { deferredSpecialists: [...specialists] }),
  };
}
