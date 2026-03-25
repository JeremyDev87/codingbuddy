/**
 * Terminal Formatter — renders agent debates as colored markdown for terminal output.
 *
 * Uses agent emoji avatars from theme and stance icons from types.
 */
import type { AgentOpinion, CrossReview, ConsensusResult, DiscussionRound, Stance } from './types';
import { STANCE_ICONS, calculateConsensus } from './types';
import { getAgentAvatar } from '../tui/utils/theme';

/** Map stance to cross-review verb. */
const CROSS_REVIEW_VERBS: Readonly<Record<Stance, string>> = {
  approve: 'agrees',
  concern: 'notes',
  reject: 'disagrees',
};

/** Format a single agent opinion as a terminal line. */
export function formatOpinion(opinion: AgentOpinion): string {
  const avatar = getAgentAvatar(opinion.agentName);
  const icon = STANCE_ICONS[opinion.stance];
  const parts = [
    `${avatar} ${opinion.agentName} — ${icon} ${opinion.stance}: "${opinion.reasoning}"`,
  ];

  if (opinion.suggestedChanges.length > 0) {
    for (const change of opinion.suggestedChanges) {
      parts.push(`  → ${change}`);
    }
  }

  return parts.join('\n');
}

/** Format a cross-review as a terminal line with arrow notation. */
export function formatCrossReview(review: CrossReview, agentNames: Record<string, string>): string {
  const fromAvatar = getAgentAvatar(agentNames[review.fromAgentId] ?? 'unknown');
  const fromName = agentNames[review.fromAgentId] ?? review.fromAgentId;
  const toName = agentNames[review.toAgentId] ?? review.toAgentId;
  const verb = CROSS_REVIEW_VERBS[review.stance];

  return `${fromAvatar} ${fromName} → ${toName} ${verb}: "${review.comment}"`;
}

/** Format consensus result as a terminal line. */
export function formatConsensus(consensus: ConsensusResult): string {
  const icon = consensus.reached ? '✅' : '❌';
  const agreeCount = consensus.approveCount;
  return `${icon} Consensus: ${agreeCount}/${consensus.totalAgents} | Critical: ${consensus.criticalCount}`;
}

/** Format a complete discussion round with opinions, cross-reviews, and consensus. */
export function formatDiscussionRound(round: DiscussionRound): string {
  const lines: string[] = [];

  // Opinions
  for (const opinion of round.opinions) {
    lines.push(formatOpinion(opinion));
  }

  // Cross-reviews
  if (round.crossReviews.length > 0) {
    const agentNames: Record<string, string> = {};
    for (const opinion of round.opinions) {
      agentNames[opinion.agentId] = opinion.agentName;
    }
    for (const review of round.crossReviews) {
      lines.push(formatCrossReview(review, agentNames));
    }
  }

  // Consensus
  const consensus = calculateConsensus(round.opinions);
  lines.push(formatConsensus(consensus));

  return lines.join('\n');
}
