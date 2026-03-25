/**
 * Collaboration module — public API
 */
export type {
  Stance,
  AgentOpinion,
  CrossReview,
  DiscussionRound,
  ConsensusResult,
  CreateAgentOpinionParams,
  CreateCrossReviewParams,
} from './types';
export {
  STANCES,
  STANCE_ICONS,
  createAgentOpinion,
  createCrossReview,
  createDiscussionRound,
  calculateConsensus,
} from './types';
export { DiscussionEngine } from './discussion-engine';
export {
  formatOpinion,
  formatCrossReview,
  formatConsensus,
  formatDiscussionRound,
} from './terminal-formatter';
