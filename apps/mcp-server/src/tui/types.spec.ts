import { describe, it, expect } from 'vitest';
import type { AgentState, TuiEvent, AgentStatus } from './types';
import type { Mode } from '../keyword/keyword.types';
import { AGENT_STATUSES, TUI_EVENT_TYPES, createDefaultAgentState } from './types';

describe('tui/types', () => {
  describe('AGENT_STATUSES', () => {
    it('should contain all valid agent statuses', () => {
      expect(AGENT_STATUSES).toEqual(['idle', 'running', 'completed', 'failed']);
    });

    it('should be readonly', () => {
      expect(Object.isFrozen(AGENT_STATUSES)).toBe(true);
    });
  });

  describe('TUI_EVENT_TYPES', () => {
    it('should contain all valid event types', () => {
      expect(TUI_EVENT_TYPES).toEqual([
        'agent:start',
        'agent:progress',
        'agent:complete',
        'agent:fail',
        'mode:change',
        'agent:activated',
        'agent:deactivated',
        'mode:changed',
        'skill:recommended',
        'parallel:started',
        'parallel:completed',
      ]);
    });

    it('should be readonly', () => {
      expect(Object.isFrozen(TUI_EVENT_TYPES)).toBe(true);
    });
  });

  describe('createDefaultAgentState', () => {
    it('should create agent state with required fields', () => {
      const state = createDefaultAgentState({
        id: 'agent-1',
        name: 'Test Agent',
        role: 'tester',
      });

      expect(state).toEqual({
        id: 'agent-1',
        name: 'Test Agent',
        role: 'tester',
        status: 'idle',
        progress: 0,
        isPrimary: false,
      });
    });

    it('should allow overriding defaults', () => {
      const state = createDefaultAgentState({
        id: 'agent-2',
        name: 'Primary Agent',
        role: 'architect',
        status: 'running',
        progress: 50,
        isPrimary: true,
        childAgents: ['child-1'],
      });

      expect(state).toEqual({
        id: 'agent-2',
        name: 'Primary Agent',
        role: 'architect',
        status: 'running',
        progress: 50,
        isPrimary: true,
        childAgents: ['child-1'],
      });
    });

    it('should not include childAgents when not provided', () => {
      const state = createDefaultAgentState({
        id: 'agent-3',
        name: 'Solo',
        role: 'worker',
      });

      expect(state).not.toHaveProperty('childAgents');
    });
  });

  describe('type compatibility', () => {
    it('should allow Mode type from keyword types', () => {
      const mode: Mode = 'PLAN';
      expect(['PLAN', 'ACT', 'EVAL', 'AUTO']).toContain(mode);
    });

    it('should allow AgentStatus as subset of AgentState status', () => {
      const status: AgentStatus = 'idle';
      const state: AgentState = {
        id: 'test',
        name: 'test',
        role: 'test',
        status,
        progress: 0,
        isPrimary: false,
      };
      expect(state.status).toBe('idle');
    });

    it('should allow TuiEvent with typed payload', () => {
      const event: TuiEvent<{ agentId: string }> = {
        type: 'agent:start',
        timestamp: Date.now(),
        payload: { agentId: 'agent-1' },
      };
      expect(event.type).toBe('agent:start');
      expect(event.payload.agentId).toBe('agent-1');
    });
  });
});
