import { describe, it, expect } from 'vitest';
import { executeStage } from './pipeline.executors';
import type { PipelineStage } from './pipeline.types';

describe('Pipeline Stage Executors', () => {
  describe('command stage', () => {
    it('should execute a shell command and return stdout', async () => {
      const stage: PipelineStage = {
        id: 'cmd-1',
        name: 'Echo',
        type: 'command',
        config: { command: 'echo "hello world"' },
      };
      const result = await executeStage(stage, undefined);
      expect(result.status).toBe('completed');
      expect(result.output?.trim()).toBe('hello world');
    });

    it('should pass previous output as PIPELINE_INPUT env var', async () => {
      const stage: PipelineStage = {
        id: 'cmd-2',
        name: 'Read Input',
        type: 'command',
        config: { command: 'echo "received: $PIPELINE_INPUT"' },
      };
      const result = await executeStage(stage, 'previous-output');
      expect(result.status).toBe('completed');
      expect(result.output?.trim()).toBe('received: previous-output');
    });

    it('should return failed status when command fails', async () => {
      const stage: PipelineStage = {
        id: 'cmd-3',
        name: 'Fail',
        type: 'command',
        config: { command: 'exit 1' },
      };
      const result = await executeStage(stage, undefined);
      expect(result.status).toBe('failed');
      expect(result.error).toBeDefined();
    });

    it('should include timing information', async () => {
      const stage: PipelineStage = {
        id: 'cmd-4',
        name: 'Timed',
        type: 'command',
        config: { command: 'echo "done"' },
      };
      const result = await executeStage(stage);
      expect(result.startedAt).toBeDefined();
      expect(result.completedAt).toBeDefined();
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('agent stage', () => {
    it('should return formatted agent prompt with input context', async () => {
      const stage: PipelineStage = {
        id: 'agent-1',
        name: 'Review',
        type: 'agent',
        config: { agentName: 'code-reviewer', prompt: 'Review this code' },
      };
      const result = await executeStage(stage, 'function foo() {}');
      expect(result.status).toBe('completed');
      expect(result.output).toContain('code-reviewer');
      expect(result.output).toContain('Review this code');
      expect(result.output).toContain('function foo() {}');
    });

    it('should work without previous input', async () => {
      const stage: PipelineStage = {
        id: 'agent-2',
        name: 'Plan',
        type: 'agent',
        config: { agentName: 'architect', prompt: 'Design system' },
      };
      const result = await executeStage(stage);
      expect(result.status).toBe('completed');
      expect(result.output).toContain('architect');
      expect(result.output).toContain('Design system');
    });
  });

  describe('skill stage', () => {
    it('should return formatted skill invocation with input context', async () => {
      const stage: PipelineStage = {
        id: 'skill-1',
        name: 'TDD',
        type: 'skill',
        config: { skillName: 'tdd', args: '--strict' },
      };
      const result = await executeStage(stage, 'test context');
      expect(result.status).toBe('completed');
      expect(result.output).toContain('tdd');
      expect(result.output).toContain('--strict');
      expect(result.output).toContain('test context');
    });

    it('should work without args', async () => {
      const stage: PipelineStage = {
        id: 'skill-2',
        name: 'Review',
        type: 'skill',
        config: { skillName: 'code-review' },
      };
      const result = await executeStage(stage);
      expect(result.status).toBe('completed');
      expect(result.output).toContain('code-review');
    });
  });

  describe('unknown stage type', () => {
    it('should return failed for unknown stage type', async () => {
      const stage = {
        id: 'unknown-1',
        name: 'Unknown',
        type: 'unknown' as 'command',
        config: {},
      } as PipelineStage;
      const result = await executeStage(stage);
      expect(result.status).toBe('failed');
      expect(result.error).toContain('Unknown stage type');
    });
  });
});
