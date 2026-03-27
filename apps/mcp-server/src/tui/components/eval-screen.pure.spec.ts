import { describe, it, expect } from 'vitest';
import {
  renderScoreBar,
  renderAgentResult,
  calculateAggregateScore,
  renderEvalScreen,
} from './eval-screen.pure';
import type { AgentReviewResult } from '../dashboard-types';

describe('eval-screen.pure', () => {
  describe('renderScoreBar', () => {
    it('should render 0 score', () => {
      const bar = renderScoreBar(0, 100, 10);
      expect(bar).toContain('░'.repeat(10));
      expect(bar).toContain('0/100');
    });

    it('should render full score', () => {
      const bar = renderScoreBar(100, 100, 10);
      expect(bar).toContain('█'.repeat(10));
      expect(bar).toContain('100/100');
    });

    it('should handle zero maxScore', () => {
      const bar = renderScoreBar(0, 0, 10);
      expect(bar).toContain('0/0');
    });
  });

  describe('renderAgentResult', () => {
    it('should render agent name with status icon', () => {
      const result: AgentReviewResult = {
        agentId: 'sec',
        agentName: 'Security Specialist',
        categories: [{ name: 'OWASP', score: 80, maxScore: 100 }],
        totalScore: 80,
        maxTotalScore: 100,
        status: 'done',
      };
      const lines = renderAgentResult(result, 80);
      expect(lines[0].text).toContain('✅');
      expect(lines[0].text).toContain('Security Specialist');
      expect(lines[1].text).toContain('OWASP');
      expect(lines[2].text).toContain('Total');
    });

    it('should render pending status icon', () => {
      const result: AgentReviewResult = {
        agentId: 'a1',
        agentName: 'Agent',
        categories: [],
        totalScore: 0,
        maxTotalScore: 100,
        status: 'pending',
      };
      const lines = renderAgentResult(result, 80);
      expect(lines[0].text).toContain('⏳');
    });
  });

  describe('calculateAggregateScore', () => {
    it('should return zeros for empty results', () => {
      expect(calculateAggregateScore([])).toEqual({ total: 0, max: 0, percent: 0 });
    });

    it('should aggregate multiple results', () => {
      const results: AgentReviewResult[] = [
        {
          agentId: 'a1',
          agentName: 'A1',
          categories: [],
          totalScore: 80,
          maxTotalScore: 100,
          status: 'done',
        },
        {
          agentId: 'a2',
          agentName: 'A2',
          categories: [],
          totalScore: 60,
          maxTotalScore: 100,
          status: 'done',
        },
      ];
      const agg = calculateAggregateScore(results);
      expect(agg.total).toBe(140);
      expect(agg.max).toBe(200);
      expect(agg.percent).toBe(70);
    });
  });

  describe('renderEvalScreen', () => {
    it('should show empty message when no results', () => {
      const lines = renderEvalScreen([], 80);
      expect(lines[1].text).toContain('no review results yet');
    });

    it('should render results with aggregate score', () => {
      const results: AgentReviewResult[] = [
        {
          agentId: 'sec',
          agentName: 'Security',
          categories: [{ name: 'Auth', score: 90, maxScore: 100 }],
          totalScore: 90,
          maxTotalScore: 100,
          status: 'done',
        },
      ];
      const lines = renderEvalScreen(results, 80);
      expect(lines.some(l => l.text.includes('Security'))).toBe(true);
      expect(lines.some(l => l.text.includes('Aggregate'))).toBe(true);
    });
  });
});
