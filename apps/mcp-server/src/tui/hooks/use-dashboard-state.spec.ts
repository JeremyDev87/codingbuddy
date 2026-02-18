import { describe, it, expect } from 'vitest';
import {
  dashboardReducer,
  createInitialDashboardState,
  type DashboardAction,
} from './use-dashboard-state';

describe('dashboardReducer', () => {
  const initialDashboardState = createInitialDashboardState();

  it('initializes toolInvokeCount to 0 and outputStats to zero counts', () => {
    const state = createInitialDashboardState();
    expect(state.toolInvokeCount).toBe(0);
    expect(state.outputStats).toEqual({ files: 0, commits: 0 });
  });

  it('initializes agentActivateCount and skillInvokeCount to 0', () => {
    const state = createInitialDashboardState();
    expect(state.agentActivateCount).toBe(0);
    expect(state.skillInvokeCount).toBe(0);
  });

  it('increments agentActivateCount on same agentId re-activation (cumulative counter)', () => {
    let state = createInitialDashboardState();
    state = dashboardReducer(state, {
      type: 'AGENT_ACTIVATED',
      payload: { agentId: 'a1', name: 'architect', role: 'primary', isPrimary: true },
    });
    // 동일 agentId 재활성화 — 누적 카운터이므로 +1 증가
    state = dashboardReducer(state, {
      type: 'AGENT_ACTIVATED',
      payload: { agentId: 'a1', name: 'architect', role: 'primary', isPrimary: true },
    });
    expect(state.agentActivateCount).toBe(2);
  });

  it('increments agentActivateCount on AGENT_ACTIVATED', () => {
    let state = createInitialDashboardState();
    state = dashboardReducer(state, {
      type: 'AGENT_ACTIVATED',
      payload: { agentId: 'a1', name: 'architect', role: 'primary', isPrimary: true },
    });
    expect(state.agentActivateCount).toBe(1);

    state = dashboardReducer(state, {
      type: 'AGENT_ACTIVATED',
      payload: { agentId: 'a2', name: 'security', role: 'specialist', isPrimary: false },
    });
    expect(state.agentActivateCount).toBe(2);
  });

  it('increments skillInvokeCount on SKILL_RECOMMENDED (first time only)', () => {
    let state = createInitialDashboardState();
    state = dashboardReducer(state, {
      type: 'SKILL_RECOMMENDED',
      payload: { skillName: 'tdd', reason: 'writing tests' },
    });
    expect(state.skillInvokeCount).toBe(1);

    // 중복 — 증가하지 않아야 함
    state = dashboardReducer(state, {
      type: 'SKILL_RECOMMENDED',
      payload: { skillName: 'tdd', reason: 'still writing tests' },
    });
    expect(state.skillInvokeCount).toBe(1);
  });

  it('resets agentActivateCount and skillInvokeCount on SESSION_RESET', () => {
    let state = createInitialDashboardState();
    state = dashboardReducer(state, {
      type: 'AGENT_ACTIVATED',
      payload: { agentId: 'a1', name: 'architect', role: 'primary', isPrimary: true },
    });
    state = dashboardReducer(state, {
      type: 'SKILL_RECOMMENDED',
      payload: { skillName: 'tdd', reason: 'test' },
    });
    state = dashboardReducer(state, { type: 'SESSION_RESET', payload: {} as any });
    expect(state.agentActivateCount).toBe(0);
    expect(state.skillInvokeCount).toBe(0);
    expect(state.toolInvokeCount).toBe(0);
  });

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

  it('increments toolInvokeCount on TOOL_INVOKED', () => {
    const s1 = dashboardReducer(createInitialDashboardState(), {
      type: 'TOOL_INVOKED',
      payload: { toolName: 'search_rules', timestamp: Date.now(), agentId: null },
    });
    expect(s1.toolInvokeCount).toBe(1);

    const s2 = dashboardReducer(s1, {
      type: 'TOOL_INVOKED',
      payload: { toolName: 'get_agent_details', timestamp: Date.now(), agentId: null },
    });
    expect(s2.toolInvokeCount).toBe(2);
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

  it('should accumulate activeSkills on SKILL_RECOMMENDED', () => {
    let state = createInitialDashboardState();
    state = dashboardReducer(state, {
      type: 'SKILL_RECOMMENDED',
      payload: { skillName: 'tdd', reason: 'matched' },
    });
    expect(state.activeSkills).toEqual(['tdd']);
  });

  it('should deduplicate activeSkills', () => {
    let state = createInitialDashboardState();
    state = dashboardReducer(state, {
      type: 'SKILL_RECOMMENDED',
      payload: { skillName: 'tdd', reason: 'matched' },
    });
    state = dashboardReducer(state, {
      type: 'SKILL_RECOMMENDED',
      payload: { skillName: 'tdd', reason: 'matched again' },
    });
    expect(state.activeSkills).toEqual(['tdd']);
  });

  it('should reset activeSkills on MODE_CHANGED', () => {
    let state = createInitialDashboardState();
    state = dashboardReducer(state, {
      type: 'SKILL_RECOMMENDED',
      payload: { skillName: 'tdd', reason: 'matched' },
    });
    state = dashboardReducer(state, {
      type: 'MODE_CHANGED',
      payload: { from: 'PLAN', to: 'ACT' },
    });
    expect(state.activeSkills).toEqual([]);
  });

  it('should pre-register specialists as idle agents on PARALLEL_STARTED', () => {
    let state = createInitialDashboardState();
    state = dashboardReducer(state, {
      type: 'MODE_CHANGED',
      payload: { from: null, to: 'EVAL' },
    });
    state = dashboardReducer(state, {
      type: 'PARALLEL_STARTED',
      payload: { specialists: ['security-specialist', 'perf-specialist'], mode: 'EVAL' },
    });
    expect(state.agents.size).toBe(2);

    const sec = state.agents.get('specialist:security-specialist');
    expect(sec).toBeDefined();
    expect(sec!.status).toBe('idle');
    expect(sec!.isPrimary).toBe(false);
    expect(sec!.stage).toBe('EVAL');

    const perf = state.agents.get('specialist:perf-specialist');
    expect(perf).toBeDefined();
    expect(perf!.status).toBe('idle');
  });

  it('should not overwrite already running specialist on PARALLEL_STARTED', () => {
    let state = createInitialDashboardState();
    state = dashboardReducer(state, {
      type: 'AGENT_ACTIVATED',
      payload: {
        agentId: 'specialist:security-specialist',
        name: 'security-specialist',
        role: 'specialist',
        isPrimary: false,
      },
    });
    state = dashboardReducer(state, {
      type: 'PARALLEL_STARTED',
      payload: { specialists: ['security-specialist'], mode: 'EVAL' },
    });
    expect(state.agents.get('specialist:security-specialist')!.status).toBe('running');
  });

  it('should handle empty specialists array as no-op on PARALLEL_STARTED', () => {
    const state = dashboardReducer(initialDashboardState, {
      type: 'PARALLEL_STARTED',
      payload: { specialists: [], mode: 'EVAL' },
    });
    expect(state.agents.size).toBe(0);
  });

  it('handles AGENT_ACTIVATED with isParallel defaulting to false', () => {
    const action: DashboardAction = {
      type: 'AGENT_ACTIVATED',
      payload: { agentId: 'a1', name: 'Architect', role: 'architect', isPrimary: true },
    };
    const state = dashboardReducer(initialDashboardState, action);
    expect(state.agents.get('a1')!.isParallel).toBe(false);
  });

  it('handles PARALLEL_STARTED — sets isParallel:true on all specialist nodes', () => {
    const action: DashboardAction = {
      type: 'PARALLEL_STARTED',
      payload: {
        specialists: ['security-specialist', 'performance-specialist'],
        mode: 'EVAL',
      },
    };
    const state = dashboardReducer(initialDashboardState, action);
    const security = state.agents.get('specialist:security-specialist')!;
    const perf = state.agents.get('specialist:performance-specialist')!;
    expect(security.isParallel).toBe(true);
    expect(perf.isParallel).toBe(true);
    expect(security.isPrimary).toBe(false);
    expect(perf.isPrimary).toBe(false);
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

  it('should update running agents stage on MODE_CHANGED', () => {
    let state = createInitialDashboardState();
    state = dashboardReducer(state, {
      type: 'MODE_CHANGED',
      payload: { from: null, to: 'PLAN' },
    });
    state = dashboardReducer(state, {
      type: 'AGENT_ACTIVATED',
      payload: { agentId: 'a1', name: 'planner', role: 'primary', isPrimary: true },
    });
    expect(state.agents.get('a1')!.stage).toBe('PLAN');

    state = dashboardReducer(state, {
      type: 'MODE_CHANGED',
      payload: { from: 'PLAN', to: 'ACT' },
    });
    expect(state.agents.get('a1')!.stage).toBe('ACT');
  });

  it('should only update running agents stage, preserving done/error/idle on MODE_CHANGED', () => {
    let state = createInitialDashboardState();
    state = dashboardReducer(state, {
      type: 'MODE_CHANGED',
      payload: { from: null, to: 'PLAN' },
    });
    // running agent
    state = dashboardReducer(state, {
      type: 'AGENT_ACTIVATED',
      payload: { agentId: 'r1', name: 'runner', role: 'primary', isPrimary: true },
    });
    // done agent
    state = dashboardReducer(state, {
      type: 'AGENT_ACTIVATED',
      payload: { agentId: 'd1', name: 'done-agent', role: 'specialist', isPrimary: false },
    });
    state = dashboardReducer(state, {
      type: 'AGENT_DEACTIVATED',
      payload: { agentId: 'd1', reason: 'completed', durationMs: 100 },
    });
    // error agent
    state = dashboardReducer(state, {
      type: 'AGENT_ACTIVATED',
      payload: { agentId: 'e1', name: 'error-agent', role: 'specialist', isPrimary: false },
    });
    state = dashboardReducer(state, {
      type: 'AGENT_DEACTIVATED',
      payload: { agentId: 'e1', reason: 'error', durationMs: 50 },
    });
    // idle agent (pre-registered specialist)
    state = dashboardReducer(state, {
      type: 'PARALLEL_STARTED',
      payload: { specialists: ['idle-spec'], mode: 'PLAN' },
    });

    state = dashboardReducer(state, {
      type: 'MODE_CHANGED',
      payload: { from: 'PLAN', to: 'ACT' },
    });

    expect(state.agents.get('r1')!.stage).toBe('ACT');
    expect(state.agents.get('d1')!.stage).toBe('PLAN');
    expect(state.agents.get('e1')!.stage).toBe('PLAN');
    expect(state.agents.get('specialist:idle-spec')!.stage).toBe('PLAN');
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

  it('accumulates ToolCallRecord on TOOL_INVOKED', () => {
    const state = dashboardReducer(initialDashboardState, {
      type: 'TOOL_INVOKED',
      payload: { toolName: 'Read', agentId: 'a1', timestamp: 1000 },
    });
    expect(state.toolCalls).toHaveLength(1);
    expect(state.toolCalls[0]).toEqual({
      agentId: 'a1',
      toolName: 'Read',
      timestamp: 1000,
      status: 'completed',
    });
  });

  it('replaces null agentId with "unknown" in toolCalls', () => {
    const state = dashboardReducer(initialDashboardState, {
      type: 'TOOL_INVOKED',
      payload: { toolName: 'Bash', agentId: null, timestamp: 2000 },
    });
    expect(state.toolCalls[0].agentId).toBe('unknown');
  });

  it('enforces TOOL_CALLS_MAX ring buffer (200)', () => {
    let state = initialDashboardState;
    for (let i = 0; i < 210; i++) {
      state = dashboardReducer(state, {
        type: 'TOOL_INVOKED',
        payload: { toolName: `tool_${i}`, agentId: null, timestamp: i },
      });
    }
    expect(state.toolCalls).toHaveLength(200);
    expect(state.toolCalls[0].toolName).toBe('tool_10');
    expect(state.toolCalls[199].toolName).toBe('tool_209');
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

  it('should set objectives on OBJECTIVE_SET', () => {
    let state = createInitialDashboardState();
    state = dashboardReducer(state, {
      type: 'OBJECTIVE_SET',
      payload: { objective: 'implement auth feature' },
    });
    expect(state.objectives).toEqual(['implement auth feature']);
  });

  it('should replace objectives on new OBJECTIVE_SET (not accumulate)', () => {
    let state = createInitialDashboardState();
    state = dashboardReducer(state, {
      type: 'OBJECTIVE_SET',
      payload: { objective: 'first task' },
    });
    state = dashboardReducer(state, {
      type: 'OBJECTIVE_SET',
      payload: { objective: 'second task' },
    });
    expect(state.objectives).toEqual(['second task']);
  });

  it('should increment focused primary agent progress on TOOL_INVOKED with non-matching agentId (fallback)', () => {
    // Primary agent registered as "primary:arch" — but TOOL_INVOKED has agentId "search_rules"
    let state = dashboardReducer(initialDashboardState, {
      type: 'AGENT_ACTIVATED',
      payload: { agentId: 'primary:arch', name: 'arch', role: 'primary', isPrimary: true },
    });
    expect(state.focusedAgentId).toBe('primary:arch');
    expect(state.agents.get('primary:arch')?.progress).toBe(0);

    state = dashboardReducer(state, {
      type: 'TOOL_INVOKED',
      payload: { toolName: 'search_rules', agentId: 'search_rules', timestamp: Date.now() },
    });
    // Should fall back to focused agent and increment progress
    expect(state.agents.get('primary:arch')?.progress).toBe(5);
  });

  it('should not crash on TOOL_INVOKED with non-matching agentId when focusedAgentId is null', () => {
    // No agents activated — focusedAgentId is null
    const state = dashboardReducer(initialDashboardState, {
      type: 'TOOL_INVOKED',
      payload: { toolName: 'search_rules', agentId: 'search_rules', timestamp: Date.now() },
    });
    // Should not crash, agents map unchanged
    expect(state.agents.size).toBe(0);
  });

  it('should not increment progress via fallback when focused agent is not running', () => {
    let state = dashboardReducer(initialDashboardState, {
      type: 'AGENT_ACTIVATED',
      payload: { agentId: 'primary:arch', name: 'arch', role: 'primary', isPrimary: true },
    });
    // Deactivate the primary agent
    state = dashboardReducer(state, {
      type: 'AGENT_DEACTIVATED',
      payload: { agentId: 'primary:arch', reason: 'completed', durationMs: 1000 },
    });
    expect(state.agents.get('primary:arch')?.status).toBe('done');
    expect(state.agents.get('primary:arch')?.progress).toBe(100);

    state = dashboardReducer(state, {
      type: 'TOOL_INVOKED',
      payload: { toolName: 'search_rules', agentId: 'search_rules', timestamp: Date.now() },
    });
    // Progress should remain 100 (not incremented because agent is 'done', not 'running')
    expect(state.agents.get('primary:arch')?.progress).toBe(100);
  });

  it('should prefer exact agentId match over focusedAgentId fallback', () => {
    // Register primary agent AND a specialist with the same ID as the tool event
    let state = dashboardReducer(initialDashboardState, {
      type: 'AGENT_ACTIVATED',
      payload: { agentId: 'primary:arch', name: 'arch', role: 'primary', isPrimary: true },
    });
    state = dashboardReducer(state, {
      type: 'AGENT_ACTIVATED',
      payload: { agentId: 'search_rules', name: 'search_rules', role: 'query', isPrimary: false },
    });

    state = dashboardReducer(state, {
      type: 'TOOL_INVOKED',
      payload: { toolName: 'search_rules', agentId: 'search_rules', timestamp: Date.now() },
    });

    // Exact match agent should be incremented
    expect(state.agents.get('search_rules')?.progress).toBe(5);
    // Focused primary agent should NOT be incremented (exact match took priority)
    expect(state.agents.get('primary:arch')?.progress).toBe(0);
  });

  describe('SESSION_RESET', () => {
    it('should clear agents, edges, eventLog, tasks, objectives on SESSION_RESET', () => {
      let state = dashboardReducer(initialDashboardState, {
        type: 'AGENT_ACTIVATED',
        payload: { agentId: 'a1', name: 'Architect', role: 'architect', isPrimary: true },
      });
      state = dashboardReducer(state, {
        type: 'MODE_CHANGED',
        payload: { from: null, to: 'PLAN' },
      });
      state = dashboardReducer(state, {
        type: 'TOOL_INVOKED',
        payload: { toolName: 'search_rules', agentId: 'a1', timestamp: Date.now() },
      });
      state = dashboardReducer(state, {
        type: 'OBJECTIVE_SET',
        payload: { objective: 'build auth feature' },
      });

      const result = dashboardReducer(state, {
        type: 'SESSION_RESET',
        payload: { reason: 'new-plan-session' },
      });

      expect(result.agents.size).toBe(0);
      expect(result.edges).toEqual([]);
      expect(result.eventLog).toEqual([]);
      expect(result.tasks).toEqual([]);
      expect(result.objectives).toEqual([]);
      expect(result.currentMode).toBeNull();
      expect(result.globalState).toBe('IDLE');
      expect(result.toolInvokeCount).toBe(0);
    });

    it('should generate a new sessionId on SESSION_RESET', () => {
      const result = dashboardReducer(initialDashboardState, {
        type: 'SESSION_RESET',
        payload: { reason: 'new-plan-session' },
      });
      expect(result.sessionId).toBeDefined();
      expect(typeof result.sessionId).toBe('string');
    });
  });

  describe('CONTEXT_UPDATED', () => {
    it('initializes contextDecisions and contextNotes as empty arrays', () => {
      const state = createInitialDashboardState();
      expect(state.contextDecisions).toEqual([]);
      expect(state.contextNotes).toEqual([]);
      expect(state.contextMode).toBeNull();
      expect(state.contextStatus).toBeNull();
    });

    it('handles CONTEXT_UPDATED with decisions and notes', () => {
      const action: DashboardAction = {
        type: 'CONTEXT_UPDATED',
        payload: {
          decisions: ['Use JWT', 'Add rate limiting'],
          notes: ['Review codebase first'],
          mode: 'PLAN',
          status: 'in_progress',
        },
      };
      const state = dashboardReducer(initialDashboardState, action);
      expect(state.contextDecisions).toEqual(['Use JWT', 'Add rate limiting']);
      expect(state.contextNotes).toEqual(['Review codebase first']);
      expect(state.contextMode).toBe('PLAN');
      expect(state.contextStatus).toBe('in_progress');
    });

    it('handles CONTEXT_UPDATED with only decisions', () => {
      const state = dashboardReducer(initialDashboardState, {
        type: 'CONTEXT_UPDATED',
        payload: { decisions: ['Use X pattern'], notes: [], mode: 'ACT', status: 'completed' },
      });
      expect(state.contextDecisions).toEqual(['Use X pattern']);
      expect(state.contextNotes).toEqual([]);
    });

    it('handles CONTEXT_UPDATED with null mode and status', () => {
      const state = dashboardReducer(initialDashboardState, {
        type: 'CONTEXT_UPDATED',
        payload: { decisions: ['decision'], notes: [], mode: null, status: null },
      });
      expect(state.contextMode).toBeNull();
      expect(state.contextStatus).toBeNull();
    });

    it('SESSION_RESET clears context fields', () => {
      const withContext = dashboardReducer(initialDashboardState, {
        type: 'CONTEXT_UPDATED',
        payload: { decisions: ['decision'], notes: ['note'], mode: 'PLAN', status: 'completed' },
      });
      const reset = dashboardReducer(withContext, {
        type: 'SESSION_RESET',
        payload: { reason: 'clear' },
      });
      expect(reset.contextDecisions).toEqual([]);
      expect(reset.contextNotes).toEqual([]);
      expect(reset.contextMode).toBeNull();
      expect(reset.contextStatus).toBeNull();
    });
  });
});
