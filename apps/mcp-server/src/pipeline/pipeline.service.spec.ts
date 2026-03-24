import { describe, it, expect, beforeEach } from 'vitest';
import { PipelineService } from './pipeline.service';
import type { PipelineDefinition } from './pipeline.types';

describe('PipelineService', () => {
  let service: PipelineService;

  beforeEach(() => {
    service = new PipelineService();
  });

  const createPipeline = (stages: PipelineDefinition['stages'] = []): PipelineDefinition => ({
    id: 'test-pipeline',
    name: 'Test Pipeline',
    stages,
  });

  describe('runPipeline', () => {
    it('should run all stages sequentially and return completed status', async () => {
      const pipeline = createPipeline([
        { id: 's1', name: 'Step 1', type: 'command', config: { command: 'echo "step1"' } },
        { id: 's2', name: 'Step 2', type: 'command', config: { command: 'echo "step2"' } },
      ]);

      const execution = await service.runPipeline(pipeline);

      expect(execution.status).toBe('completed');
      expect(execution.stageResults).toHaveLength(2);
      expect(execution.stageResults[0].status).toBe('completed');
      expect(execution.stageResults[1].status).toBe('completed');
    });

    it('should stop on stage failure and mark pipeline as failed', async () => {
      const pipeline = createPipeline([
        { id: 's1', name: 'Pass', type: 'command', config: { command: 'echo "ok"' } },
        { id: 's2', name: 'Fail', type: 'command', config: { command: 'exit 1' } },
        { id: 's3', name: 'Skip', type: 'command', config: { command: 'echo "skip"' } },
      ]);

      const execution = await service.runPipeline(pipeline);

      expect(execution.status).toBe('failed');
      expect(execution.stageResults).toHaveLength(2);
      expect(execution.stageResults[0].status).toBe('completed');
      expect(execution.stageResults[1].status).toBe('failed');
    });

    it('should handle empty pipeline', async () => {
      const pipeline = createPipeline([]);

      const execution = await service.runPipeline(pipeline);

      expect(execution.status).toBe('completed');
      expect(execution.stageResults).toHaveLength(0);
    });

    it('should handle single stage pipeline', async () => {
      const pipeline = createPipeline([
        { id: 's1', name: 'Only', type: 'command', config: { command: 'echo "only"' } },
      ]);

      const execution = await service.runPipeline(pipeline);

      expect(execution.status).toBe('completed');
      expect(execution.stageResults).toHaveLength(1);
    });

    it('should pass output from stage N as input to stage N+1', async () => {
      const pipeline = createPipeline([
        { id: 's1', name: 'Produce', type: 'command', config: { command: 'echo "data-from-s1"' } },
        {
          id: 's2',
          name: 'Consume',
          type: 'command',
          config: { command: 'echo "received: $PIPELINE_INPUT"' },
        },
      ]);

      const execution = await service.runPipeline(pipeline);

      expect(execution.status).toBe('completed');
      expect(execution.stageResults[1].output?.trim()).toBe('received: data-from-s1');
    });

    it('should generate unique execution IDs', async () => {
      const pipeline = createPipeline([]);

      const exec1 = await service.runPipeline(pipeline);
      const exec2 = await service.runPipeline(pipeline);

      expect(exec1.id).not.toBe(exec2.id);
    });

    it('should set timing fields', async () => {
      const pipeline = createPipeline([
        { id: 's1', name: 'Step', type: 'command', config: { command: 'echo "done"' } },
      ]);

      const execution = await service.runPipeline(pipeline);

      expect(execution.startedAt).toBeDefined();
      expect(execution.completedAt).toBeDefined();
    });
  });

  describe('getStatus', () => {
    it('should return execution status by ID', async () => {
      const pipeline = createPipeline([]);
      const execution = await service.runPipeline(pipeline);

      const status = service.getStatus(execution.id);

      expect(status).toBeDefined();
      expect(status?.id).toBe(execution.id);
    });

    it('should return undefined for unknown ID', () => {
      const status = service.getStatus('nonexistent');

      expect(status).toBeUndefined();
    });
  });

  describe('resumePipeline', () => {
    it('should resume from failed stage', async () => {
      const pipeline = createPipeline([
        { id: 's1', name: 'Pass', type: 'command', config: { command: 'echo "ok"' } },
        { id: 's2', name: 'Fail', type: 'command', config: { command: 'exit 1' } },
        { id: 's3', name: 'After', type: 'command', config: { command: 'echo "after"' } },
      ]);

      // First run — s2 fails
      const firstRun = await service.runPipeline(pipeline);
      expect(firstRun.status).toBe('failed');

      // Fix the pipeline definition with a passing command for s2
      const fixedPipeline = createPipeline([
        { id: 's1', name: 'Pass', type: 'command', config: { command: 'echo "ok"' } },
        { id: 's2', name: 'Fixed', type: 'command', config: { command: 'echo "fixed"' } },
        { id: 's3', name: 'After', type: 'command', config: { command: 'echo "after"' } },
      ]);

      const resumed = await service.resumePipeline(firstRun.id, fixedPipeline);

      expect(resumed.status).toBe('completed');
      // s1 result preserved from first run, s2 and s3 re-executed
      expect(resumed.stageResults).toHaveLength(3);
      expect(resumed.stageResults[0].output?.trim()).toBe('ok');
      expect(resumed.stageResults[1].output?.trim()).toBe('fixed');
      expect(resumed.stageResults[2].output?.trim()).toBe('after');
    });

    it('should throw for unknown execution ID', async () => {
      const pipeline = createPipeline([]);

      await expect(service.resumePipeline('nonexistent', pipeline)).rejects.toThrow(
        'Execution not found',
      );
    });

    it('should throw for already completed pipeline', async () => {
      const pipeline = createPipeline([
        { id: 's1', name: 'Done', type: 'command', config: { command: 'echo "done"' } },
      ]);

      const execution = await service.runPipeline(pipeline);

      await expect(service.resumePipeline(execution.id, pipeline)).rejects.toThrow(
        'Pipeline is not in a failed state',
      );
    });
  });
});
