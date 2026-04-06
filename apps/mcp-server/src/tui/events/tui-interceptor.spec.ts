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

    it('should NOT emit agent events for MCP tools like search_rules', async () => {
      const activatedHandler = vi.fn();
      const deactivatedHandler = vi.fn();
      eventBus.on(TUI_EVENTS.AGENT_ACTIVATED, activatedHandler);
      eventBus.on(TUI_EVENTS.AGENT_DEACTIVATED, deactivatedHandler);

      await interceptor.intercept('search_rules', { query: 'test' }, async () => ({
        content: [{ type: 'text', text: 'result' }],
      }));

      await new Promise(resolve => setImmediate(resolve));

      expect(activatedHandler).not.toHaveBeenCalled();
      expect(deactivatedHandler).not.toHaveBeenCalled();
    });

    it('should not emit agent events for unknown tools', async () => {
      const activatedHandler = vi.fn();
      const deactivatedHandler = vi.fn();
      eventBus.on(TUI_EVENTS.AGENT_ACTIVATED, activatedHandler);
      eventBus.on(TUI_EVENTS.AGENT_DEACTIVATED, deactivatedHandler);

      await interceptor.intercept('completely_unknown_tool', { query: 'test' }, async () => ({
        content: [{ type: 'text', text: 'result' }],
      }));

      await new Promise(resolve => setImmediate(resolve));

      expect(activatedHandler).not.toHaveBeenCalled();
      expect(deactivatedHandler).not.toHaveBeenCalled();
    });

    it('should emit tool:invoked for all tools including unknown ones', async () => {
      const toolHandler = vi.fn();
      eventBus.on(TUI_EVENTS.TOOL_INVOKED, toolHandler);

      await interceptor.intercept('completely_unknown_tool', { query: 'test' }, async () => ({
        content: [{ type: 'text', text: 'result' }],
      }));

      await new Promise(resolve => setImmediate(resolve));

      expect(toolHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          toolName: 'completely_unknown_tool',
          agentId: null,
        }),
      );
    });

    it('should emit mode:changed from parse_mode response', async () => {
      const modeHandler = vi.fn();
      eventBus.on(TUI_EVENTS.MODE_CHANGED, modeHandler);

      await interceptor.intercept('parse_mode', { prompt: 'PLAN design auth' }, async () => ({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              mode: 'PLAN',
              originalPrompt: 'design auth',
            }),
          },
        ],
      }));

      await new Promise(resolve => setImmediate(resolve));

      expect(modeHandler).toHaveBeenCalledWith({ from: null, to: 'PLAN' });
    });

    it('should emit skill:recommended from parse_mode response', async () => {
      const skillHandler = vi.fn();
      eventBus.on(TUI_EVENTS.SKILL_RECOMMENDED, skillHandler);

      await interceptor.intercept('parse_mode', { prompt: 'PLAN something' }, async () => ({
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
      }));

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

    it('should emit agent:activated for primary agent from parse_mode delegates_to', async () => {
      const activatedHandler = vi.fn();
      eventBus.on(TUI_EVENTS.AGENT_ACTIVATED, activatedHandler);

      await interceptor.intercept('parse_mode', { prompt: 'PLAN design auth' }, async () => ({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              mode: 'PLAN',
              delegates_to: 'solution-architect',
            }),
          },
        ],
      }));

      await new Promise(resolve => setImmediate(resolve));

      expect(activatedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: 'primary:solution-architect',
          name: 'solution-architect',
          isPrimary: true,
        }),
      );
    });

    it('should deactivate previous primary agent when new parse_mode arrives', async () => {
      const activatedHandler = vi.fn();
      const deactivatedHandler = vi.fn();
      eventBus.on(TUI_EVENTS.AGENT_ACTIVATED, activatedHandler);
      eventBus.on(TUI_EVENTS.AGENT_DEACTIVATED, deactivatedHandler);

      // First call: PLAN with solution-architect
      await interceptor.intercept('parse_mode', { prompt: 'PLAN design auth' }, async () => ({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              mode: 'PLAN',
              delegates_to: 'solution-architect',
            }),
          },
        ],
      }));
      await new Promise(resolve => setImmediate(resolve));

      // Second call: ACT with software-engineer
      await interceptor.intercept('parse_mode', { prompt: 'ACT implement feature' }, async () => ({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              mode: 'ACT',
              delegates_to: 'software-engineer',
            }),
          },
        ],
      }));
      await new Promise(resolve => setImmediate(resolve));

      // solution-architect should be deactivated with 'replaced' reason
      expect(deactivatedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: 'primary:solution-architect',
          reason: 'replaced',
        }),
      );
      // software-engineer should be activated
      expect(activatedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: 'primary:software-engineer',
          name: 'software-engineer',
          isPrimary: true,
        }),
      );
    });

    it('should emit args-based AGENT_ACTIVATED before response-based AGENT_ACTIVATED', async () => {
      const activatedHandler = vi.fn();
      eventBus.on(TUI_EVENTS.AGENT_ACTIVATED, activatedHandler);

      await interceptor.intercept('parse_mode', { prompt: 'PLAN design auth' }, async () => ({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              mode: 'PLAN',
              delegates_to: 'solution-architect',
            }),
          },
        ],
      }));

      await new Promise(resolve => setImmediate(resolve));

      // Args-based activation (plan-mode) fires before response-based (primary:solution-architect)
      expect(activatedHandler).toHaveBeenCalledTimes(2);
      expect(activatedHandler.mock.calls[0][0]).toEqual(
        expect.objectContaining({ agentId: 'plan-mode' }),
      );
      expect(activatedHandler.mock.calls[1][0]).toEqual(
        expect.objectContaining({ agentId: 'primary:solution-architect', isPrimary: true }),
      );
    });

    it('should track previous mode in mode:changed from field', async () => {
      const modeHandler = vi.fn();
      eventBus.on(TUI_EVENTS.MODE_CHANGED, modeHandler);

      // First call: PLAN (from: null since no previous mode)
      await interceptor.intercept('parse_mode', { prompt: 'PLAN design auth' }, async () => ({
        content: [
          {
            type: 'text',
            text: JSON.stringify({ mode: 'PLAN' }),
          },
        ],
      }));
      await new Promise(resolve => setImmediate(resolve));

      expect(modeHandler).toHaveBeenCalledWith({ from: null, to: 'PLAN' });

      // Second call: ACT (from: PLAN)
      await interceptor.intercept('parse_mode', { prompt: 'ACT implement feature' }, async () => ({
        content: [
          {
            type: 'text',
            text: JSON.stringify({ mode: 'ACT' }),
          },
        ],
      }));
      await new Promise(resolve => setImmediate(resolve));

      expect(modeHandler).toHaveBeenCalledWith({ from: 'PLAN', to: 'ACT' });

      // Third call: EVAL (from: ACT)
      await interceptor.intercept('parse_mode', { prompt: 'EVAL review code' }, async () => ({
        content: [
          {
            type: 'text',
            text: JSON.stringify({ mode: 'EVAL' }),
          },
        ],
      }));
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
          content: [{ type: 'text', text: JSON.stringify({ systemPrompt: 'hi' }) }],
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

  describe('resetSession()', () => {
    beforeEach(() => {
      interceptor.enable();
    });

    it('should emit session:reset event with given reason', async () => {
      const resetHandler = vi.fn();
      eventBus.on(TUI_EVENTS.SESSION_RESET, resetHandler);

      interceptor.resetSession('manual');
      await new Promise(resolve => setImmediate(resolve));

      expect(resetHandler).toHaveBeenCalledWith({ reason: 'manual' });
    });

    it('should emit session:reset only once per call', async () => {
      const resetHandler = vi.fn();
      eventBus.on(TUI_EVENTS.SESSION_RESET, resetHandler);

      interceptor.resetSession('test');
      await new Promise(resolve => setImmediate(resolve));

      expect(resetHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('MODE_CHANGED auto-reset', () => {
    beforeEach(() => {
      interceptor.enable();
    });

    it('should NOT emit SESSION_RESET on first PLAN when currentMode is null', async () => {
      const resetHandler = vi.fn();
      eventBus.on(TUI_EVENTS.SESSION_RESET, resetHandler);

      await interceptor.intercept('parse_mode', { prompt: 'PLAN first session' }, async () => ({
        content: [{ type: 'text', text: JSON.stringify({ mode: 'PLAN' }) }],
      }));
      await new Promise(resolve => setImmediate(resolve));

      expect(resetHandler).not.toHaveBeenCalled();
    });

    it('should emit SESSION_RESET on second PLAN when previous session exists', async () => {
      const resetHandler = vi.fn();
      eventBus.on(TUI_EVENTS.SESSION_RESET, resetHandler);

      // 첫 번째 PLAN: currentMode null → PLAN (reset 없음)
      await interceptor.intercept('parse_mode', { prompt: 'PLAN first' }, async () => ({
        content: [{ type: 'text', text: JSON.stringify({ mode: 'PLAN' }) }],
      }));
      await new Promise(resolve => setImmediate(resolve));
      expect(resetHandler).not.toHaveBeenCalled();

      // 두 번째 PLAN: currentMode PLAN → reset 발생
      await interceptor.intercept('parse_mode', { prompt: 'PLAN second' }, async () => ({
        content: [{ type: 'text', text: JSON.stringify({ mode: 'PLAN' }) }],
      }));
      await new Promise(resolve => setImmediate(resolve));

      expect(resetHandler).toHaveBeenCalledWith({ reason: 'new-plan-session' });
      expect(resetHandler).toHaveBeenCalledTimes(1);
    });

    it('should emit SESSION_RESET on AUTO when previous session exists', async () => {
      const resetHandler = vi.fn();
      eventBus.on(TUI_EVENTS.SESSION_RESET, resetHandler);

      // 첫 번째 PLAN
      await interceptor.intercept('parse_mode', { prompt: 'PLAN setup' }, async () => ({
        content: [{ type: 'text', text: JSON.stringify({ mode: 'PLAN' }) }],
      }));
      await new Promise(resolve => setImmediate(resolve));

      // AUTO: currentMode PLAN → reset 발생
      await interceptor.intercept('parse_mode', { prompt: 'AUTO build feature' }, async () => ({
        content: [{ type: 'text', text: JSON.stringify({ mode: 'AUTO' }) }],
      }));
      await new Promise(resolve => setImmediate(resolve));

      expect(resetHandler).toHaveBeenCalledWith({ reason: 'new-plan-session' });
    });

    it('should NOT emit SESSION_RESET on ACT even with previous session', async () => {
      const resetHandler = vi.fn();
      eventBus.on(TUI_EVENTS.SESSION_RESET, resetHandler);

      // PLAN 먼저
      await interceptor.intercept('parse_mode', { prompt: 'PLAN setup' }, async () => ({
        content: [{ type: 'text', text: JSON.stringify({ mode: 'PLAN' }) }],
      }));
      await new Promise(resolve => setImmediate(resolve));
      resetHandler.mockClear();

      // ACT: reset 없어야 함
      await interceptor.intercept('parse_mode', { prompt: 'ACT implement' }, async () => ({
        content: [{ type: 'text', text: JSON.stringify({ mode: 'ACT' }) }],
      }));
      await new Promise(resolve => setImmediate(resolve));

      expect(resetHandler).not.toHaveBeenCalled();
    });

    it('should NOT emit SESSION_RESET on EVAL even with previous session', async () => {
      const resetHandler = vi.fn();
      eventBus.on(TUI_EVENTS.SESSION_RESET, resetHandler);

      // PLAN → ACT 먼저
      await interceptor.intercept('parse_mode', { prompt: 'PLAN setup' }, async () => ({
        content: [{ type: 'text', text: JSON.stringify({ mode: 'PLAN' }) }],
      }));
      await new Promise(resolve => setImmediate(resolve));
      await interceptor.intercept('parse_mode', { prompt: 'ACT impl' }, async () => ({
        content: [{ type: 'text', text: JSON.stringify({ mode: 'ACT' }) }],
      }));
      await new Promise(resolve => setImmediate(resolve));
      resetHandler.mockClear();

      // EVAL: reset 없어야 함
      await interceptor.intercept('parse_mode', { prompt: 'EVAL review' }, async () => ({
        content: [{ type: 'text', text: JSON.stringify({ mode: 'EVAL' }) }],
      }));
      await new Promise(resolve => setImmediate(resolve));

      expect(resetHandler).not.toHaveBeenCalled();
    });

    it('MODE_CHANGED should still be emitted after SESSION_RESET', async () => {
      const modeHandler = vi.fn();
      const resetHandler = vi.fn();
      eventBus.on(TUI_EVENTS.MODE_CHANGED, modeHandler);
      eventBus.on(TUI_EVENTS.SESSION_RESET, resetHandler);

      // 첫 PLAN
      await interceptor.intercept('parse_mode', { prompt: 'PLAN first' }, async () => ({
        content: [{ type: 'text', text: JSON.stringify({ mode: 'PLAN' }) }],
      }));
      await new Promise(resolve => setImmediate(resolve));
      modeHandler.mockClear();

      // 두 번째 PLAN: reset 후 mode:changed도 발생해야 함
      await interceptor.intercept('parse_mode', { prompt: 'PLAN second' }, async () => ({
        content: [{ type: 'text', text: JSON.stringify({ mode: 'PLAN' }) }],
      }));
      await new Promise(resolve => setImmediate(resolve));

      expect(resetHandler).toHaveBeenCalledTimes(1);
      expect(modeHandler).toHaveBeenCalledWith({ from: null, to: 'PLAN' });
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

    it('should reset currentPrimaryAgentId on disable()', async () => {
      interceptor.enable();
      const activatedHandler = vi.fn();
      const deactivatedHandler = vi.fn();
      eventBus.on(TUI_EVENTS.AGENT_ACTIVATED, activatedHandler);
      eventBus.on(TUI_EVENTS.AGENT_DEACTIVATED, deactivatedHandler);

      // Activate a primary agent
      await interceptor.intercept('parse_mode', { prompt: 'PLAN test' }, async () => ({
        content: [
          {
            type: 'text',
            text: JSON.stringify({ mode: 'PLAN', delegates_to: 'solution-architect' }),
          },
        ],
      }));
      await new Promise(resolve => setImmediate(resolve));

      // Disable and re-enable
      interceptor.disable();
      interceptor.enable();
      deactivatedHandler.mockClear();

      // New primary agent should NOT trigger deactivation of old one
      await interceptor.intercept('parse_mode', { prompt: 'ACT impl' }, async () => ({
        content: [
          {
            type: 'text',
            text: JSON.stringify({ mode: 'ACT', delegates_to: 'software-engineer' }),
          },
        ],
      }));
      await new Promise(resolve => setImmediate(resolve));

      // Should not have emitted 'replaced' deactivation for solution-architect
      const replacedCalls = deactivatedHandler.mock.calls.filter(
        (call: unknown[]) => (call[0] as { reason: string }).reason === 'replaced',
      );
      expect(replacedCalls).toHaveLength(0);
    });
  });
});
