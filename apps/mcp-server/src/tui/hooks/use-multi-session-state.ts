import { useState, useCallback, useEffect, useRef } from 'react';
import type { DashboardState, GlobalRunState } from '../dashboard-types';
import { createInitialDashboardState } from './use-dashboard-state';
import type { MultiSessionManager, ManagedSession } from '../ipc/multi-session-manager';
import { TUI_EVENTS } from '../events/types';
import type { TuiEventBus } from '../events/event-bus';
import type { AgentActivatedEvent, AgentDeactivatedEvent } from '../events/types';

export interface SessionState {
  pid: number;
  projectRoot: string;
  dashboardState: DashboardState;
}

export interface MultiSessionState {
  sessions: Map<number, SessionState>;
  activeSessionPid: number | null;
  switchSession: (pid: number) => void;
  switchByIndex: (index: number) => void;
  switchNext: () => void;
  switchPrev: () => void;
}

function toSessionState(managed: ManagedSession): SessionState {
  return {
    pid: managed.instance.pid,
    projectRoot: managed.instance.projectRoot,
    dashboardState: createInitialDashboardState(),
  };
}

function buildInitialSessions(manager: MultiSessionManager): Map<number, SessionState> {
  const map = new Map<number, SessionState>();
  for (const managed of manager.getSessions()) {
    const state = toSessionState(managed);
    map.set(state.pid, state);
  }
  return map;
}

function getPidArray(sessions: Map<number, SessionState>): number[] {
  return [...sessions.keys()];
}

export function useMultiSessionState(manager: MultiSessionManager): MultiSessionState {
  const [sessions, setSessions] = useState<Map<number, SessionState>>(() =>
    buildInitialSessions(manager),
  );
  const [activeSessionPid, setActiveSessionPid] = useState<number | null>(() => {
    const initial = manager.getSessions();
    return initial.length > 0 ? initial[0].instance.pid : null;
  });

  // Keep a ref to sessions so callbacks can read the latest value
  const sessionsRef = useRef(sessions);
  sessionsRef.current = sessions;

  const activeRef = useRef(activeSessionPid);
  activeRef.current = activeSessionPid;

  // Track per-session event cleanup functions
  const eventCleanupRef = useRef(new Map<number, () => void>());

  const switchSession = useCallback((pid: number) => {
    if (sessionsRef.current.has(pid)) {
      setActiveSessionPid(pid);
    }
  }, []);

  const switchByIndex = useCallback((index: number) => {
    const pids = getPidArray(sessionsRef.current);
    // 1-based index
    if (index < 1 || index > pids.length) return;
    setActiveSessionPid(pids[index - 1]);
  }, []);

  const switchNext = useCallback(() => {
    const pids = getPidArray(sessionsRef.current);
    if (pids.length === 0) return;
    const currentIdx = pids.indexOf(activeRef.current!);
    if (currentIdx === -1) return;
    const nextIdx = (currentIdx + 1) % pids.length;
    setActiveSessionPid(pids[nextIdx]);
  }, []);

  const switchPrev = useCallback(() => {
    const pids = getPidArray(sessionsRef.current);
    if (pids.length === 0) return;
    const currentIdx = pids.indexOf(activeRef.current!);
    if (currentIdx === -1) return;
    const prevIdx = (currentIdx - 1 + pids.length) % pids.length;
    setActiveSessionPid(pids[prevIdx]);
  }, []);

  // Subscribe to per-session EventBus to track globalState for tab bar
  const subscribeSession = useCallback((pid: number, eventBus: TuiEventBus) => {
    // Defensive: clean up any prior subscription for this pid
    const existing = eventCleanupRef.current.get(pid);
    if (existing) existing();

    let runningAgents = 0;

    const updateGlobalState = (globalState: GlobalRunState) => {
      setSessions(prev => {
        const session = prev.get(pid);
        if (!session || session.dashboardState.globalState === globalState) return prev;
        const next = new Map(prev);
        next.set(pid, {
          ...session,
          dashboardState: { ...session.dashboardState, globalState },
        });
        return next;
      });
    };

    const onActivated = (_payload: AgentActivatedEvent) => {
      runningAgents++;
      updateGlobalState('RUNNING');
    };

    const onDeactivated = (payload: AgentDeactivatedEvent) => {
      runningAgents = Math.max(0, runningAgents - 1);
      if (runningAgents === 0) {
        updateGlobalState(payload.reason === 'error' ? 'ERROR' : 'IDLE');
      }
    };

    eventBus.on(TUI_EVENTS.AGENT_ACTIVATED, onActivated);
    eventBus.on(TUI_EVENTS.AGENT_DEACTIVATED, onDeactivated);

    eventCleanupRef.current.set(pid, () => {
      eventBus.off(TUI_EVENTS.AGENT_ACTIVATED, onActivated);
      eventBus.off(TUI_EVENTS.AGENT_DEACTIVATED, onDeactivated);
    });
  }, []);

  const unsubscribeSession = useCallback((pid: number) => {
    const cleanup = eventCleanupRef.current.get(pid);
    if (cleanup) {
      cleanup();
      eventCleanupRef.current.delete(pid);
    }
  }, []);

  useEffect(() => {
    // Subscribe to events for initial sessions
    for (const managed of manager.getSessions()) {
      subscribeSession(managed.instance.pid, managed.eventBus);
    }

    const onAdded = (managed: ManagedSession) => {
      const state = toSessionState(managed);
      setSessions(prev => {
        const next = new Map(prev);
        next.set(state.pid, state);
        return next;
      });
      // Auto-focus if no active session
      setActiveSessionPid(prev => (prev === null ? state.pid : prev));
      subscribeSession(managed.instance.pid, managed.eventBus);
    };

    const onRemoved = (pid: number) => {
      unsubscribeSession(pid);
      setSessions(prev => {
        const next = new Map(prev);
        next.delete(pid);
        return next;
      });
      setActiveSessionPid(prev => {
        if (prev !== pid) return prev;
        // Active session was removed: shift to next available
        // NOTE: sessionsRef.current may be stale (setSessions above is batched).
        // We explicitly filter out the removed pid rather than relying on the ref.
        const currentSessions = sessionsRef.current;
        const pids = getPidArray(currentSessions);
        const removedIdx = pids.indexOf(pid);
        // After removal, remaining pids
        const remaining = pids.filter(p => p !== pid);
        if (remaining.length === 0) return null;
        // Pick the session at the same index (or wrap to last)
        const nextIdx = Math.min(removedIdx, remaining.length - 1);
        return remaining[nextIdx];
      });
    };

    manager.onSessionAdded(onAdded);
    manager.onSessionRemoved(onRemoved);

    return () => {
      manager.offSessionAdded(onAdded);
      manager.offSessionRemoved(onRemoved);
      // Clean up all session event subscriptions
      for (const cleanup of eventCleanupRef.current.values()) {
        cleanup();
      }
      eventCleanupRef.current.clear();
    };
  }, [manager, subscribeSession, unsubscribeSession]);

  return {
    sessions,
    activeSessionPid,
    switchSession,
    switchByIndex,
    switchNext,
    switchPrev,
  };
}
