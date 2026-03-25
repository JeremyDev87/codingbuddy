import { describe, it, expect } from 'vitest';
import {
  renderOpinionLine,
  renderCrossReviewLine,
  renderConsensusLine,
  renderDiscussionPanel,
  renderStanceHistory,
} from './agent-discussion-panel.pure';
import { createAgentOpinion, createCrossReview } from '../../collaboration/types';
import type { DiscussionRound, ConsensusResult } from '../../collaboration/types';

describe('agent-discussion-panel.pure', () => {
  describe('renderStanceHistory', () => {
    it('should return empty for single stance', () => {
      expect(renderStanceHistory(['approve'])).toBe('');
    });

    it('should render arrow-separated icons for multiple stances', () => {
      const result = renderStanceHistory(['concern', 'approve']);
      expect(result).toContain('⚠️');
      expect(result).toContain('→');
      expect(result).toContain('✅');
    });
  });

  describe('renderOpinionLine', () => {
    it('should render opinion with agent name and stance', () => {
      const opinion = createAgentOpinion({
        agentId: 'arch-1',
        agentName: 'architecture',
        stance: 'approve',
        reasoning: 'Clean design',
      });

      const line = renderOpinionLine(opinion);

      expect(line.type).toBe('opinion');
      expect(line.text).toContain('architecture');
      expect(line.text).toContain('✅');
      expect(line.text).toContain('Clean design');
    });

    it('should show (revised) suffix when stance changed from concern/reject', () => {
      const opinion = createAgentOpinion({
        agentId: 'arch-1',
        agentName: 'architecture',
        stance: 'approve',
        reasoning: 'Now ok',
      });

      const line = renderOpinionLine(opinion, ['concern', 'approve']);

      expect(line.text).toContain('(revised)');
    });

    it('should not show suffix when no stance change', () => {
      const opinion = createAgentOpinion({
        agentId: 'arch-1',
        agentName: 'architecture',
        stance: 'approve',
        reasoning: 'Still ok',
      });

      const line = renderOpinionLine(opinion, ['approve']);

      expect(line.text).not.toContain('(revised)');
      expect(line.text).not.toContain('(alt)');
    });
  });

  describe('renderCrossReviewLine', () => {
    it('should render arrow notation between agents', () => {
      const review = createCrossReview({
        fromAgentId: 'arch-1',
        toAgentId: 'sec-1',
        stance: 'approve',
        comment: 'Good approach',
      });

      const line = renderCrossReviewLine(review, {
        'arch-1': 'architecture',
        'sec-1': 'security',
      });

      expect(line.type).toBe('cross-review');
      expect(line.text).toContain('architecture');
      expect(line.text).toContain('→');
      expect(line.text).toContain('security');
      expect(line.text).toContain('agrees');
    });
  });

  describe('renderConsensusLine', () => {
    it('should render consensus reached', () => {
      const consensus: ConsensusResult = {
        totalAgents: 3,
        approveCount: 3,
        concernCount: 0,
        rejectCount: 0,
        reached: true,
        criticalCount: 0,
      };

      const line = renderConsensusLine(consensus);

      expect(line.type).toBe('consensus');
      expect(line.text).toContain('✅');
      expect(line.text).toContain('3/3');
      expect(line.text).toContain('Critical: 0');
    });

    it('should render consensus not reached', () => {
      const consensus: ConsensusResult = {
        totalAgents: 3,
        approveCount: 1,
        concernCount: 0,
        rejectCount: 2,
        reached: false,
        criticalCount: 2,
      };

      const line = renderConsensusLine(consensus);

      expect(line.text).toContain('❌');
      expect(line.text).toContain('Critical: 2');
    });
  });

  describe('renderDiscussionPanel', () => {
    it('should render empty message when no rounds have opinions', () => {
      const lines = renderDiscussionPanel([], 80);

      expect(lines).toHaveLength(1);
      expect(lines[0].type).toBe('empty');
    });

    it('should render header, opinions, and consensus for a round', () => {
      const round: DiscussionRound = {
        roundNumber: 1,
        opinions: [
          createAgentOpinion({
            agentId: 'arch-1',
            agentName: 'architecture',
            stance: 'approve',
            reasoning: 'Good',
          }),
          createAgentOpinion({
            agentId: 'sec-1',
            agentName: 'security',
            stance: 'concern',
            reasoning: 'Watch auth',
          }),
        ],
        crossReviews: [],
      };

      const lines = renderDiscussionPanel([round], 80);

      const types = lines.map(l => l.type);
      expect(types).toContain('header');
      expect(types).toContain('opinion');
      expect(types).toContain('consensus');
      expect(lines.filter(l => l.type === 'opinion')).toHaveLength(2);
    });

    it('should include cross-reviews when present', () => {
      const round: DiscussionRound = {
        roundNumber: 1,
        opinions: [
          createAgentOpinion({
            agentId: 'arch-1',
            agentName: 'architecture',
            stance: 'concern',
            reasoning: 'Risk',
          }),
          createAgentOpinion({
            agentId: 'sec-1',
            agentName: 'security',
            stance: 'reject',
            reasoning: 'No',
          }),
        ],
        crossReviews: [
          createCrossReview({
            fromAgentId: 'arch-1',
            toAgentId: 'sec-1',
            stance: 'approve',
            comment: 'Solution found',
          }),
        ],
      };

      const lines = renderDiscussionPanel([round], 80);

      const types = lines.map(l => l.type);
      expect(types).toContain('cross-review');
    });
  });
});
