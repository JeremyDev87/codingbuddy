import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from 'ink-testing-library';
import { DashboardApp } from '../dashboard-app';
import {
  TuiEventBus,
  TUI_EVENTS,
  type AgentMetadata,
  type AgentCategory,
  AGENT_CATEGORY_MAP,
} from '../events';
import { AGENT_ICONS } from '../utils/icons';
import { flushInk } from '../testing/tui-test-utils';

vi.mock('../utils/icons', async importOriginal => {
  const actual = await importOriginal<typeof import('../utils/icons')>();
  return {
    ...actual,
    isNerdFontEnabled: () => false,
  };
});

const flushRender = async () => flushInk(5);

const ALL_AGENT_NAMES = Object.keys(AGENT_ICONS);

function buildAgentMetadata(agentNames: readonly string[]): AgentMetadata[] {
  return agentNames.map(name => ({
    id: name,
    name,
    description: `${name} desc`,
    expertise: [],
    category: (AGENT_CATEGORY_MAP[name] ?? 'Architecture') as AgentCategory,
    icon: '🔧',
  }));
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

describe(`${ALL_AGENT_NAMES.length} Agent 초기 렌더링`, () => {
  let unmountFn: (() => void) | undefined;

  afterEach(() => {
    unmountFn?.();
    unmountFn = undefined;
  });

  it(`should render ${ALL_AGENT_NAMES.length} activated agents within 300ms (median of 3 runs)`, async () => {
    const durations: number[] = [];

    for (let run = 0; run < 3; run++) {
      const eventBus = new TuiEventBus();
      const { unmount, lastFrame } = render(<DashboardApp eventBus={eventBus} />);

      // Load agent metadata first
      eventBus.emit(TUI_EVENTS.AGENTS_LOADED, {
        agents: buildAgentMetadata(ALL_AGENT_NAMES),
      });
      await flushInk();

      // Measure activation of all agents (first as primary, rest as specialists)
      const start = performance.now();

      for (let i = 0; i < ALL_AGENT_NAMES.length; i++) {
        eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
          agentId: `agent-${i}`,
          name: ALL_AGENT_NAMES[i],
          role: i === 0 ? 'primary' : 'specialist',
          isPrimary: i === 0,
        });
      }
      await flushRender();

      const end = performance.now();
      durations.push(end - start);

      // Verify render completed - dashboard should show RUNNING
      const frame = lastFrame() ?? '';
      expect(frame).toContain('RUNNING');

      unmount();
    }

    unmountFn = undefined;
    const medianDuration = median(durations);
    expect(medianDuration).toBeLessThan(300);
  });
});

describe('단일 Agent 상태 변경 리렌더', () => {
  let unmountFn: (() => void) | undefined;

  afterEach(() => {
    unmountFn?.();
    unmountFn = undefined;
  });

  it('should rerender within 200ms when one additional agent is activated (median of 3 runs)', async () => {
    const durations: number[] = [];

    for (let run = 0; run < 3; run++) {
      const eventBus = new TuiEventBus();
      const { unmount, lastFrame } = render(<DashboardApp eventBus={eventBus} />);
      unmountFn = unmount;

      // Load agent metadata
      eventBus.emit(TUI_EVENTS.AGENTS_LOADED, {
        agents: buildAgentMetadata(ALL_AGENT_NAMES),
      });
      await flushInk();

      // Activate all agents (first as primary, rest as specialists)
      for (let i = 0; i < ALL_AGENT_NAMES.length; i++) {
        eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
          agentId: `agent-${i}`,
          name: ALL_AGENT_NAMES[i],
          role: i === 0 ? 'primary' : 'specialist',
          isPrimary: i === 0,
        });
      }
      await flushRender();

      const frame = lastFrame() ?? '';
      expect(frame).toContain('RUNNING');

      // Measure activating one more agent
      const start = performance.now();

      eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
        agentId: 'extra-agent',
        name: 'security-specialist',
        role: 'specialist',
        isPrimary: false,
      });
      await flushRender();

      const end = performance.now();
      durations.push(end - start);

      const updatedFrame = lastFrame() ?? '';
      expect(updatedFrame).toContain('RUNNING');

      unmount();
      unmountFn = undefined;
    }

    const medianDuration = median(durations);
    expect(medianDuration).toBeLessThan(200);
  });
});

describe(`${ALL_AGENT_NAMES.length} Agent 동시 상태 업데이트`, () => {
  let unmountFn: (() => void) | undefined;

  afterEach(() => {
    unmountFn?.();
    unmountFn = undefined;
  });

  it('should deactivate all agents in rapid succession within 500ms (median of 3 runs)', async () => {
    const durations: number[] = [];

    for (let run = 0; run < 3; run++) {
      const eventBus = new TuiEventBus();
      const { unmount, lastFrame } = render(<DashboardApp eventBus={eventBus} />);
      unmountFn = unmount;

      // Load agent metadata
      eventBus.emit(TUI_EVENTS.AGENTS_LOADED, {
        agents: buildAgentMetadata(ALL_AGENT_NAMES),
      });
      await flushInk();

      // Activate all agents (first as primary, rest as specialists)
      for (let i = 0; i < ALL_AGENT_NAMES.length; i++) {
        eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
          agentId: `agent-${i}`,
          name: ALL_AGENT_NAMES[i],
          role: i === 0 ? 'primary' : 'specialist',
          isPrimary: i === 0,
        });
      }
      await flushRender();

      const frame = lastFrame() ?? '';
      expect(frame).toContain('RUNNING');

      // Measure rapid deactivation of all agents
      const start = performance.now();

      for (let i = 0; i < ALL_AGENT_NAMES.length; i++) {
        eventBus.emit(TUI_EVENTS.AGENT_DEACTIVATED, {
          agentId: `agent-${i}`,
          reason: 'completed',
          durationMs: 100,
        });
      }
      await flushRender();

      const end = performance.now();
      durations.push(end - start);

      const updatedFrame = lastFrame() ?? '';
      expect(updatedFrame).toContain('IDLE');

      unmount();
      unmountFn = undefined;
    }

    const medianDuration = median(durations);
    expect(medianDuration).toBeLessThan(500);
  });
});
