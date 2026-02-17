import React, { act } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';
import { Text } from 'ink';

import { useMultiSessionState } from './use-multi-session-state';
import type { MultiSessionState } from './use-multi-session-state';
import type { MultiSessionManager, ManagedSession } from '../ipc/multi-session-manager';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function makeManagedSession(pid: number, projectRoot = `/project/${pid}`): ManagedSession {
  return {
    instance: {
      pid,
      projectRoot,
      socketPath: `/tmp/cb-tui-${pid}.sock`,
      startedAt: new Date().toISOString(),
    },
    client: {} as ManagedSession['client'],
    eventBus: { on: vi.fn(), off: vi.fn(), emit: vi.fn() } as unknown as ManagedSession['eventBus'],
    connected: true,
  };
}

interface MockManager {
  getSessions: ReturnType<typeof vi.fn>;
  onSessionAdded: ReturnType<typeof vi.fn>;
  offSessionAdded: ReturnType<typeof vi.fn>;
  onSessionRemoved: ReturnType<typeof vi.fn>;
  offSessionRemoved: ReturnType<typeof vi.fn>;
}

function createMockManager(sessions: ManagedSession[] = []): MockManager {
  return {
    getSessions: vi.fn(() => sessions),
    onSessionAdded: vi.fn(),
    offSessionAdded: vi.fn(),
    onSessionRemoved: vi.fn(),
    offSessionRemoved: vi.fn(),
  };
}

/**
 * Wrapper component that renders hook output as serialized text.
 * This follows the project pattern of using ink-testing-library with a wrapper.
 */
let hookResult: MultiSessionState | null = null;

function TestComponent({ manager }: { manager: MultiSessionManager }) {
  const state = useMultiSessionState(manager);
  hookResult = state;
  const pids = [...state.sessions.keys()].join(',');
  return React.createElement(Text, null, `active:${state.activeSessionPid ?? 'null'}|pids:${pids}`);
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('useMultiSessionState', () => {
  beforeEach(() => {
    hookResult = null;
  });

  describe('initialization', () => {
    it('initializes with sessions from manager', () => {
      const s1 = makeManagedSession(100);
      const s2 = makeManagedSession(200);
      const mgr = createMockManager([s1, s2]);

      const { lastFrame } = render(
        React.createElement(TestComponent, { manager: mgr as unknown as MultiSessionManager }),
      );

      expect(lastFrame()).toContain('pids:100,200');
      expect(hookResult!.sessions.size).toBe(2);
    });

    it('sets initial activeSessionPid to first session pid', () => {
      const s1 = makeManagedSession(100);
      const s2 = makeManagedSession(200);
      const mgr = createMockManager([s1, s2]);

      render(
        React.createElement(TestComponent, { manager: mgr as unknown as MultiSessionManager }),
      );

      expect(hookResult!.activeSessionPid).toBe(100);
    });

    it('sets activeSessionPid to null when manager has no sessions', () => {
      const mgr = createMockManager([]);

      const { lastFrame } = render(
        React.createElement(TestComponent, { manager: mgr as unknown as MultiSessionManager }),
      );

      expect(lastFrame()).toContain('active:null');
      expect(hookResult!.activeSessionPid).toBeNull();
      expect(hookResult!.sessions.size).toBe(0);
    });

    it('registers onSessionAdded and onSessionRemoved callbacks', () => {
      const mgr = createMockManager([]);

      render(
        React.createElement(TestComponent, { manager: mgr as unknown as MultiSessionManager }),
      );

      expect(mgr.onSessionAdded).toHaveBeenCalledTimes(1);
      expect(mgr.onSessionRemoved).toHaveBeenCalledTimes(1);
    });

    it('initializes each SessionState with dashboardState placeholder', () => {
      const s1 = makeManagedSession(100, '/my/project');
      const mgr = createMockManager([s1]);

      render(
        React.createElement(TestComponent, { manager: mgr as unknown as MultiSessionManager }),
      );

      const session = hookResult!.sessions.get(100);
      expect(session).toBeDefined();
      expect(session!.pid).toBe(100);
      expect(session!.projectRoot).toBe('/my/project');
      expect(session!.dashboardState).toBeDefined();
      expect(session!.dashboardState.globalState).toBe('IDLE');
    });
  });

  describe('switchSession', () => {
    it('switches active session by pid', () => {
      const s1 = makeManagedSession(100);
      const s2 = makeManagedSession(200);
      const mgr = createMockManager([s1, s2]);

      render(
        React.createElement(TestComponent, { manager: mgr as unknown as MultiSessionManager }),
      );

      expect(hookResult!.activeSessionPid).toBe(100);

      act(() => {
        hookResult!.switchSession(200);
      });

      expect(hookResult!.activeSessionPid).toBe(200);
    });

    it('does not change active session for unknown pid', () => {
      const s1 = makeManagedSession(100);
      const mgr = createMockManager([s1]);

      render(
        React.createElement(TestComponent, { manager: mgr as unknown as MultiSessionManager }),
      );

      act(() => {
        hookResult!.switchSession(999);
      });

      expect(hookResult!.activeSessionPid).toBe(100);
    });
  });

  describe('switchByIndex', () => {
    it('switches to session by 1-based index', () => {
      const s1 = makeManagedSession(100);
      const s2 = makeManagedSession(200);
      const s3 = makeManagedSession(300);
      const mgr = createMockManager([s1, s2, s3]);

      render(
        React.createElement(TestComponent, { manager: mgr as unknown as MultiSessionManager }),
      );

      act(() => {
        hookResult!.switchByIndex(2);
      });

      expect(hookResult!.activeSessionPid).toBe(200);

      act(() => {
        hookResult!.switchByIndex(3);
      });

      expect(hookResult!.activeSessionPid).toBe(300);
    });

    it('ignores out-of-range index', () => {
      const s1 = makeManagedSession(100);
      const mgr = createMockManager([s1]);

      render(
        React.createElement(TestComponent, { manager: mgr as unknown as MultiSessionManager }),
      );

      act(() => {
        hookResult!.switchByIndex(0);
      });

      expect(hookResult!.activeSessionPid).toBe(100);

      act(() => {
        hookResult!.switchByIndex(5);
      });

      expect(hookResult!.activeSessionPid).toBe(100);
    });
  });

  describe('switchNext', () => {
    it('cycles forward through sessions', () => {
      const s1 = makeManagedSession(100);
      const s2 = makeManagedSession(200);
      const s3 = makeManagedSession(300);
      const mgr = createMockManager([s1, s2, s3]);

      render(
        React.createElement(TestComponent, { manager: mgr as unknown as MultiSessionManager }),
      );

      expect(hookResult!.activeSessionPid).toBe(100);

      act(() => {
        hookResult!.switchNext();
      });

      expect(hookResult!.activeSessionPid).toBe(200);

      act(() => {
        hookResult!.switchNext();
      });

      expect(hookResult!.activeSessionPid).toBe(300);
    });

    it('wraps around to first session', () => {
      const s1 = makeManagedSession(100);
      const s2 = makeManagedSession(200);
      const mgr = createMockManager([s1, s2]);

      render(
        React.createElement(TestComponent, { manager: mgr as unknown as MultiSessionManager }),
      );

      act(() => {
        hookResult!.switchNext(); // -> 200
      });

      act(() => {
        hookResult!.switchNext(); // -> wrap to 100
      });

      expect(hookResult!.activeSessionPid).toBe(100);
    });

    it('does nothing with single session', () => {
      const s1 = makeManagedSession(100);
      const mgr = createMockManager([s1]);

      render(
        React.createElement(TestComponent, { manager: mgr as unknown as MultiSessionManager }),
      );

      act(() => {
        hookResult!.switchNext();
      });

      expect(hookResult!.activeSessionPid).toBe(100);
    });

    it('does nothing with no sessions', () => {
      const mgr = createMockManager([]);

      render(
        React.createElement(TestComponent, { manager: mgr as unknown as MultiSessionManager }),
      );

      act(() => {
        hookResult!.switchNext();
      });

      expect(hookResult!.activeSessionPid).toBeNull();
    });
  });

  describe('switchPrev', () => {
    it('cycles backward through sessions', () => {
      const s1 = makeManagedSession(100);
      const s2 = makeManagedSession(200);
      const s3 = makeManagedSession(300);
      const mgr = createMockManager([s1, s2, s3]);

      render(
        React.createElement(TestComponent, { manager: mgr as unknown as MultiSessionManager }),
      );

      // Active is 100 (first), going prev should wrap to 300 (last)
      act(() => {
        hookResult!.switchPrev();
      });

      expect(hookResult!.activeSessionPid).toBe(300);

      act(() => {
        hookResult!.switchPrev();
      });

      expect(hookResult!.activeSessionPid).toBe(200);
    });

    it('wraps around to last session', () => {
      const s1 = makeManagedSession(100);
      const s2 = makeManagedSession(200);
      const mgr = createMockManager([s1, s2]);

      render(
        React.createElement(TestComponent, { manager: mgr as unknown as MultiSessionManager }),
      );

      act(() => {
        hookResult!.switchPrev(); // wrap to 200
      });

      expect(hookResult!.activeSessionPid).toBe(200);
    });

    it('does nothing with no sessions', () => {
      const mgr = createMockManager([]);

      render(
        React.createElement(TestComponent, { manager: mgr as unknown as MultiSessionManager }),
      );

      act(() => {
        hookResult!.switchPrev();
      });

      expect(hookResult!.activeSessionPid).toBeNull();
    });
  });

  describe('onSessionAdded callback', () => {
    it('adds new session to the map', () => {
      const s1 = makeManagedSession(100);
      const mgr = createMockManager([s1]);

      render(
        React.createElement(TestComponent, { manager: mgr as unknown as MultiSessionManager }),
      );

      expect(hookResult!.sessions.size).toBe(1);

      // Extract the registered callback
      const addedCallback = mgr.onSessionAdded.mock.calls[0][0] as (s: ManagedSession) => void;
      const s2 = makeManagedSession(200);

      act(() => {
        addedCallback(s2);
      });

      expect(hookResult!.sessions.size).toBe(2);
      expect(hookResult!.sessions.has(200)).toBe(true);
    });

    it('auto-focuses new session if activeSessionPid is null', () => {
      const mgr = createMockManager([]);

      render(
        React.createElement(TestComponent, { manager: mgr as unknown as MultiSessionManager }),
      );

      expect(hookResult!.activeSessionPid).toBeNull();

      const addedCallback = mgr.onSessionAdded.mock.calls[0][0] as (s: ManagedSession) => void;
      const s1 = makeManagedSession(100);

      act(() => {
        addedCallback(s1);
      });

      expect(hookResult!.activeSessionPid).toBe(100);
    });

    it('does not change active session when one already exists', () => {
      const s1 = makeManagedSession(100);
      const mgr = createMockManager([s1]);

      render(
        React.createElement(TestComponent, { manager: mgr as unknown as MultiSessionManager }),
      );

      expect(hookResult!.activeSessionPid).toBe(100);

      const addedCallback = mgr.onSessionAdded.mock.calls[0][0] as (s: ManagedSession) => void;
      const s2 = makeManagedSession(200);

      act(() => {
        addedCallback(s2);
      });

      expect(hookResult!.activeSessionPid).toBe(100);
    });
  });

  describe('EventBus subscription and globalState tracking', () => {
    it('subscribes to AGENT_ACTIVATED and AGENT_DEACTIVATED on each session eventBus', () => {
      const s1 = makeManagedSession(100);
      const s2 = makeManagedSession(200);
      const mgr = createMockManager([s1, s2]);

      render(
        React.createElement(TestComponent, { manager: mgr as unknown as MultiSessionManager }),
      );

      // Each eventBus should have on() called twice (AGENT_ACTIVATED + AGENT_DEACTIVATED)
      expect(s1.eventBus.on).toHaveBeenCalledTimes(2);
      expect(s2.eventBus.on).toHaveBeenCalledTimes(2);
    });

    it('transitions globalState to RUNNING on AGENT_ACTIVATED', () => {
      const s1 = makeManagedSession(100);
      const mgr = createMockManager([s1]);

      render(
        React.createElement(TestComponent, { manager: mgr as unknown as MultiSessionManager }),
      );

      // Initial state should be IDLE
      expect(hookResult!.sessions.get(100)!.dashboardState.globalState).toBe('IDLE');

      // Extract the AGENT_ACTIVATED handler (first on() call)
      const onCalls = vi.mocked(s1.eventBus.on).mock.calls;
      const activatedHandler = onCalls.find(c => c[0] === 'agent:activated')![1] as (
        payload: unknown,
      ) => void;

      act(() => {
        activatedHandler({ agentId: 'test-agent' });
      });

      expect(hookResult!.sessions.get(100)!.dashboardState.globalState).toBe('RUNNING');
    });

    it('transitions globalState to IDLE on AGENT_DEACTIVATED with reason completed', () => {
      const s1 = makeManagedSession(100);
      const mgr = createMockManager([s1]);

      render(
        React.createElement(TestComponent, { manager: mgr as unknown as MultiSessionManager }),
      );

      const onCalls = vi.mocked(s1.eventBus.on).mock.calls;
      const activatedHandler = onCalls.find(c => c[0] === 'agent:activated')![1] as (
        payload: unknown,
      ) => void;
      const deactivatedHandler = onCalls.find(c => c[0] === 'agent:deactivated')![1] as (
        payload: unknown,
      ) => void;

      // Activate then deactivate
      act(() => {
        activatedHandler({ agentId: 'test-agent' });
      });

      expect(hookResult!.sessions.get(100)!.dashboardState.globalState).toBe('RUNNING');

      act(() => {
        deactivatedHandler({ agentId: 'test-agent', reason: 'completed', durationMs: 1000 });
      });

      expect(hookResult!.sessions.get(100)!.dashboardState.globalState).toBe('IDLE');
    });

    it('transitions globalState to ERROR on AGENT_DEACTIVATED with reason error', () => {
      const s1 = makeManagedSession(100);
      const mgr = createMockManager([s1]);

      render(
        React.createElement(TestComponent, { manager: mgr as unknown as MultiSessionManager }),
      );

      const onCalls = vi.mocked(s1.eventBus.on).mock.calls;
      const activatedHandler = onCalls.find(c => c[0] === 'agent:activated')![1] as (
        payload: unknown,
      ) => void;
      const deactivatedHandler = onCalls.find(c => c[0] === 'agent:deactivated')![1] as (
        payload: unknown,
      ) => void;

      act(() => {
        activatedHandler({ agentId: 'test-agent' });
      });

      act(() => {
        deactivatedHandler({ agentId: 'test-agent', reason: 'error', durationMs: 500 });
      });

      expect(hookResult!.sessions.get(100)!.dashboardState.globalState).toBe('ERROR');
    });

    it('transitions globalState to IDLE on AGENT_DEACTIVATED with reason replaced', () => {
      const s1 = makeManagedSession(100);
      const mgr = createMockManager([s1]);

      render(
        React.createElement(TestComponent, { manager: mgr as unknown as MultiSessionManager }),
      );

      const onCalls = vi.mocked(s1.eventBus.on).mock.calls;
      const activatedHandler = onCalls.find(c => c[0] === 'agent:activated')![1] as (
        payload: unknown,
      ) => void;
      const deactivatedHandler = onCalls.find(c => c[0] === 'agent:deactivated')![1] as (
        payload: unknown,
      ) => void;

      act(() => {
        activatedHandler({ agentId: 'test-agent' });
      });

      act(() => {
        deactivatedHandler({ agentId: 'test-agent', reason: 'replaced', durationMs: 200 });
      });

      expect(hookResult!.sessions.get(100)!.dashboardState.globalState).toBe('IDLE');
    });

    it('does not change globalState on spurious AGENT_DEACTIVATED when no agents were active', () => {
      const s1 = makeManagedSession(100);
      const mgr = createMockManager([s1]);

      render(
        React.createElement(TestComponent, { manager: mgr as unknown as MultiSessionManager }),
      );

      const onCalls = vi.mocked(s1.eventBus.on).mock.calls;
      const deactivatedHandler = onCalls.find(c => c[0] === 'agent:deactivated')![1] as (
        payload: unknown,
      ) => void;

      // Fire deactivated without a prior activate (runningAgents underflow)
      act(() => {
        deactivatedHandler({ agentId: 'ghost-agent', reason: 'completed', durationMs: 0 });
      });

      // State must remain IDLE (Math.max(0, 0 - 1) = 0, so IDLE path is taken)
      expect(hookResult!.sessions.get(100)!.dashboardState.globalState).toBe('IDLE');
    });

    it('stays RUNNING when multiple agents active and one deactivates', () => {
      const s1 = makeManagedSession(100);
      const mgr = createMockManager([s1]);

      render(
        React.createElement(TestComponent, { manager: mgr as unknown as MultiSessionManager }),
      );

      const onCalls = vi.mocked(s1.eventBus.on).mock.calls;
      const activatedHandler = onCalls.find(c => c[0] === 'agent:activated')![1] as (
        payload: unknown,
      ) => void;
      const deactivatedHandler = onCalls.find(c => c[0] === 'agent:deactivated')![1] as (
        payload: unknown,
      ) => void;

      // Activate two agents
      act(() => {
        activatedHandler({ agentId: 'agent-1' });
        activatedHandler({ agentId: 'agent-2' });
      });

      expect(hookResult!.sessions.get(100)!.dashboardState.globalState).toBe('RUNNING');

      // Deactivate one — still running
      act(() => {
        deactivatedHandler({ agentId: 'agent-1', reason: 'completed', durationMs: 100 });
      });

      expect(hookResult!.sessions.get(100)!.dashboardState.globalState).toBe('RUNNING');
    });

    it('subscribes to eventBus for dynamically added sessions', () => {
      const mgr = createMockManager([]);

      render(
        React.createElement(TestComponent, { manager: mgr as unknown as MultiSessionManager }),
      );

      const addedCallback = mgr.onSessionAdded.mock.calls[0][0] as (s: ManagedSession) => void;
      const s1 = makeManagedSession(100);

      act(() => {
        addedCallback(s1);
      });

      // The newly added session's eventBus must be subscribed to immediately
      expect(s1.eventBus.on).toHaveBeenCalledTimes(2);
      expect(s1.eventBus.on).toHaveBeenCalledWith('agent:activated', expect.any(Function));
      expect(s1.eventBus.on).toHaveBeenCalledWith('agent:deactivated', expect.any(Function));
    });

    it('cleans up eventBus subscriptions on unmount with correct event names', () => {
      const s1 = makeManagedSession(100);
      const mgr = createMockManager([s1]);

      const { unmount } = render(
        React.createElement(TestComponent, { manager: mgr as unknown as MultiSessionManager }),
      );

      expect(s1.eventBus.on).toHaveBeenCalledTimes(2);

      unmount();

      // off() must be called for each specific event, not just twice in general
      expect(s1.eventBus.off).toHaveBeenCalledTimes(2);
      expect(s1.eventBus.off).toHaveBeenCalledWith('agent:activated', expect.any(Function));
      expect(s1.eventBus.off).toHaveBeenCalledWith('agent:deactivated', expect.any(Function));
    });
  });

  describe('onSessionRemoved callback', () => {
    it('removes session from the map', () => {
      const s1 = makeManagedSession(100);
      const s2 = makeManagedSession(200);
      const mgr = createMockManager([s1, s2]);

      render(
        React.createElement(TestComponent, { manager: mgr as unknown as MultiSessionManager }),
      );

      expect(hookResult!.sessions.size).toBe(2);

      const removedCallback = mgr.onSessionRemoved.mock.calls[0][0] as (pid: number) => void;

      act(() => {
        removedCallback(200);
      });

      expect(hookResult!.sessions.size).toBe(1);
      expect(hookResult!.sessions.has(200)).toBe(false);
    });

    it('shifts focus to next session when active is removed', () => {
      const s1 = makeManagedSession(100);
      const s2 = makeManagedSession(200);
      const s3 = makeManagedSession(300);
      const mgr = createMockManager([s1, s2, s3]);

      render(
        React.createElement(TestComponent, { manager: mgr as unknown as MultiSessionManager }),
      );

      // Switch to s2 (200), then remove it
      act(() => {
        hookResult!.switchSession(200);
      });

      expect(hookResult!.activeSessionPid).toBe(200);

      const removedCallback = mgr.onSessionRemoved.mock.calls[0][0] as (pid: number) => void;

      act(() => {
        removedCallback(200);
      });

      // Should shift to next available session (300 was after 200)
      expect(hookResult!.activeSessionPid).not.toBe(200);
      expect(hookResult!.sessions.has(hookResult!.activeSessionPid!)).toBe(true);
    });

    it('sets activeSessionPid to null when last session removed', () => {
      const s1 = makeManagedSession(100);
      const mgr = createMockManager([s1]);

      render(
        React.createElement(TestComponent, { manager: mgr as unknown as MultiSessionManager }),
      );

      const removedCallback = mgr.onSessionRemoved.mock.calls[0][0] as (pid: number) => void;

      act(() => {
        removedCallback(100);
      });

      expect(hookResult!.activeSessionPid).toBeNull();
      expect(hookResult!.sessions.size).toBe(0);
    });

    it('does not change active if removed session is not active', () => {
      const s1 = makeManagedSession(100);
      const s2 = makeManagedSession(200);
      const mgr = createMockManager([s1, s2]);

      render(
        React.createElement(TestComponent, { manager: mgr as unknown as MultiSessionManager }),
      );

      expect(hookResult!.activeSessionPid).toBe(100);

      const removedCallback = mgr.onSessionRemoved.mock.calls[0][0] as (pid: number) => void;

      act(() => {
        removedCallback(200);
      });

      expect(hookResult!.activeSessionPid).toBe(100);
    });
  });
});
