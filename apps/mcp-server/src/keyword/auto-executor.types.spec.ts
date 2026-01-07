import {
  DEFAULT_AUTO_CONFIG,
  type AutoConfig,
  type IssueSeverity,
  type EvalSummary,
  type AutoExecutorOptions,
  type EvalIssue,
  type AutoResult,
  type IterationResult,
} from './auto-executor.types';
import type { ParseModeResult } from './keyword.types';

describe('auto-executor.types', () => {
  describe('DEFAULT_AUTO_CONFIG', () => {
    it('should have correct default maxIterations', () => {
      expect(DEFAULT_AUTO_CONFIG.maxIterations).toBe(3);
    });

    it('should be a valid AutoConfig', () => {
      const config: AutoConfig = DEFAULT_AUTO_CONFIG;
      expect(config).toBeDefined();
      expect(typeof config.maxIterations).toBe('number');
    });

    it('should be readonly (type check)', () => {
      // This is a compile-time check - if this compiles, the test passes
      const config: AutoConfig = { ...DEFAULT_AUTO_CONFIG };
      expect(config).toEqual(DEFAULT_AUTO_CONFIG);
    });
  });

  describe('Type Guards and Utilities', () => {
    describe('IssueSeverity', () => {
      it('should accept valid severity values', () => {
        const validSeverities: IssueSeverity[] = [
          'critical',
          'high',
          'medium',
          'low',
        ];
        validSeverities.forEach(severity => {
          expect(['critical', 'high', 'medium', 'low']).toContain(severity);
        });
      });
    });

    describe('EvalSummary', () => {
      it('should create valid EvalSummary with all required fields', () => {
        const summary: EvalSummary = {
          criticalCount: 1,
          highCount: 2,
          mediumCount: 3,
          lowCount: 4,
          issues: [],
        };

        expect(summary.criticalCount).toBe(1);
        expect(summary.highCount).toBe(2);
        expect(summary.mediumCount).toBe(3);
        expect(summary.lowCount).toBe(4);
        expect(Array.isArray(summary.issues)).toBe(true);
      });

      it('should allow totalCount property for backward compatibility', () => {
        const summary: EvalSummary & { totalCount?: number } = {
          criticalCount: 1,
          highCount: 2,
          mediumCount: 3,
          lowCount: 4,
          totalCount: 10,
          issues: [],
        };

        expect(summary.totalCount).toBe(10);
      });

      it('should contain EvalIssue items', () => {
        const issue: EvalIssue = {
          severity: 'critical',
          description: 'Security vulnerability',
        };

        const summary: EvalSummary = {
          criticalCount: 1,
          highCount: 0,
          mediumCount: 0,
          lowCount: 0,
          issues: [issue],
        };

        expect(summary.issues).toHaveLength(1);
        expect(summary.issues[0].severity).toBe('critical');
        expect(summary.issues[0].description).toBe('Security vulnerability');
      });
    });

    describe('AutoExecutorOptions', () => {
      it('should create valid options with all required fields', () => {
        const options: AutoExecutorOptions = {
          maxIterations: 5,
          prompt: 'Implement feature X',
        };

        expect(options.maxIterations).toBe(5);
        expect(options.prompt).toBe('Implement feature X');
      });

      it('should accept default maxIterations from config', () => {
        const options: AutoExecutorOptions = {
          maxIterations: DEFAULT_AUTO_CONFIG.maxIterations,
          prompt: 'Test prompt',
        };

        expect(options.maxIterations).toBe(3);
      });
    });

    describe('AutoResult', () => {
      it('should create successful AutoResult', () => {
        const summary: EvalSummary = {
          criticalCount: 0,
          highCount: 0,
          mediumCount: 0,
          lowCount: 0,
          issues: [],
        };

        const result: AutoResult = {
          success: true,
          iterations: 2,
          maxIterations: 3,
          finalEvalSummary: summary,
          iterationHistory: [],
          modifiedFiles: ['src/file1.ts', 'src/file2.ts'],
          fallbackToPlan: false,
        };

        expect(result.success).toBe(true);
        expect(result.iterations).toBe(2);
        expect(result.fallbackToPlan).toBe(false);
        expect(result.modifiedFiles).toHaveLength(2);
      });

      it('should create failed AutoResult with fallback', () => {
        const mockParseResult = {} as ParseModeResult;
        const summary: EvalSummary = {
          criticalCount: 1,
          highCount: 2,
          mediumCount: 0,
          lowCount: 0,
          issues: [
            { severity: 'critical', description: 'Critical issue' },
            { severity: 'high', description: 'High priority issue 1' },
            { severity: 'high', description: 'High priority issue 2' },
          ],
        };

        const result: AutoResult = {
          success: false,
          iterations: 3,
          maxIterations: 3,
          finalEvalSummary: summary,
          iterationHistory: [],
          modifiedFiles: [],
          fallbackToPlan: true,
          fallbackPlanResult: mockParseResult,
        };

        expect(result.success).toBe(false);
        expect(result.iterations).toBe(result.maxIterations);
        expect(result.fallbackToPlan).toBe(true);
        expect(result.fallbackPlanResult).toBeDefined();
        expect(result.finalEvalSummary?.criticalCount).toBe(1);
        expect(result.finalEvalSummary?.highCount).toBe(2);
      });
    });

    describe('IterationResult', () => {
      it('should create valid IterationResult', () => {
        const mockParseResult = {} as ParseModeResult;
        const summary: EvalSummary = {
          criticalCount: 0,
          highCount: 1,
          mediumCount: 2,
          lowCount: 1,
          issues: [],
        };

        const iteration: IterationResult = {
          iteration: 1,
          planResult: mockParseResult,
          actResult: mockParseResult,
          evalResult: mockParseResult,
          evalSummary: summary,
          approach: 'Test-driven approach',
        };

        expect(iteration.iteration).toBe(1);
        expect(iteration.approach).toBe('Test-driven approach');
        expect(iteration.evalSummary).toEqual(summary);
      });
    });
  });

  describe('EvalIssue', () => {
    it('should create issues with different severities', () => {
      const criticalIssue: EvalIssue = {
        severity: 'critical',
        description: 'Security flaw',
      };

      const highIssue: EvalIssue = {
        severity: 'high',
        description: 'Performance issue',
      };

      const mediumIssue: EvalIssue = {
        severity: 'medium',
        description: 'Code quality',
      };

      const lowIssue: EvalIssue = {
        severity: 'low',
        description: 'Minor suggestion',
      };

      expect(criticalIssue.severity).toBe('critical');
      expect(highIssue.severity).toBe('high');
      expect(mediumIssue.severity).toBe('medium');
      expect(lowIssue.severity).toBe('low');
    });

    it('should require both severity and description', () => {
      const issue: EvalIssue = {
        severity: 'high',
        description: 'Test description',
      };

      // Type check - if this compiles, required fields are present
      expect(issue.severity).toBeDefined();
      expect(issue.description).toBeDefined();
    });

    it('should support category field if extended', () => {
      const issueWithCategory: EvalIssue & { category?: string } = {
        severity: 'critical',
        description: 'Security issue',
        category: 'security',
      };

      expect(issueWithCategory.category).toBe('security');
    });
  });
});
