/**
 * Types for the Agent Discussion protocol.
 *
 * Defines the AgentOpinion structure and DiscussionResult
 * for collecting and analyzing specialist agent opinions.
 */

/**
 * Severity levels for agent opinions.
 * Ordered from least to most severe.
 */
export type OpinionSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';

/**
 * A single agent's opinion on a discussion topic.
 */
export interface AgentOpinion {
  /** Name of the specialist agent providing the opinion */
  agent: string;
  /** The agent's opinion or assessment */
  opinion: string;
  /** Severity level of the finding */
  severity: OpinionSeverity;
  /** Supporting evidence for the opinion */
  evidence: string[];
  /** Recommended action or resolution */
  recommendation: string;
}

/**
 * Consensus status of a discussion.
 */
export type ConsensusStatus = 'consensus' | 'majority' | 'split' | 'disagreement';

/**
 * Result of a multi-agent discussion.
 */
export interface DiscussionResult {
  /** The topic that was discussed */
  topic: string;
  /** List of specialist agents that participated */
  specialists: string[];
  /** Individual opinions from each agent */
  opinions: AgentOpinion[];
  /** Overall consensus status */
  consensus: ConsensusStatus;
  /** Summary of the discussion outcome */
  summary: string;
  /** Highest severity found across all opinions */
  maxSeverity: OpinionSeverity;
}

/**
 * Valid severity values for validation.
 */
export const VALID_SEVERITIES: readonly OpinionSeverity[] = [
  'info',
  'low',
  'medium',
  'high',
  'critical',
];
