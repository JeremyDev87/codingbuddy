import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContextService } from './context.service';
import type { ChecklistService } from '../checklist/checklist.service';
import type { AnalyzeTaskInput } from './context.types';

describe('ContextService', () => {
  let service: ContextService;
  let mockChecklistService: ChecklistService;

  beforeEach(() => {
    // Create mock ChecklistService
    mockChecklistService = {
      generateChecklist: vi.fn().mockResolvedValue({
        checklists: [
          {
            domain: 'security',
            icon: '🔒',
            priority: 'critical',
            items: [{ id: 'sec-001', text: 'Test item', priority: 'critical' }],
          },
        ],
        summary: { total: 1, critical: 1, high: 0, medium: 0, low: 0 },
        matchedTriggers: [
          {
            domain: 'security',
            category: 'auth',
            reason: 'file_pattern',
            match: 'test',
          },
        ],
      }),
      getAvailableDomains: vi
        .fn()
        .mockReturnValue(['security', 'accessibility']),
    } as unknown as ChecklistService;

    service = new ContextService(mockChecklistService);
  });

  describe('analyzeTask', () => {
    describe('when analyzing auth-related files', () => {
      it('returns critical risk assessment for authentication', async () => {
        const input: AnalyzeTaskInput = {
          prompt: 'Add login functionality',
          files: ['src/auth/login.ts'],
        };

        const result = await service.analyzeTask(input);

        expect(result.riskAssessment.level).toBe('critical');
        expect(result.analysis.category).toBe('authentication');
      });

      it('recommends security specialist', async () => {
        const input: AnalyzeTaskInput = {
          prompt: 'Add login functionality',
          files: ['src/auth/login.ts'],
        };

        const result = await service.analyzeTask(input);

        expect(result.recommendedSpecialists).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              name: 'security-specialist',
            }),
          ]),
        );
      });
    });

    describe('when analyzing UI component files', () => {
      it('returns medium risk assessment', async () => {
        const input: AnalyzeTaskInput = {
          prompt: 'Create button component',
          files: ['src/components/Button.tsx'],
        };

        const result = await service.analyzeTask(input);

        expect(result.riskAssessment.level).toBe('medium');
        expect(result.analysis.category).toBe('ui');
      });

      it('recommends accessibility specialist', async () => {
        const input: AnalyzeTaskInput = {
          prompt: 'Create button component',
          files: ['src/components/Button.tsx'],
        };

        const result = await service.analyzeTask(input);

        expect(result.recommendedSpecialists).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              name: 'accessibility-specialist',
            }),
          ]),
        );
      });
    });

    describe('workflow suggestion', () => {
      it('includes design, implementation, and verification phases', async () => {
        const input: AnalyzeTaskInput = {
          prompt: 'Add new feature',
          files: ['src/features/NewFeature.tsx'],
        };

        const result = await service.analyzeTask(input);

        const phaseNames = result.suggestedWorkflow.phases.map(p => p.phase);
        expect(phaseNames.length).toBeGreaterThanOrEqual(2);
      });
    });

    describe('context hints', () => {
      it('includes must-consider items based on category', async () => {
        const input: AnalyzeTaskInput = {
          prompt: 'Add payment form',
          files: ['src/payment/checkout.ts'],
        };

        const result = await service.analyzeTask(input);

        expect(result.contextHints.mustConsider.length).toBeGreaterThan(0);
      });
    });

    describe('when files are empty', () => {
      it('returns general category', async () => {
        const input: AnalyzeTaskInput = {
          prompt: 'Do something',
        };

        const result = await service.analyzeTask(input);

        expect(result.analysis.category).toBe('general');
      });
    });

    describe('intent detection', () => {
      it('detects bug_fix intent', async () => {
        const input: AnalyzeTaskInput = {
          prompt: 'Fix the login bug',
        };

        const result = await service.analyzeTask(input);

        expect(result.analysis.intent).toBe('bug_fix');
      });

      it('detects feature_development intent', async () => {
        const input: AnalyzeTaskInput = {
          prompt: 'Add user registration',
        };

        const result = await service.analyzeTask(input);

        expect(result.analysis.intent).toBe('feature_development');
      });

      it('detects refactoring intent', async () => {
        const input: AnalyzeTaskInput = {
          prompt: 'Refactor the auth module',
        };

        const result = await service.analyzeTask(input);

        expect(result.analysis.intent).toBe('refactoring');
      });
    });
  });
});
