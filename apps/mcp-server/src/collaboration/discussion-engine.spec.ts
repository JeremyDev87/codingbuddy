import { describe, it, expect } from 'vitest';
import { DiscussionEngine } from './discussion-engine';
import { createAgentOpinion, createCrossReview } from './types';

describe('DiscussionEngine', () => {
  function createEngine(): DiscussionEngine {
    return new DiscussionEngine();
  }

  describe('addOpinion', () => {
    it('should add opinion to current round', () => {
      const engine = createEngine();
      const opinion = createAgentOpinion({
        agentId: 'arch-1',
        agentName: 'Architecture Specialist',
        stance: 'approve',
        reasoning: 'Clean design',
      });

      engine.addOpinion(opinion);

      const round = engine.getCurrentRound();
      expect(round.opinions).toHaveLength(1);
      expect(round.opinions[0].agentId).toBe('arch-1');
    });

    it('should accumulate multiple opinions in same round', () => {
      const engine = createEngine();

      engine.addOpinion(
        createAgentOpinion({
          agentId: 'arch-1',
          agentName: 'Architect',
          stance: 'approve',
          reasoning: 'ok',
        }),
      );
      engine.addOpinion(
        createAgentOpinion({
          agentId: 'sec-1',
          agentName: 'Security',
          stance: 'reject',
          reasoning: 'no',
        }),
      );

      const round = engine.getCurrentRound();
      expect(round.opinions).toHaveLength(2);
    });
  });

  describe('addCrossReview', () => {
    it('should add cross-review to current round', () => {
      const engine = createEngine();

      engine.addOpinion(
        createAgentOpinion({
          agentId: 'arch-1',
          agentName: 'Architect',
          stance: 'concern',
          reasoning: 'Circular dep risk',
        }),
      );

      engine.addCrossReview(
        createCrossReview({
          fromAgentId: 'arch-1',
          toAgentId: 'sec-1',
          stance: 'approve',
          comment: 'Middleware solves it',
        }),
      );

      const round = engine.getCurrentRound();
      expect(round.crossReviews).toHaveLength(1);
      expect(round.crossReviews[0].fromAgentId).toBe('arch-1');
    });
  });

  describe('nextRound', () => {
    it('should advance to a new round', () => {
      const engine = createEngine();

      engine.addOpinion(
        createAgentOpinion({
          agentId: 'a1',
          agentName: 'A1',
          stance: 'approve',
          reasoning: 'ok',
        }),
      );

      engine.nextRound();

      const round = engine.getCurrentRound();
      expect(round.roundNumber).toBe(2);
      expect(round.opinions).toHaveLength(0);
    });

    it('should preserve previous rounds', () => {
      const engine = createEngine();

      engine.addOpinion(
        createAgentOpinion({
          agentId: 'a1',
          agentName: 'A1',
          stance: 'approve',
          reasoning: 'ok',
        }),
      );
      engine.nextRound();

      const allRounds = engine.getAllRounds();
      expect(allRounds).toHaveLength(2);
      expect(allRounds[0].opinions).toHaveLength(1);
      expect(allRounds[1].opinions).toHaveLength(0);
    });
  });

  describe('getConsensus', () => {
    it('should calculate consensus for current round', () => {
      const engine = createEngine();

      engine.addOpinion(
        createAgentOpinion({
          agentId: 'a1',
          agentName: 'A1',
          stance: 'approve',
          reasoning: 'ok',
        }),
      );
      engine.addOpinion(
        createAgentOpinion({
          agentId: 'a2',
          agentName: 'A2',
          stance: 'approve',
          reasoning: 'ok',
        }),
      );
      engine.addOpinion(
        createAgentOpinion({
          agentId: 'a3',
          agentName: 'A3',
          stance: 'concern',
          reasoning: 'watch',
        }),
      );

      const consensus = engine.getConsensus();
      expect(consensus.totalAgents).toBe(3);
      expect(consensus.approveCount).toBe(2);
      expect(consensus.concernCount).toBe(1);
      expect(consensus.reached).toBe(true);
    });

    it('should not reach consensus with rejections', () => {
      const engine = createEngine();

      engine.addOpinion(
        createAgentOpinion({
          agentId: 'a1',
          agentName: 'A1',
          stance: 'approve',
          reasoning: 'ok',
        }),
      );
      engine.addOpinion(
        createAgentOpinion({
          agentId: 'a2',
          agentName: 'A2',
          stance: 'reject',
          reasoning: 'no',
        }),
      );

      const consensus = engine.getConsensus();
      expect(consensus.reached).toBe(false);
      expect(consensus.criticalCount).toBe(1);
    });
  });

  describe('getAgentStanceHistory', () => {
    it('should track stance changes across rounds', () => {
      const engine = createEngine();

      engine.addOpinion(
        createAgentOpinion({
          agentId: 'a1',
          agentName: 'Architect',
          stance: 'concern',
          reasoning: 'risky',
        }),
      );
      engine.nextRound();
      engine.addOpinion(
        createAgentOpinion({
          agentId: 'a1',
          agentName: 'Architect',
          stance: 'approve',
          reasoning: 'revised approach works',
        }),
      );

      const history = engine.getAgentStanceHistory('a1');
      expect(history).toEqual(['concern', 'approve']);
    });

    it('should return empty for unknown agent', () => {
      const engine = createEngine();
      expect(engine.getAgentStanceHistory('unknown')).toEqual([]);
    });
  });

  describe('reset', () => {
    it('should clear all rounds and start fresh', () => {
      const engine = createEngine();

      engine.addOpinion(
        createAgentOpinion({
          agentId: 'a1',
          agentName: 'A1',
          stance: 'approve',
          reasoning: 'ok',
        }),
      );
      engine.nextRound();

      engine.reset();

      expect(engine.getAllRounds()).toHaveLength(1);
      expect(engine.getCurrentRound().roundNumber).toBe(1);
      expect(engine.getCurrentRound().opinions).toHaveLength(0);
    });
  });
});
