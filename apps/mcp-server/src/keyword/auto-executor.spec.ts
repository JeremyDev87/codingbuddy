import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { AutoExecutor, type AutoExecutorDependencies } from './auto-executor';
import type { AutoExecutorOptions, EvalSummary } from './auto-executor.types';
import type { ParseModeResult } from './keyword.types';

describe('AutoExecutor', () => {
  let executor: AutoExecutor;
  let mockDeps: {
    parsePlan: Mock<(prompt: string) => Promise<ParseModeResult>>;
    parseAct: Mock<(prompt: string) => Promise<ParseModeResult>>;
    parseEval: Mock<(prompt: string) => Promise<ParseModeResult>>;
    extractEvalSummary: Mock<(evalResult: ParseModeResult) => EvalSummary>;
  };

  const createMockParseResult = (
    mode: string,
    instructions?: string,
    delegatesTo?: string,
  ): ParseModeResult => ({
    mode: mode as 'PLAN' | 'ACT' | 'EVAL',
    originalPrompt: 'test prompt',
    instructions:
      instructions !== undefined ? instructions : 'test instructions',
    rules: [],
    ...(delegatesTo && { delegates_to: delegatesTo }),
  });

  beforeEach(() => {
    mockDeps = {
      parsePlan: vi.fn().mockResolvedValue(createMockParseResult('PLAN')),
      parseAct: vi.fn().mockResolvedValue(createMockParseResult('ACT')),
      parseEval: vi.fn().mockResolvedValue(createMockParseResult('EVAL')),
      extractEvalSummary: vi.fn(),
    };

    executor = new AutoExecutor(mockDeps as AutoExecutorDependencies);
  });

  describe('execute', () => {
    it('should complete successfully when no critical/high issues on first iteration', async () => {
      const goodSummary: EvalSummary = {
        criticalCount: 0,
        highCount: 0,
        mediumCount: 1,
        lowCount: 2,
        issues: [],
      };
      mockDeps.extractEvalSummary.mockReturnValue(goodSummary);

      const options: AutoExecutorOptions = {
        maxIterations: 3,
        prompt: 'Add login feature',
      };

      const result = await executor.execute(options);

      expect(result.success).toBe(true);
      expect(result.iterations).toBe(1);
      expect(result.fallbackToPlan).toBe(false);
      expect(mockDeps.parsePlan).toHaveBeenCalledTimes(1);
      expect(mockDeps.parseAct).toHaveBeenCalledTimes(1);
      expect(mockDeps.parseEval).toHaveBeenCalledTimes(1);
    });

    it('should iterate until quality achieved', async () => {
      const badSummary: EvalSummary = {
        criticalCount: 0,
        highCount: 1,
        mediumCount: 0,
        lowCount: 0,
        issues: [{ severity: 'high', description: 'Missing error handling' }],
      };
      const goodSummary: EvalSummary = {
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        issues: [],
      };

      mockDeps.extractEvalSummary
        .mockReturnValueOnce(badSummary)
        .mockReturnValueOnce(goodSummary);

      const options: AutoExecutorOptions = {
        maxIterations: 3,
        prompt: 'Add login feature',
      };

      const result = await executor.execute(options);

      expect(result.success).toBe(true);
      expect(result.iterations).toBe(2);
      expect(mockDeps.parsePlan).toHaveBeenCalledTimes(2);
      expect(mockDeps.parseAct).toHaveBeenCalledTimes(2);
      expect(mockDeps.parseEval).toHaveBeenCalledTimes(2);
    });

    it('should fallback to PLAN mode when max iterations reached', async () => {
      const badSummary: EvalSummary = {
        criticalCount: 1,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        issues: [
          { severity: 'critical', description: 'Security vulnerability' },
        ],
      };
      mockDeps.extractEvalSummary.mockReturnValue(badSummary);

      const options: AutoExecutorOptions = {
        maxIterations: 3,
        prompt: 'Add login feature',
      };

      const result = await executor.execute(options);

      expect(result.success).toBe(false);
      expect(result.iterations).toBe(3);
      expect(result.fallbackToPlan).toBe(true);
      expect(result.fallbackPlanResult).toBeDefined();
    });
  });

  describe('isQualityAchieved', () => {
    it('should return true when critical and high are both 0', () => {
      const summary: EvalSummary = {
        criticalCount: 0,
        highCount: 0,
        mediumCount: 5,
        lowCount: 10,
        issues: [],
      };

      expect(executor.isQualityAchieved(summary)).toBe(true);
    });

    it('should return false when critical > 0', () => {
      const summary: EvalSummary = {
        criticalCount: 1,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        issues: [],
      };

      expect(executor.isQualityAchieved(summary)).toBe(false);
    });

    it('should return false when high > 0', () => {
      const summary: EvalSummary = {
        criticalCount: 0,
        highCount: 1,
        mediumCount: 0,
        lowCount: 0,
        issues: [],
      };

      expect(executor.isQualityAchieved(summary)).toBe(false);
    });
  });

  describe('approach extraction', () => {
    it('should extract approach from plan result with delegate agent and instructions', async () => {
      const goodSummary: EvalSummary = {
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        issues: [],
      };
      mockDeps.extractEvalSummary.mockReturnValue(goodSummary);
      mockDeps.parsePlan.mockResolvedValue(
        createMockParseResult(
          'PLAN',
          'Design first approach. Define test cases from TDD perspective.',
          'frontend-developer',
        ),
      );

      const options: AutoExecutorOptions = {
        maxIterations: 3,
        prompt: 'Add login feature',
      };

      const result = await executor.execute(options);

      expect(result.iterationHistory[0].approach).toContain(
        'frontend-developer',
      );
      expect(result.iterationHistory[0].approach).toContain(
        'Design first approach',
      );
    });

    it('should truncate long instructions to 60 characters', async () => {
      const goodSummary: EvalSummary = {
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        issues: [],
      };
      mockDeps.extractEvalSummary.mockReturnValue(goodSummary);
      const longInstructions =
        'This is a very long instruction that should be truncated to maintain readability in the approach description';
      mockDeps.parsePlan.mockResolvedValue(
        createMockParseResult('PLAN', longInstructions, 'backend-developer'),
      );

      const options: AutoExecutorOptions = {
        maxIterations: 3,
        prompt: 'Add login feature',
      };

      const result = await executor.execute(options);

      expect(result.iterationHistory[0].approach).toContain(
        'backend-developer',
      );
      expect(result.iterationHistory[0].approach.length).toBeLessThan(85); // agent name + ": " + 60 chars + "..."
      expect(result.iterationHistory[0].approach).toContain('...');
    });

    it('should use iteration number as fallback when no instructions', async () => {
      const goodSummary: EvalSummary = {
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        issues: [],
      };
      mockDeps.extractEvalSummary.mockReturnValue(goodSummary);
      mockDeps.parsePlan.mockResolvedValue(
        createMockParseResult('PLAN', '', 'test-agent'),
      );

      const options: AutoExecutorOptions = {
        maxIterations: 3,
        prompt: 'Add login feature',
      };

      const result = await executor.execute(options);

      expect(result.iterationHistory[0].approach).toBe(
        'test-agent iteration 1',
      );
    });
  });
});
