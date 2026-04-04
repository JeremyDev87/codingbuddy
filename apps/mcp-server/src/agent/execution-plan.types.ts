/**
 * Execution plan types extracted from agent.types.ts to break the
 * circular dependency: agent.types → keyword.types → agent.types.
 *
 * These types are consumed by keyword.types.ts (ParseModeResult) and
 * re-exported from agent.types.ts for backward compatibility.
 */

/**
 * Dispatch parameters for a single agent, ready to use with Claude Code Task tool
 */
export interface DispatchParams {
  subagent_type: 'general-purpose';
  prompt: string;
  description: string;
  run_in_background?: true;
}

/**
 * A dispatched agent with metadata and Task-tool-ready parameters
 */
export interface DispatchedAgent {
  name: string;
  displayName: string;
  description: string;
  dispatchParams: DispatchParams;
}

/**
 * Inner Teams coordination metadata embedded in a TaskMaestro pane assignment.
 * Present only when the composable `taskmaestro+teams` strategy is active
 * and the Teams capability gate is enabled.
 */
export interface InnerTeamsSpec {
  type: 'teams';
  teamSpec: {
    team_name: string;
    description: string;
  };
  teammates: Array<{
    name: string;
    subagent_type: 'general-purpose';
  }>;
}

/**
 * A single TaskMaestro pane assignment with agent name and prompt.
 * When the composable `taskmaestro+teams` strategy is active,
 * `innerCoordination` carries the metadata a pane worker needs
 * to bootstrap its inner Teams workflow.
 */
export interface TaskmaestroAssignment {
  name: string;
  displayName: string;
  prompt: string;
  /** Inner coordination metadata for composable taskmaestro+teams execution */
  innerCoordination?: InnerTeamsSpec;
}

/**
 * TaskMaestro dispatch configuration for parallel tmux pane execution
 */
export interface TaskmaestroDispatch {
  sessionName: string;
  paneCount: number;
  assignments: TaskmaestroAssignment[];
}

/**
 * A single teammate in a Teams dispatch configuration
 */
export interface TeamsTeammate {
  name: string;
  subagent_type: 'general-purpose';
  team_name: string;
  prompt: string;
}

/**
 * Teams dispatch configuration for Claude Code native team coordination
 */
export interface TeamsDispatch {
  team_name: string;
  description: string;
  teammates: TeamsTeammate[];
}

/**
 * SendMessage-based progress reporting instructions for specialist visibility
 */
export interface VisibilityMessages {
  onStart: string;
  onFinding: string;
  onComplete: string;
}

/**
 * Configuration for real-time specialist execution visibility via Teams messaging
 */
export interface VisibilityConfig {
  reportTo: string;
  format: string;
  includeProgress: boolean;
  messages?: VisibilityMessages;
}

/**
 * Execution layer: subagent strategy
 */
export interface SubagentLayer {
  type: 'subagent';
  agents: DispatchedAgent[];
}

/**
 * Execution layer: TaskMaestro tmux-based transport
 */
export interface TaskmaestroLayer {
  type: 'taskmaestro';
  config: TaskmaestroDispatch;
}

/**
 * Execution layer: Claude Code native Teams coordination
 */
export interface TeamsLayer {
  type: 'teams';
  config: TeamsDispatch;
  visibility?: VisibilityConfig;
}

/**
 * Discriminated union of all execution layer types.
 * Each layer represents a single execution strategy.
 */
export type ExecutionLayer = SubagentLayer | TaskmaestroLayer | TeamsLayer;

/**
 * Composable execution plan with outer transport and optional inner coordination.
 *
 * Simple plan:  outerExecution only (e.g. subagent, taskmaestro, or teams)
 * Nested plan:  outerExecution + innerCoordination (e.g. taskmaestro + teams)
 *
 * @example
 * // Simple subagent plan
 * { outerExecution: { type: 'subagent', agents: [...] } }
 *
 * @example
 * // Nested: TaskMaestro as transport, Teams as coordination
 * {
 *   outerExecution: { type: 'taskmaestro', config: {...} },
 *   innerCoordination: { type: 'teams', config: {...} }
 * }
 */
export interface ExecutionPlan {
  outerExecution: ExecutionLayer;
  innerCoordination?: ExecutionLayer;
}
