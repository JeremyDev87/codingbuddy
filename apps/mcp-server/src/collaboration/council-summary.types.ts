/**
 * Council Summary Types — structured consensus layer on top of multi-agent outputs.
 *
 * Aggregates specialist opinions into consensus, disagreements, blocking risks,
 * and a recommended next step. Handles partial failures gracefully.
 */
import type { AgentOpinion, Stance } from './types';

/** Input to the council summary generator. Null opinion indicates a failed specialist. */
export interface CouncilInput {
  readonly agentName: string;
  readonly opinion: AgentOpinion | null;
  readonly error?: string;
}

/** One side of a disagreement between specialists. */
export interface DisagreementPosition {
  readonly agentName: string;
  readonly stance: Stance;
  readonly reasoning: string;
}

/** A point where specialists diverge in stance. */
export interface Disagreement {
  readonly topic: string;
  readonly positions: readonly DisagreementPosition[];
}

/** Final council summary aggregating all specialist outputs. */
export interface CouncilSummary {
  readonly opinions: readonly AgentOpinion[];
  readonly failedAgents: readonly string[];
  readonly consensus: readonly string[];
  readonly disagreements: readonly Disagreement[];
  readonly blockingRisks: readonly string[];
  readonly nextStep: string;
  readonly partialFailure: boolean;
}
