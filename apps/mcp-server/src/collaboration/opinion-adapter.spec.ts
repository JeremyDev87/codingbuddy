import { describe, it, expect } from 'vitest';
import {
  mapSeverityToStance,
  convertSpecialistResult,
  convertSpecialistResults,
  type SpecialistResult,
} from './opinion-adapter';

describe('opinion-adapter', () => {
  describe('mapSeverityToStance', () => {
    it('should map "critical" severity to "reject"', () => {
      expect(mapSeverityToStance('critical')).toBe('reject');
    });

    it('should map "high" severity to "reject"', () => {
      expect(mapSeverityToStance('high')).toBe('reject');
    });

    it('should map "medium" severity to "concern"', () => {
      expect(mapSeverityToStance('medium')).toBe('concern');
    });

    it('should map "low" severity to "approve"', () => {
      expect(mapSeverityToStance('low')).toBe('approve');
    });

    it('should map "none" severity to "approve"', () => {
      expect(mapSeverityToStance('none')).toBe('approve');
    });
  });

  describe('convertSpecialistResult', () => {
    it('should convert a specialist result with critical findings to a reject opinion', () => {
      const result: SpecialistResult = {
        agentName: 'Security Specialist',
        findings: [
          { text: 'SQL injection vulnerability found', severity: 'critical' },
          { text: 'Missing input validation', severity: 'high' },
        ],
        recommendations: ['Use parameterized queries', 'Add input sanitization'],
      };

      const opinion = convertSpecialistResult(result);

      expect(opinion.agentName).toBe('Security Specialist');
      expect(opinion.agentId).toBe('specialist:security-specialist');
      expect(opinion.stance).toBe('reject');
      expect(opinion.reasoning).toContain('SQL injection vulnerability found');
      expect(opinion.reasoning).toContain('Missing input validation');
      expect(opinion.suggestedChanges).toEqual([
        'Use parameterized queries',
        'Add input sanitization',
      ]);
    });

    it('should convert a specialist result with medium findings to a concern opinion', () => {
      const result: SpecialistResult = {
        agentName: 'Code Quality Specialist',
        findings: [{ text: 'Function complexity is borderline', severity: 'medium' }],
        recommendations: ['Consider extracting helper functions'],
      };

      const opinion = convertSpecialistResult(result);

      expect(opinion.stance).toBe('concern');
      expect(opinion.reasoning).toContain('Function complexity is borderline');
      expect(opinion.suggestedChanges).toEqual(['Consider extracting helper functions']);
    });

    it('should convert a specialist result with no findings to an approve opinion', () => {
      const result: SpecialistResult = {
        agentName: 'Performance Specialist',
        findings: [],
        recommendations: [],
      };

      const opinion = convertSpecialistResult(result);

      expect(opinion.stance).toBe('approve');
      expect(opinion.reasoning).toBe('No issues found.');
      expect(opinion.suggestedChanges).toEqual([]);
    });

    it('should use the highest severity finding to determine stance', () => {
      const result: SpecialistResult = {
        agentName: 'Architecture Specialist',
        findings: [
          { text: 'Minor naming inconsistency', severity: 'low' },
          { text: 'Circular dependency detected', severity: 'high' },
          { text: 'Consider adding interface', severity: 'medium' },
        ],
        recommendations: ['Break circular dependency'],
      };

      const opinion = convertSpecialistResult(result);

      // highest severity is 'high' → reject
      expect(opinion.stance).toBe('reject');
    });

    it('should generate agentId from agentName by slugifying', () => {
      const result: SpecialistResult = {
        agentName: 'Test Strategy Specialist',
        findings: [{ text: 'Missing edge case tests', severity: 'low' }],
        recommendations: [],
      };

      const opinion = convertSpecialistResult(result);

      expect(opinion.agentId).toBe('specialist:test-strategy-specialist');
    });
  });

  describe('convertSpecialistResults', () => {
    it('should convert multiple specialist results into a DiscussionRound', () => {
      const results: SpecialistResult[] = [
        {
          agentName: 'Security Specialist',
          findings: [{ text: 'Auth token exposed', severity: 'critical' }],
          recommendations: ['Encrypt tokens'],
        },
        {
          agentName: 'Performance Specialist',
          findings: [],
          recommendations: [],
        },
      ];

      const round = convertSpecialistResults(results, 1);

      expect(round.roundNumber).toBe(1);
      expect(round.opinions).toHaveLength(2);
      expect(round.opinions[0].agentName).toBe('Security Specialist');
      expect(round.opinions[0].stance).toBe('reject');
      expect(round.opinions[1].agentName).toBe('Performance Specialist');
      expect(round.opinions[1].stance).toBe('approve');
      expect(round.crossReviews).toEqual([]);
    });

    it('should default roundNumber to 1 when not provided', () => {
      const round = convertSpecialistResults([]);

      expect(round.roundNumber).toBe(1);
      expect(round.opinions).toHaveLength(0);
    });
  });
});
