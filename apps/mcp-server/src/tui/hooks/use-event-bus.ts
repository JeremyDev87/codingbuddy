import { useEffect, useReducer } from 'react';
import type { TuiEventBus } from '../events';
import {
  TUI_EVENTS,
  type AgentActivatedEvent,
  type AgentDeactivatedEvent,
  type ModeChangedEvent,
  type SkillRecommendedEvent,
  type ParallelStartedEvent,
  type ParallelCompletedEvent,
  type AgentsLoadedEvent,
  type AgentMetadata,
} from '../events';
import type { AgentState, Mode } from '../types';

export interface EventBusState {
  agents: AgentState[];
  mode: Mode | null;
  skills: SkillRecommendedEvent[];
  allAgents: AgentMetadata[];
}

export type EventBusAction =
  | { type: 'AGENT_ACTIVATED'; payload: AgentActivatedEvent }
  | { type: 'AGENT_DEACTIVATED'; payload: AgentDeactivatedEvent }
  | { type: 'MODE_CHANGED'; payload: ModeChangedEvent }
  | { type: 'SKILL_RECOMMENDED'; payload: SkillRecommendedEvent }
  | { type: 'PARALLEL_STARTED'; payload: ParallelStartedEvent }
  | { type: 'PARALLEL_COMPLETED'; payload: ParallelCompletedEvent }
  | { type: 'AGENTS_LOADED'; payload: AgentsLoadedEvent };

export const initialState: EventBusState = {
  agents: [],
  mode: null,
  skills: [],
  allAgents: [],
};

export function eventBusReducer(
  state: EventBusState,
  action: EventBusAction,
): EventBusState {
  switch (action.type) {
    case 'AGENT_ACTIVATED': {
      const { agentId, name, role, isPrimary } = action.payload;
      const existing = state.agents.findIndex(a => a.id === agentId);
      const agent: AgentState = {
        id: agentId,
        name,
        role,
        status: 'running',
        progress: 0,
        isPrimary,
      };
      if (existing >= 0) {
        const next = [...state.agents];
        next[existing] = agent;
        return { ...state, agents: next };
      }
      return { ...state, agents: [...state.agents, agent] };
    }
    case 'AGENT_DEACTIVATED': {
      const idx = state.agents.findIndex(a => a.id === action.payload.agentId);
      if (idx < 0) return state;
      const next = [...state.agents];
      next[idx] = {
        ...next[idx],
        status: action.payload.reason === 'error' ? 'failed' : 'completed',
      };
      return { ...state, agents: next };
    }
    case 'MODE_CHANGED':
      return { ...state, mode: action.payload.to };
    case 'SKILL_RECOMMENDED':
      return { ...state, skills: [...state.skills, action.payload] };
    case 'PARALLEL_STARTED':
    case 'PARALLEL_COMPLETED':
      return state;
    case 'AGENTS_LOADED':
      return { ...state, allAgents: action.payload.agents };
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

export function useEventBus(eventBus: TuiEventBus | undefined): EventBusState {
  const [state, dispatch] = useReducer(eventBusReducer, initialState);

  useEffect(() => {
    if (!eventBus) return;

    const onActivated = (p: AgentActivatedEvent) =>
      dispatch({ type: 'AGENT_ACTIVATED', payload: p });
    const onDeactivated = (p: AgentDeactivatedEvent) =>
      dispatch({ type: 'AGENT_DEACTIVATED', payload: p });
    const onModeChanged = (p: ModeChangedEvent) =>
      dispatch({ type: 'MODE_CHANGED', payload: p });
    const onSkill = (p: SkillRecommendedEvent) =>
      dispatch({ type: 'SKILL_RECOMMENDED', payload: p });
    const onParallelStarted = (p: ParallelStartedEvent) =>
      dispatch({ type: 'PARALLEL_STARTED', payload: p });
    const onParallelCompleted = (p: ParallelCompletedEvent) =>
      dispatch({ type: 'PARALLEL_COMPLETED', payload: p });
    const onAgentsLoaded = (p: AgentsLoadedEvent) =>
      dispatch({ type: 'AGENTS_LOADED', payload: p });

    eventBus.on(TUI_EVENTS.AGENT_ACTIVATED, onActivated);
    eventBus.on(TUI_EVENTS.AGENT_DEACTIVATED, onDeactivated);
    eventBus.on(TUI_EVENTS.MODE_CHANGED, onModeChanged);
    eventBus.on(TUI_EVENTS.SKILL_RECOMMENDED, onSkill);
    eventBus.on(TUI_EVENTS.PARALLEL_STARTED, onParallelStarted);
    eventBus.on(TUI_EVENTS.PARALLEL_COMPLETED, onParallelCompleted);
    eventBus.on(TUI_EVENTS.AGENTS_LOADED, onAgentsLoaded);

    return () => {
      eventBus.off(TUI_EVENTS.AGENT_ACTIVATED, onActivated);
      eventBus.off(TUI_EVENTS.AGENT_DEACTIVATED, onDeactivated);
      eventBus.off(TUI_EVENTS.MODE_CHANGED, onModeChanged);
      eventBus.off(TUI_EVENTS.SKILL_RECOMMENDED, onSkill);
      eventBus.off(TUI_EVENTS.PARALLEL_STARTED, onParallelStarted);
      eventBus.off(TUI_EVENTS.PARALLEL_COMPLETED, onParallelCompleted);
      eventBus.off(TUI_EVENTS.AGENTS_LOADED, onAgentsLoaded);
    };
  }, [eventBus]);

  return state;
}
