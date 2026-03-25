/**
 * Opinion Adapter — converts specialist agent results to AgentOpinion/DiscussionRound.
 *
 * Pure module: no side effects, no I/O.
 */
import { createAgentOpinion, createDiscussionRound } from './types';
import type { AgentOpinion, DiscussionRound, Stance } from './types';

/** Severity levels produced by specialist agents. */
export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low' | 'none';

/** A single finding from a specialist agent. */
export interface SpecialistFinding {
  readonly text: string;
  readonly severity: FindingSeverity;
}

/** Aggregated result from a specialist agent. */
export interface SpecialistResult {
  readonly agentName: string;
  readonly findings: readonly SpecialistFinding[];
  readonly recommendations: readonly string[];
}

/** Severity rank — higher number = more severe. */
const SEVERITY_RANK: Record<FindingSeverity, number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

/**
 * Maps a finding severity to a discussion stance.
 * critical/high → reject, medium → concern, low/none → approve
 */
export function mapSeverityToStance(severity: FindingSeverity): Stance {
  switch (severity) {
    case 'critical':
    case 'high':
      return 'reject';
    case 'medium':
      return 'concern';
    case 'low':
    case 'none':
      return 'approve';
  }
}

/**
 * Slugifies an agent name to produce a stable agentId.
 * "Security Specialist" → "specialist:security-specialist"
 */
function slugify(name: string): string {
  return `specialist:${name.toLowerCase().replace(/\s+/g, '-')}`;
}

/**
 * Determines the highest severity across all findings.
 * Returns 'none' when there are no findings.
 */
function highestSeverity(findings: readonly SpecialistFinding[]): FindingSeverity {
  if (findings.length === 0) return 'none';
  let max: FindingSeverity = 'none';
  for (const f of findings) {
    if (SEVERITY_RANK[f.severity] > SEVERITY_RANK[max]) {
      max = f.severity;
    }
  }
  return max;
}

/**
 * Converts a single specialist result into an AgentOpinion.
 */
export function convertSpecialistResult(result: SpecialistResult): AgentOpinion {
  const severity = highestSeverity(result.findings);
  const stance = mapSeverityToStance(severity);
  const reasoning =
    result.findings.length === 0 ? 'No issues found.' : result.findings.map(f => f.text).join('; ');

  return createAgentOpinion({
    agentId: slugify(result.agentName),
    agentName: result.agentName,
    stance,
    reasoning,
    suggestedChanges: [...result.recommendations],
  });
}

/**
 * Converts multiple specialist results into a DiscussionRound.
 */
export function convertSpecialistResults(
  results: readonly SpecialistResult[],
  roundNumber = 1,
): DiscussionRound {
  const opinions = results.map(convertSpecialistResult);
  return createDiscussionRound(roundNumber, opinions);
}
