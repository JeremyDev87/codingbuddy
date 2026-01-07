import { AutoPromptBuilder } from './auto-prompt-builder';
import type { IterationResult, EvalSummary } from './auto-executor.types';
import type { ParseModeResult } from './keyword.types';

describe('AutoPromptBuilder', () => {
  let builder: AutoPromptBuilder;

  beforeEach(() => {
    builder = new AutoPromptBuilder();
  });

  describe('buildIterationPrompt', () => {
    it('should return original prompt for first iteration', () => {
      const prompt = 'Implement user authentication';
      const result = builder.buildIterationPrompt(prompt, 1, []);

      expect(result).toBe(prompt);
    });

    it('should append critical and high severity issues for subsequent iterations', () => {
      const originalPrompt = 'Implement user authentication';
      const evalSummary: EvalSummary = {
        criticalCount: 1,
        highCount: 1,
        mediumCount: 0,
        lowCount: 0,
        issues: [
          {
            severity: 'critical',
            description: 'SQL injection vulnerability',
          },
          {
            severity: 'high',
            description: 'Missing authentication tests',
          },
          {
            severity: 'medium',
            description: 'Code duplication',
          },
        ],
      };

      const history: IterationResult[] = [
        {
          iteration: 1,
          planResult: {} as ParseModeResult,
          actResult: {} as ParseModeResult,
          evalResult: {} as ParseModeResult,
          evalSummary,
          approach: 'Initial approach',
        },
      ];

      const result = builder.buildIterationPrompt(originalPrompt, 2, history);

      expect(result).toContain(originalPrompt);
      expect(result).toContain('Previous issues to address:');
      expect(result).toContain('- SQL injection vulnerability');
      expect(result).toContain('- Missing authentication tests');
      expect(result).not.toContain('Code duplication'); // medium severity should be excluded
    });

    it('should return original prompt when history is empty for subsequent iterations', () => {
      const prompt = 'Implement feature';
      const result = builder.buildIterationPrompt(prompt, 2, []);

      expect(result).toBe(prompt); // Should fall back to original prompt
    });

    it('should return original prompt when history is null/undefined', () => {
      const prompt = 'Implement feature';
      const resultNull = builder.buildIterationPrompt(
        prompt,
        2,
        null as unknown as IterationResult[],
      );
      const resultUndef = builder.buildIterationPrompt(
        prompt,
        2,
        undefined as unknown as IterationResult[],
      );

      expect(resultNull).toBe(prompt);
      expect(resultUndef).toBe(prompt);
    });

    it('should return original prompt when lastIteration has no evalSummary', () => {
      const prompt = 'Implement feature';
      const history: IterationResult[] = [
        {
          iteration: 1,
          planResult: {} as ParseModeResult,
          actResult: {} as ParseModeResult,
          evalResult: {} as ParseModeResult,
          evalSummary: null as unknown as EvalSummary, // Invalid evalSummary
          approach: 'Test approach',
        },
      ];

      const result = builder.buildIterationPrompt(prompt, 2, history);
      expect(result).toBe(prompt); // Should fall back
    });

    it('should handle iterations with no critical/high issues', () => {
      const originalPrompt = 'Implement feature';
      const evalSummary: EvalSummary = {
        criticalCount: 0,
        highCount: 0,
        mediumCount: 1,
        lowCount: 1,
        issues: [
          {
            severity: 'medium',
            description: 'Minor refactoring needed',
          },
          {
            severity: 'low',
            description: 'Add JSDoc comments',
          },
        ],
      };

      const history: IterationResult[] = [
        {
          iteration: 1,
          planResult: {} as ParseModeResult,
          actResult: {} as ParseModeResult,
          evalResult: {} as ParseModeResult,
          evalSummary,
          approach: 'Initial approach',
        },
      ];

      const result = builder.buildIterationPrompt(originalPrompt, 2, history);

      expect(result).toContain(originalPrompt);
      expect(result).toContain('Previous issues to address:\n');
      expect(result).not.toContain('Minor refactoring needed');
      expect(result).not.toContain('Add JSDoc comments');
    });
  });

  describe('buildFallbackPrompt', () => {
    it('should include all iteration attempts and remaining issues', () => {
      const originalPrompt = 'Implement user authentication';
      const evalSummary1: EvalSummary = {
        criticalCount: 1,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        issues: [
          {
            severity: 'critical',
            description: 'Password not hashed',
          },
        ],
      };

      const evalSummary2: EvalSummary = {
        criticalCount: 0,
        highCount: 1,
        mediumCount: 0,
        lowCount: 0,
        issues: [
          {
            severity: 'high',
            description: 'Missing edge case tests',
          },
        ],
      };

      const history: IterationResult[] = [
        {
          iteration: 1,
          planResult: {} as ParseModeResult,
          actResult: {} as ParseModeResult,
          evalResult: {} as ParseModeResult,
          evalSummary: evalSummary1,
          approach: 'Use bcrypt for hashing',
        },
        {
          iteration: 2,
          planResult: {} as ParseModeResult,
          actResult: {} as ParseModeResult,
          evalResult: {} as ParseModeResult,
          evalSummary: evalSummary2,
          approach: 'Add comprehensive test suite',
        },
      ];

      const result = builder.buildFallbackPrompt(originalPrompt, history);

      expect(result).toContain(originalPrompt);
      expect(result).toContain('Previous attempts:');
      expect(result).toContain('- Iteration 1: Use bcrypt for hashing');
      expect(result).toContain('- Iteration 2: Add comprehensive test suite');
      expect(result).toContain('Remaining issues:');
      expect(result).toContain('- [HIGH] Missing edge case tests');
      expect(result).toContain('Please propose a new approach.');
    });

    it('should handle single iteration history', () => {
      const originalPrompt = 'Implement feature';
      const evalSummary: EvalSummary = {
        criticalCount: 1,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        issues: [
          {
            severity: 'critical',
            description: 'Security flaw detected',
          },
        ],
      };

      const history: IterationResult[] = [
        {
          iteration: 1,
          planResult: {} as ParseModeResult,
          actResult: {} as ParseModeResult,
          evalResult: {} as ParseModeResult,
          evalSummary,
          approach: 'First attempt',
        },
      ];

      const result = builder.buildFallbackPrompt(originalPrompt, history);

      expect(result).toContain('- Iteration 1: First attempt');
      expect(result).toContain('- [CRITICAL] Security flaw detected');
    });

    it('should only include critical and high severity issues', () => {
      const originalPrompt = 'Implement feature';
      const evalSummary: EvalSummary = {
        criticalCount: 1,
        highCount: 1,
        mediumCount: 1,
        lowCount: 1,
        issues: [
          {
            severity: 'critical',
            description: 'Critical security issue',
          },
          {
            severity: 'high',
            description: 'High priority test issue',
          },
          {
            severity: 'medium',
            description: 'Medium priority issue',
          },
          {
            severity: 'low',
            description: 'Low priority issue',
          },
        ],
      };

      const history: IterationResult[] = [
        {
          iteration: 1,
          planResult: {} as ParseModeResult,
          actResult: {} as ParseModeResult,
          evalResult: {} as ParseModeResult,
          evalSummary,
          approach: 'Test approach',
        },
      ];

      const result = builder.buildFallbackPrompt(originalPrompt, history);

      expect(result).toContain('- [CRITICAL] Critical security issue');
      expect(result).toContain('- [HIGH] High priority test issue');
      expect(result).not.toContain('Medium priority issue');
      expect(result).not.toContain('Low priority issue');
    });
  });
});
