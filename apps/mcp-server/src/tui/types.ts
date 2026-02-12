/**
 * TUI Agent Monitor - Core Type Definitions
 *
 * Types for the Ink-based terminal UI that monitors agent execution.
 */

// Re-export Mode from existing keyword types (single source of truth)
export type { Mode } from '../keyword/keyword.types';

/**
 * Valid agent statuses
 */
export const AGENT_STATUSES = Object.freeze([
  'idle',
  'running',
  'completed',
  'failed',
] as const);

export type AgentStatus = (typeof AGENT_STATUSES)[number];

/**
 * Represents the state of a specialist agent in the TUI
 */
export interface AgentState {
  id: string;
  name: string;
  role: string;
  status: AgentStatus;
  progress: number;
  isPrimary: boolean;
  childAgents?: string[];
}

/**
 * Valid TUI event types
 */
export const TUI_EVENT_TYPES = Object.freeze([
  'agent:start',
  'agent:progress',
  'agent:complete',
  'agent:fail',
  'mode:change',
] as const);

export type TuiEventType = (typeof TUI_EVENT_TYPES)[number];

/**
 * Generic TUI event with typed payload
 */
export interface TuiEvent<T = unknown> {
  type: TuiEventType;
  timestamp: number;
  payload: T;
}

/**
 * Required fields for creating a new AgentState
 */
type AgentStateRequired = Pick<AgentState, 'id' | 'name' | 'role'>;
type AgentStateOptional = Partial<Omit<AgentState, 'id' | 'name' | 'role'>>;

/**
 * Creates an AgentState with sensible defaults
 */
export function createDefaultAgentState(
  params: AgentStateRequired & AgentStateOptional,
): AgentState {
  const { id, name, role, status = 'idle', progress = 0, isPrimary = false, childAgents } = params;

  const state: AgentState = {
    id,
    name,
    role,
    status,
    progress,
    isPrimary,
  };

  if (childAgents !== undefined) {
    state.childAgents = childAgents;
  }

  return state;
}
