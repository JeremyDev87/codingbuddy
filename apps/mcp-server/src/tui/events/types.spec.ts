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
  type TuiEventMap,
} from './types';

describe('tui/events/types', () => {
  describe('TUI_EVENTS', () => {
    it('should define all 7 event names', () => {
      expect(TUI_EVENTS).toEqual({
        AGENT_ACTIVATED: 'agent:activated',
        AGENT_DEACTIVATED: 'agent:deactivated',
        MODE_CHANGED: 'mode:changed',
        SKILL_RECOMMENDED: 'skill:recommended',
        PARALLEL_STARTED: 'parallel:started',
        PARALLEL_COMPLETED: 'parallel:completed',
        AGENTS_LOADED: 'agents:loaded',
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
        'agent:deactivated': { agentId: 'a1', reason: 'done', durationMs: 0 },
        'mode:changed': { from: 'PLAN', to: 'ACT' },
        'skill:recommended': { skillName: 's1', reason: 'r' },
        'parallel:started': { specialists: [], mode: 'PLAN' },
        'parallel:completed': { specialists: [], results: {} },
        'agents:loaded': { agents: [] },
      };
      expect(map['agent:activated'].agentId).toBe('a1');
    });
  });
});
