import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from 'ink-testing-library';
import { App } from '../app';
import {
  TuiEventBus,
  TUI_EVENTS,
  type AgentMetadata,
  type AgentCategory,
  AGENT_CATEGORY_MAP,
} from '../events';
import { AGENT_ICONS } from '../utils/icons';

vi.mock('../utils/icons', async importOriginal => {
  const actual = await importOriginal<typeof import('../utils/icons')>();
  return {
    ...actual,
    isNerdFontEnabled: () => false,
  };
});

const tick = () => new Promise(resolve => setTimeout(resolve, 0));
const flushRender = async () => {
  for (let i = 0; i < 5; i++) await tick();
};

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
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

describe('29 Agent 초기 렌더링', () => {
  let unmountFn: (() => void) | undefined;

  afterEach(() => {
    unmountFn?.();
    unmountFn = undefined;
  });

  it('should render 29 activated agents within 300ms (median of 3 runs)', async () => {
    const durations: number[] = [];

    for (let run = 0; run < 3; run++) {
      const eventBus = new TuiEventBus();
      const { unmount, lastFrame } = render(<App eventBus={eventBus} />);

      // Load agent metadata first
      eventBus.emit(TUI_EVENTS.AGENTS_LOADED, {
        agents: buildAgentMetadata(ALL_AGENT_NAMES),
      });
      await tick();

      // Measure activation of all 29 agents (first as primary, rest as specialists)
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

      // Verify render completed
      const frame = lastFrame() ?? '';
      expect(frame).toContain(`${ALL_AGENT_NAMES.length} active`);

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
      const { unmount, lastFrame } = render(<App eventBus={eventBus} />);
      unmountFn = unmount;

      // Load agent metadata
      eventBus.emit(TUI_EVENTS.AGENTS_LOADED, {
        agents: buildAgentMetadata(ALL_AGENT_NAMES),
      });
      await tick();

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
      expect(frame).toContain(`${ALL_AGENT_NAMES.length} active`);

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
      expect(updatedFrame).toContain(`${ALL_AGENT_NAMES.length + 1} active`);

      unmount();
      unmountFn = undefined;
    }

    const medianDuration = median(durations);
    expect(medianDuration).toBeLessThan(200);
  });
});

describe('29 Agent 동시 상태 업데이트', () => {
  let unmountFn: (() => void) | undefined;

  afterEach(() => {
    unmountFn?.();
    unmountFn = undefined;
  });

  it('should deactivate all 29 agents in rapid succession within 500ms (median of 3 runs)', async () => {
    const durations: number[] = [];

    for (let run = 0; run < 3; run++) {
      const eventBus = new TuiEventBus();
      const { unmount, lastFrame } = render(<App eventBus={eventBus} />);
      unmountFn = unmount;

      // Load agent metadata
      eventBus.emit(TUI_EVENTS.AGENTS_LOADED, {
        agents: buildAgentMetadata(ALL_AGENT_NAMES),
      });
      await tick();

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
      expect(frame).toContain(`${ALL_AGENT_NAMES.length} active`);

      // Measure rapid deactivation of all 29 agents
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
      expect(updatedFrame).toContain('0 active');

      unmount();
      unmountFn = undefined;
    }

    const medianDuration = median(durations);
    expect(medianDuration).toBeLessThan(500);
  });
});
