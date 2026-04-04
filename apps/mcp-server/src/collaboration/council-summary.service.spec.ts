import { describe, it, expect } from 'vitest';
import { generateCouncilSummary } from './council-summary.service';
import { createAgentOpinion } from './types';
import type { CouncilInput } from './council-summary.types';

function successInput(
  agentName: string,
  stance: 'approve' | 'concern' | 'reject',
  reasoning: string,
  suggestedChanges: string[] = [],
): CouncilInput {
  return {
    agentName,
    opinion: createAgentOpinion({
      agentId: `specialist:${agentName.toLowerCase().replace(/\s+/g, '-')}`,
      agentName,
      stance,
      reasoning,
      suggestedChanges,
    }),
  };
}

function failedInput(agentName: string, error = 'Agent timed out'): CouncilInput {
  return { agentName, opinion: null, error };
}

describe('generateCouncilSummary', () => {
  describe('normal case: all specialists respond', () => {
    it('should produce a full summary with opinions, consensus, and disagreements', () => {
      const inputs: CouncilInput[] = [
        successInput('Architecture Specialist', 'approve', 'Clean layered design'),
        successInput('Security Specialist', 'reject', 'Missing input validation', [
          'Add schema validation',
        ]),
        successInput('Performance Specialist', 'approve', 'Bundle size within budget'),
      ];

      const summary = generateCouncilSummary(inputs);

      expect(summary.opinions).toHaveLength(3);
      expect(summary.failedAgents).toHaveLength(0);
      expect(summary.partialFailure).toBe(false);
      expect(summary.disagreements.length).toBeGreaterThan(0);
      expect(summary.blockingRisks.length).toBeGreaterThan(0);
      expect(summary.nextStep).toBeTruthy();
    });
  });

  describe('partial failure: 1+ specialist fails', () => {
    it('should produce a degraded but useful summary', () => {
      const inputs: CouncilInput[] = [
        successInput('Architecture Specialist', 'approve', 'Looks good'),
        failedInput('Security Specialist', 'Connection timeout'),
        successInput('Performance Specialist', 'approve', 'No issues'),
      ];

      const summary = generateCouncilSummary(inputs);

      expect(summary.opinions).toHaveLength(2);
      expect(summary.failedAgents).toEqual(['Security Specialist']);
      expect(summary.partialFailure).toBe(true);
      expect(summary.nextStep).toBeTruthy();
    });

    it('should produce summary even when all but one fail', () => {
      const inputs: CouncilInput[] = [
        successInput('Architecture Specialist', 'concern', 'Coupling risk'),
        failedInput('Security Specialist'),
        failedInput('Performance Specialist'),
      ];

      const summary = generateCouncilSummary(inputs);

      expect(summary.opinions).toHaveLength(1);
      expect(summary.failedAgents).toHaveLength(2);
      expect(summary.partialFailure).toBe(true);
      expect(summary.nextStep).toBeTruthy();
    });
  });

  describe('no disagreement: all agree', () => {
    it('should return empty disagreements when all approve', () => {
      const inputs: CouncilInput[] = [
        successInput('Architecture Specialist', 'approve', 'Clean design'),
        successInput('Security Specialist', 'approve', 'Auth is solid'),
        successInput('Performance Specialist', 'approve', 'Fast enough'),
      ];

      const summary = generateCouncilSummary(inputs);

      expect(summary.disagreements).toEqual([]);
      expect(summary.consensus.length).toBeGreaterThan(0);
      expect(summary.blockingRisks).toEqual([]);
    });

    it('should return empty disagreements when all share the same non-approve stance', () => {
      const inputs: CouncilInput[] = [
        successInput('Architecture Specialist', 'concern', 'Coupling risk'),
        successInput('Security Specialist', 'concern', 'Needs review'),
      ];

      const summary = generateCouncilSummary(inputs);

      expect(summary.disagreements).toEqual([]);
    });
  });

  describe('blocker-heavy case', () => {
    it('should collect all blocking risks from reject-stance agents', () => {
      const inputs: CouncilInput[] = [
        successInput('Architecture Specialist', 'reject', 'Circular dependency detected', [
          'Break the cycle via interface',
        ]),
        successInput('Security Specialist', 'reject', 'SQL injection vulnerability', [
          'Use parameterized queries',
        ]),
        successInput('Performance Specialist', 'concern', 'Could be faster'),
      ];

      const summary = generateCouncilSummary(inputs);

      expect(summary.blockingRisks).toHaveLength(2);
      expect(summary.blockingRisks).toContain(
        'Architecture Specialist: Circular dependency detected',
      );
      expect(summary.blockingRisks).toContain('Security Specialist: SQL injection vulnerability');
    });
  });

  describe('nextStep', () => {
    it('should always have a nextStep even on total failure', () => {
      const inputs: CouncilInput[] = [
        failedInput('Architecture Specialist'),
        failedInput('Security Specialist'),
      ];

      const summary = generateCouncilSummary(inputs);

      expect(summary.nextStep).toBeTruthy();
      expect(summary.opinions).toHaveLength(0);
      expect(summary.partialFailure).toBe(true);
    });

    it('should recommend addressing blockers when blocking risks exist', () => {
      const inputs: CouncilInput[] = [
        successInput('Security Specialist', 'reject', 'Critical vulnerability found'),
      ];

      const summary = generateCouncilSummary(inputs);

      expect(summary.nextStep).toContain('block');
    });

    it('should recommend proceeding when consensus is reached', () => {
      const inputs: CouncilInput[] = [
        successInput('Architecture Specialist', 'approve', 'All good'),
        successInput('Security Specialist', 'approve', 'Secure'),
      ];

      const summary = generateCouncilSummary(inputs);

      expect(summary.nextStep).toContain('Proceed');
    });
  });

  describe('edge cases', () => {
    it('should handle empty input', () => {
      const summary = generateCouncilSummary([]);

      expect(summary.opinions).toEqual([]);
      expect(summary.failedAgents).toEqual([]);
      expect(summary.consensus).toEqual([]);
      expect(summary.disagreements).toEqual([]);
      expect(summary.blockingRisks).toEqual([]);
      expect(summary.nextStep).toBeTruthy();
      expect(summary.partialFailure).toBe(false);
    });

    it('should include suggested changes in consensus when shared across agents', () => {
      const inputs: CouncilInput[] = [
        successInput('Architecture Specialist', 'approve', 'Good', ['Add logging']),
        successInput('Security Specialist', 'approve', 'Good', ['Add logging']),
      ];

      const summary = generateCouncilSummary(inputs);

      expect(summary.consensus).toContain('Shared recommendation: Add logging');
    });
  });
});
