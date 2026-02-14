import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TuiInterceptor } from '../events/tui-interceptor';
import { TuiEventBus } from '../events/event-bus';
import { TUI_EVENTS } from '../events/types';

describe('비활성화 시 이벤트 발행 0회 (Zero Overhead)', () => {
  let interceptor: TuiInterceptor;
  let eventBus: TuiEventBus;
  let emitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    eventBus = new TuiEventBus();
    interceptor = new TuiInterceptor(eventBus);
    emitSpy = vi.spyOn(eventBus, 'emit');
  });

  it('should not emit events for agent tool when disabled', async () => {
    const result = await interceptor.intercept(
      'get_agent_system_prompt',
      { agentName: 'test', context: { mode: 'EVAL' } },
      async () => 'result',
    );

    expect(emitSpy).not.toHaveBeenCalled();
    expect(result).toBe('result');
  });

  it('should not emit events for non-agent tool when disabled', async () => {
    const result = await interceptor.intercept(
      'search_rules',
      { query: 'test' },
      async () => 'search-result',
    );

    expect(emitSpy).not.toHaveBeenCalled();
    expect(result).toBe('search-result');
  });

  it('should passthrough result without modification', async () => {
    const payload = { content: [{ type: 'text', text: 'ok' }] };
    const result = await interceptor.intercept(
      'get_agent_system_prompt',
      { agentName: 'test', context: { mode: 'EVAL' } },
      async () => payload,
    );

    expect(result).toBe(payload);
  });
});

describe('활성화 시 응답 지연 < 5ms', () => {
  let interceptor: TuiInterceptor;
  let eventBus: TuiEventBus;

  beforeEach(() => {
    eventBus = new TuiEventBus();
    interceptor = new TuiInterceptor(eventBus);
    interceptor.enable();
  });

  it('should add less than 5ms overhead per call', async () => {
    const execute = async () => ({
      content: [{ type: 'text', text: 'ok' }],
    });

    const directStart = performance.now();
    await execute();
    const directDuration = performance.now() - directStart;

    const interceptedStart = performance.now();
    await interceptor.intercept(
      'get_agent_system_prompt',
      { agentName: 'test', context: { mode: 'EVAL' } },
      execute,
    );
    const interceptedDuration = performance.now() - interceptedStart;

    await new Promise(resolve => setImmediate(resolve));

    const overhead = interceptedDuration - directDuration;
    expect(overhead).toBeLessThan(5);
  });

  it('should have median overhead < 5ms over 10 iterations', async () => {
    const execute = async () => ({
      content: [{ type: 'text', text: 'ok' }],
    });

    const overheads: number[] = [];

    for (let i = 0; i < 10; i++) {
      const directStart = performance.now();
      await execute();
      const directDuration = performance.now() - directStart;

      const interceptedStart = performance.now();
      await interceptor.intercept(
        'get_agent_system_prompt',
        { agentName: 'test', context: { mode: 'EVAL' } },
        execute,
      );
      const interceptedDuration = performance.now() - interceptedStart;

      await new Promise(resolve => setImmediate(resolve));

      overheads.push(interceptedDuration - directDuration);
    }

    const sorted = [...overheads].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];

    expect(median).toBeLessThan(5);
  });
});

describe('setImmediate fire-and-forget 확인', () => {
  let interceptor: TuiInterceptor;
  let eventBus: TuiEventBus;
  let emitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    eventBus = new TuiEventBus();
    interceptor = new TuiInterceptor(eventBus);
    interceptor.enable();
    emitSpy = vi.spyOn(eventBus, 'emit');
  });

  it('should not emit events synchronously during intercept', async () => {
    await interceptor.intercept(
      'get_agent_system_prompt',
      { agentName: 'test', context: { mode: 'EVAL' } },
      async () => 'result',
    );

    // Before setImmediate flushes, events should NOT have been emitted
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('should emit events after setImmediate flushes', async () => {
    await interceptor.intercept(
      'get_agent_system_prompt',
      { agentName: 'test', context: { mode: 'EVAL' } },
      async () => 'result',
    );

    expect(emitSpy).not.toHaveBeenCalled();

    // Flush setImmediate callbacks
    await new Promise(resolve => setImmediate(resolve));

    expect(emitSpy).toHaveBeenCalledWith(
      TUI_EVENTS.AGENT_ACTIVATED,
      expect.objectContaining({
        agentId: 'test',
        name: 'test',
      }),
    );
    expect(emitSpy).toHaveBeenCalledWith(
      TUI_EVENTS.AGENT_DEACTIVATED,
      expect.objectContaining({
        agentId: 'test',
        reason: 'completed',
      }),
    );
  });
});
