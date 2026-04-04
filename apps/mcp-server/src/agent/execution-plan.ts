import type {
  ExecutionPlan,
  ExecutionLayer,
  DispatchedAgent,
  TaskmaestroDispatch,
  TeamsDispatch,
  VisibilityConfig,
} from './execution-plan.types';

/**
 * Build a single-layer execution plan.
 */
export function buildSimplePlan(layer: ExecutionLayer): ExecutionPlan {
  return { outerExecution: layer };
}

/**
 * Build a nested execution plan with outer transport and inner coordination.
 */
export function buildNestedPlan(outer: ExecutionLayer, inner: ExecutionLayer): ExecutionPlan {
  return { outerExecution: outer, innerCoordination: inner };
}

/**
 * Check whether an execution plan uses inner coordination.
 */
export function isNestedPlan(plan: ExecutionPlan): boolean {
  return plan.innerCoordination !== undefined;
}

/**
 * Create a subagent execution layer.
 */
export function subagentLayer(agents: DispatchedAgent[]): ExecutionLayer {
  return { type: 'subagent', agents };
}

/**
 * Create a TaskMaestro execution layer.
 */
export function taskmaestroLayer(config: TaskmaestroDispatch): ExecutionLayer {
  return { type: 'taskmaestro', config };
}

/**
 * Create a Teams execution layer.
 */
export function teamsLayer(config: TeamsDispatch, visibility?: VisibilityConfig): ExecutionLayer {
  return { type: 'teams', config, ...(visibility ? { visibility } : {}) };
}

/**
 * Serialize an ExecutionPlan to a flat, JSON-safe structure for handler consumption.
 *
 * The serialized form includes:
 * - `strategy`: simple name or composite like "taskmaestro+teams"
 * - `isNested`: whether inner coordination is present
 * - `outerExecution`: serialized outer layer
 * - `innerCoordination`: serialized inner layer (if present)
 */
export function serializeExecutionPlan(plan: ExecutionPlan): Record<string, unknown> {
  const serialized: Record<string, unknown> = {
    outerExecution: serializeLayer(plan.outerExecution),
    isNested: isNestedPlan(plan),
    strategy: plan.innerCoordination
      ? `${plan.outerExecution.type}+${plan.innerCoordination.type}`
      : plan.outerExecution.type,
  };

  if (plan.innerCoordination) {
    serialized.innerCoordination = serializeLayer(plan.innerCoordination);
  }

  return serialized;
}

function serializeLayer(layer: ExecutionLayer): Record<string, unknown> {
  switch (layer.type) {
    case 'subagent':
      return {
        type: 'subagent',
        agentCount: layer.agents.length,
        agents: layer.agents.map(a => ({
          name: a.name,
          displayName: a.displayName,
          description: a.description,
        })),
      };
    case 'taskmaestro':
      return {
        type: 'taskmaestro',
        sessionName: layer.config.sessionName,
        paneCount: layer.config.paneCount,
        assignments: layer.config.assignments.map(a => ({
          name: a.name,
          displayName: a.displayName,
        })),
      };
    case 'teams':
      return {
        type: 'teams',
        teamName: layer.config.team_name,
        teammateCount: layer.config.teammates.length,
        teammates: layer.config.teammates.map(t => ({ name: t.name })),
        ...(layer.visibility ? { visibility: layer.visibility } : {}),
      };
  }
}
