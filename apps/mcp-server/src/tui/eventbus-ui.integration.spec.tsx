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
});
