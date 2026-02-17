import { describe, it, expect } from 'vitest';
import {
  dashboardReducer,
  createInitialDashboardState,
  type DashboardAction,
} from './use-dashboard-state';

describe('dashboardReducer', () => {
  const initialDashboardState = createInitialDashboardState();

  it('handles AGENT_ACTIVATED by adding node', () => {
    const action: DashboardAction = {
      type: 'AGENT_ACTIVATED',
      payload: { agentId: 'a1', name: 'Architect', role: 'architect', isPrimary: true },
    };
    const state = dashboardReducer(initialDashboardState, action);
    expect(state.agents.has('a1')).toBe(true);
    expect(state.agents.get('a1')!.status).toBe('running');
    expect(state.agents.get('a1')!.isPrimary).toBe(true);
    expect(state.globalState).toBe('RUNNING');
  });

  it('sets stage to currentMode when activating agent', () => {
    const withMode = dashboardReducer(initialDashboardState, {
      type: 'MODE_CHANGED',
      payload: { from: null, to: 'ACT' },
    });
    const state = dashboardReducer(withMode, {
      type: 'AGENT_ACTIVATED',
      payload: { agentId: 'a1', name: 'Dev', role: 'developer', isPrimary: false },
    });
    expect(state.agents.get('a1')!.stage).toBe('ACT');
  });

  it('defaults stage to PLAN when currentMode is null', () => {
    const state = dashboardReducer(initialDashboardState, {
      type: 'AGENT_ACTIVATED',
      payload: { agentId: 'a1', name: 'Dev', role: 'developer', isPrimary: false },
    });
    expect(state.agents.get('a1')!.stage).toBe('PLAN');
  });

  it('handles AGENT_DEACTIVATED completed', () => {
    let state = dashboardReducer(initialDashboardState, {
      type: 'AGENT_ACTIVATED',
      payload: { agentId: 'a1', name: 'Arch', role: 'architect', isPrimary: true },
    });
    state = dashboardReducer(state, {
      type: 'AGENT_DEACTIVATED',
      payload: { agentId: 'a1', reason: 'completed', durationMs: 1000 },
    });
    expect(state.agents.get('a1')!.status).toBe('done');
    expect(state.globalState).toBe('IDLE');
  });

  it('handles AGENT_DEACTIVATED error and sets globalState to ERROR', () => {
    let state = dashboardReducer(initialDashboardState, {
      type: 'AGENT_ACTIVATED',
      payload: { agentId: 'a1', name: 'Arch', role: 'architect', isPrimary: true },
    });
    state = dashboardReducer(state, {
      type: 'AGENT_DEACTIVATED',
      payload: { agentId: 'a1', reason: 'error', durationMs: 500 },
    });
    expect(state.agents.get('a1')!.status).toBe('error');
    expect(state.globalState).toBe('ERROR');
  });

  it('keeps globalState RUNNING when other agents still running', () => {
    let state = dashboardReducer(initialDashboardState, {
      type: 'AGENT_ACTIVATED',
      payload: { agentId: 'a1', name: 'Arch', role: 'architect', isPrimary: true },
    });
    state = dashboardReducer(state, {
      type: 'AGENT_ACTIVATED',
      payload: { agentId: 'a2', name: 'Dev', role: 'developer', isPrimary: false },
    });
    state = dashboardReducer(state, {
      type: 'AGENT_DEACTIVATED',
      payload: { agentId: 'a1', reason: 'completed', durationMs: 1000 },
    });
    expect(state.globalState).toBe('RUNNING');
  });

  it('handles AGENT_DEACTIVATED for unknown agent gracefully', () => {
    const state = dashboardReducer(initialDashboardState, {
      type: 'AGENT_DEACTIVATED',
      payload: { agentId: 'unknown', reason: 'completed', durationMs: 0 },
    });
    expect(state.globalState).toBe('IDLE');
  });

  it('handles MODE_CHANGED', () => {
    const state = dashboardReducer(initialDashboardState, {
      type: 'MODE_CHANGED',
      payload: { from: null, to: 'PLAN' },
    });
    expect(state.currentMode).toBe('PLAN');
  });

  it('handles AGENT_RELATIONSHIP by adding edge', () => {
    const state = dashboardReducer(initialDashboardState, {
      type: 'AGENT_RELATIONSHIP',
      payload: { from: 'a1', to: 'a2', label: 'assign', type: 'delegation' },
    });
    expect(state.edges).toHaveLength(1);
    expect(state.edges[0].label).toBe('assign');
    expect(state.edges[0].type).toBe('delegation');
  });

  it('accumulates multiple edges', () => {
    let state = dashboardReducer(initialDashboardState, {
      type: 'AGENT_RELATIONSHIP',
      payload: { from: 'a1', to: 'a2', label: 'assign', type: 'delegation' },
    });
    state = dashboardReducer(state, {
      type: 'AGENT_RELATIONSHIP',
      payload: { from: 'a2', to: 'a3', label: 'result', type: 'output' },
    });
    expect(state.edges).toHaveLength(2);
  });

  it('handles TASK_SYNCED by replacing tasks', () => {
    const state = dashboardReducer(initialDashboardState, {
      type: 'TASK_SYNCED',
      payload: {
        agentId: 'a1',
        tasks: [{ id: '1', subject: 'routes added', completed: true }],
      },
    });
    expect(state.tasks).toHaveLength(1);
    expect(state.tasks[0].completed).toBe(true);
    expect(state.tasks[0].subject).toBe('routes added');
  });

  it('replaces previous tasks on subsequent TASK_SYNCED', () => {
    let state = dashboardReducer(initialDashboardState, {
      type: 'TASK_SYNCED',
      payload: {
        agentId: 'a1',
        tasks: [{ id: '1', subject: 'first', completed: false }],
      },
    });
    state = dashboardReducer(state, {
      type: 'TASK_SYNCED',
      payload: {
        agentId: 'a1',
        tasks: [
          { id: '1', subject: 'first', completed: true },
          { id: '2', subject: 'second', completed: false },
        ],
      },
    });
    expect(state.tasks).toHaveLength(2);
    expect(state.tasks[0].completed).toBe(true);
  });

  it('limits edges to ring buffer size (200)', () => {
    let state = initialDashboardState;
    for (let i = 0; i < 250; i++) {
      state = dashboardReducer(state, {
        type: 'AGENT_RELATIONSHIP',
        payload: { from: `a${i}`, to: `b${i}`, label: `edge_${i}`, type: 'delegation' },
      });
    }
    expect(state.edges.length).toBeLessThanOrEqual(200);
    expect(state.edges[state.edges.length - 1].label).toBe('edge_249');
  });

  it('handles TOOL_INVOKED by appending to eventLog', () => {
    const state = dashboardReducer(initialDashboardState, {
      type: 'TOOL_INVOKED',
      payload: { toolName: 'file_edit', agentId: 'a1', timestamp: Date.now() },
    });
    expect(state.eventLog).toHaveLength(1);
    expect(state.eventLog[0].message).toContain('file_edit');
    expect(state.eventLog[0].message).toContain('[a1]');
    expect(state.eventLog[0].level).toBe('info');
  });

  it('handles TOOL_INVOKED without agentId', () => {
    const state = dashboardReducer(initialDashboardState, {
      type: 'TOOL_INVOKED',
      payload: { toolName: 'search', agentId: null, timestamp: Date.now() },
    });
    expect(state.eventLog[0].message).toBe('search');
  });

  it('limits eventLog to ring buffer size (100)', () => {
    let state = initialDashboardState;
    for (let i = 0; i < 150; i++) {
      state = dashboardReducer(state, {
        type: 'TOOL_INVOKED',
        payload: { toolName: `tool_${i}`, agentId: null, timestamp: Date.now() },
      });
    }
    expect(state.eventLog.length).toBeLessThanOrEqual(100);
    // Should contain the most recent entries
    expect(state.eventLog[state.eventLog.length - 1].message).toBe('tool_149');
  });

  it('handles SKILL_RECOMMENDED as no-op', () => {
    const state = dashboardReducer(initialDashboardState, {
      type: 'SKILL_RECOMMENDED',
      payload: { skillName: 'test', reason: 'reason' },
    });
    expect(state).toEqual(initialDashboardState);
  });

  it('handles PARALLEL_STARTED as no-op', () => {
    const state = dashboardReducer(initialDashboardState, {
      type: 'PARALLEL_STARTED',
      payload: { specialists: ['sec'], mode: 'EVAL' },
    });
    expect(state).toEqual(initialDashboardState);
  });

  it('handles PARALLEL_COMPLETED as no-op', () => {
    const state = dashboardReducer(initialDashboardState, {
      type: 'PARALLEL_COMPLETED',
      payload: { specialists: ['sec'], results: { sec: 'ok' } },
    });
    expect(state).toEqual(initialDashboardState);
  });

  it('handles AGENTS_LOADED as no-op', () => {
    const state = dashboardReducer(initialDashboardState, {
      type: 'AGENTS_LOADED',
      payload: { agents: [] },
    });
    expect(state).toEqual(initialDashboardState);
  });

  it('does not mutate original agents map', () => {
    const originalAgents = initialDashboardState.agents;
    dashboardReducer(initialDashboardState, {
      type: 'AGENT_ACTIVATED',
      payload: { agentId: 'a1', name: 'Arch', role: 'architect', isPrimary: true },
    });
    expect(originalAgents.size).toBe(0);
  });

  it('should increment agent progress on TOOL_INVOKED with matching agentId', () => {
    let state = dashboardReducer(initialDashboardState, {
      type: 'AGENT_ACTIVATED',
      payload: { agentId: 'a1', name: 'test-agent', role: 'primary', isPrimary: true },
    });
    expect(state.agents.get('a1')?.progress).toBe(0);

    state = dashboardReducer(state, {
      type: 'TOOL_INVOKED',
      payload: { toolName: 'search_rules', agentId: 'a1', timestamp: Date.now() },
    });
    expect(state.agents.get('a1')?.progress).toBeGreaterThan(0);
  });

  it('should set progress to 100 on AGENT_DEACTIVATED with reason=completed', () => {
    let state = dashboardReducer(initialDashboardState, {
      type: 'AGENT_ACTIVATED',
      payload: { agentId: 'a1', name: 'test-agent', role: 'primary', isPrimary: true },
    });
    state = dashboardReducer(state, {
      type: 'AGENT_DEACTIVATED',
      payload: { agentId: 'a1', reason: 'completed', durationMs: 1000 },
    });
    expect(state.agents.get('a1')?.progress).toBe(100);
  });

  it('should cap progress at 95 before completion', () => {
    let state = dashboardReducer(initialDashboardState, {
      type: 'AGENT_ACTIVATED',
      payload: { agentId: 'a1', name: 'test-agent', role: 'primary', isPrimary: true },
    });
    for (let i = 0; i < 20; i++) {
      state = dashboardReducer(state, {
        type: 'TOOL_INVOKED',
        payload: { toolName: `tool_${i}`, agentId: 'a1', timestamp: Date.now() },
      });
    }
    expect(state.agents.get('a1')?.progress).toBe(95);
  });

  it('should not change progress for TOOL_INVOKED without agentId', () => {
    let state = dashboardReducer(initialDashboardState, {
      type: 'AGENT_ACTIVATED',
      payload: { agentId: 'a1', name: 'test-agent', role: 'primary', isPrimary: true },
    });
    state = dashboardReducer(state, {
      type: 'TOOL_INVOKED',
      payload: { toolName: 'search_rules', agentId: null, timestamp: Date.now() },
    });
    expect(state.agents.get('a1')?.progress).toBe(0);
  });

  it('should keep current progress on AGENT_DEACTIVATED with reason=error', () => {
    let state = dashboardReducer(initialDashboardState, {
      type: 'AGENT_ACTIVATED',
      payload: { agentId: 'a1', name: 'test-agent', role: 'primary', isPrimary: true },
    });
    state = dashboardReducer(state, {
      type: 'TOOL_INVOKED',
      payload: { toolName: 'search_rules', agentId: 'a1', timestamp: Date.now() },
    });
    const progressBefore = state.agents.get('a1')!.progress;
    state = dashboardReducer(state, {
      type: 'AGENT_DEACTIVATED',
      payload: { agentId: 'a1', reason: 'error', durationMs: 500 },
    });
    expect(state.agents.get('a1')?.progress).toBe(progressBefore);
  });

  it('produces correct timestamp format in eventLog', () => {
    const fixedTime = new Date('2026-02-17T14:30:45.123Z');
    const state = dashboardReducer(initialDashboardState, {
      type: 'TOOL_INVOKED',
      payload: { toolName: 'test', agentId: null, timestamp: fixedTime.getTime() },
    });
    // Timestamp should be HH:MM:SS format (8 chars)
    expect(state.eventLog[0].timestamp).toHaveLength(8);
    expect(state.eventLog[0].timestamp).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });
});
