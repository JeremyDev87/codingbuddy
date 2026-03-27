import { useReducer, useEffect } from 'react';
import type {
  DashboardState,
  DashboardNode,
  Edge,
  EventLogEntry,
  TaskItem,
  ToolCallRecord,
  ActivitySample,
  ModeTransition,
  FileChangeStats,
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
  type SessionResetEvent,
  type ContextUpdatedEvent,
  type DiscussionRoundAddedEvent,
  type TddPhaseChangedEvent,
  type TddStepUpdatedEvent,
  type ReviewResultAddedEvent,
  type ConnectionStatusChangedEvent,
} from '../events';
import { selectFocusedAgent } from './use-focus-agent';

const EVENT_LOG_MAX = 100;
const EDGE_MAX = 200;
const TOOL_CALLS_MAX = 200;
/** TOOL_INVOKED 시간 기반 진행률 계산 기준선 (밀리초) */
const EXPECTED_AGENT_DURATION_MS = 120_000;

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
    toolCalls: [],
    activityHistory: [],
    objectives: [],
    activeSkills: [],
    toolInvokeCount: 0,
    agentActivateCount: 0,
    skillInvokeCount: 0,
    outputStats: { files: 0, commits: 0 },
    contextDecisions: [],
    contextNotes: [],
    contextMode: null,
    contextStatus: null,
    discussionRounds: [],
    tddCurrentPhase: null,
    tddSteps: [],
    reviewResults: [],
    connectionStatus: 'connected',
    sessionStartedAt: Date.now(),
    modeTransitions: [],
    fileChanges: { created: 0, modified: 0, deleted: 0 },
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
  | { type: 'OBJECTIVE_SET'; payload: ObjectiveSetEvent }
  | { type: 'SESSION_RESET'; payload: SessionResetEvent }
  | { type: 'CONTEXT_UPDATED'; payload: ContextUpdatedEvent }
  | { type: 'ADD_DISCUSSION_ROUND'; payload: DiscussionRoundAddedEvent }
  | { type: 'TDD_PHASE_CHANGED'; payload: TddPhaseChangedEvent }
  | { type: 'TDD_STEP_UPDATED'; payload: TddStepUpdatedEvent }
  | { type: 'REVIEW_RESULT_ADDED'; payload: ReviewResultAddedEvent }
  | { type: 'CONNECTION_STATUS_CHANGED'; payload: ConnectionStatusChangedEvent }
  | { type: 'CLEANUP_STALE_AGENTS'; payload: { now: number; ttlMs: number } };

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
        isParallel: false, // AGENT_ACTIVATED는 항상 단일 에이전트
        startedAt: Date.now(),
      });
      const globalState = 'RUNNING' as const;
      const focusedAgentId = selectFocusedAgent(agents, state.focusedAgentId);
      return {
        ...state,
        agents,
        globalState,
        focusedAgentId,
        agentActivateCount: state.agentActivateCount + 1,
      };
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
          completedAt: Date.now(),
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

    case 'MODE_CHANGED': {
      const { from, to: newMode } = action.payload;
      const agents = cloneAgents(state.agents);
      for (const [id, a] of agents) {
        // from이 null이면 세션 시작이므로 클린업 스킵
        if (
          from !== null &&
          a.stage === from &&
          (a.status === 'done' || (a.status === 'idle' && a.isParallel))
        ) {
          // 이전 모드의 done/idle(parallel) 에이전트 즉시 제거
          agents.delete(id);
          continue;
        }
        // running 에이전트는 새 모드로 stage 업데이트
        if (a.status === 'running') {
          agents.set(id, { ...a, stage: newMode });
        }
      }
      const focusedAgentId = selectFocusedAgent(agents, state.focusedAgentId);
      const transition: ModeTransition = { from, to: newMode, timestamp: Date.now() };
      const modeTransitions = [...state.modeTransitions, transition];
      return {
        ...state,
        currentMode: newMode,
        agents,
        activeSkills: [],
        focusedAgentId,
        modeTransitions,
      };
    }

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
        rawTimestamp: action.payload.timestamp,
      };
      // Ring buffer: drop oldest when at capacity, then append (consistent with edges)
      const base =
        state.eventLog.length >= EVENT_LOG_MAX ? state.eventLog.slice(1) : state.eventLog;

      // Progress increment with focusedAgentId fallback
      const invokedAgentId = action.payload.agentId;
      let agents = state.agents;

      // 1st: Try exact agentId match
      let targetAgent = invokedAgentId ? (state.agents.get(invokedAgentId) ?? null) : null;

      // 2nd: Fallback to focused agent when agentId exists but no exact match found
      if (invokedAgentId && !targetAgent && state.focusedAgentId) {
        targetAgent = state.agents.get(state.focusedAgentId) ?? null;
      }

      if (targetAgent && targetAgent.status === 'running') {
        const now = Date.now();
        const elapsed = targetAgent.startedAt !== undefined ? now - targetAgent.startedAt : 0;
        // 시간 기반 추정: 초반에 빠르게 성장, 90% 상한
        const timeBased = Math.min(90, (elapsed / EXPECTED_AGENT_DURATION_MS) * 100);
        // 툴 호출 기반: 호출마다 +3%, 95% 상한
        const toolBased = Math.min(95, targetAgent.progress + 3);
        // 후퇴 방지를 위해 둘 중 높은 값 사용, 정수 반올림으로 레이블 오버플로우 방지
        const newProgress = Math.round(Math.max(timeBased, toolBased));
        agents = cloneAgents(state.agents);
        agents.set(targetAgent.id, {
          ...targetAgent,
          progress: newProgress,
        });
      }

      const toolCall: ToolCallRecord = {
        agentId: action.payload.agentId ?? 'unknown',
        toolName: action.payload.toolName,
        timestamp: action.payload.timestamp,
        status: 'completed',
      };
      const toolCallsBase =
        state.toolCalls.length >= TOOL_CALLS_MAX ? state.toolCalls.slice(1) : state.toolCalls;

      // Activity history: track tool calls per second for sparkline
      const sec = Math.floor(action.payload.timestamp / 1000);
      const history = state.activityHistory;
      const last = history.length > 0 ? history[history.length - 1] : null;
      let activityHistory: ActivitySample[];
      if (last && last.timestamp === sec) {
        activityHistory = [
          ...history.slice(0, -1),
          { timestamp: sec, toolCalls: last.toolCalls + 1 },
        ];
      } else {
        activityHistory = [...history.slice(-59), { timestamp: sec, toolCalls: 1 }];
      }

      // Track file changes based on tool name
      const toolLower = action.payload.toolName.toLowerCase();
      let fileChanges = state.fileChanges;
      if (toolLower === 'write' || toolLower === 'notebookedit') {
        fileChanges = { ...fileChanges, created: fileChanges.created + 1 };
      } else if (toolLower === 'edit') {
        fileChanges = { ...fileChanges, modified: fileChanges.modified + 1 };
      }

      return {
        ...state,
        agents,
        eventLog: [...base, entry],
        toolCalls: [...toolCallsBase, toolCall],
        activityHistory,
        toolInvokeCount: state.toolInvokeCount + 1,
        fileChanges,
      };
    }

    case 'OBJECTIVE_SET':
      return { ...state, objectives: [action.payload.objective] };

    case 'SKILL_RECOMMENDED': {
      const { skillName } = action.payload;
      if (state.activeSkills.includes(skillName)) return state;
      return {
        ...state,
        activeSkills: [...state.activeSkills, skillName],
        skillInvokeCount: state.skillInvokeCount + 1,
      };
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
          isParallel: true, // parallel dispatch로 등록된 에이전트
          startedAt: Date.now(),
        });
      }
      return { ...state, agents };
    }

    case 'CONTEXT_UPDATED': {
      const { decisions, notes, mode, status } = action.payload;
      return {
        ...state,
        contextDecisions: decisions,
        contextNotes: notes,
        contextMode: mode,
        contextStatus: status,
      };
    }

    case 'ADD_DISCUSSION_ROUND': {
      return {
        ...state,
        discussionRounds: [...state.discussionRounds, action.payload.round],
      };
    }

    case 'SESSION_RESET':
      return createInitialDashboardState();

    case 'CLEANUP_STALE_AGENTS': {
      // Note: 'blocked' agents are intentionally excluded from TTL cleanup.
      // Blocked agents require explicit state transitions to resolve.
      const { now, ttlMs } = action.payload;
      let changed = false;
      const agents = cloneAgents(state.agents);
      for (const [id, a] of agents) {
        if (a.status === 'running') continue; // running 에이전트는 절대 제거 금지
        if (
          (a.status === 'done' && a.completedAt !== undefined && now - a.completedAt > ttlMs) ||
          (a.status === 'error' &&
            a.completedAt !== undefined &&
            now - a.completedAt > ttlMs * 2) ||
          (a.status === 'idle' &&
            a.isParallel &&
            a.startedAt !== undefined &&
            now - a.startedAt > ttlMs)
        ) {
          agents.delete(id);
          changed = true;
        }
      }
      if (!changed) return state;
      const focusedAgentId = selectFocusedAgent(agents, state.focusedAgentId);
      return { ...state, agents, focusedAgentId };
    }

    case 'TDD_PHASE_CHANGED': {
      return { ...state, tddCurrentPhase: action.payload.phase };
    }

    case 'TDD_STEP_UPDATED': {
      const { step } = action.payload;
      const existing = state.tddSteps.findIndex(s => s.id === step.id);
      const tddSteps =
        existing >= 0
          ? state.tddSteps.map((s, i) => (i === existing ? step : s))
          : [...state.tddSteps, step];
      return { ...state, tddSteps };
    }

    case 'REVIEW_RESULT_ADDED': {
      const { result } = action.payload;
      const idx = state.reviewResults.findIndex(r => r.agentId === result.agentId);
      const reviewResults =
        idx >= 0
          ? state.reviewResults.map((r, i) => (i === idx ? result : r))
          : [...state.reviewResults, result];
      return { ...state, reviewResults };
    }

    case 'CONNECTION_STATUS_CHANGED': {
      return { ...state, connectionStatus: action.payload.status };
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
    const onSessionReset = (p: SessionResetEvent) =>
      dispatch({ type: 'SESSION_RESET', payload: p });
    const onContextUpdated = (p: ContextUpdatedEvent) =>
      dispatch({ type: 'CONTEXT_UPDATED', payload: p });
    const onDiscussionRoundAdded = (p: DiscussionRoundAddedEvent) =>
      dispatch({ type: 'ADD_DISCUSSION_ROUND', payload: p });
    const onTddPhaseChanged = (p: TddPhaseChangedEvent) =>
      dispatch({ type: 'TDD_PHASE_CHANGED', payload: p });
    const onTddStepUpdated = (p: TddStepUpdatedEvent) =>
      dispatch({ type: 'TDD_STEP_UPDATED', payload: p });
    const onReviewResultAdded = (p: ReviewResultAddedEvent) =>
      dispatch({ type: 'REVIEW_RESULT_ADDED', payload: p });
    const onConnectionStatusChanged = (p: ConnectionStatusChangedEvent) =>
      dispatch({ type: 'CONNECTION_STATUS_CHANGED', payload: p });

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
    eventBus.on(TUI_EVENTS.SESSION_RESET, onSessionReset);
    eventBus.on(TUI_EVENTS.CONTEXT_UPDATED, onContextUpdated);
    eventBus.on(TUI_EVENTS.DISCUSSION_ROUND_ADDED, onDiscussionRoundAdded);
    eventBus.on(TUI_EVENTS.TDD_PHASE_CHANGED, onTddPhaseChanged);
    eventBus.on(TUI_EVENTS.TDD_STEP_UPDATED, onTddStepUpdated);
    eventBus.on(TUI_EVENTS.REVIEW_RESULT_ADDED, onReviewResultAdded);
    eventBus.on(TUI_EVENTS.CONNECTION_STATUS_CHANGED, onConnectionStatusChanged);

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
      eventBus.off(TUI_EVENTS.SESSION_RESET, onSessionReset);
      eventBus.off(TUI_EVENTS.CONTEXT_UPDATED, onContextUpdated);
      eventBus.off(TUI_EVENTS.DISCUSSION_ROUND_ADDED, onDiscussionRoundAdded);
      eventBus.off(TUI_EVENTS.TDD_PHASE_CHANGED, onTddPhaseChanged);
      eventBus.off(TUI_EVENTS.TDD_STEP_UPDATED, onTddStepUpdated);
      eventBus.off(TUI_EVENTS.REVIEW_RESULT_ADDED, onReviewResultAdded);
      eventBus.off(TUI_EVENTS.CONNECTION_STATUS_CHANGED, onConnectionStatusChanged);
    };
  }, [eventBus]);

  // Cleanup interval: TTL 초과 에이전트를 10초마다 제거
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      dispatch({ type: 'CLEANUP_STALE_AGENTS', payload: { now: Date.now(), ttlMs: 30_000 } });
    }, 10_000);
    return () => clearInterval(cleanupInterval);
  }, []);

  return state;
}
