/**
 * Agent Discussion Panel — Pure rendering logic.
 *
 * Stateless functions that produce display lines from discussion data.
 * Follows the same pattern as flow-map.pure.ts.
 */
import type {
  AgentOpinion,
  CrossReview,
  ConsensusResult,
  DiscussionRound,
  Stance,
} from '../../collaboration/types';
import { STANCE_ICONS, calculateConsensus } from '../../collaboration/types';
import { getAgentAvatar } from '../utils/theme';

/** A single styled line for the discussion panel display. */
export interface DiscussionLine {
  readonly text: string;
  readonly type: 'opinion' | 'cross-review' | 'consensus' | 'header' | 'empty';
}

/** Map stance to cross-review verb. */
const CROSS_REVIEW_VERBS: Readonly<Record<Stance, string>> = {
  approve: 'agrees',
  concern: 'notes',
  reject: 'disagrees',
};

/** Render stance history as arrow-separated icons (e.g., "⚠️ → ✅"). */
export function renderStanceHistory(stances: Stance[]): string {
  if (stances.length <= 1) return '';
  return stances.map(s => STANCE_ICONS[s]).join(' → ');
}

/** Render a single opinion line with stance history. */
export function renderOpinionLine(opinion: AgentOpinion, stanceHistory?: Stance[]): DiscussionLine {
  const avatar = getAgentAvatar(opinion.agentName);
  const icon = STANCE_ICONS[opinion.stance];

  let suffix = '';
  if (stanceHistory && stanceHistory.length > 1) {
    const lastStance = stanceHistory[stanceHistory.length - 1];
    const prevStance = stanceHistory[stanceHistory.length - 2];
    if (lastStance !== prevStance) {
      suffix = ` (${prevStance === 'reject' || prevStance === 'concern' ? 'revised' : 'alt'})`;
    }
  }

  return {
    text: `${avatar} ${opinion.agentName}  ${icon} ${opinion.stance}${suffix}: "${opinion.reasoning}"`,
    type: 'opinion',
  };
}

/** Render a cross-review line. */
export function renderCrossReviewLine(
  review: CrossReview,
  agentNames: Record<string, string>,
): DiscussionLine {
  const fromAvatar = getAgentAvatar(agentNames[review.fromAgentId] ?? 'unknown');
  const fromName = agentNames[review.fromAgentId] ?? review.fromAgentId;
  const toAvatar = getAgentAvatar(agentNames[review.toAgentId] ?? 'unknown');
  const toName = agentNames[review.toAgentId] ?? review.toAgentId;
  const verb = CROSS_REVIEW_VERBS[review.stance];

  return {
    text: `${fromAvatar} ${fromName} → ${toAvatar} ${toName} ${verb}: "${review.comment}"`,
    type: 'cross-review',
  };
}

/** Render the consensus summary line. */
export function renderConsensusLine(consensus: ConsensusResult): DiscussionLine {
  const icon = consensus.reached ? '✅' : '❌';
  return {
    text: `${icon} Consensus: ${consensus.approveCount}/${consensus.totalAgents} | Critical: ${consensus.criticalCount}`,
    type: 'consensus',
  };
}

/** Build agent name lookup from opinions. */
function buildAgentNameMap(rounds: readonly DiscussionRound[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const round of rounds) {
    for (const opinion of round.opinions) {
      map[opinion.agentId] = opinion.agentName;
    }
  }
  return map;
}

/** Build stance history for each agent across rounds. */
function buildStanceHistories(rounds: readonly DiscussionRound[]): Record<string, Stance[]> {
  const histories: Record<string, Stance[]> = {};
  for (const round of rounds) {
    for (const opinion of round.opinions) {
      if (!histories[opinion.agentId]) {
        histories[opinion.agentId] = [];
      }
      histories[opinion.agentId].push(opinion.stance);
    }
  }
  return histories;
}

/**
 * Render all discussion rounds into display lines.
 * This is the main pure function for the panel.
 */
export function renderDiscussionPanel(
  rounds: readonly DiscussionRound[],
  _width: number,
): DiscussionLine[] {
  if (rounds.length === 0) {
    return [{ text: 'No agent discussion yet', type: 'empty' }];
  }

  const lines: DiscussionLine[] = [];
  const agentNames = buildAgentNameMap(rounds);
  const stanceHistories = buildStanceHistories(rounds);

  // Show the latest round's data
  const latestRound = rounds[rounds.length - 1];

  lines.push({ text: `── Agent Discussion ──`, type: 'header' });

  // Opinions
  for (const opinion of latestRound.opinions) {
    lines.push(renderOpinionLine(opinion, stanceHistories[opinion.agentId]));
  }

  // Cross-reviews
  for (const review of latestRound.crossReviews) {
    lines.push(renderCrossReviewLine(review, agentNames));
  }

  // Consensus
  const consensus = calculateConsensus(latestRound.opinions);
  lines.push(renderConsensusLine(consensus));

  return lines;
}
