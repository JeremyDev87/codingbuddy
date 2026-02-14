import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { App } from '../app';
import { TuiEventBus, TUI_EVENTS } from '../events';
import type { TuiEventName } from '../events/types';

vi.mock('../utils/icons', async importOriginal => {
  const actual = await importOriginal<typeof import('../utils/icons')>();
  return {
    ...actual,
    isNerdFontEnabled: () => false,
  };
});

const tick = () => new Promise(resolve => setTimeout(resolve, 0));

describe('10,000 이벤트 후 메모리 증가 < 50MB (GC 없이)', () => {
  it('should keep memory growth under 50MB after 10,000 events', async () => {
    const eventBus = new TuiEventBus();
    const { unmount } = render(<App eventBus={eventBus} />);

    global.gc?.();
    const heapBefore = process.memoryUsage().heapUsed;

    for (let i = 0; i < 5000; i++) {
      eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
        agentId: `agent-${i}`,
        name: `agent-${i}`,
        role: 'specialist',
        isPrimary: false,
      });

      eventBus.emit(TUI_EVENTS.AGENT_DEACTIVATED, {
        agentId: `agent-${i}`,
        reason: 'completed',
        durationMs: 100,
      });
    }

    await tick();

    global.gc?.();
    const heapAfter = process.memoryUsage().heapUsed;
    const delta = heapAfter - heapBefore;

    // 50MB threshold accounts for Node.js heap measurement variance
    // without --expose-gc; the key invariant is no unbounded growth.
    expect(delta).toBeLessThan(50 * 1024 * 1024);

    unmount();
  }, 30_000);
});

describe('리스너 누적 방지', () => {
  it('should not accumulate listeners after mount/unmount cycles', async () => {
    const eventBus = new TuiEventBus();

    const initialCounts = new Map<TuiEventName, number>();
    for (const event of Object.values(TUI_EVENTS)) {
      const eventName = event as TuiEventName;
      initialCounts.set(eventName, eventBus.listenerCount(eventName));
    }

    const { unmount } = render(<App eventBus={eventBus} />);

    for (let i = 0; i < 100; i++) {
      eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
        agentId: `agent-${i}`,
        name: `agent-${i}`,
        role: 'specialist',
        isPrimary: false,
      });

      eventBus.emit(TUI_EVENTS.AGENT_DEACTIVATED, {
        agentId: `agent-${i}`,
        reason: 'completed',
        durationMs: 100,
      });
    }

    await tick();
    unmount();

    for (const event of Object.values(TUI_EVENTS)) {
      const eventName = event as TuiEventName;
      expect(eventBus.listenerCount(eventName)).toBe(
        initialCounts.get(eventName),
      );
    }
  });
});

describe('비활성화 Agent 상태 정리 확인', () => {
  it('should clean up deactivated agents and reflect correct active count', async () => {
    const eventBus = new TuiEventBus();
    const { lastFrame } = render(<App eventBus={eventBus} />);

    for (let i = 0; i < 5; i++) {
      eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
        agentId: `agent-${i}`,
        name: `agent-${i}`,
        role: 'specialist',
        isPrimary: false,
      });
    }
    await tick();

    for (let i = 0; i < 5; i++) {
      eventBus.emit(TUI_EVENTS.AGENT_DEACTIVATED, {
        agentId: `agent-${i}`,
        reason: 'completed',
        durationMs: 100,
      });
    }
    await tick();

    expect(lastFrame()).toContain('0 active');

    eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
      agentId: 'new-agent',
      name: 'new-agent',
      role: 'specialist',
      isPrimary: false,
    });
    await tick();

    expect(lastFrame()).toContain('1 active');
  });
});
