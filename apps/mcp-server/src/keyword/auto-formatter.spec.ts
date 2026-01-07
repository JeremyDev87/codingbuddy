import { describe, it, expect } from 'vitest';
import { AutoFormatter } from './auto-formatter';
import type { AutoResult, EvalSummary } from './auto-executor.types';
import type { ParseModeResult } from './keyword.types';

/** Creates a minimal mock ParseModeResult for testing */
const createMockParseResult = (): ParseModeResult => ({
  mode: 'PLAN',
  originalPrompt: 'test',
  instructions: '',
  rules: [],
});

/** Creates a minimal mock EvalSummary for testing */
const createMockEvalSummary = (): EvalSummary => ({
  criticalCount: 0,
  highCount: 0,
  mediumCount: 0,
  lowCount: 0,
  issues: [],
});

describe('AutoFormatter', () => {
  describe('formatStart', () => {
    it('should format AUTO mode start message', () => {
      const output = AutoFormatter.formatStart('Add login feature', 3);

      expect(output).toContain('# Mode: AUTO');
      expect(output).toContain('Autonomous Execution Started');
      expect(output).toContain('Add login feature');
      expect(output).toContain('Max Iterations: 3');
    });
  });

  describe('formatIterationPhase', () => {
    it('should format iteration phase header', () => {
      const output = AutoFormatter.formatIterationPhase('plan', 1, 3);

      expect(output).toContain('Iteration 1/3');
      expect(output).toContain('PLAN Phase');
    });

    it('should format ACT phase header', () => {
      const output = AutoFormatter.formatIterationPhase('act', 2, 3);

      expect(output).toContain('Iteration 2/3');
      expect(output).toContain('ACT Phase');
    });

    it('should format EVAL phase header', () => {
      const output = AutoFormatter.formatIterationPhase('eval', 3, 3);

      expect(output).toContain('Iteration 3/3');
      expect(output).toContain('EVAL Phase');
    });
  });

  describe('formatSuccess', () => {
    it('should format successful completion', () => {
      const result: AutoResult = {
        success: true,
        iterations: 2,
        maxIterations: 3,
        finalEvalSummary: {
          criticalCount: 0,
          highCount: 0,
          mediumCount: 1,
          lowCount: 2,
          issues: [],
        },
        iterationHistory: [],
        modifiedFiles: ['src/auth/login.ts', 'src/auth/login.spec.ts'],
        fallbackToPlan: false,
      };

      const output = AutoFormatter.formatSuccess(result);

      expect(output).toContain('COMPLETED');
      expect(output).toContain('Iterations: 2/3');
      expect(output).toContain('Critical: 0');
      expect(output).toContain('src/auth/login.ts');
    });

    it('should handle empty modified files', () => {
      const result: AutoResult = {
        success: true,
        iterations: 1,
        maxIterations: 3,
        finalEvalSummary: {
          criticalCount: 0,
          highCount: 0,
          mediumCount: 0,
          lowCount: 0,
          issues: [],
        },
        iterationHistory: [],
        modifiedFiles: [],
        fallbackToPlan: false,
      };

      const output = AutoFormatter.formatSuccess(result);

      expect(output).toContain('COMPLETED');
      expect(output).toContain('(none)');
    });
  });

  describe('formatFailure', () => {
    it('should format max iterations reached', () => {
      const result: AutoResult = {
        success: false,
        iterations: 3,
        maxIterations: 3,
        finalEvalSummary: {
          criticalCount: 0,
          highCount: 1,
          mediumCount: 0,
          lowCount: 0,
          issues: [{ severity: 'high', description: 'Missing error handling' }],
        },
        iterationHistory: [
          {
            iteration: 1,
            approach: 'Basic implementation',
            planResult: createMockParseResult(),
            actResult: createMockParseResult(),
            evalResult: createMockParseResult(),
            evalSummary: createMockEvalSummary(),
          },
        ],
        modifiedFiles: [],
        fallbackToPlan: true,
      };

      const output = AutoFormatter.formatFailure(result);

      expect(output).toContain('MAX ITERATIONS REACHED');
      expect(output).toContain('Missing error handling');
      expect(output).toContain('Mode: PLAN');
    });
  });

  describe('formatEvalSummary', () => {
    it('should format eval summary with all counts', () => {
      const summary = {
        criticalCount: 1,
        highCount: 2,
        mediumCount: 3,
        lowCount: 4,
        issues: [],
      };

      const output = AutoFormatter.formatEvalSummary(summary);

      expect(output).toContain('Critical: 1');
      expect(output).toContain('High: 2');
      expect(output).toContain('Medium: 3');
      expect(output).toContain('Low: 4');
    });

    it('should indicate iteration needed when high > 0', () => {
      const summary = {
        criticalCount: 0,
        highCount: 1,
        mediumCount: 0,
        lowCount: 0,
        issues: [],
      };

      const output = AutoFormatter.formatEvalSummary(summary);

      expect(output).toContain('반복 필요');
    });
  });
});
