import { describe, it, expect } from 'vitest';
import type {
  TaskmaestroAssignment,
  TaskmaestroDispatch,
  DispatchAgentsInput,
  DispatchResult,
} from './agent.types';

describe('agent.types - TaskMaestro types', () => {
  describe('TaskmaestroAssignment', () => {
    it('accepts object with name, displayName, prompt', () => {
      const assignment: TaskmaestroAssignment = {
        name: 'frontend-dev',
        displayName: 'Frontend Developer',
        prompt: 'Implement the UI component',
      };
      expect(assignment.name).toBe('frontend-dev');
      expect(assignment.displayName).toBe('Frontend Developer');
      expect(assignment.prompt).toBe('Implement the UI component');
    });
  });

  describe('TaskmaestroDispatch', () => {
    it('accepts object with sessionName, paneCount, assignments', () => {
      const dispatch: TaskmaestroDispatch = {
        sessionName: 'workspace-1',
        paneCount: 3,
        assignments: [{ name: 'dev-1', displayName: 'Dev 1', prompt: 'Task 1' }],
      };
      expect(dispatch.sessionName).toBe('workspace-1');
      expect(dispatch.paneCount).toBe(3);
      expect(dispatch.assignments).toHaveLength(1);
    });
  });

  describe('DispatchAgentsInput - executionStrategy', () => {
    it('accepts executionStrategy: subagent', () => {
      const input: DispatchAgentsInput = {
        mode: 'PLAN',
        executionStrategy: 'subagent',
      };
      expect(input.executionStrategy).toBe('subagent');
    });

    it('accepts executionStrategy: taskmaestro', () => {
      const input: DispatchAgentsInput = {
        mode: 'ACT',
        executionStrategy: 'taskmaestro',
      };
      expect(input.executionStrategy).toBe('taskmaestro');
    });

    it('executionStrategy is optional', () => {
      const input: DispatchAgentsInput = { mode: 'PLAN' };
      expect(input.executionStrategy).toBeUndefined();
    });
  });

  describe('DispatchResult - taskmaestro fields', () => {
    it('accepts optional taskmaestro dispatch data', () => {
      const result: DispatchResult = {
        executionHint: 'Use taskmaestro for parallel execution',
        taskmaestro: {
          sessionName: 'ws-1',
          paneCount: 2,
          assignments: [],
        },
        executionStrategy: 'taskmaestro',
      };
      expect(result.taskmaestro?.sessionName).toBe('ws-1');
      expect(result.executionStrategy).toBe('taskmaestro');
    });

    it('taskmaestro and executionStrategy are optional', () => {
      const result: DispatchResult = {
        executionHint: 'Use subagent',
      };
      expect(result.taskmaestro).toBeUndefined();
      expect(result.executionStrategy).toBeUndefined();
    });
  });
});
