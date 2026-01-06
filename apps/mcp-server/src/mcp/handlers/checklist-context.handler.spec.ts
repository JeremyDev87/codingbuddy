import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChecklistContextHandler } from './checklist-context.handler';
import { ChecklistService } from '../../checklist/checklist.service';
import { ContextService } from '../../context/context.service';

describe('ChecklistContextHandler', () => {
  let handler: ChecklistContextHandler;
  let mockChecklistService: ChecklistService;
  let mockContextService: ContextService;

  const mockChecklistResult = {
    checklists: [
      { domain: 'security', items: [], priority: 'high', icon: '🔒' },
    ],
    summary: { total: 1, critical: 0, high: 1, medium: 0, low: 0 },
    matchedTriggers: [],
  };

  const mockAnalysisResult = {
    analysis: {
      intent: 'feature_development',
      category: 'general',
      complexity: 'low',
      keywords: [],
    },
    riskAssessment: {
      level: 'low',
      reason: 'Standard code changes',
      attentionAreas: [],
    },
    checklists: [],
    checklistSummary: { total: 0, critical: 0, high: 0, medium: 0, low: 0 },
    matchedTriggers: [],
    recommendedSpecialists: [],
    suggestedWorkflow: { phases: [] },
    contextHints: {
      projectType: 'web_application',
      securityLevel: 'low',
      mustConsider: [],
    },
  };

  beforeEach(() => {
    mockChecklistService = {
      generateChecklist: vi.fn().mockResolvedValue(mockChecklistResult),
    } as unknown as ChecklistService;

    mockContextService = {
      analyzeTask: vi.fn().mockResolvedValue(mockAnalysisResult),
    } as unknown as ContextService;

    handler = new ChecklistContextHandler(
      mockChecklistService,
      mockContextService,
    );
  });

  describe('handle', () => {
    it('should return null for unhandled tools', async () => {
      const result = await handler.handle('unknown_tool', {});
      expect(result).toBeNull();
    });

    describe('generate_checklist', () => {
      it('should generate checklist with files', async () => {
        const result = await handler.handle('generate_checklist', {
          files: ['src/auth/login.ts'],
        });

        expect(result?.isError).toBeFalsy();
        expect(mockChecklistService.generateChecklist).toHaveBeenCalledWith({
          files: ['src/auth/login.ts'],
          domains: undefined,
        });
      });

      it('should generate checklist with domains', async () => {
        const result = await handler.handle('generate_checklist', {
          domains: ['security', 'accessibility'],
        });

        expect(result?.isError).toBeFalsy();
        expect(mockChecklistService.generateChecklist).toHaveBeenCalledWith({
          files: undefined,
          domains: ['security', 'accessibility'],
        });
      });

      it('should ignore invalid files array', async () => {
        const result = await handler.handle('generate_checklist', {
          files: [123, null],
        });

        expect(result?.isError).toBeFalsy();
        expect(mockChecklistService.generateChecklist).toHaveBeenCalledWith({
          files: undefined,
          domains: undefined,
        });
      });

      it('should ignore non-array files', async () => {
        const result = await handler.handle('generate_checklist', {
          files: 'not-an-array',
        });

        expect(result?.isError).toBeFalsy();
        expect(mockChecklistService.generateChecklist).toHaveBeenCalledWith({
          files: undefined,
          domains: undefined,
        });
      });

      it('should return error when service fails', async () => {
        mockChecklistService.generateChecklist = vi
          .fn()
          .mockRejectedValue(new Error('Checklist error'));

        const result = await handler.handle('generate_checklist', {});

        expect(result?.isError).toBe(true);
        expect(result?.content[0]).toMatchObject({
          type: 'text',
          text: expect.stringContaining('Checklist error'),
        });
      });
    });

    describe('analyze_task', () => {
      it('should analyze task with valid prompt', async () => {
        const result = await handler.handle('analyze_task', {
          prompt: 'Add new feature',
        });

        expect(result?.isError).toBeFalsy();
        expect(mockContextService.analyzeTask).toHaveBeenCalledWith({
          prompt: 'Add new feature',
          files: undefined,
          mode: undefined,
        });
      });

      it('should return error for missing prompt', async () => {
        const result = await handler.handle('analyze_task', {});

        expect(result?.isError).toBe(true);
        expect(result?.content[0]).toMatchObject({
          type: 'text',
          text: expect.stringContaining('Missing required parameter: prompt'),
        });
      });

      it('should return error for non-string prompt', async () => {
        const result = await handler.handle('analyze_task', { prompt: 123 });

        expect(result?.isError).toBe(true);
      });

      it('should analyze task with all parameters', async () => {
        const result = await handler.handle('analyze_task', {
          prompt: 'Fix bug',
          files: ['src/app.ts'],
          mode: 'ACT',
        });

        expect(result?.isError).toBeFalsy();
        expect(mockContextService.analyzeTask).toHaveBeenCalledWith({
          prompt: 'Fix bug',
          files: ['src/app.ts'],
          mode: 'ACT',
        });
      });

      it('should ignore invalid mode', async () => {
        const result = await handler.handle('analyze_task', {
          prompt: 'Fix bug',
          mode: 'INVALID',
        });

        expect(result?.isError).toBeFalsy();
        expect(mockContextService.analyzeTask).toHaveBeenCalledWith({
          prompt: 'Fix bug',
          files: undefined,
          mode: undefined,
        });
      });

      it('should return error when service fails', async () => {
        mockContextService.analyzeTask = vi
          .fn()
          .mockRejectedValue(new Error('Analysis error'));

        const result = await handler.handle('analyze_task', {
          prompt: 'test',
        });

        expect(result?.isError).toBe(true);
        expect(result?.content[0]).toMatchObject({
          type: 'text',
          text: expect.stringContaining('Analysis error'),
        });
      });
    });
  });

  describe('getToolDefinitions', () => {
    it('should return tool definitions', () => {
      const definitions = handler.getToolDefinitions();

      expect(definitions).toHaveLength(2);
      expect(definitions.map(d => d.name)).toEqual([
        'generate_checklist',
        'analyze_task',
      ]);
    });

    it('should have correct required parameters', () => {
      const definitions = handler.getToolDefinitions();

      const generateChecklist = definitions.find(
        d => d.name === 'generate_checklist',
      );
      expect(generateChecklist?.inputSchema.required).toEqual([]);

      const analyzeTask = definitions.find(d => d.name === 'analyze_task');
      expect(analyzeTask?.inputSchema.required).toContain('prompt');
    });
  });
});
