import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TuiInterceptor } from './tui-interceptor';
import { TuiEventBus } from './event-bus';
import { TUI_EVENTS } from './types';

describe('TuiInterceptor', () => {
  let interceptor: TuiInterceptor;
  let eventBus: TuiEventBus;

  beforeEach(() => {
    eventBus = new TuiEventBus();
    interceptor = new TuiInterceptor(eventBus);
  });

  describe('when disabled', () => {
    it('should pass through without emitting events', async () => {
      const emitSpy = vi.spyOn(eventBus, 'emit');
      const result = await interceptor.intercept(
        'get_agent_system_prompt',
        { agentName: 'test-agent', context: { mode: 'EVAL' } },
        async () => ({ content: [{ type: 'text', text: 'ok' }] }),
      );
      expect(result).toEqual({ content: [{ type: 'text', text: 'ok' }] });
      expect(emitSpy).not.toHaveBeenCalled();
    });
  });

  describe('when enabled', () => {
    beforeEach(() => {
      interceptor.enable();
    });

    it('should emit agent:activated and agent:deactivated for agent tools', async () => {
      const activatedHandler = vi.fn();
      const deactivatedHandler = vi.fn();
      eventBus.on(TUI_EVENTS.AGENT_ACTIVATED, activatedHandler);
      eventBus.on(TUI_EVENTS.AGENT_DEACTIVATED, deactivatedHandler);

      await interceptor.intercept(
        'get_agent_system_prompt',
        { agentName: 'security-specialist', context: { mode: 'EVAL' } },
        async () => ({ content: [{ type: 'text', text: 'ok' }] }),
      );

      // Events emitted via setImmediate, flush microtasks
      await new Promise(resolve => setImmediate(resolve));

      expect(activatedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: 'security-specialist',
          name: 'security-specialist',
        }),
      );
      expect(deactivatedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: 'security-specialist',
          reason: 'completed',
          durationMs: expect.any(Number),
        }),
      );
    });

    it('should emit agent:deactivated with error reason on failure', async () => {
      const deactivatedHandler = vi.fn();
      eventBus.on(TUI_EVENTS.AGENT_DEACTIVATED, deactivatedHandler);

      await expect(
        interceptor.intercept(
          'get_agent_system_prompt',
          { agentName: 'test-agent', context: { mode: 'EVAL' } },
          async () => {
            throw new Error('tool failed');
          },
        ),
      ).rejects.toThrow('tool failed');

      await new Promise(resolve => setImmediate(resolve));

      expect(deactivatedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: 'test-agent',
          reason: 'error',
        }),
      );
    });

    it('should not emit events for non-agent tools', async () => {
      const emitSpy = vi.spyOn(eventBus, 'emit');

      await interceptor.intercept(
        'search_rules',
        { query: 'test' },
        async () => ({ content: [{ type: 'text', text: 'result' }] }),
      );

      await new Promise(resolve => setImmediate(resolve));

      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('should measure execution duration', async () => {
      const deactivatedHandler = vi.fn();
      eventBus.on(TUI_EVENTS.AGENT_DEACTIVATED, deactivatedHandler);

      await interceptor.intercept(
        'get_agent_system_prompt',
        { agentName: 'test', context: { mode: 'EVAL' } },
        async () => {
          await new Promise(r => setTimeout(r, 10));
          return { content: [{ type: 'text', text: 'ok' }] };
        },
      );

      await new Promise(resolve => setImmediate(resolve));

      const event = deactivatedHandler.mock.calls[0][0];
      expect(event.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('enable/disable', () => {
    it('should be disabled by default', () => {
      expect(interceptor.isEnabled()).toBe(false);
    });

    it('should be enabled after enable()', () => {
      interceptor.enable();
      expect(interceptor.isEnabled()).toBe(true);
    });

    it('should be disabled after disable()', () => {
      interceptor.enable();
      interceptor.disable();
      expect(interceptor.isEnabled()).toBe(false);
    });
  });
});
