/**
 * Council Summary Service — generates a structured consensus summary
 * from multi-agent specialist outputs.
 *
 * Pure module: no side effects, no I/O.
 * Handles partial failures gracefully — produces a degraded but useful
 * summary even when some specialist calls fail.
 */
import type { AgentOpinion, Stance } from './types';
import type {
  CouncilInput,
  CouncilSummary,
  Disagreement,
  DisagreementPosition,
} from './council-summary.types';

/**
 * Generates a council summary from specialist inputs.
 * Tolerates partial failures: failed specialists are recorded in `failedAgents`
 * and excluded from analysis, but the summary is still produced.
 */
export function generateCouncilSummary(inputs: readonly CouncilInput[]): CouncilSummary {
  const opinions: AgentOpinion[] = [];
  const failedAgents: string[] = [];

  for (const input of inputs) {
    if (input.opinion !== null) {
      opinions.push(input.opinion);
    } else {
      failedAgents.push(input.agentName);
    }
  }

  const partialFailure = failedAgents.length > 0;
  const consensus = detectConsensus(opinions);
  const disagreements = detectDisagreements(opinions);
  const blockingRisks = extractBlockingRisks(opinions);
  const nextStep = determineNextStep(opinions, failedAgents, blockingRisks);

  return {
    opinions,
    failedAgents,
    consensus,
    disagreements,
    blockingRisks,
    nextStep,
    partialFailure,
  };
}

/**
 * Detects consensus points: things all specialists agree on.
 * - Unanimous stance → reported as consensus
 * - Shared suggested changes across 2+ agents → reported
 */
function detectConsensus(opinions: readonly AgentOpinion[]): string[] {
  if (opinions.length === 0) return [];

  const points: string[] = [];
  const stances = new Set(opinions.map(o => o.stance));

  if (stances.size === 1) {
    const stance = opinions[0].stance;
    points.push(`All specialists ${stanceVerb(stance)}`);
  }

  const sharedChanges = findSharedSuggestedChanges(opinions);
  for (const change of sharedChanges) {
    points.push(`Shared recommendation: ${change}`);
  }

  return points;
}

/** Returns suggested changes that appear in 2+ opinions. */
function findSharedSuggestedChanges(opinions: readonly AgentOpinion[]): string[] {
  const changeCounts = new Map<string, number>();
  for (const opinion of opinions) {
    for (const change of opinion.suggestedChanges) {
      changeCounts.set(change, (changeCounts.get(change) ?? 0) + 1);
    }
  }

  const shared: string[] = [];
  for (const [change, count] of changeCounts) {
    if (count >= 2) {
      shared.push(change);
    }
  }
  return shared;
}

/** Human-readable verb for a stance. */
function stanceVerb(stance: Stance): string {
  switch (stance) {
    case 'approve':
      return 'approve';
    case 'concern':
      return 'express concerns';
    case 'reject':
      return 'reject';
  }
}

/**
 * Detects disagreements: points where specialists diverge in stance.
 * Groups by the distinct stance sets — if all share the same stance, no disagreement.
 */
function detectDisagreements(opinions: readonly AgentOpinion[]): Disagreement[] {
  if (opinions.length < 2) return [];

  const stances = new Set(opinions.map(o => o.stance));
  if (stances.size <= 1) return [];

  const positions: DisagreementPosition[] = opinions.map(o => ({
    agentName: o.agentName,
    stance: o.stance,
    reasoning: o.reasoning,
  }));

  return [
    {
      topic: 'Overall assessment',
      positions,
    },
  ];
}

/**
 * Extracts blocking risks from agents with reject stance.
 * Format: "AgentName: reasoning"
 */
function extractBlockingRisks(opinions: readonly AgentOpinion[]): string[] {
  return opinions.filter(o => o.stance === 'reject').map(o => `${o.agentName}: ${o.reasoning}`);
}

/**
 * Determines the recommended next action based on the council state.
 * Priority: blocking risks > partial failure > concerns > proceed.
 */
function determineNextStep(
  opinions: readonly AgentOpinion[],
  failedAgents: readonly string[],
  blockingRisks: readonly string[],
): string {
  if (opinions.length === 0 && failedAgents.length === 0) {
    return 'No specialist input available. Run specialist analysis first.';
  }

  if (opinions.length === 0 && failedAgents.length > 0) {
    return `Re-run failed specialists (${failedAgents.join(', ')}) to obtain analysis.`;
  }

  if (blockingRisks.length > 0) {
    return `Address ${blockingRisks.length} blocking risk(s) before proceeding.`;
  }

  const concerns = opinions.filter(o => o.stance === 'concern');
  const parts: string[] = [];

  if (failedAgents.length > 0) {
    parts.push(`re-run failed specialists (${failedAgents.join(', ')})`);
  }

  if (concerns.length > 0) {
    parts.push(`review ${concerns.length} concern(s)`);
  }

  if (parts.length > 0) {
    return `Proceed with caution: ${parts.join(', ')}.`;
  }

  return 'Proceed with implementation — all specialists approve.';
}
