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

describe('tui/App', () => {
  it('should render the application title', () => {
    const { lastFrame } = render(<App />);
    expect(lastFrame()).toContain('CODINGBUDDY');
  });

  it('should render without errors', () => {
    expect(() => render(<App />)).not.toThrow();
  });

  it('should accept eventBus prop without errors', () => {
    const eventBus = new TuiEventBus();
    expect(() => render(<App eventBus={eventBus} />)).not.toThrow();
  });

  it('should display mode when eventBus emits MODE_CHANGED', async () => {
    const eventBus = new TuiEventBus();
    const { lastFrame } = render(<App eventBus={eventBus} />);

    eventBus.emit(TUI_EVENTS.MODE_CHANGED, { from: null, to: 'PLAN' });
    await tick();

    expect(lastFrame()).toContain('PLAN');
  });

  it('should render AgentTree when agents are activated', async () => {
    const eventBus = new TuiEventBus();
    const { lastFrame } = render(<App eventBus={eventBus} />);

    // Activate primary agent
    eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
      agentId: 'p1',
      name: 'solution-architect',
      role: 'primary',
      isPrimary: true,
    });
    await tick();

    // Activate parallel agents
    eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
      agentId: 's1',
      name: 'security-specialist',
      role: 'specialist',
      isPrimary: false,
    });
    eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
      agentId: 's2',
      name: 'test-strategy-specialist',
      role: 'specialist',
      isPrimary: false,
    });
    await tick();

    const frame = lastFrame() ?? '';
    // Primary agent card should be rendered
    expect(frame).toContain('soluti');
    // Parallel agent cards should be rendered
    expect(frame).toContain('securi');
    expect(frame).toContain('test-s');
  });

  it('should show active count in StatusBar after AGENT_ACTIVATED', async () => {
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
  });

  it('should render AgentGrid categories when AGENTS_LOADED emitted', async () => {
    const eventBus = new TuiEventBus();
    const { lastFrame } = render(<App eventBus={eventBus} />);

    const agents: AgentMetadata[] = [
      {
        id: 'security-specialist',
        name: 'security-specialist',
        description: 'Security analysis',
        category: 'Security',
        icon: '🔒',
        expertise: ['security'],
      },
      {
        id: 'test-strategy-specialist',
        name: 'test-strategy-specialist',
        description: 'Test strategy',
        category: 'Testing',
        icon: '🧪',
        expertise: ['testing'],
      },
    ];
    eventBus.emit(TUI_EVENTS.AGENTS_LOADED, { agents });
    await tick();

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Security');
    expect(frame).toContain('Testing');
  });

  it('should reflect agent deactivation after AGENT_DEACTIVATED', async () => {
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
      reason: 'completed',
      durationMs: 1000,
    });
    await tick();
    expect(lastFrame()).toContain('0 active');
  });

  it('should display skill names in StatusBar after SKILL_RECOMMENDED', async () => {
    const eventBus = new TuiEventBus();
    const { lastFrame } = render(<App eventBus={eventBus} />);

    eventBus.emit(TUI_EVENTS.SKILL_RECOMMENDED, {
      skillName: 'brainstorming',
      reason: 'creative work detected',
    });
    await tick();

    expect(lastFrame()).toContain('brainstorming');
  });

  it('should handle full workflow: mode change → agents → deactivation', async () => {
    const eventBus = new TuiEventBus();
    const { lastFrame } = render(<App eventBus={eventBus} />);

    // 1. Mode change
    eventBus.emit(TUI_EVENTS.MODE_CHANGED, { from: null, to: 'PLAN' });
    await tick();
    expect(lastFrame()).toContain('PLAN');

    // 2. Activate primary agent
    eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
      agentId: 'p1',
      name: 'solution-architect',
      role: 'primary',
      isPrimary: true,
    });
    await tick();
    expect(lastFrame()).toContain('1 active');

    // 3. Activate parallel agents
    eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
      agentId: 's1',
      name: 'security-specialist',
      role: 'specialist',
      isPrimary: false,
    });
    eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
      agentId: 's2',
      name: 'test-strategy-specialist',
      role: 'specialist',
      isPrimary: false,
    });
    await tick();
    expect(lastFrame()).toContain('3 active');

    // 4. Deactivate parallel agents
    eventBus.emit(TUI_EVENTS.AGENT_DEACTIVATED, {
      agentId: 's1',
      reason: 'completed',
      durationMs: 500,
    });
    eventBus.emit(TUI_EVENTS.AGENT_DEACTIVATED, {
      agentId: 's2',
      reason: 'completed',
      durationMs: 700,
    });
    await tick();
    expect(lastFrame()).toContain('1 active');

    // 5. Mode still shown
    expect(lastFrame()).toContain('PLAN');
  });
});

describe('tui/App responsive layout', () => {
  it('should render without crash with many agents in single category', async () => {
    const eventBus = new TuiEventBus();
    const { lastFrame } = render(<App eventBus={eventBus} />);

    eventBus.emit(TUI_EVENTS.AGENTS_LOADED, {
      agents: Array.from({ length: 12 }, (_, i) => ({
        id: `agent-${i}`,
        name: `agent-${i}`,
        description: `Agent ${i}`,
        category: 'Security' as const,
        icon: '🔒',
        expertise: ['test'],
      })),
    });
    await tick();

    expect(lastFrame()).toBeDefined();
    expect(lastFrame()).toContain('Security');
  });

  it('should render without crash with many agents across categories', async () => {
    const eventBus = new TuiEventBus();
    const { lastFrame } = render(<App eventBus={eventBus} />);

    const categories: Array<import('./events').AgentCategory> = [
      'Security',
      'Testing',
      'Architecture',
      'Frontend',
      'Backend',
    ];
    const agents: AgentMetadata[] = categories.flatMap(category =>
      Array.from({ length: 3 }, (_, i) => ({
        id: `${category.toLowerCase()}-${i}`,
        name: `${category.toLowerCase()}-agent-${i}`,
        description: `${category} agent ${i}`,
        category,
        icon: '🔧',
        expertise: [category.toLowerCase()],
      })),
    );

    eventBus.emit(TUI_EVENTS.AGENTS_LOADED, { agents });
    await tick();

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Security');
    expect(frame).toContain('Testing');
    expect(frame).toContain('Architecture');
    expect(frame).toContain('Frontend');
    expect(frame).toContain('Backend');
  });
});
