import { describe, it, expect } from 'vitest';
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
  type TuiEventMap,
} from './types';

describe('tui/events/types', () => {
  describe('TUI_EVENTS', () => {
    it('should define all 10 event names', () => {
      expect(TUI_EVENTS).toEqual({
        AGENT_ACTIVATED: 'agent:activated',
        AGENT_DEACTIVATED: 'agent:deactivated',
        MODE_CHANGED: 'mode:changed',
        SKILL_RECOMMENDED: 'skill:recommended',
        PARALLEL_STARTED: 'parallel:started',
        PARALLEL_COMPLETED: 'parallel:completed',
        AGENTS_LOADED: 'agents:loaded',
        AGENT_RELATIONSHIP: 'agent:relationship',
        TASK_SYNCED: 'task:synced',
        TOOL_INVOKED: 'tool:invoked',
      });
    });

    it('should include AGENTS_LOADED event', () => {
      expect(TUI_EVENTS.AGENTS_LOADED).toBe('agents:loaded');
    });

    it('should be readonly', () => {
      expect(Object.isFrozen(TUI_EVENTS)).toBe(true);
    });
  });

  describe('event interfaces type compatibility', () => {
    it('should create AgentActivatedEvent', () => {
      const event: AgentActivatedEvent = {
        agentId: 'agent-1',
        name: 'frontend-developer',
        role: 'Frontend Developer',
        isPrimary: true,
      };
      expect(event.agentId).toBe('agent-1');
    });

    it('should create AgentDeactivatedEvent', () => {
      const event: AgentDeactivatedEvent = {
        agentId: 'agent-1',
        reason: 'completed',
        durationMs: 0,
      };
      expect(event.reason).toBe('completed');
    });

    it('AgentDeactivatedEvent should include durationMs', () => {
      const event: AgentDeactivatedEvent = {
        agentId: 'agent-1',
        reason: 'completed',
        durationMs: 150,
      };
      expect(event.durationMs).toBe(150);
    });

    it('should create ModeChangedEvent', () => {
      const event: ModeChangedEvent = {
        from: 'PLAN',
        to: 'ACT',
      };
      expect(event.to).toBe('ACT');
    });

    it('should create SkillRecommendedEvent', () => {
      const event: SkillRecommendedEvent = {
        skillName: 'brainstorming',
        reason: 'Creative task detected',
      };
      expect(event.skillName).toBe('brainstorming');
    });

    it('should create ParallelStartedEvent', () => {
      const event: ParallelStartedEvent = {
        specialists: ['security-specialist', 'performance-specialist'],
        mode: 'EVAL',
      };
      expect(event.specialists).toHaveLength(2);
    });

    it('should create ParallelCompletedEvent', () => {
      const event: ParallelCompletedEvent = {
        specialists: ['security-specialist'],
        results: { 'security-specialist': 'completed' },
      };
      expect(event.results).toBeDefined();
    });

    it('should create AgentsLoadedEvent', () => {
      const event: AgentsLoadedEvent = {
        agents: [
          {
            id: 'fe',
            name: 'FE',
            description: 'd',
            category: 'Frontend',
            icon: '🎨',
            expertise: [],
          },
        ],
      };
      expect(event.agents).toHaveLength(1);
    });

    it('should create AgentRelationshipEvent', () => {
      const event: AgentRelationshipEvent = {
        from: 'agent-1',
        to: 'agent-2',
        label: 'delegates security review',
        type: 'delegation',
      };
      expect(event.from).toBe('agent-1');
      expect(event.to).toBe('agent-2');
      expect(event.type).toBe('delegation');
    });

    it('should create TaskSyncedEvent', () => {
      const event: TaskSyncedEvent = {
        agentId: 'agent-1',
        tasks: [
          { id: 't1', subject: 'Implement auth', completed: false },
          { id: 't2', subject: 'Write tests', completed: true },
        ],
      };
      expect(event.agentId).toBe('agent-1');
      expect(event.tasks).toHaveLength(2);
    });

    it('should create ToolInvokedEvent', () => {
      const event: ToolInvokedEvent = {
        toolName: 'search_rules',
        agentId: null,
        timestamp: 1700000000000,
      };
      expect(event.toolName).toBe('search_rules');
      expect(event.agentId).toBeNull();
    });
  });

  describe('TuiEventMap', () => {
    it('should map event names to payload types', () => {
      const map: TuiEventMap = {
        'agent:activated': {
          agentId: 'a1',
          name: 'test',
          role: 'tester',
          isPrimary: false,
        },
        'agent:deactivated': { agentId: 'a1', reason: 'completed', durationMs: 0 },
        'mode:changed': { from: 'PLAN', to: 'ACT' },
        'skill:recommended': { skillName: 's1', reason: 'r' },
        'parallel:started': { specialists: [], mode: 'PLAN' },
        'parallel:completed': { specialists: [], results: {} },
        'agents:loaded': { agents: [] },
        'agent:relationship': {
          from: 'a1',
          to: 'a2',
          label: 'delegates',
          type: 'delegation',
        },
        'task:synced': { agentId: 'a1', tasks: [] },
        'tool:invoked': { toolName: 'search_rules', agentId: null, timestamp: 0 },
      };
      expect(map['agent:activated'].agentId).toBe('a1');
    });
  });
});
