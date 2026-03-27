/**
 * Agent Discussion Panel — Pure rendering logic.
 *
 * Stateless functions that produce display lines and rich blocks from
 * discussion data. Follows the same pattern as flow-map.pure.ts.
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

// ---------------------------------------------------------------------------
// Legacy flat-line types (kept for backward compatibility)
// ---------------------------------------------------------------------------

/** A single styled line for the discussion panel display. */
export interface DiscussionLine {
  readonly text: string;
  readonly type: 'opinion' | 'cross-review' | 'consensus' | 'header' | 'empty';
}

// ---------------------------------------------------------------------------
// Rich block types for collaboration visualization (#994)
// ---------------------------------------------------------------------------

/** Distinct ANSI colors assigned to agents for visual distinction. */
export const AGENT_PALETTE: readonly string[] = [
  'cyan',
  'magenta',
  'yellow',
  'green',
  'blue',
  'red',
  'white',
] as const;

/** Speech-bubble block for a single agent opinion. */
export interface AgentBubbleBlock {
  readonly type: 'agent-bubble';
  readonly agentName: string;
  readonly agentAvatar: string;
  readonly color: string;
  readonly stanceIcon: string;
  readonly reasoning: string;
  readonly isConflict: boolean;
  readonly stanceHistoryText: string;
}

/** Cross-review between two agents. */
export interface CrossReviewBlock {
  readonly type: 'cross-review-block';
  readonly fromName: string;
  readonly fromAvatar: string;
  readonly fromColor: string;
  readonly toName: string;
  readonly toAvatar: string;
  readonly toColor: string;
  readonly verb: string;
  readonly comment: string;
}

/** Consensus progress bar data. */
export interface ConsensusBarBlock {
  readonly type: 'consensus-bar';
  readonly approveCount: number;
  readonly concernCount: number;
  readonly rejectCount: number;
  readonly totalAgents: number;
  readonly reached: boolean;
  readonly percentage: number;
}

/** Section header. */
export interface HeaderBlock {
  readonly type: 'header';
  readonly text: string;
}

/** Empty / placeholder. */
export interface EmptyBlock {
  readonly type: 'empty';
  readonly text: string;
}

/** Union of all rich block types rendered by the panel. */
export type DiscussionBlock =
  | AgentBubbleBlock
  | CrossReviewBlock
  | ConsensusBarBlock
  | HeaderBlock
  | EmptyBlock;

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/** Map stance to cross-review verb. */
export const CROSS_REVIEW_VERBS: Readonly<Record<Stance, string>> = {
  approve: 'agrees',
  concern: 'notes',
  reject: 'disagrees',
};

/** Render stance history as arrow-separated icons (e.g., "⚠️ → ✅"). */
export function renderStanceHistory(stances: Stance[]): string {
  if (stances.length <= 1) return '';
  return stances.map(s => STANCE_ICONS[s]).join(' → ');
}

/** Assign a distinct palette color to each agent by first-appearance order. */
export function assignAgentColors(
  rounds: readonly DiscussionRound[],
): Record<string, string> {
  const colors: Record<string, string> = {};
  let idx = 0;
  for (const round of rounds) {
    for (const opinion of round.opinions) {
      if (!colors[opinion.agentId]) {
        colors[opinion.agentId] = AGENT_PALETTE[idx % AGENT_PALETTE.length];
        idx++;
      }
    }
  }
  return colors;
}

/**
 * Detect conflicting opinions within a single round.
 * Conflict = both 'approve' and 'reject' stances coexist.
 * Returns the set of agent IDs holding the 'reject' stance.
 */
export function detectConflicts(
  opinions: readonly AgentOpinion[],
): Set<string> {
  const hasApprove = opinions.some(o => o.stance === 'approve');
  const hasReject = opinions.some(o => o.stance === 'reject');
  if (!hasApprove || !hasReject) return new Set();

  const conflicting = new Set<string>();
  for (const opinion of opinions) {
    if (opinion.stance === 'reject') {
      conflicting.add(opinion.agentId);
    }
  }
  return conflicting;
}

/** Estimate how many terminal rows a block occupies. */
export function estimateBlockHeight(block: DiscussionBlock): number {
  switch (block.type) {
    case 'agent-bubble':
      return 4; // label + border-top + content + border-bottom
    case 'consensus-bar':
      return 2;
    default:
      return 1;
  }
}

// ---------------------------------------------------------------------------
// Build helpers (shared between legacy and rich renderers)
// ---------------------------------------------------------------------------

/** Build agent name lookup from opinions. */
function buildAgentNameMap(
  rounds: readonly DiscussionRound[],
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const round of rounds) {
    for (const opinion of round.opinions) {
      map[opinion.agentId] = opinion.agentName;
    }
  }
  return map;
}

/** Build stance history for each agent across rounds. */
function buildStanceHistories(
  rounds: readonly DiscussionRound[],
): Record<string, Stance[]> {
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

// ---------------------------------------------------------------------------
// Rich block renderer (#994)
// ---------------------------------------------------------------------------

/**
 * Render discussion rounds into rich DiscussionBlock[] for the
 * collaboration-visualization panel (speech bubbles, progress bar, etc.).
 */
export function renderCollaborationBlocks(
  rounds: readonly DiscussionRound[],
  _width: number,
): DiscussionBlock[] {
  if (rounds.length === 0) {
    return [{ type: 'empty', text: 'No agent discussion yet' }];
  }

  const blocks: DiscussionBlock[] = [];
  const agentNames = buildAgentNameMap(rounds);
  const agentColors = assignAgentColors(rounds);
  const stanceHistories = buildStanceHistories(rounds);

  const latestRound = rounds[rounds.length - 1];
  const conflicts = detectConflicts(latestRound.opinions);

  // Header
  blocks.push({
    type: 'header',
    text: `── Agent Discussion (Round ${latestRound.roundNumber}) ──`,
  });

  // Agent speech bubbles
  for (const opinion of latestRound.opinions) {
    const history = stanceHistories[opinion.agentId] ?? [];
    blocks.push({
      type: 'agent-bubble',
      agentName: opinion.agentName,
      agentAvatar: getAgentAvatar(opinion.agentName),
      color: agentColors[opinion.agentId] ?? 'white',
      stanceIcon: STANCE_ICONS[opinion.stance],
      reasoning: opinion.reasoning,
      isConflict: conflicts.has(opinion.agentId),
      stanceHistoryText: renderStanceHistory(history),
    });
  }

  // Cross-reviews
  for (const review of latestRound.crossReviews) {
    const fromName = agentNames[review.fromAgentId] ?? review.fromAgentId;
    const toName = agentNames[review.toAgentId] ?? review.toAgentId;
    blocks.push({
      type: 'cross-review-block',
      fromName,
      fromAvatar: getAgentAvatar(fromName),
      fromColor: agentColors[review.fromAgentId] ?? 'white',
      toName,
      toAvatar: getAgentAvatar(toName),
      toColor: agentColors[review.toAgentId] ?? 'white',
      verb: CROSS_REVIEW_VERBS[review.stance],
      comment: review.comment,
    });
  }

  // Consensus progress bar
  const consensus = calculateConsensus(latestRound.opinions);
  const percentage =
    consensus.totalAgents > 0
      ? Math.round((consensus.approveCount / consensus.totalAgents) * 100)
      : 0;
  blocks.push({
    type: 'consensus-bar',
    approveCount: consensus.approveCount,
    concernCount: consensus.concernCount,
    rejectCount: consensus.rejectCount,
    totalAgents: consensus.totalAgents,
    reached: consensus.reached,
    percentage,
  });

  return blocks;
}

// ---------------------------------------------------------------------------
// Legacy flat-line renderer (backward-compatible)
// ---------------------------------------------------------------------------

/** Render a single opinion line with stance history. */
export function renderOpinionLine(
  opinion: AgentOpinion,
  stanceHistory?: Stance[],
): DiscussionLine {
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
export function renderConsensusLine(
  consensus: ConsensusResult,
): DiscussionLine {
  const icon = consensus.reached ? '✅' : '❌';
  return {
    text: `${icon} Consensus: ${consensus.approveCount}/${consensus.totalAgents} | Critical: ${consensus.criticalCount}`,
    type: 'consensus',
  };
}

/**
 * Render all discussion rounds into flat display lines.
 * Legacy renderer — kept for backward compatibility.
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

  const latestRound = rounds[rounds.length - 1];

  lines.push({ text: `── Agent Discussion ──`, type: 'header' });

  for (const opinion of latestRound.opinions) {
    lines.push(renderOpinionLine(opinion, stanceHistories[opinion.agentId]));
  }

  for (const review of latestRound.crossReviews) {
    lines.push(renderCrossReviewLine(review, agentNames));
  }

  const consensus = calculateConsensus(latestRound.opinions);
  lines.push(renderConsensusLine(consensus));

  return lines;
}
