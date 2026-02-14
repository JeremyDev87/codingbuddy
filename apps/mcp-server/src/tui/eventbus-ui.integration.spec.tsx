import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { App } from './app';
import { TuiEventBus, TUI_EVENTS, type AgentMetadata } from './events';

vi.mock('./utils/icons', async importOriginal => {
  const actual = await importOriginal<typeof import('./utils/icons')>();
  return {
    ...actual,
    isNerdFontEnabled: () => false,
  };
});

const tick = () => new Promise(resolve => setTimeout(resolve, 0));

describe('EventBus ↔ UI Integration', () => {
  describe('Agent 활성화 → AgentCard 상태 변화', () => {
    it('should show primary agent name in AgentTree when AGENT_ACTIVATED with isPrimary=true', async () => {
      const eventBus = new TuiEventBus();
      const { lastFrame } = render(<App eventBus={eventBus} />);

      eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
        agentId: 'arch-1',
        name: 'solution-architect',
        role: 'primary',
        isPrimary: true,
      });
      await tick();

      const frame = lastFrame() ?? '';
      // Primary agent should appear in AgentTree
      expect(frame).toContain('soluti');
      // StatusBar should show 1 active
      expect(frame).toContain('1 active');
    });

    it('should show multiple parallel agents in AgentTree when specialists activated', async () => {
      const eventBus = new TuiEventBus();
      const { lastFrame } = render(<App eventBus={eventBus} />);

      // Activate primary first
      eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
        agentId: 'p1',
        name: 'solution-architect',
        role: 'primary',
        isPrimary: true,
      });
      // Then specialists
      eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
        agentId: 's1',
        name: 'security-specialist',
        role: 'specialist',
        isPrimary: false,
      });
      eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
        agentId: 's2',
        name: 'performance-specialist',
        role: 'specialist',
        isPrimary: false,
      });
      await tick();

      const frame = lastFrame() ?? '';
      expect(frame).toContain('securi');
      expect(frame).toContain('perfor');
      expect(frame).toContain('3 active');
    });
  });

  describe('Agent 비활성화 → AgentCard Idle 전환', () => {
    it('should decrease active count when agent deactivated with reason=completed', async () => {
      const eventBus = new TuiEventBus();
      const { lastFrame } = render(<App eventBus={eventBus} />);

      eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
        agentId: 'a1',
        name: 'security-specialist',
        role: 'specialist',
        isPrimary: false,
      });
      eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
        agentId: 'a2',
        name: 'test-strategy-specialist',
        role: 'specialist',
        isPrimary: false,
      });
      await tick();
      expect(lastFrame()).toContain('2 active');

      eventBus.emit(TUI_EVENTS.AGENT_DEACTIVATED, {
        agentId: 'a1',
        reason: 'completed',
        durationMs: 1200,
      });
      await tick();
      expect(lastFrame()).toContain('1 active');
    });

    it('should decrease active count when agent deactivated with reason=error', async () => {
      const eventBus = new TuiEventBus();
      const { lastFrame } = render(<App eventBus={eventBus} />);

      eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
        agentId: 'a1',
        name: 'security-specialist',
        role: 'specialist',
        isPrimary: true,
      });
      await tick();
      expect(lastFrame()).toContain('1 active');

      eventBus.emit(TUI_EVENTS.AGENT_DEACTIVATED, {
        agentId: 'a1',
        reason: 'error',
        durationMs: 500,
      });
      await tick();
      expect(lastFrame()).toContain('0 active');
    });

    it('should clear AgentTree primary slot when primary agent deactivated', async () => {
      const eventBus = new TuiEventBus();
      const { lastFrame } = render(<App eventBus={eventBus} />);

      eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
        agentId: 'p1',
        name: 'solution-architect',
        role: 'primary',
        isPrimary: true,
      });
      await tick();
      expect(lastFrame()).toContain('soluti');

      eventBus.emit(TUI_EVENTS.AGENT_DEACTIVATED, {
        agentId: 'p1',
        reason: 'completed',
        durationMs: 2000,
      });
      await tick();

      const frame = lastFrame() ?? '';
      expect(frame).toContain('0 active');
    });
  });

  describe('Mode 변경 → Header 업데이트', () => {
    it('should display ACT in Header when mode changes from PLAN to ACT', async () => {
      const eventBus = new TuiEventBus();
      const { lastFrame } = render(<App eventBus={eventBus} />);

      eventBus.emit(TUI_EVENTS.MODE_CHANGED, { from: 'PLAN', to: 'ACT' });
      await tick();

      expect(lastFrame()).toContain('ACT');
    });

    it('should display EVAL in Header when mode changes from ACT to EVAL', async () => {
      const eventBus = new TuiEventBus();
      const { lastFrame } = render(<App eventBus={eventBus} />);

      eventBus.emit(TUI_EVENTS.MODE_CHANGED, { from: null, to: 'ACT' });
      await tick();
      eventBus.emit(TUI_EVENTS.MODE_CHANGED, { from: 'ACT', to: 'EVAL' });
      await tick();

      const frame = lastFrame() ?? '';
      expect(frame).toContain('EVAL');
    });

    it('should reflect only the latest mode after rapid consecutive changes', async () => {
      const eventBus = new TuiEventBus();
      const { lastFrame } = render(<App eventBus={eventBus} />);

      eventBus.emit(TUI_EVENTS.MODE_CHANGED, { from: null, to: 'PLAN' });
      eventBus.emit(TUI_EVENTS.MODE_CHANGED, { from: 'PLAN', to: 'ACT' });
      eventBus.emit(TUI_EVENTS.MODE_CHANGED, { from: 'ACT', to: 'AUTO' });
      await tick();

      expect(lastFrame()).toContain('AUTO');
    });
  });

  describe('Parallel 시작/완료 → AgentTree 업데이트', () => {
    it('should show specialists in AgentTree after PARALLEL_STARTED + individual activations', async () => {
      const eventBus = new TuiEventBus();
      const { lastFrame } = render(<App eventBus={eventBus} />);

      eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
        agentId: 'p1',
        name: 'solution-architect',
        role: 'primary',
        isPrimary: true,
      });

      eventBus.emit(TUI_EVENTS.PARALLEL_STARTED, {
        specialists: ['security-specialist', 'test-strategy-specialist'],
        mode: 'PLAN',
      });

      eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
        agentId: 'sec-1',
        name: 'security-specialist',
        role: 'specialist',
        isPrimary: false,
      });
      eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
        agentId: 'test-1',
        name: 'test-strategy-specialist',
        role: 'specialist',
        isPrimary: false,
      });
      await tick();

      const frame = lastFrame() ?? '';
      expect(frame).toContain('securi');
      expect(frame).toContain('test-s');
      expect(frame).toContain('3 active');
    });

    it('should clear specialists from AgentTree after individual deactivations + PARALLEL_COMPLETED', async () => {
      const eventBus = new TuiEventBus();
      const { lastFrame } = render(<App eventBus={eventBus} />);

      eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
        agentId: 'p1',
        name: 'solution-architect',
        role: 'primary',
        isPrimary: true,
      });
      eventBus.emit(TUI_EVENTS.PARALLEL_STARTED, {
        specialists: ['security-specialist', 'test-strategy-specialist'],
        mode: 'PLAN',
      });
      eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
        agentId: 'sec-1',
        name: 'security-specialist',
        role: 'specialist',
        isPrimary: false,
      });
      eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
        agentId: 'test-1',
        name: 'test-strategy-specialist',
        role: 'specialist',
        isPrimary: false,
      });
      await tick();
      expect(lastFrame()).toContain('3 active');

      eventBus.emit(TUI_EVENTS.AGENT_DEACTIVATED, {
        agentId: 'sec-1',
        reason: 'completed',
        durationMs: 800,
      });
      eventBus.emit(TUI_EVENTS.AGENT_DEACTIVATED, {
        agentId: 'test-1',
        reason: 'completed',
        durationMs: 1200,
      });
      eventBus.emit(TUI_EVENTS.PARALLEL_COMPLETED, {
        specialists: ['security-specialist', 'test-strategy-specialist'],
        results: {
          'security-specialist': 'No issues found',
          'test-strategy-specialist': 'Tests designed',
        },
      });
      await tick();

      expect(lastFrame()).toContain('1 active');
    });

    it('should handle full parallel lifecycle: start → activate → deactivate → complete', async () => {
      const eventBus = new TuiEventBus();
      const { lastFrame } = render(<App eventBus={eventBus} />);

      eventBus.emit(TUI_EVENTS.MODE_CHANGED, { from: null, to: 'PLAN' });
      await tick();
      expect(lastFrame()).toContain('PLAN');

      eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
        agentId: 'p1',
        name: 'solution-architect',
        role: 'primary',
        isPrimary: true,
      });
      await tick();
      expect(lastFrame()).toContain('1 active');

      eventBus.emit(TUI_EVENTS.PARALLEL_STARTED, {
        specialists: ['security-specialist', 'accessibility-specialist', 'performance-specialist'],
        mode: 'PLAN',
      });
      eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
        agentId: 'sec-1',
        name: 'security-specialist',
        role: 'specialist',
        isPrimary: false,
      });
      eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
        agentId: 'acc-1',
        name: 'accessibility-specialist',
        role: 'specialist',
        isPrimary: false,
      });
      eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
        agentId: 'perf-1',
        name: 'performance-specialist',
        role: 'specialist',
        isPrimary: false,
      });
      await tick();
      expect(lastFrame()).toContain('4 active');

      eventBus.emit(TUI_EVENTS.AGENT_DEACTIVATED, { agentId: 'sec-1', reason: 'completed', durationMs: 500 });
      eventBus.emit(TUI_EVENTS.AGENT_DEACTIVATED, { agentId: 'acc-1', reason: 'completed', durationMs: 700 });
      eventBus.emit(TUI_EVENTS.AGENT_DEACTIVATED, { agentId: 'perf-1', reason: 'completed', durationMs: 900 });
      eventBus.emit(TUI_EVENTS.PARALLEL_COMPLETED, {
        specialists: ['security-specialist', 'accessibility-specialist', 'performance-specialist'],
        results: {
          'security-specialist': 'done',
          'accessibility-specialist': 'done',
          'performance-specialist': 'done',
        },
      });
      await tick();

      const frame = lastFrame() ?? '';
      expect(frame).toContain('1 active');
      expect(frame).toContain('PLAN');
    });
  });
});
