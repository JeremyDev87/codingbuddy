import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PipelineHandler } from './pipeline.handler';
import { PipelineService } from '../../pipeline/pipeline.service';
import type { PipelineExecution } from '../../pipeline/pipeline.types';

describe('PipelineHandler', () => {
  let handler: PipelineHandler;
  let mockService: PipelineService;

  const mockExecution: PipelineExecution = {
    id: 'exec-1',
    pipelineId: 'pipeline-1',
    status: 'completed',
    currentStageIndex: 1,
    stageResults: [
      {
        stageId: 's1',
        status: 'completed',
        output: 'done',
        startedAt: '2026-03-25T00:00:00Z',
        completedAt: '2026-03-25T00:00:01Z',
        durationMs: 1000,
      },
    ],
    startedAt: '2026-03-25T00:00:00Z',
    completedAt: '2026-03-25T00:00:01Z',
  };

  beforeEach(() => {
    mockService = {
      runPipeline: vi.fn().mockResolvedValue(mockExecution),
      getStatus: vi.fn().mockReturnValue(mockExecution),
      resumePipeline: vi.fn().mockResolvedValue(mockExecution),
    } as unknown as PipelineService;

    handler = new PipelineHandler(mockService);
  });

  describe('handle', () => {
    it('should return null for unhandled tools', async () => {
      const result = await handler.handle('unknown_tool', {});
      expect(result).toBeNull();
    });

    describe('run_pipeline', () => {
      it('should run pipeline with valid definition', async () => {
        const args = {
          pipeline: {
            id: 'p1',
            name: 'Test',
            stages: [{ id: 's1', name: 'Build', type: 'command', config: { command: 'echo ok' } }],
          },
        };

        const result = await handler.handle('run_pipeline', args);

        expect(result?.isError).toBeFalsy();
        expect(mockService.runPipeline).toHaveBeenCalled();
      });

      it('should return error for missing pipeline field', async () => {
        const result = await handler.handle('run_pipeline', {});

        expect(result?.isError).toBe(true);
        expect(result?.content[0].text).toContain('Missing required parameter: pipeline');
      });

      it('should return error for invalid pipeline definition', async () => {
        const result = await handler.handle('run_pipeline', {
          pipeline: { id: '', name: '', stages: [] },
        });

        expect(result?.isError).toBe(true);
        expect(result?.content[0].text).toContain('Invalid pipeline definition');
      });
    });

    describe('pipeline_status', () => {
      it('should return status for valid execution ID', async () => {
        const result = await handler.handle('pipeline_status', {
          executionId: 'exec-1',
        });

        expect(result?.isError).toBeFalsy();
        expect(mockService.getStatus).toHaveBeenCalledWith('exec-1');
      });

      it('should return error for missing executionId', async () => {
        const result = await handler.handle('pipeline_status', {});

        expect(result?.isError).toBe(true);
        expect(result?.content[0].text).toContain('Missing required parameter: executionId');
      });

      it('should return error when execution not found', async () => {
        mockService.getStatus = vi.fn().mockReturnValue(undefined);

        const result = await handler.handle('pipeline_status', {
          executionId: 'nonexistent',
        });

        expect(result?.isError).toBe(true);
        expect(result?.content[0].text).toContain('not found');
      });
    });

    describe('resume_pipeline', () => {
      it('should resume pipeline with valid args', async () => {
        const args = {
          executionId: 'exec-1',
          pipeline: {
            id: 'p1',
            name: 'Test',
            stages: [{ id: 's1', name: 'Build', type: 'command', config: { command: 'echo ok' } }],
          },
        };

        const result = await handler.handle('resume_pipeline', args);

        expect(result?.isError).toBeFalsy();
        expect(mockService.resumePipeline).toHaveBeenCalled();
      });

      it('should return error for missing executionId', async () => {
        const result = await handler.handle('resume_pipeline', {
          pipeline: { id: 'p1', name: 'Test', stages: [] },
        });

        expect(result?.isError).toBe(true);
        expect(result?.content[0].text).toContain('Missing required parameter: executionId');
      });

      it('should return error when resume fails', async () => {
        mockService.resumePipeline = vi
          .fn()
          .mockRejectedValue(new Error('Pipeline is not in a failed state'));

        const result = await handler.handle('resume_pipeline', {
          executionId: 'exec-1',
          pipeline: {
            id: 'p1',
            name: 'Test',
            stages: [{ id: 's1', name: 'Build', type: 'command', config: { command: 'echo ok' } }],
          },
        });

        expect(result?.isError).toBe(true);
        expect(result?.content[0].text).toContain('Pipeline is not in a failed state');
      });
    });
  });

  describe('getToolDefinitions', () => {
    it('should return tool definitions for all pipeline tools', () => {
      const definitions = handler.getToolDefinitions();

      expect(definitions).toHaveLength(3);
      expect(definitions.map(d => d.name)).toEqual([
        'run_pipeline',
        'pipeline_status',
        'resume_pipeline',
      ]);
    });

    it('should have correct required parameters', () => {
      const definitions = handler.getToolDefinitions();

      const runPipeline = definitions.find(d => d.name === 'run_pipeline');
      expect(runPipeline?.inputSchema.required).toContain('pipeline');

      const status = definitions.find(d => d.name === 'pipeline_status');
      expect(status?.inputSchema.required).toContain('executionId');

      const resume = definitions.find(d => d.name === 'resume_pipeline');
      expect(resume?.inputSchema.required).toContain('executionId');
      expect(resume?.inputSchema.required).toContain('pipeline');
    });
  });
});
