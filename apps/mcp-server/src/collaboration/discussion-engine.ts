/**
 * Discussion Engine — tracks agent opinions, cross-reviews, and consensus
 * across multiple rounds of structured debate.
 */
import type { AgentOpinion, CrossReview, ConsensusResult, DiscussionRound, Stance } from './types';
import { calculateConsensus } from './types';

export class DiscussionEngine {
  private rounds: DiscussionRound[] = [];

  constructor() {
    this.rounds.push({ roundNumber: 1, opinions: [], crossReviews: [] });
  }

  /** Add an agent opinion to the current round. */
  addOpinion(opinion: AgentOpinion): void {
    const current = this.mutableCurrentRound();
    (current.opinions as AgentOpinion[]).push(opinion);
  }

  /** Add a cross-review to the current round. */
  addCrossReview(review: CrossReview): void {
    const current = this.mutableCurrentRound();
    (current.crossReviews as CrossReview[]).push(review);
  }

  /** Advance to the next discussion round. */
  nextRound(): void {
    const nextNumber = this.rounds.length + 1;
    this.rounds.push({ roundNumber: nextNumber, opinions: [], crossReviews: [] });
  }

  /** Get the current (latest) discussion round. */
  getCurrentRound(): DiscussionRound {
    return this.rounds[this.rounds.length - 1];
  }

  /** Get all discussion rounds. */
  getAllRounds(): readonly DiscussionRound[] {
    return this.rounds;
  }

  /** Calculate consensus for the current round's opinions. */
  getConsensus(): ConsensusResult {
    return calculateConsensus(this.getCurrentRound().opinions);
  }

  /** Track an agent's stance changes across all rounds. */
  getAgentStanceHistory(agentId: string): Stance[] {
    const stances: Stance[] = [];
    for (const round of this.rounds) {
      const opinion = round.opinions.find(o => o.agentId === agentId);
      if (opinion) {
        stances.push(opinion.stance);
      }
    }
    return stances;
  }

  /** Reset the engine, clearing all rounds. */
  reset(): void {
    this.rounds = [{ roundNumber: 1, opinions: [], crossReviews: [] }];
  }

  private mutableCurrentRound(): DiscussionRound {
    return this.rounds[this.rounds.length - 1];
  }
}
