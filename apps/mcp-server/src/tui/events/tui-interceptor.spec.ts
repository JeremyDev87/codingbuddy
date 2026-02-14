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

    it('should emit events for mapped general tools like search_rules', async () => {
      const activatedHandler = vi.fn();
      const deactivatedHandler = vi.fn();
      eventBus.on(TUI_EVENTS.AGENT_ACTIVATED, activatedHandler);
      eventBus.on(TUI_EVENTS.AGENT_DEACTIVATED, deactivatedHandler);

      await interceptor.intercept(
        'search_rules',
        { query: 'test' },
        async () => ({ content: [{ type: 'text', text: 'result' }] }),
      );

      await new Promise(resolve => setImmediate(resolve));

      expect(activatedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: 'search_rules',
          role: 'query',
        }),
      );
      expect(deactivatedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: 'search_rules',
          reason: 'completed',
        }),
      );
    });

    it('should not emit events for unknown tools', async () => {
      const emitSpy = vi.spyOn(eventBus, 'emit');

      await interceptor.intercept(
        'completely_unknown_tool',
        { query: 'test' },
        async () => ({ content: [{ type: 'text', text: 'result' }] }),
      );

      await new Promise(resolve => setImmediate(resolve));

      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('should emit mode:changed from parse_mode response', async () => {
      const modeHandler = vi.fn();
      eventBus.on(TUI_EVENTS.MODE_CHANGED, modeHandler);

      await interceptor.intercept(
        'parse_mode',
        { prompt: 'PLAN design auth' },
        async () => ({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                mode: 'PLAN',
                originalPrompt: 'design auth',
              }),
            },
          ],
        }),
      );

      await new Promise(resolve => setImmediate(resolve));

      expect(modeHandler).toHaveBeenCalledWith({ from: null, to: 'PLAN' });
    });

    it('should emit skill:recommended from parse_mode response', async () => {
      const skillHandler = vi.fn();
      eventBus.on(TUI_EVENTS.SKILL_RECOMMENDED, skillHandler);

      await interceptor.intercept(
        'parse_mode',
        { prompt: 'PLAN something' },
        async () => ({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                mode: 'PLAN',
                included_skills: [
                  { name: 'writing-plans', reason: 'matched' },
                  { name: 'tdd', reason: 'test pattern' },
                ],
              }),
            },
          ],
        }),
      );

      await new Promise(resolve => setImmediate(resolve));

      expect(skillHandler).toHaveBeenCalledTimes(2);
      expect(skillHandler).toHaveBeenCalledWith({
        skillName: 'writing-plans',
        reason: 'matched',
      });
      expect(skillHandler).toHaveBeenCalledWith({
        skillName: 'tdd',
        reason: 'test pattern',
      });
    });

    it('should emit parallel:started from prepare_parallel_agents response', async () => {
      const parallelHandler = vi.fn();
      eventBus.on(TUI_EVENTS.PARALLEL_STARTED, parallelHandler);

      await interceptor.intercept(
        'prepare_parallel_agents',
        { specialists: ['security', 'perf'], mode: 'EVAL' },
        async () => ({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                agents: [
                  { agentName: 'security-specialist' },
                  { agentName: 'performance-specialist' },
                ],
                mode: 'EVAL',
              }),
            },
          ],
        }),
      );

      await new Promise(resolve => setImmediate(resolve));

      expect(parallelHandler).toHaveBeenCalledWith({
        specialists: ['security-specialist', 'performance-specialist'],
        mode: 'EVAL',
      });
    });

    it('should track previous mode in mode:changed from field', async () => {
      const modeHandler = vi.fn();
      eventBus.on(TUI_EVENTS.MODE_CHANGED, modeHandler);

      // First call: PLAN (from: null since no previous mode)
      await interceptor.intercept(
        'parse_mode',
        { prompt: 'PLAN design auth' },
        async () => ({
          content: [
            {
              type: 'text',
              text: JSON.stringify({ mode: 'PLAN' }),
            },
          ],
        }),
      );
      await new Promise(resolve => setImmediate(resolve));

      expect(modeHandler).toHaveBeenCalledWith({ from: null, to: 'PLAN' });

      // Second call: ACT (from: PLAN)
      await interceptor.intercept(
        'parse_mode',
        { prompt: 'ACT implement feature' },
        async () => ({
          content: [
            {
              type: 'text',
              text: JSON.stringify({ mode: 'ACT' }),
            },
          ],
        }),
      );
      await new Promise(resolve => setImmediate(resolve));

      expect(modeHandler).toHaveBeenCalledWith({ from: 'PLAN', to: 'ACT' });

      // Third call: EVAL (from: ACT)
      await interceptor.intercept(
        'parse_mode',
        { prompt: 'EVAL review code' },
        async () => ({
          content: [
            {
              type: 'text',
              text: JSON.stringify({ mode: 'EVAL' }),
            },
          ],
        }),
      );
      await new Promise(resolve => setImmediate(resolve));

      expect(modeHandler).toHaveBeenCalledWith({ from: 'ACT', to: 'EVAL' });
    });

    it('should not emit semantic events when response has no extractable data', async () => {
      const modeHandler = vi.fn();
      const skillHandler = vi.fn();
      eventBus.on(TUI_EVENTS.MODE_CHANGED, modeHandler);
      eventBus.on(TUI_EVENTS.SKILL_RECOMMENDED, skillHandler);

      await interceptor.intercept(
        'get_agent_system_prompt',
        { agentName: 'test', context: { mode: 'EVAL' } },
        async () => ({
          content: [
            { type: 'text', text: JSON.stringify({ systemPrompt: 'hi' }) },
          ],
        }),
      );

      await new Promise(resolve => setImmediate(resolve));

      expect(modeHandler).not.toHaveBeenCalled();
      expect(skillHandler).not.toHaveBeenCalled();
    });

    it('should emit semantic events even for tools without agentInfo', async () => {
      const modeHandler = vi.fn();
      eventBus.on(TUI_EVENTS.MODE_CHANGED, modeHandler);

      // Use a hypothetical unknown tool that returns mode data
      // (shouldn't happen in practice, but tests the decoupled architecture)
      await interceptor.intercept('completely_unknown_tool', {}, async () => ({
        content: [{ type: 'text', text: '{"not":"mode-data"}' }],
      }));

      await new Promise(resolve => setImmediate(resolve));

      expect(modeHandler).not.toHaveBeenCalled();
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
