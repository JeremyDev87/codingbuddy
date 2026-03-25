/**
 * Agent Collaboration Visualization - Type Definitions
 *
 * Types for structured agent debates: opinions, cross-reviews,
 * discussion rounds, and consensus calculation.
 */

/** Agent stance on a proposal or review item. */
export type Stance = 'approve' | 'concern' | 'reject';

/** Ordered list of valid stances. */
export const STANCES: readonly Stance[] = Object.freeze(['approve', 'concern', 'reject']);

/** Emoji icons for each stance. */
export const STANCE_ICONS: Readonly<Record<Stance, string>> = Object.freeze({
  approve: '✅',
  concern: '⚠️',
  reject: '❌',
});

/** A single agent's opinion in a discussion round. */
export interface AgentOpinion {
  readonly agentId: string;
  readonly agentName: string;
  readonly stance: Stance;
  readonly reasoning: string;
  readonly suggestedChanges: readonly string[];
  readonly timestamp: number;
}

/** Parameters for creating an AgentOpinion. */
export interface CreateAgentOpinionParams {
  agentId: string;
  agentName: string;
  stance: Stance;
  reasoning: string;
  suggestedChanges?: string[];
  timestamp?: number;
}

/** Create an AgentOpinion with defaults for optional fields. */
export function createAgentOpinion(params: CreateAgentOpinionParams): AgentOpinion {
  return {
    agentId: params.agentId,
    agentName: params.agentName,
    stance: params.stance,
    reasoning: params.reasoning,
    suggestedChanges: params.suggestedChanges ?? [],
    timestamp: params.timestamp ?? Date.now(),
  };
}

/** A cross-review: one agent commenting on another's opinion. */
export interface CrossReview {
  readonly fromAgentId: string;
  readonly toAgentId: string;
  readonly stance: Stance;
  readonly comment: string;
  readonly timestamp: number;
}

/** Parameters for creating a CrossReview. */
export interface CreateCrossReviewParams {
  fromAgentId: string;
  toAgentId: string;
  stance: Stance;
  comment: string;
  timestamp?: number;
}

/** Create a CrossReview with defaults for optional fields. */
export function createCrossReview(params: CreateCrossReviewParams): CrossReview {
  return {
    fromAgentId: params.fromAgentId,
    toAgentId: params.toAgentId,
    stance: params.stance,
    comment: params.comment,
    timestamp: params.timestamp ?? Date.now(),
  };
}

/** A single round of discussion containing opinions and cross-reviews. */
export interface DiscussionRound {
  readonly roundNumber: number;
  readonly opinions: readonly AgentOpinion[];
  readonly crossReviews: readonly CrossReview[];
}

/** Create a DiscussionRound. */
export function createDiscussionRound(
  roundNumber: number,
  opinions: AgentOpinion[],
  crossReviews: CrossReview[] = [],
): DiscussionRound {
  return {
    roundNumber,
    opinions,
    crossReviews,
  };
}

/** Result of consensus calculation across agent opinions. */
export interface ConsensusResult {
  readonly totalAgents: number;
  readonly approveCount: number;
  readonly concernCount: number;
  readonly rejectCount: number;
  readonly reached: boolean;
  readonly criticalCount: number;
}

/**
 * Calculate consensus from a set of opinions.
 * Consensus is reached when there are no rejections and at least one opinion.
 * Critical count = number of rejections.
 */
export function calculateConsensus(opinions: readonly AgentOpinion[]): ConsensusResult {
  const approveCount = opinions.filter(o => o.stance === 'approve').length;
  const concernCount = opinions.filter(o => o.stance === 'concern').length;
  const rejectCount = opinions.filter(o => o.stance === 'reject').length;

  return {
    totalAgents: opinions.length,
    approveCount,
    concernCount,
    rejectCount,
    reached: opinions.length > 0 && rejectCount === 0,
    criticalCount: rejectCount,
  };
}
