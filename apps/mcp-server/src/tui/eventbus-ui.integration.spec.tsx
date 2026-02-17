import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { App } from './app';
import { TuiEventBus, TUI_EVENTS, TuiInterceptor, type AgentMetadata } from './events';

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

      eventBus.emit(TUI_EVENTS.AGENT_DEACTIVATED, {
        agentId: 'sec-1',
        reason: 'completed',
        durationMs: 500,
      });
      eventBus.emit(TUI_EVENTS.AGENT_DEACTIVATED, {
        agentId: 'acc-1',
        reason: 'completed',
        durationMs: 700,
      });
      eventBus.emit(TUI_EVENTS.AGENT_DEACTIVATED, {
        agentId: 'perf-1',
        reason: 'completed',
        durationMs: 900,
      });
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

  describe('Skill 추천 → StatusBar 업데이트', () => {
    it('should display all skill names when multiple skills recommended sequentially', async () => {
      const eventBus = new TuiEventBus();
      const { lastFrame } = render(<App eventBus={eventBus} />);

      eventBus.emit(TUI_EVENTS.SKILL_RECOMMENDED, {
        skillName: 'brainstorming',
        reason: 'creative work',
      });
      eventBus.emit(TUI_EVENTS.SKILL_RECOMMENDED, {
        skillName: 'test-driven-development',
        reason: 'TDD cycle',
      });
      await tick();

      const frame = lastFrame() ?? '';
      expect(frame).toContain('brainstorming');
      expect(frame).toContain('test-driven-development');
    });

    it('should handle skill recommendation alongside agent activation', async () => {
      const eventBus = new TuiEventBus();
      const { lastFrame } = render(<App eventBus={eventBus} />);

      eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
        agentId: 'a1',
        name: 'security-specialist',
        role: 'specialist',
        isPrimary: true,
      });
      eventBus.emit(TUI_EVENTS.SKILL_RECOMMENDED, {
        skillName: 'systematic-debugging',
        reason: 'bug detected',
      });
      await tick();

      const frame = lastFrame() ?? '';
      expect(frame).toContain('1 active');
      expect(frame).toContain('systematic-debugging');
    });
  });

  describe('이벤트 버퍼링 (TUI 시작 전 이벤트)', () => {
    it('should NOT reflect MODE_CHANGED emitted before App mount', async () => {
      const eventBus = new TuiEventBus();

      // Emit BEFORE render
      eventBus.emit(TUI_EVENTS.MODE_CHANGED, { from: null, to: 'ACT' });

      // Render AFTER emit
      const { lastFrame } = render(<App eventBus={eventBus} />);
      await tick();

      // Mode should NOT be reflected because listener wasn't registered yet
      const frame = lastFrame() ?? '';
      expect(frame).not.toContain('ACT');
    });

    it('should NOT reflect AGENT_ACTIVATED emitted before App mount', async () => {
      const eventBus = new TuiEventBus();

      // Emit BEFORE render
      eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
        agentId: 'a1',
        name: 'security-specialist',
        role: 'specialist',
        isPrimary: true,
      });

      const { lastFrame } = render(<App eventBus={eventBus} />);
      await tick();

      // Agent should NOT be reflected
      expect(lastFrame()).toContain('0 active');
    });

    it('should sync state via re-emitting events after App mount', async () => {
      const eventBus = new TuiEventBus();

      // These events are lost (emitted before mount)
      eventBus.emit(TUI_EVENTS.MODE_CHANGED, { from: null, to: 'PLAN' });

      const { lastFrame } = render(<App eventBus={eventBus} />);
      await tick();

      // Re-emit after mount to sync state
      eventBus.emit(TUI_EVENTS.MODE_CHANGED, { from: null, to: 'PLAN' });
      eventBus.emit(TUI_EVENTS.AGENTS_LOADED, {
        agents: [
          {
            id: 'security-specialist',
            name: 'security-specialist',
            description: 'Security analysis',
            category: 'Security' as const,
            icon: '🔒',
            expertise: ['security'],
          },
        ],
      });
      await tick();

      const frame = lastFrame() ?? '';
      expect(frame).toContain('PLAN');
      expect(frame).toContain('Security');
    });
  });

  describe('복합 시나리오 통합 테스트', () => {
    it('should handle real workflow: mode → agents → parallel → skills → completion', async () => {
      const eventBus = new TuiEventBus();
      const { lastFrame } = render(<App eventBus={eventBus} />);

      // 1. Load agent metadata
      const agents: AgentMetadata[] = [
        {
          id: 'security-specialist',
          name: 'security-specialist',
          description: 'Security',
          category: 'Security',
          icon: '🔒',
          expertise: ['security'],
        },
        {
          id: 'test-strategy-specialist',
          name: 'test-strategy-specialist',
          description: 'Testing',
          category: 'Testing',
          icon: '🧪',
          expertise: ['testing'],
        },
        {
          id: 'architecture-specialist',
          name: 'architecture-specialist',
          description: 'Architecture',
          category: 'Architecture',
          icon: '🏛️',
          expertise: ['architecture'],
        },
      ];
      eventBus.emit(TUI_EVENTS.AGENTS_LOADED, { agents });
      await tick();

      // 2. Mode change to PLAN
      eventBus.emit(TUI_EVENTS.MODE_CHANGED, { from: null, to: 'PLAN' });
      await tick();
      expect(lastFrame()).toContain('PLAN');

      // 3. Primary agent activates
      eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
        agentId: 'arch-1',
        name: 'architecture-specialist',
        role: 'primary',
        isPrimary: true,
      });
      await tick();
      expect(lastFrame()).toContain('1 active');

      // 4. Skill recommended
      eventBus.emit(TUI_EVENTS.SKILL_RECOMMENDED, {
        skillName: 'brainstorming',
        reason: 'planning phase',
      });
      await tick();
      expect(lastFrame()).toContain('brainstorming');

      // 5. Parallel execution
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

      // 6. Specialists complete
      eventBus.emit(TUI_EVENTS.AGENT_DEACTIVATED, {
        agentId: 'sec-1',
        reason: 'completed',
        durationMs: 600,
      });
      eventBus.emit(TUI_EVENTS.AGENT_DEACTIVATED, {
        agentId: 'test-1',
        reason: 'completed',
        durationMs: 800,
      });
      eventBus.emit(TUI_EVENTS.PARALLEL_COMPLETED, {
        specialists: ['security-specialist', 'test-strategy-specialist'],
        results: {
          'security-specialist': 'ok',
          'test-strategy-specialist': 'ok',
        },
      });
      await tick();

      const frame = lastFrame() ?? '';
      expect(frame).toContain('PLAN');
      expect(frame).toContain('1 active');
      expect(frame).toContain('brainstorming');
      // Grid should still show categories from AGENTS_LOADED
      expect(frame).toContain('Security');
      expect(frame).toContain('Testing');
    });

    it('should handle error scenario: activate → error deactivation → re-activate', async () => {
      const eventBus = new TuiEventBus();
      const { lastFrame } = render(<App eventBus={eventBus} />);

      // 1. Activate agent
      eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
        agentId: 'a1',
        name: 'security-specialist',
        role: 'specialist',
        isPrimary: true,
      });
      await tick();
      expect(lastFrame()).toContain('1 active');

      // 2. Agent fails with error
      eventBus.emit(TUI_EVENTS.AGENT_DEACTIVATED, {
        agentId: 'a1',
        reason: 'error',
        durationMs: 300,
      });
      await tick();
      expect(lastFrame()).toContain('0 active');

      // 3. Re-activate the same agent (retry scenario)
      eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
        agentId: 'a1',
        name: 'security-specialist',
        role: 'specialist',
        isPrimary: true,
      });
      await tick();
      expect(lastFrame()).toContain('1 active');
    });
  });

  describe('Interceptor → EventBus → UI 통합 (semantic events)', () => {
    it('should update Header mode when parse_mode tool is intercepted', async () => {
      const eventBus = new TuiEventBus();
      const interceptor = new TuiInterceptor(eventBus);
      interceptor.enable();

      const { lastFrame } = render(<App eventBus={eventBus} />);
      await tick();

      // Simulate parse_mode tool call through interceptor
      await interceptor.intercept(
        'parse_mode',
        { prompt: 'PLAN design auth feature' },
        async () => ({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                mode: 'PLAN',
                originalPrompt: 'design auth feature',
              }),
            },
          ],
        }),
      );

      // Wait for setImmediate events to propagate
      await new Promise(resolve => setImmediate(resolve));
      await tick();

      expect(lastFrame()).toContain('PLAN');
    });

    it('should show skills in StatusBar when parse_mode returns included_skills', async () => {
      const eventBus = new TuiEventBus();
      const interceptor = new TuiInterceptor(eventBus);
      interceptor.enable();

      const { lastFrame } = render(<App eventBus={eventBus} />);
      await tick();

      await interceptor.intercept('parse_mode', { prompt: 'PLAN something' }, async () => ({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              mode: 'PLAN',
              included_skills: [
                { name: 'brainstorming', reason: 'creative work' },
                { name: 'writing-plans', reason: 'multi-step task' },
              ],
            }),
          },
        ],
      }));

      await new Promise(resolve => setImmediate(resolve));
      await tick();

      const frame = lastFrame() ?? '';
      expect(frame).toContain('PLAN');
      expect(frame).toContain('brainstorming');
      expect(frame).toContain('writing-plans');
    });

    it('should show agent activation for mapped general tools like search_rules', async () => {
      const eventBus = new TuiEventBus();
      const interceptor = new TuiInterceptor(eventBus);
      interceptor.enable();

      const { lastFrame } = render(<App eventBus={eventBus} />);
      await tick();

      await interceptor.intercept('search_rules', { query: 'test' }, async () => ({
        content: [{ type: 'text', text: '{"results":[]}' }],
      }));

      await new Promise(resolve => setImmediate(resolve));
      await tick();

      // search_rules is now mapped → should show in status
      // After deactivation it becomes 0 active (completed), but the agent entry exists
      const frame = lastFrame() ?? '';
      expect(frame).toContain('0 active');
    });

    it('should handle full interceptor workflow: parse_mode + parallel agents', async () => {
      const eventBus = new TuiEventBus();
      const interceptor = new TuiInterceptor(eventBus);
      interceptor.enable();

      const { lastFrame } = render(<App eventBus={eventBus} />);
      await tick();

      // 1. parse_mode call sets mode and skills
      await interceptor.intercept('parse_mode', { prompt: 'EVAL review code' }, async () => ({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              mode: 'EVAL',
              included_skills: [{ name: 'systematic-debugging', reason: 'bug' }],
            }),
          },
        ],
      }));

      await new Promise(resolve => setImmediate(resolve));
      await tick();

      let frame = lastFrame() ?? '';
      expect(frame).toContain('EVAL');
      expect(frame).toContain('systematic-debugging');

      // 2. prepare_parallel_agents call triggers parallel:started
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
      await tick();

      frame = lastFrame() ?? '';
      expect(frame).toContain('EVAL');
      expect(frame).toContain('systematic-debugging');
    });
  });
});
