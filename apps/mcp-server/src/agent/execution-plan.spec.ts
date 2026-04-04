import { describe, it, expect } from 'vitest';
import {
  buildSimplePlan,
  buildNestedPlan,
  isNestedPlan,
  subagentLayer,
  taskmaestroLayer,
  teamsLayer,
  serializeExecutionPlan,
} from './execution-plan';
import type {
  DispatchedAgent,
  TaskmaestroDispatch,
  TeamsDispatch,
  ExecutionPlan,
} from './agent.types';

describe('execution-plan', () => {
  const mockAgent: DispatchedAgent = {
    name: 'security-specialist',
    displayName: 'Security Specialist',
    description: 'Security analysis',
    dispatchParams: {
      subagent_type: 'general-purpose',
      prompt: 'Analyze security',
      description: 'Security analysis',
      run_in_background: true,
    },
  };

  const mockTmDispatch: TaskmaestroDispatch = {
    sessionName: 'eval-specialists',
    paneCount: 2,
    assignments: [
      {
        name: 'security-specialist',
        displayName: 'Security Specialist',
        prompt: 'Review security',
      },
      { name: 'perf-specialist', displayName: 'Performance Specialist', prompt: 'Review perf' },
    ],
  };

  const mockTeamsConfig: TeamsDispatch = {
    team_name: 'eval-specialists',
    description: 'EVAL mode specialist team',
    teammates: [
      {
        name: 'security-specialist',
        subagent_type: 'general-purpose',
        team_name: 'eval-specialists',
        prompt: 'Review security',
      },
    ],
  };

  describe('layer factories', () => {
    it('subagentLayer creates a subagent layer', () => {
      const layer = subagentLayer([mockAgent]);
      expect(layer.type).toBe('subagent');
      if (layer.type === 'subagent') {
        expect(layer.agents).toHaveLength(1);
        expect(layer.agents[0].name).toBe('security-specialist');
      }
    });

    it('taskmaestroLayer creates a taskmaestro layer', () => {
      const layer = taskmaestroLayer(mockTmDispatch);
      expect(layer.type).toBe('taskmaestro');
      if (layer.type === 'taskmaestro') {
        expect(layer.config.sessionName).toBe('eval-specialists');
        expect(layer.config.paneCount).toBe(2);
      }
    });

    it('teamsLayer creates a teams layer', () => {
      const layer = teamsLayer(mockTeamsConfig);
      expect(layer.type).toBe('teams');
      if (layer.type === 'teams') {
        expect(layer.config.team_name).toBe('eval-specialists');
      }
    });

    it('teamsLayer includes visibility when provided', () => {
      const visibility = { reportTo: 'lead', format: 'markdown', includeProgress: true };
      const layer = teamsLayer(mockTeamsConfig, visibility);
      expect(layer.type).toBe('teams');
      if (layer.type === 'teams') {
        expect(layer.visibility).toEqual(visibility);
      }
    });

    it('teamsLayer omits visibility when not provided', () => {
      const layer = teamsLayer(mockTeamsConfig);
      if (layer.type === 'teams') {
        expect(layer.visibility).toBeUndefined();
      }
    });
  });

  describe('buildSimplePlan', () => {
    it('creates a plan with only outerExecution', () => {
      const plan = buildSimplePlan(subagentLayer([mockAgent]));
      expect(plan.outerExecution.type).toBe('subagent');
      expect(plan.innerCoordination).toBeUndefined();
    });

    it('works with taskmaestro layer', () => {
      const plan = buildSimplePlan(taskmaestroLayer(mockTmDispatch));
      expect(plan.outerExecution.type).toBe('taskmaestro');
      expect(plan.innerCoordination).toBeUndefined();
    });

    it('works with teams layer', () => {
      const plan = buildSimplePlan(teamsLayer(mockTeamsConfig));
      expect(plan.outerExecution.type).toBe('teams');
      expect(plan.innerCoordination).toBeUndefined();
    });
  });

  describe('buildNestedPlan', () => {
    it('creates a plan with outer and inner layers', () => {
      const plan = buildNestedPlan(taskmaestroLayer(mockTmDispatch), teamsLayer(mockTeamsConfig));
      expect(plan.outerExecution.type).toBe('taskmaestro');
      expect(plan.innerCoordination).toBeDefined();
      expect(plan.innerCoordination!.type).toBe('teams');
    });

    it('supports any combination of layers', () => {
      const plan = buildNestedPlan(teamsLayer(mockTeamsConfig), subagentLayer([mockAgent]));
      expect(plan.outerExecution.type).toBe('teams');
      expect(plan.innerCoordination!.type).toBe('subagent');
    });
  });

  describe('isNestedPlan', () => {
    it('returns false for simple plans', () => {
      const plan = buildSimplePlan(subagentLayer([mockAgent]));
      expect(isNestedPlan(plan)).toBe(false);
    });

    it('returns true for nested plans', () => {
      const plan = buildNestedPlan(taskmaestroLayer(mockTmDispatch), teamsLayer(mockTeamsConfig));
      expect(isNestedPlan(plan)).toBe(true);
    });
  });

  describe('serializeExecutionPlan', () => {
    it('serializes a simple subagent plan', () => {
      const plan = buildSimplePlan(subagentLayer([mockAgent]));
      const serialized = serializeExecutionPlan(plan);

      expect(serialized.strategy).toBe('subagent');
      expect(serialized.isNested).toBe(false);
      expect(serialized.outerExecution).toBeDefined();
      expect(serialized.innerCoordination).toBeUndefined();

      const outer = serialized.outerExecution as Record<string, unknown>;
      expect(outer.type).toBe('subagent');
      expect(outer.agentCount).toBe(1);
    });

    it('serializes a simple taskmaestro plan', () => {
      const plan = buildSimplePlan(taskmaestroLayer(mockTmDispatch));
      const serialized = serializeExecutionPlan(plan);

      expect(serialized.strategy).toBe('taskmaestro');
      expect(serialized.isNested).toBe(false);

      const outer = serialized.outerExecution as Record<string, unknown>;
      expect(outer.type).toBe('taskmaestro');
      expect(outer.sessionName).toBe('eval-specialists');
      expect(outer.paneCount).toBe(2);
    });

    it('serializes a simple teams plan', () => {
      const plan = buildSimplePlan(teamsLayer(mockTeamsConfig));
      const serialized = serializeExecutionPlan(plan);

      expect(serialized.strategy).toBe('teams');
      const outer = serialized.outerExecution as Record<string, unknown>;
      expect(outer.type).toBe('teams');
      expect(outer.teamName).toBe('eval-specialists');
      expect(outer.teammateCount).toBe(1);
    });

    it('serializes a nested taskmaestro+teams plan', () => {
      const plan = buildNestedPlan(taskmaestroLayer(mockTmDispatch), teamsLayer(mockTeamsConfig));
      const serialized = serializeExecutionPlan(plan);

      expect(serialized.strategy).toBe('taskmaestro+teams');
      expect(serialized.isNested).toBe(true);
      expect(serialized.outerExecution).toBeDefined();
      expect(serialized.innerCoordination).toBeDefined();

      const outer = serialized.outerExecution as Record<string, unknown>;
      expect(outer.type).toBe('taskmaestro');

      const inner = serialized.innerCoordination as Record<string, unknown>;
      expect(inner.type).toBe('teams');
    });

    it('includes visibility in teams layer serialization when present', () => {
      const visibility = { reportTo: 'lead', format: 'markdown', includeProgress: true };
      const plan = buildSimplePlan(teamsLayer(mockTeamsConfig, visibility));
      const serialized = serializeExecutionPlan(plan);

      const outer = serialized.outerExecution as Record<string, unknown>;
      expect(outer.visibility).toEqual(visibility);
    });

    it('omits visibility in teams layer serialization when absent', () => {
      const plan = buildSimplePlan(teamsLayer(mockTeamsConfig));
      const serialized = serializeExecutionPlan(plan);

      const outer = serialized.outerExecution as Record<string, unknown>;
      expect(outer.visibility).toBeUndefined();
    });

    it('serialized plan is JSON-safe', () => {
      const plan = buildNestedPlan(taskmaestroLayer(mockTmDispatch), teamsLayer(mockTeamsConfig));
      const serialized = serializeExecutionPlan(plan);

      const json = JSON.stringify(serialized);
      const parsed = JSON.parse(json);
      expect(parsed.strategy).toBe('taskmaestro+teams');
      expect(parsed.isNested).toBe(true);
    });
  });

  describe('backward compatibility', () => {
    it('simple plans match single-strategy shape', () => {
      const plan: ExecutionPlan = { outerExecution: { type: 'subagent', agents: [mockAgent] } };
      expect(plan.outerExecution.type).toBe('subagent');
      expect(plan.innerCoordination).toBeUndefined();
    });

    it('ExecutionPlan is assignable with just outerExecution', () => {
      const plan: ExecutionPlan = buildSimplePlan(taskmaestroLayer(mockTmDispatch));
      expect(isNestedPlan(plan)).toBe(false);
    });
  });
});
