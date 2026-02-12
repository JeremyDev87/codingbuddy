import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TuiEventBus } from './event-bus';
import { TUI_EVENTS } from './types';
import type { AgentActivatedEvent, ModeChangedEvent } from './types';

describe('TuiEventBus', () => {
  let eventBus: TuiEventBus;

  beforeEach(() => {
    eventBus = new TuiEventBus();
  });

  describe('emit and on', () => {
    it('should emit and receive agent:activated event', () => {
      const handler = vi.fn();
      const payload: AgentActivatedEvent = {
        agentId: 'agent-1',
        name: 'frontend-developer',
        role: 'Frontend Developer',
        isPrimary: true,
      };

      eventBus.on(TUI_EVENTS.AGENT_ACTIVATED, handler);
      eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, payload);

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith(payload);
    });

    it('should emit and receive mode:changed event', () => {
      const handler = vi.fn();
      const payload: ModeChangedEvent = { from: 'PLAN', to: 'ACT' };

      eventBus.on(TUI_EVENTS.MODE_CHANGED, handler);
      eventBus.emit(TUI_EVENTS.MODE_CHANGED, payload);

      expect(handler).toHaveBeenCalledWith(payload);
    });

    it('should support multiple listeners for same event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const payload: AgentActivatedEvent = {
        agentId: 'a1',
        name: 'test',
        role: 'tester',
        isPrimary: false,
      };

      eventBus.on(TUI_EVENTS.AGENT_ACTIVATED, handler1);
      eventBus.on(TUI_EVENTS.AGENT_ACTIVATED, handler2);
      eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, payload);

      expect(handler1).toHaveBeenCalledOnce();
      expect(handler2).toHaveBeenCalledOnce();
    });

    it('should not call handler for different event', () => {
      const handler = vi.fn();

      eventBus.on(TUI_EVENTS.MODE_CHANGED, handler);
      eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
        agentId: 'a1',
        name: 'test',
        role: 'tester',
        isPrimary: false,
      });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('off', () => {
    it('should remove a specific listener', () => {
      const handler = vi.fn();
      eventBus.on(TUI_EVENTS.AGENT_ACTIVATED, handler);
      eventBus.off(TUI_EVENTS.AGENT_ACTIVATED, handler);

      eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
        agentId: 'a1',
        name: 'test',
        role: 'tester',
        isPrimary: false,
      });

      expect(handler).not.toHaveBeenCalled();
    });

    it('should not affect other listeners', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.on(TUI_EVENTS.AGENT_ACTIVATED, handler1);
      eventBus.on(TUI_EVENTS.AGENT_ACTIVATED, handler2);
      eventBus.off(TUI_EVENTS.AGENT_ACTIVATED, handler1);

      eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
        agentId: 'a1',
        name: 'test',
        role: 'tester',
        isPrimary: false,
      });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledOnce();
    });
  });

  describe('once', () => {
    it('should only fire handler once', () => {
      const handler = vi.fn();
      const payload: ModeChangedEvent = { from: null, to: 'PLAN' };

      eventBus.once(TUI_EVENTS.MODE_CHANGED, handler);
      eventBus.emit(TUI_EVENTS.MODE_CHANGED, payload);
      eventBus.emit(TUI_EVENTS.MODE_CHANGED, payload);

      expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe('removeAllListeners', () => {
    it('should remove all listeners for a specific event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.on(TUI_EVENTS.AGENT_ACTIVATED, handler1);
      eventBus.on(TUI_EVENTS.AGENT_ACTIVATED, handler2);
      eventBus.removeAllListeners(TUI_EVENTS.AGENT_ACTIVATED);

      eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
        agentId: 'a1',
        name: 'test',
        role: 'tester',
        isPrimary: false,
      });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });

    it('should remove all listeners when called without args', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.on(TUI_EVENTS.AGENT_ACTIVATED, handler1);
      eventBus.on(TUI_EVENTS.MODE_CHANGED, handler2);
      eventBus.removeAllListeners();

      eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
        agentId: 'a1',
        name: 'test',
        role: 'tester',
        isPrimary: false,
      });
      eventBus.emit(TUI_EVENTS.MODE_CHANGED, { from: null, to: 'PLAN' });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });
  });

  describe('listenerCount', () => {
    it('should return 0 when no listeners', () => {
      expect(eventBus.listenerCount(TUI_EVENTS.AGENT_ACTIVATED)).toBe(0);
    });

    it('should return correct count after adding listeners', () => {
      eventBus.on(TUI_EVENTS.AGENT_ACTIVATED, vi.fn());
      expect(eventBus.listenerCount(TUI_EVENTS.AGENT_ACTIVATED)).toBe(1);

      eventBus.on(TUI_EVENTS.AGENT_ACTIVATED, vi.fn());
      expect(eventBus.listenerCount(TUI_EVENTS.AGENT_ACTIVATED)).toBe(2);
    });

    it('should not count listeners for other events', () => {
      eventBus.on(TUI_EVENTS.MODE_CHANGED, vi.fn());
      expect(eventBus.listenerCount(TUI_EVENTS.AGENT_ACTIVATED)).toBe(0);
    });
  });

  describe('NestJS compatibility', () => {
    it('should be instantiable (Injectable-ready)', () => {
      expect(eventBus).toBeDefined();
      expect(eventBus).toBeInstanceOf(TuiEventBus);
    });
  });
});
