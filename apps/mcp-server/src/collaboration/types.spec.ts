import { describe, it, expect } from 'vitest';
import {
  type AgentOpinion,
  type CrossReview,
  STANCES,
  createAgentOpinion,
  createCrossReview,
  createDiscussionRound,
  calculateConsensus,
} from './types';

describe('collaboration/types', () => {
  describe('STANCES', () => {
    it('should contain approve, concern, and reject', () => {
      expect(STANCES).toEqual(['approve', 'concern', 'reject']);
    });
  });

  describe('createAgentOpinion', () => {
    it('should create an opinion with required fields', () => {
      const opinion = createAgentOpinion({
        agentId: 'arch-1',
        agentName: 'Architecture Specialist',
        stance: 'approve',
        reasoning: 'Clean separation of concerns',
      });

      expect(opinion.agentId).toBe('arch-1');
      expect(opinion.agentName).toBe('Architecture Specialist');
      expect(opinion.stance).toBe('approve');
      expect(opinion.reasoning).toBe('Clean separation of concerns');
      expect(opinion.suggestedChanges).toEqual([]);
      expect(opinion.timestamp).toBeGreaterThan(0);
    });

    it('should include suggested changes when provided', () => {
      const opinion = createAgentOpinion({
        agentId: 'sec-1',
        agentName: 'Security Specialist',
        stance: 'reject',
        reasoning: 'Auth context breaks',
        suggestedChanges: ['Add middleware isolation', 'Use interface segregation'],
      });

      expect(opinion.suggestedChanges).toEqual([
        'Add middleware isolation',
        'Use interface segregation',
      ]);
    });

    it('should accept custom timestamp', () => {
      const opinion = createAgentOpinion({
        agentId: 'test-1',
        agentName: 'Test Engineer',
        stance: 'concern',
        reasoning: 'Missing edge cases',
        timestamp: 1000,
      });

      expect(opinion.timestamp).toBe(1000);
    });
  });

  describe('createCrossReview', () => {
    it('should create a cross-review between two agents', () => {
      const review = createCrossReview({
        fromAgentId: 'arch-1',
        toAgentId: 'sec-1',
        stance: 'approve',
        comment: 'Middleware + interface segregation works',
      });

      expect(review.fromAgentId).toBe('arch-1');
      expect(review.toAgentId).toBe('sec-1');
      expect(review.stance).toBe('approve');
      expect(review.comment).toBe('Middleware + interface segregation works');
      expect(review.timestamp).toBeGreaterThan(0);
    });
  });

  describe('createDiscussionRound', () => {
    it('should create a round with opinions and empty cross-reviews', () => {
      const opinions: AgentOpinion[] = [
        createAgentOpinion({
          agentId: 'arch-1',
          agentName: 'Architecture Specialist',
          stance: 'approve',
          reasoning: 'Looks good',
        }),
      ];

      const round = createDiscussionRound(1, opinions);

      expect(round.roundNumber).toBe(1);
      expect(round.opinions).toHaveLength(1);
      expect(round.crossReviews).toEqual([]);
    });

    it('should include cross-reviews when provided', () => {
      const opinions: AgentOpinion[] = [
        createAgentOpinion({
          agentId: 'arch-1',
          agentName: 'Architect',
          stance: 'concern',
          reasoning: 'Circular dep risk',
        }),
        createAgentOpinion({
          agentId: 'sec-1',
          agentName: 'Security',
          stance: 'reject',
          reasoning: 'Auth context breaks',
        }),
      ];

      const crossReviews: CrossReview[] = [
        createCrossReview({
          fromAgentId: 'arch-1',
          toAgentId: 'sec-1',
          stance: 'approve',
          comment: 'Middleware solves it',
        }),
      ];

      const round = createDiscussionRound(2, opinions, crossReviews);

      expect(round.roundNumber).toBe(2);
      expect(round.opinions).toHaveLength(2);
      expect(round.crossReviews).toHaveLength(1);
    });
  });

  describe('calculateConsensus', () => {
    it('should return full consensus when all approve', () => {
      const opinions: AgentOpinion[] = [
        createAgentOpinion({ agentId: 'a1', agentName: 'A1', stance: 'approve', reasoning: 'ok' }),
        createAgentOpinion({ agentId: 'a2', agentName: 'A2', stance: 'approve', reasoning: 'ok' }),
        createAgentOpinion({ agentId: 'a3', agentName: 'A3', stance: 'approve', reasoning: 'ok' }),
      ];

      const result = calculateConsensus(opinions);

      expect(result.totalAgents).toBe(3);
      expect(result.approveCount).toBe(3);
      expect(result.concernCount).toBe(0);
      expect(result.rejectCount).toBe(0);
      expect(result.reached).toBe(true);
      expect(result.criticalCount).toBe(0);
    });

    it('should not reach consensus when there are rejections', () => {
      const opinions: AgentOpinion[] = [
        createAgentOpinion({ agentId: 'a1', agentName: 'A1', stance: 'approve', reasoning: 'ok' }),
        createAgentOpinion({ agentId: 'a2', agentName: 'A2', stance: 'reject', reasoning: 'no' }),
        createAgentOpinion({ agentId: 'a3', agentName: 'A3', stance: 'approve', reasoning: 'ok' }),
      ];

      const result = calculateConsensus(opinions);

      expect(result.totalAgents).toBe(3);
      expect(result.approveCount).toBe(2);
      expect(result.rejectCount).toBe(1);
      expect(result.reached).toBe(false);
      expect(result.criticalCount).toBe(1);
    });

    it('should reach consensus with concerns but no rejections', () => {
      const opinions: AgentOpinion[] = [
        createAgentOpinion({ agentId: 'a1', agentName: 'A1', stance: 'approve', reasoning: 'ok' }),
        createAgentOpinion({
          agentId: 'a2',
          agentName: 'A2',
          stance: 'concern',
          reasoning: 'watch out',
        }),
      ];

      const result = calculateConsensus(opinions);

      expect(result.totalAgents).toBe(2);
      expect(result.approveCount).toBe(1);
      expect(result.concernCount).toBe(1);
      expect(result.rejectCount).toBe(0);
      expect(result.reached).toBe(true);
      expect(result.criticalCount).toBe(0);
    });

    it('should handle empty opinions', () => {
      const result = calculateConsensus([]);

      expect(result.totalAgents).toBe(0);
      expect(result.reached).toBe(false);
      expect(result.criticalCount).toBe(0);
    });
  });
});
