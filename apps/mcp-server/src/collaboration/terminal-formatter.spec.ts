import { describe, it, expect } from 'vitest';
import {
  formatOpinion,
  formatCrossReview,
  formatConsensus,
  formatDiscussionRound,
} from './terminal-formatter';
import { createAgentOpinion, createCrossReview } from './types';
import type { AgentOpinion, CrossReview, ConsensusResult, DiscussionRound } from './types';

describe('terminal-formatter', () => {
  describe('formatOpinion', () => {
    it('should format an approve opinion with emoji and stance', () => {
      const opinion = createAgentOpinion({
        agentId: 'arch-1',
        agentName: 'architecture',
        stance: 'approve',
        reasoning: 'Clean separation of concerns',
      });

      const result = formatOpinion(opinion);

      expect(result).toContain('architecture');
      expect(result).toContain('✅');
      expect(result).toContain('approve');
      expect(result).toContain('Clean separation of concerns');
    });

    it('should format a concern opinion', () => {
      const opinion = createAgentOpinion({
        agentId: 'arch-1',
        agentName: 'architecture',
        stance: 'concern',
        reasoning: 'Circular dependency risk',
      });

      const result = formatOpinion(opinion);

      expect(result).toContain('⚠️');
      expect(result).toContain('concern');
      expect(result).toContain('Circular dependency risk');
    });

    it('should format a reject opinion', () => {
      const opinion = createAgentOpinion({
        agentId: 'sec-1',
        agentName: 'security',
        stance: 'reject',
        reasoning: 'Separation breaks auth context',
      });

      const result = formatOpinion(opinion);

      expect(result).toContain('❌');
      expect(result).toContain('reject');
      expect(result).toContain('Separation breaks auth context');
    });

    it('should include suggested changes when present', () => {
      const opinion = createAgentOpinion({
        agentId: 'sec-1',
        agentName: 'security',
        stance: 'reject',
        reasoning: 'Auth breaks',
        suggestedChanges: ['Add middleware isolation'],
      });

      const result = formatOpinion(opinion);

      expect(result).toContain('Add middleware isolation');
    });
  });

  describe('formatCrossReview', () => {
    it('should format a cross-review with arrow notation', () => {
      const review = createCrossReview({
        fromAgentId: 'arch-1',
        toAgentId: 'sec-1',
        stance: 'approve',
        comment: 'Middleware + interface segregation',
      });

      const agentNames: Record<string, string> = {
        'arch-1': 'architecture',
        'sec-1': 'security',
      };

      const result = formatCrossReview(review, agentNames);

      expect(result).toContain('architecture');
      expect(result).toContain('→');
      expect(result).toContain('security');
      expect(result).toContain('agrees');
      expect(result).toContain('Middleware + interface segregation');
    });

    it('should show "disagrees" for reject cross-review', () => {
      const review = createCrossReview({
        fromAgentId: 'sec-1',
        toAgentId: 'arch-1',
        stance: 'reject',
        comment: 'Not sufficient',
      });

      const agentNames: Record<string, string> = {
        'arch-1': 'architecture',
        'sec-1': 'security',
      };

      const result = formatCrossReview(review, agentNames);

      expect(result).toContain('disagrees');
    });

    it('should show "notes" for concern cross-review', () => {
      const review = createCrossReview({
        fromAgentId: 'test-1',
        toAgentId: 'arch-1',
        stance: 'concern',
        comment: 'Edge cases missing',
      });

      const agentNames: Record<string, string> = {
        'test-1': 'test-strategy',
        'arch-1': 'architecture',
      };

      const result = formatCrossReview(review, agentNames);

      expect(result).toContain('notes');
    });
  });

  describe('formatConsensus', () => {
    it('should format full consensus', () => {
      const consensus: ConsensusResult = {
        totalAgents: 4,
        approveCount: 4,
        concernCount: 0,
        rejectCount: 0,
        reached: true,
        criticalCount: 0,
      };

      const result = formatConsensus(consensus);

      expect(result).toContain('✅');
      expect(result).toContain('Consensus');
      expect(result).toContain('4/4');
      expect(result).toContain('Critical: 0');
    });

    it('should format failed consensus with critical count', () => {
      const consensus: ConsensusResult = {
        totalAgents: 3,
        approveCount: 1,
        concernCount: 1,
        rejectCount: 1,
        reached: false,
        criticalCount: 1,
      };

      const result = formatConsensus(consensus);

      expect(result).toContain('❌');
      expect(result).toContain('1/3');
      expect(result).toContain('Critical: 1');
    });
  });

  describe('formatDiscussionRound', () => {
    it('should format a complete round with opinions, cross-reviews, and consensus', () => {
      const opinions: AgentOpinion[] = [
        createAgentOpinion({
          agentId: 'arch-1',
          agentName: 'architecture',
          stance: 'concern',
          reasoning: 'Circular dependency risk',
        }),
        createAgentOpinion({
          agentId: 'sec-1',
          agentName: 'security',
          stance: 'reject',
          reasoning: 'Separation breaks auth context',
        }),
        createAgentOpinion({
          agentId: 'test-1',
          agentName: 'test-strategy',
          stance: 'approve',
          reasoning: 'Good testability',
        }),
      ];

      const crossReviews: CrossReview[] = [
        createCrossReview({
          fromAgentId: 'arch-1',
          toAgentId: 'sec-1',
          stance: 'approve',
          comment: 'Middleware + interface segregation',
        }),
      ];

      const round: DiscussionRound = {
        roundNumber: 1,
        opinions,
        crossReviews,
      };

      const result = formatDiscussionRound(round);

      // Should contain all opinions
      expect(result).toContain('architecture');
      expect(result).toContain('security');
      expect(result).toContain('test-strategy');
      // Should contain cross-review
      expect(result).toContain('→');
      // Should contain consensus line
      expect(result).toContain('Consensus');
      expect(result).toContain('Critical: 1');
    });

    it('should handle round with no cross-reviews', () => {
      const round: DiscussionRound = {
        roundNumber: 1,
        opinions: [
          createAgentOpinion({
            agentId: 'a1',
            agentName: 'architect',
            stance: 'approve',
            reasoning: 'ok',
          }),
        ],
        crossReviews: [],
      };

      const result = formatDiscussionRound(round);

      expect(result).toContain('architect');
      expect(result).toContain('Consensus');
      expect(result).not.toContain('→');
    });
  });
});
