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

/**
 * Environment variable that enables the experimental agent_discussion tool.
 *
 * This tool produces templated synthesis rather than real specialist execution,
 * so it is disabled by default. Set this env var to '1' to enable it for
 * experimentation / evaluation, and understand that its output does NOT
 * reflect real agent collective intelligence.
 */
export const EXPERIMENTAL_DISCUSSION_ENV = 'CODINGBUDDY_EXPERIMENTAL_DISCUSSION';

/**
 * Warning banner attached to any enabled agent_discussion response so callers
 * cannot mistake templated synthesis for real specialist execution.
 */
export const EXPERIMENTAL_DISCUSSION_WARNING =
  '\u26a0\ufe0f experimental — templated synthesis, not real specialist execution';

/**
 * Reason surfaced when the tool is disabled (default state).
 */
export const DISABLED_DISCUSSION_REASON =
  'templated synthesis not aligned with collective intelligence promise';

/**
 * Response returned when the agent_discussion tool is disabled (default).
 */
export interface DisabledDiscussionResult {
  disabled: true;
  reason: string;
  experimentalFlag: string;
}

/**
 * Response returned when the agent_discussion tool is explicitly enabled
 * via the experimental env flag. Extends DiscussionResult with a warning
 * banner that the output is templated synthesis, not real specialist
 * execution.
 */
export interface ExperimentalDiscussionResult extends DiscussionResult {
  experimental: true;
  warning: string;
}
