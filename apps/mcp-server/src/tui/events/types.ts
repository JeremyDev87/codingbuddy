/**
 * TUI EventBus Event Types and Interfaces
 *
 * Defines the 7 core events for the TUI Agent Monitor event system.
 * Each event has a typed payload interface for type-safe emit/subscribe.
 */
import type { Mode } from '../../keyword/keyword.types';
import type { AgentMetadata } from './agent-metadata.types';

/**
 * Event name constants for the TUI EventBus
 */
export const TUI_EVENTS = Object.freeze({
  AGENT_ACTIVATED: 'agent:activated',
  AGENT_DEACTIVATED: 'agent:deactivated',
  MODE_CHANGED: 'mode:changed',
  SKILL_RECOMMENDED: 'skill:recommended',
  PARALLEL_STARTED: 'parallel:started',
  PARALLEL_COMPLETED: 'parallel:completed',
  AGENTS_LOADED: 'agents:loaded',
} as const);

export type TuiEventName = (typeof TUI_EVENTS)[keyof typeof TUI_EVENTS];

/** Payload when a specialist agent is activated */
export interface AgentActivatedEvent {
  agentId: string;
  name: string;
  role: string;
  isPrimary: boolean;
}

/** Payload when a specialist agent is deactivated */
export interface AgentDeactivatedEvent {
  agentId: string;
  reason: string;
  durationMs: number;
}

/** Payload when the workflow mode changes */
export interface ModeChangedEvent {
  from: Mode | null;
  to: Mode;
}

/** Payload when a skill is recommended */
export interface SkillRecommendedEvent {
  skillName: string;
  reason: string;
}

/** Payload when parallel specialist execution starts */
export interface ParallelStartedEvent {
  specialists: string[];
  mode: Mode;
}

/** Payload when parallel specialist execution completes */
export interface ParallelCompletedEvent {
  specialists: string[];
  results: Record<string, string>;
}

/** Payload when all agent metadata is loaded and available */
export interface AgentsLoadedEvent {
  agents: AgentMetadata[];
}

/**
 * Maps event names to their payload types for type-safe emit/subscribe.
 */
export interface TuiEventMap {
  [TUI_EVENTS.AGENT_ACTIVATED]: AgentActivatedEvent;
  [TUI_EVENTS.AGENT_DEACTIVATED]: AgentDeactivatedEvent;
  [TUI_EVENTS.MODE_CHANGED]: ModeChangedEvent;
  [TUI_EVENTS.SKILL_RECOMMENDED]: SkillRecommendedEvent;
  [TUI_EVENTS.PARALLEL_STARTED]: ParallelStartedEvent;
  [TUI_EVENTS.PARALLEL_COMPLETED]: ParallelCompletedEvent;
  [TUI_EVENTS.AGENTS_LOADED]: AgentsLoadedEvent;
}
