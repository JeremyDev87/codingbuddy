import { useReducer, useEffect } from 'react';
import type {
  DashboardState,
  DashboardNode,
  Edge,
  EventLogEntry,
  TaskItem,
} from '../dashboard-types';
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
  type AgentRelationshipEvent,
  type TaskSyncedEvent,
  type ToolInvokedEvent,
  type ObjectiveSetEvent,
} from '../events';
import { selectFocusedAgent } from './use-focus-agent';

const EVENT_LOG_MAX = 100;
const EDGE_MAX = 200;

/**
 * Creates fresh initial dashboard state.
 * Separated as a function to avoid impure calls (process.cwd, Date) at module scope.
 */
export function createInitialDashboardState(): DashboardState {
  return {
    workspace: process.cwd(),
    sessionId: new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19),
    currentMode: null,
    globalState: 'IDLE',
    agents: new Map(),
    edges: [],
    focusedAgentId: null,
    tasks: [],
    eventLog: [],
    objectives: [],
    activeSkills: [],
  };
}

export type DashboardAction =
  | { type: 'AGENT_ACTIVATED'; payload: AgentActivatedEvent }
  | { type: 'AGENT_DEACTIVATED'; payload: AgentDeactivatedEvent }
  | { type: 'MODE_CHANGED'; payload: ModeChangedEvent }
  | { type: 'SKILL_RECOMMENDED'; payload: SkillRecommendedEvent }
  | { type: 'PARALLEL_STARTED'; payload: ParallelStartedEvent }
  | { type: 'PARALLEL_COMPLETED'; payload: ParallelCompletedEvent }
  | { type: 'AGENTS_LOADED'; payload: AgentsLoadedEvent }
  | { type: 'AGENT_RELATIONSHIP'; payload: AgentRelationshipEvent }
  | { type: 'TASK_SYNCED'; payload: TaskSyncedEvent }
  | { type: 'TOOL_INVOKED'; payload: ToolInvokedEvent }
  | { type: 'OBJECTIVE_SET'; payload: ObjectiveSetEvent };

function cloneAgents(agents: Map<string, DashboardNode>): Map<string, DashboardNode> {
  return new Map(agents);
}

export function dashboardReducer(state: DashboardState, action: DashboardAction): DashboardState {
  switch (action.type) {
    case 'AGENT_ACTIVATED': {
      const { agentId, name, isPrimary } = action.payload;
      const agents = cloneAgents(state.agents);
      agents.set(agentId, {
        id: agentId,
        name,
        stage: state.currentMode ?? 'PLAN',
        status: 'running',
        isPrimary,
        progress: 0,
      });
      const globalState = 'RUNNING' as const;
      const focusedAgentId = selectFocusedAgent(agents, state.focusedAgentId);
      return { ...state, agents, globalState, focusedAgentId };
    }

    case 'AGENT_DEACTIVATED': {
      const { agentId, reason } = action.payload;
      const agents = cloneAgents(state.agents);
      const existing = agents.get(agentId);
      if (existing) {
        agents.set(agentId, {
          ...existing,
          status: reason === 'error' ? 'error' : 'done',
          progress: reason === 'error' ? existing.progress : 100,
        });
      }
      // Check if any agents still running
      let anyRunning = false;
      for (const a of agents.values()) {
        if (a.status === 'running') {
          anyRunning = true;
          break;
        }
      }
      const globalState = anyRunning
        ? ('RUNNING' as const)
        : reason === 'error'
          ? ('ERROR' as const)
          : ('IDLE' as const);
      const focusedAgentId = selectFocusedAgent(agents, state.focusedAgentId);
      return { ...state, agents, globalState, focusedAgentId };
    }

    case 'MODE_CHANGED':
      return { ...state, currentMode: action.payload.to, activeSkills: [] };

    case 'AGENT_RELATIONSHIP': {
      const edge: Edge = {
        from: action.payload.from,
        to: action.payload.to,
        label: action.payload.label,
        type: action.payload.type,
      };
      // Ring buffer: drop oldest when at capacity, then append
      const base = state.edges.length >= EDGE_MAX ? state.edges.slice(1) : state.edges;
      return { ...state, edges: [...base, edge] };
    }

    case 'TASK_SYNCED': {
      // Intentionally replaces all tasks with the latest sync snapshot.
      // Each update_context call provides the complete current task list.
      const tasks: TaskItem[] = action.payload.tasks.map(t => ({
        id: t.id,
        subject: t.subject,
        completed: t.completed,
      }));
      return { ...state, tasks };
    }

    case 'TOOL_INVOKED': {
      const entry: EventLogEntry = {
        timestamp: new Date(action.payload.timestamp).toTimeString().slice(0, 8),
        message: `${action.payload.toolName}${action.payload.agentId ? ` [${action.payload.agentId}]` : ''}`,
        level: 'info',
      };
      // Ring buffer: drop oldest when at capacity, then append (consistent with edges)
      const base =
        state.eventLog.length >= EVENT_LOG_MAX ? state.eventLog.slice(1) : state.eventLog;

      // Progress increment for matched agent
      const invokedAgentId = action.payload.agentId;
      let agents = state.agents;
      if (invokedAgentId) {
        const agent = state.agents.get(invokedAgentId);
        if (agent && agent.status === 'running') {
          agents = cloneAgents(state.agents);
          agents.set(invokedAgentId, {
            ...agent,
            progress: Math.min(95, agent.progress + 5),
          });
        }
      }

      return { ...state, agents, eventLog: [...base, entry] };
    }

    case 'OBJECTIVE_SET':
      return { ...state, objectives: [action.payload.objective] };

    case 'SKILL_RECOMMENDED': {
      const { skillName } = action.payload;
      if (state.activeSkills.includes(skillName)) return state;
      return { ...state, activeSkills: [...state.activeSkills, skillName] };
    }

    case 'PARALLEL_STARTED': {
      const { specialists, mode } = action.payload;
      const agents = cloneAgents(state.agents);
      for (const name of specialists) {
        const id = `specialist:${name}`;
        if (agents.has(id)) continue;
        agents.set(id, {
          id,
          name,
          stage: mode,
          status: 'idle',
          isPrimary: false,
          progress: 0,
        });
      }
      return { ...state, agents };
    }

    // Reserved: no emitter currently produces PARALLEL_COMPLETED. Subscription kept for forward compatibility.
    case 'PARALLEL_COMPLETED':
    case 'AGENTS_LOADED':
      return state;

    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

/**
 * React hook: manages dashboard state via EventBus subscriptions.
 */
export function useDashboardState(eventBus: TuiEventBus | undefined): DashboardState {
  const [state, dispatch] = useReducer(dashboardReducer, undefined, createInitialDashboardState);

  useEffect(() => {
    if (!eventBus) return;

    const onActivated = (p: AgentActivatedEvent) =>
      dispatch({ type: 'AGENT_ACTIVATED', payload: p });
    const onDeactivated = (p: AgentDeactivatedEvent) =>
      dispatch({ type: 'AGENT_DEACTIVATED', payload: p });
    const onModeChanged = (p: ModeChangedEvent) => dispatch({ type: 'MODE_CHANGED', payload: p });
    const onSkill = (p: SkillRecommendedEvent) =>
      dispatch({ type: 'SKILL_RECOMMENDED', payload: p });
    const onParallelStarted = (p: ParallelStartedEvent) =>
      dispatch({ type: 'PARALLEL_STARTED', payload: p });
    const onParallelCompleted = (p: ParallelCompletedEvent) =>
      dispatch({ type: 'PARALLEL_COMPLETED', payload: p });
    const onAgentsLoaded = (p: AgentsLoadedEvent) =>
      dispatch({ type: 'AGENTS_LOADED', payload: p });
    const onRelationship = (p: AgentRelationshipEvent) =>
      dispatch({ type: 'AGENT_RELATIONSHIP', payload: p });
    const onTaskSynced = (p: TaskSyncedEvent) => dispatch({ type: 'TASK_SYNCED', payload: p });
    const onToolInvoked = (p: ToolInvokedEvent) => dispatch({ type: 'TOOL_INVOKED', payload: p });
    const onObjectiveSet = (p: ObjectiveSetEvent) =>
      dispatch({ type: 'OBJECTIVE_SET', payload: p });

    eventBus.on(TUI_EVENTS.AGENT_ACTIVATED, onActivated);
    eventBus.on(TUI_EVENTS.AGENT_DEACTIVATED, onDeactivated);
    eventBus.on(TUI_EVENTS.MODE_CHANGED, onModeChanged);
    eventBus.on(TUI_EVENTS.SKILL_RECOMMENDED, onSkill);
    eventBus.on(TUI_EVENTS.PARALLEL_STARTED, onParallelStarted);
    eventBus.on(TUI_EVENTS.PARALLEL_COMPLETED, onParallelCompleted);
    eventBus.on(TUI_EVENTS.AGENTS_LOADED, onAgentsLoaded);
    eventBus.on(TUI_EVENTS.AGENT_RELATIONSHIP, onRelationship);
    eventBus.on(TUI_EVENTS.TASK_SYNCED, onTaskSynced);
    eventBus.on(TUI_EVENTS.TOOL_INVOKED, onToolInvoked);
    eventBus.on(TUI_EVENTS.OBJECTIVE_SET, onObjectiveSet);

    return () => {
      eventBus.off(TUI_EVENTS.AGENT_ACTIVATED, onActivated);
      eventBus.off(TUI_EVENTS.AGENT_DEACTIVATED, onDeactivated);
      eventBus.off(TUI_EVENTS.MODE_CHANGED, onModeChanged);
      eventBus.off(TUI_EVENTS.SKILL_RECOMMENDED, onSkill);
      eventBus.off(TUI_EVENTS.PARALLEL_STARTED, onParallelStarted);
      eventBus.off(TUI_EVENTS.PARALLEL_COMPLETED, onParallelCompleted);
      eventBus.off(TUI_EVENTS.AGENTS_LOADED, onAgentsLoaded);
      eventBus.off(TUI_EVENTS.AGENT_RELATIONSHIP, onRelationship);
      eventBus.off(TUI_EVENTS.TASK_SYNCED, onTaskSynced);
      eventBus.off(TUI_EVENTS.TOOL_INVOKED, onToolInvoked);
      eventBus.off(TUI_EVENTS.OBJECTIVE_SET, onObjectiveSet);
    };
  }, [eventBus]);

  return state;
}
