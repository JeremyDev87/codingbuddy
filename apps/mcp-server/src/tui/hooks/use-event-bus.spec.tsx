import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';
import { Text } from 'ink';
import { TuiEventBus, TUI_EVENTS } from '../events';
import {
  useEventBus,
  eventBusReducer,
  initialState,
  type EventBusState,
  type EventBusAction,
} from './use-event-bus';

describe('eventBusReducer', () => {
  describe('AGENT_ACTIVATED', () => {
    it('should add agent with running status', () => {
      const action: EventBusAction = {
        type: 'AGENT_ACTIVATED',
        payload: {
          agentId: 'a1',
          name: 'security',
          role: 'specialist',
          isPrimary: true,
        },
      };
      const state = eventBusReducer(initialState, action);

      expect(state.agents).toHaveLength(1);
      expect(state.agents[0]).toEqual({
        id: 'a1',
        name: 'security',
        role: 'specialist',
        status: 'running',
        progress: 0,
        isPrimary: true,
      });
    });

    it('should update existing agent to running on re-activation', () => {
      const prev: EventBusState = {
        ...initialState,
        agents: [
          {
            id: 'a1',
            name: 'security',
            role: 'specialist',
            status: 'completed',
            progress: 100,
            isPrimary: false,
          },
        ],
      };
      const action: EventBusAction = {
        type: 'AGENT_ACTIVATED',
        payload: {
          agentId: 'a1',
          name: 'security',
          role: 'specialist',
          isPrimary: true,
        },
      };
      const state = eventBusReducer(prev, action);

      expect(state.agents).toHaveLength(1);
      expect(state.agents[0].status).toBe('running');
      expect(state.agents[0].isPrimary).toBe(true);
    });

    it('should not mutate previous state', () => {
      const action: EventBusAction = {
        type: 'AGENT_ACTIVATED',
        payload: {
          agentId: 'a1',
          name: 'security',
          role: 'specialist',
          isPrimary: false,
        },
      };
      const prev = { ...initialState };
      eventBusReducer(prev, action);

      expect(prev.agents).toHaveLength(0);
    });
  });

  describe('AGENT_DEACTIVATED', () => {
    it('should set agent status to completed', () => {
      const prev: EventBusState = {
        ...initialState,
        agents: [
          {
            id: 'a1',
            name: 'security',
            role: 'specialist',
            status: 'running',
            progress: 0,
            isPrimary: true,
          },
        ],
      };
      const action: EventBusAction = {
        type: 'AGENT_DEACTIVATED',
        payload: { agentId: 'a1', reason: 'completed', durationMs: 500 },
      };
      const state = eventBusReducer(prev, action);

      expect(state.agents[0].status).toBe('completed');
    });

    it('should set agent status to failed on error reason', () => {
      const prev: EventBusState = {
        ...initialState,
        agents: [
          {
            id: 'a1',
            name: 'security',
            role: 'specialist',
            status: 'running',
            progress: 0,
            isPrimary: true,
          },
        ],
      };
      const action: EventBusAction = {
        type: 'AGENT_DEACTIVATED',
        payload: { agentId: 'a1', reason: 'error', durationMs: 100 },
      };
      const state = eventBusReducer(prev, action);

      expect(state.agents[0].status).toBe('failed');
    });

    it('should return same state for unknown agent', () => {
      const action: EventBusAction = {
        type: 'AGENT_DEACTIVATED',
        payload: { agentId: 'unknown', reason: 'completed', durationMs: 0 },
      };
      const state = eventBusReducer(initialState, action);

      expect(state).toBe(initialState);
    });
  });

  describe('MODE_CHANGED', () => {
    it('should update mode', () => {
      const action: EventBusAction = {
        type: 'MODE_CHANGED',
        payload: { from: null, to: 'PLAN' },
      };
      const state = eventBusReducer(initialState, action);

      expect(state.mode).toBe('PLAN');
    });

    it('should update mode from previous value', () => {
      const prev: EventBusState = { ...initialState, mode: 'PLAN' };
      const action: EventBusAction = {
        type: 'MODE_CHANGED',
        payload: { from: 'PLAN', to: 'ACT' },
      };
      const state = eventBusReducer(prev, action);

      expect(state.mode).toBe('ACT');
    });
  });

  describe('SKILL_RECOMMENDED', () => {
    it('should append skill to list', () => {
      const action: EventBusAction = {
        type: 'SKILL_RECOMMENDED',
        payload: { skillName: 'brainstorming', reason: 'creative task' },
      };
      const state = eventBusReducer(initialState, action);

      expect(state.skills).toHaveLength(1);
      expect(state.skills[0]).toEqual({
        skillName: 'brainstorming',
        reason: 'creative task',
      });
    });

    it('should not replace existing skills', () => {
      const prev: EventBusState = {
        ...initialState,
        skills: [{ skillName: 'tdd', reason: 'testing' }],
      };
      const action: EventBusAction = {
        type: 'SKILL_RECOMMENDED',
        payload: { skillName: 'brainstorming', reason: 'creative task' },
      };
      const state = eventBusReducer(prev, action);

      expect(state.skills).toHaveLength(2);
    });
  });

  describe('PARALLEL_STARTED', () => {
    it('should return state unchanged', () => {
      const action: EventBusAction = {
        type: 'PARALLEL_STARTED',
        payload: { specialists: ['security', 'perf'], mode: 'EVAL' },
      };
      const state = eventBusReducer(initialState, action);

      expect(state).toBe(initialState);
    });
  });

  describe('PARALLEL_COMPLETED', () => {
    it('should return state unchanged', () => {
      const action: EventBusAction = {
        type: 'PARALLEL_COMPLETED',
        payload: {
          specialists: ['security'],
          results: { security: 'done' },
        },
      };
      const state = eventBusReducer(initialState, action);

      expect(state).toBe(initialState);
    });
  });
});

function TestComponent({ eventBus }: { eventBus: TuiEventBus }) {
  const { agents, mode, skills } = useEventBus(eventBus);
  return (
    <Text>
      {JSON.stringify({
        agentCount: agents.length,
        mode,
        skillCount: skills.length,
        agentNames: agents.map(a => a.name),
      })}
    </Text>
  );
}

const tick = () => new Promise(resolve => setTimeout(resolve, 0));

describe('useEventBus', () => {
  let eventBus: TuiEventBus;

  beforeEach(() => {
    eventBus = new TuiEventBus();
  });

  it('should return initial state', () => {
    const { lastFrame } = render(<TestComponent eventBus={eventBus} />);

    expect(lastFrame()).toContain('"agentCount":0');
    expect(lastFrame()).toContain('"mode":null');
    expect(lastFrame()).toContain('"skillCount":0');
  });

  it('should update agents on AGENT_ACTIVATED event', async () => {
    const { lastFrame } = render(<TestComponent eventBus={eventBus} />);

    eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
      agentId: 'a1',
      name: 'security',
      role: 'specialist',
      isPrimary: true,
    });
    await tick();

    expect(lastFrame()).toContain('"agentCount":1');
    expect(lastFrame()).toContain('security');
  });

  it('should update mode on MODE_CHANGED event', async () => {
    const { lastFrame } = render(<TestComponent eventBus={eventBus} />);

    eventBus.emit(TUI_EVENTS.MODE_CHANGED, { from: null, to: 'PLAN' });
    await tick();

    expect(lastFrame()).toContain('"mode":"PLAN"');
  });

  it('should update skills on SKILL_RECOMMENDED event', async () => {
    const { lastFrame } = render(<TestComponent eventBus={eventBus} />);

    eventBus.emit(TUI_EVENTS.SKILL_RECOMMENDED, {
      skillName: 'tdd',
      reason: 'testing',
    });
    await tick();

    expect(lastFrame()).toContain('"skillCount":1');
  });

  it('should handle agent lifecycle (activate then deactivate)', async () => {
    const { lastFrame } = render(<TestComponent eventBus={eventBus} />);

    eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
      agentId: 'a1',
      name: 'security',
      role: 'specialist',
      isPrimary: true,
    });
    await tick();
    expect(lastFrame()).toContain('"agentCount":1');

    eventBus.emit(TUI_EVENTS.AGENT_DEACTIVATED, {
      agentId: 'a1',
      reason: 'completed',
      durationMs: 300,
    });
    await tick();
    // Agent still exists but status changed
    expect(lastFrame()).toContain('"agentCount":1');
  });

  it('should cleanup listeners on unmount', () => {
    const { unmount } = render(<TestComponent eventBus={eventBus} />);

    expect(eventBus.listenerCount(TUI_EVENTS.AGENT_ACTIVATED)).toBeGreaterThan(
      0,
    );
    expect(eventBus.listenerCount(TUI_EVENTS.MODE_CHANGED)).toBeGreaterThan(0);

    unmount();

    expect(eventBus.listenerCount(TUI_EVENTS.AGENT_ACTIVATED)).toBe(0);
    expect(eventBus.listenerCount(TUI_EVENTS.AGENT_DEACTIVATED)).toBe(0);
    expect(eventBus.listenerCount(TUI_EVENTS.MODE_CHANGED)).toBe(0);
    expect(eventBus.listenerCount(TUI_EVENTS.SKILL_RECOMMENDED)).toBe(0);
    expect(eventBus.listenerCount(TUI_EVENTS.PARALLEL_STARTED)).toBe(0);
    expect(eventBus.listenerCount(TUI_EVENTS.PARALLEL_COMPLETED)).toBe(0);
  });

  it('should handle PARALLEL_STARTED event without error', async () => {
    const { lastFrame } = render(<TestComponent eventBus={eventBus} />);

    eventBus.emit(TUI_EVENTS.PARALLEL_STARTED, {
      specialists: ['security', 'perf'],
      mode: 'EVAL',
    });
    await tick();

    // State unchanged - agents/mode/skills stay at initial
    expect(lastFrame()).toContain('"agentCount":0');
    expect(lastFrame()).toContain('"mode":null');
  });

  it('should handle PARALLEL_COMPLETED event without error', async () => {
    const { lastFrame } = render(<TestComponent eventBus={eventBus} />);

    eventBus.emit(TUI_EVENTS.PARALLEL_COMPLETED, {
      specialists: ['security'],
      results: { security: 'done' },
    });
    await tick();

    expect(lastFrame()).toContain('"agentCount":0');
  });
});

function UndefinedTestComponent() {
  const { agents, mode, skills } = useEventBus(undefined);
  return (
    <Text>
      {JSON.stringify({
        agentCount: agents.length,
        mode,
        skillCount: skills.length,
      })}
    </Text>
  );
}

describe('useEventBus with undefined eventBus', () => {
  it('should return initial state when eventBus is undefined', () => {
    const { lastFrame } = render(<UndefinedTestComponent />);

    expect(lastFrame()).toContain('"agentCount":0');
    expect(lastFrame()).toContain('"mode":null');
    expect(lastFrame()).toContain('"skillCount":0');
  });

  it('should not register any listeners', () => {
    const { unmount } = render(<UndefinedTestComponent />);
    // No eventBus means no listeners to check - just verify no crash
    unmount();
  });
});
