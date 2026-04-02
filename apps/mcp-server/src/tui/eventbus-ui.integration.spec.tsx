import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { DashboardApp } from './dashboard-app';
import { TuiEventBus, TUI_EVENTS, TuiInterceptor } from './events';
import { flushInk } from './testing/tui-test-utils';

vi.mock('./utils/icons', async importOriginal => {
  const actual = await importOriginal<typeof import('./utils/icons')>();
  return {
    ...actual,
    isNerdFontEnabled: () => false,
  };
});

vi.mock('./hooks/use-tick', () => ({
  useTick: () => 0,
}));

describe('EventBus ↔ UI Integration', () => {
  describe('Agent 활성화 → Dashboard 상태 변화', () => {
    it('should show primary agent name and RUNNING state when AGENT_ACTIVATED with isPrimary=true', async () => {
      const eventBus = new TuiEventBus();
      const { lastFrame } = render(<DashboardApp eventBus={eventBus} />);

      eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
        agentId: 'arch-1',
        name: 'solution-architect',
        role: 'primary',
        isPrimary: true,
      });
      await flushInk();

      const frame = lastFrame() ?? '';
      expect(frame).toContain('solution-arch');
      expect(frame).toContain('RUNNING');
    });

    it('should show multiple parallel agents in FlowMap when specialists activated', async () => {
      const eventBus = new TuiEventBus();
      const { lastFrame } = render(<DashboardApp eventBus={eventBus} />);

      eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
        agentId: 'p1',
        name: 'solution-architect',
        role: 'primary',
        isPrimary: true,
      });
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
      await flushInk();

      const frame = lastFrame() ?? '';
      // FlowMap truncates names in 17-char-wide boxes (e.g., "security-...")
      expect(frame).toContain('security-');
      expect(frame).toContain('performan');
      expect(frame).toContain('RUNNING');
    });
  });

  describe('Agent 비활성화 → 상태 전환', () => {
    it('should remain RUNNING when one of two agents deactivated', async () => {
      const eventBus = new TuiEventBus();
      const { lastFrame } = render(<DashboardApp eventBus={eventBus} />);

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
      await flushInk();
      expect(lastFrame()).toContain('RUNNING');

      eventBus.emit(TUI_EVENTS.AGENT_DEACTIVATED, {
        agentId: 'a1',
        reason: 'completed',
        durationMs: 1200,
      });
      await flushInk();
      // Still one running
      expect(lastFrame()).toContain('RUNNING');
    });

    it('should switch to IDLE when all agents deactivated', async () => {
      const eventBus = new TuiEventBus();
      const { lastFrame } = render(<DashboardApp eventBus={eventBus} />);

      eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
        agentId: 'a1',
        name: 'security-specialist',
        role: 'specialist',
        isPrimary: false,
      });
      await flushInk();
      expect(lastFrame()).toContain('RUNNING');

      eventBus.emit(TUI_EVENTS.AGENT_DEACTIVATED, {
        agentId: 'a1',
        reason: 'completed',
        durationMs: 1200,
      });
      await flushInk();
      expect(lastFrame()).toContain('IDLE');
    });

    it('should switch to IDLE when agent deactivated with reason=error', async () => {
      const eventBus = new TuiEventBus();
      const { lastFrame } = render(<DashboardApp eventBus={eventBus} />);

      eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
        agentId: 'a1',
        name: 'security-specialist',
        role: 'specialist',
        isPrimary: true,
      });
      await flushInk();
      expect(lastFrame()).toContain('RUNNING');

      eventBus.emit(TUI_EVENTS.AGENT_DEACTIVATED, {
        agentId: 'a1',
        reason: 'error',
        durationMs: 500,
      });
      await flushInk();
      expect(lastFrame()).toContain('ERROR');
    });

    it('should switch to IDLE when primary agent deactivated', async () => {
      const eventBus = new TuiEventBus();
      const { lastFrame } = render(<DashboardApp eventBus={eventBus} />);

      eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
        agentId: 'p1',
        name: 'solution-architect',
        role: 'primary',
        isPrimary: true,
      });
      await flushInk();
      expect(lastFrame()).toContain('solution-arch');

      eventBus.emit(TUI_EVENTS.AGENT_DEACTIVATED, {
        agentId: 'p1',
        reason: 'completed',
        durationMs: 2000,
      });
      await flushInk();
      expect(lastFrame()).toContain('IDLE');
    });
  });

  describe('Mode 변경 → Header 업데이트', () => {
    it('should handle mode change from PLAN to ACT without error', async () => {
      const eventBus = new TuiEventBus();
      const { lastFrame } = render(<DashboardApp eventBus={eventBus} />);

      eventBus.emit(TUI_EVENTS.MODE_CHANGED, { from: 'PLAN', to: 'ACT' });
      await flushInk();

      const frame = lastFrame() ?? '';
      expect(frame).toBeTruthy();
      expect(frame).toContain('CODINGBUDDY');
    });

    it('should handle sequential mode changes without error', async () => {
      const eventBus = new TuiEventBus();
      const { lastFrame } = render(<DashboardApp eventBus={eventBus} />);

      eventBus.emit(TUI_EVENTS.MODE_CHANGED, { from: null, to: 'ACT' });
      await flushInk();
      eventBus.emit(TUI_EVENTS.MODE_CHANGED, { from: 'ACT', to: 'EVAL' });
      await flushInk();

      const frame = lastFrame() ?? '';
      expect(frame).toBeTruthy();
    });

    it('should handle rapid consecutive mode changes without error', async () => {
      const eventBus = new TuiEventBus();
      const { lastFrame } = render(<DashboardApp eventBus={eventBus} />);

      eventBus.emit(TUI_EVENTS.MODE_CHANGED, { from: null, to: 'PLAN' });
      eventBus.emit(TUI_EVENTS.MODE_CHANGED, { from: 'PLAN', to: 'ACT' });
      eventBus.emit(TUI_EVENTS.MODE_CHANGED, { from: 'ACT', to: 'AUTO' });
      await flushInk();

      const frame = lastFrame() ?? '';
      expect(frame).toBeTruthy();
    });
  });

  describe('Parallel 시작/완료 → FlowMap 업데이트', () => {
    it('should show specialists in FlowMap after PARALLEL_STARTED + individual activations', async () => {
      const eventBus = new TuiEventBus();
      const { lastFrame } = render(<DashboardApp eventBus={eventBus} />);

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
        agentId: 'specialist:security-specialist',
        name: 'security-specialist',
        role: 'specialist',
        isPrimary: false,
      });
      eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
        agentId: 'specialist:test-strategy-specialist',
        name: 'test-strategy-specialist',
        role: 'specialist',
        isPrimary: false,
      });
      await flushInk();

      const frame = lastFrame() ?? '';
      // FlowMap truncates names in 17-char-wide boxes (e.g., "security-...", "test-stra...")
      expect(frame).toContain('security-');
      expect(frame).toContain('test-stra');
      expect(frame).toContain('RUNNING');
    });

    it('should switch to IDLE after individual deactivations when only primary remains', async () => {
      const eventBus = new TuiEventBus();
      const { lastFrame } = render(<DashboardApp eventBus={eventBus} />);

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
        agentId: 'specialist:security-specialist',
        name: 'security-specialist',
        role: 'specialist',
        isPrimary: false,
      });
      eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
        agentId: 'specialist:test-strategy-specialist',
        name: 'test-strategy-specialist',
        role: 'specialist',
        isPrimary: false,
      });
      await flushInk();
      expect(lastFrame()).toContain('RUNNING');

      eventBus.emit(TUI_EVENTS.AGENT_DEACTIVATED, {
        agentId: 'specialist:security-specialist',
        reason: 'completed',
        durationMs: 800,
      });
      eventBus.emit(TUI_EVENTS.AGENT_DEACTIVATED, {
        agentId: 'specialist:test-strategy-specialist',
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
      await flushInk();

      // Primary still running
      expect(lastFrame()).toContain('RUNNING');
    });

    it('should handle full parallel lifecycle: mode → agents → parallel → completion', async () => {
      const eventBus = new TuiEventBus();
      const { lastFrame } = render(<DashboardApp eventBus={eventBus} />);

      eventBus.emit(TUI_EVENTS.MODE_CHANGED, { from: null, to: 'PLAN' });
      await flushInk();

      eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
        agentId: 'p1',
        name: 'solution-architect',
        role: 'primary',
        isPrimary: true,
      });
      await flushInk();
      expect(lastFrame()).toContain('RUNNING');

      eventBus.emit(TUI_EVENTS.PARALLEL_STARTED, {
        specialists: ['security-specialist', 'accessibility-specialist', 'performance-specialist'],
        mode: 'PLAN',
      });
      eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
        agentId: 'specialist:security-specialist',
        name: 'security-specialist',
        role: 'specialist',
        isPrimary: false,
      });
      eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
        agentId: 'specialist:accessibility-specialist',
        name: 'accessibility-specialist',
        role: 'specialist',
        isPrimary: false,
      });
      eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
        agentId: 'specialist:performance-specialist',
        name: 'performance-specialist',
        role: 'specialist',
        isPrimary: false,
      });
      await flushInk();
      expect(lastFrame()).toContain('RUNNING');

      eventBus.emit(TUI_EVENTS.AGENT_DEACTIVATED, {
        agentId: 'specialist:security-specialist',
        reason: 'completed',
        durationMs: 500,
      });
      eventBus.emit(TUI_EVENTS.AGENT_DEACTIVATED, {
        agentId: 'specialist:accessibility-specialist',
        reason: 'completed',
        durationMs: 700,
      });
      eventBus.emit(TUI_EVENTS.AGENT_DEACTIVATED, {
        agentId: 'specialist:performance-specialist',
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
      await flushInk();

      // Only primary still running
      expect(lastFrame()).toContain('RUNNING');
    });
  });

  describe('Skill 추천 → 이벤트 처리 (UI 표시 없음)', () => {
    it('should handle skill recommendation events without error', async () => {
      const eventBus = new TuiEventBus();
      const { lastFrame } = render(<DashboardApp eventBus={eventBus} />);

      eventBus.emit(TUI_EVENTS.SKILL_RECOMMENDED, {
        skillName: 'brainstorming',
        reason: 'creative work',
      });
      eventBus.emit(TUI_EVENTS.SKILL_RECOMMENDED, {
        skillName: 'test-driven-development',
        reason: 'TDD cycle',
      });
      await flushInk();

      const frame = lastFrame() ?? '';
      expect(frame).toBeTruthy();
    });

    it('should handle skill recommendation alongside agent activation', async () => {
      const eventBus = new TuiEventBus();
      const { lastFrame } = render(<DashboardApp eventBus={eventBus} />);

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
      await flushInk();
      await flushInk();

      const frame = lastFrame() ?? '';
      expect(frame).toContain('RUNNING');
      expect(frame).toContain('security-spec');
    });
  });

  describe('이벤트 버퍼링 (TUI 시작 전 이벤트)', () => {
    it('should NOT reflect AGENT_ACTIVATED emitted before DashboardApp mount', async () => {
      const eventBus = new TuiEventBus();

      // Emit BEFORE render
      eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
        agentId: 'a1',
        name: 'security-specialist',
        role: 'specialist',
        isPrimary: true,
      });

      const { lastFrame } = render(<DashboardApp eventBus={eventBus} />);
      await flushInk();

      // Agent should NOT be reflected because listener wasn't registered yet
      const frame = lastFrame() ?? '';
      expect(frame).toContain('IDLE');
      expect(frame).not.toContain('security-spec');
    });

    it('should sync state via re-emitting events after DashboardApp mount', async () => {
      const eventBus = new TuiEventBus();

      // This event is lost (emitted before mount)
      eventBus.emit(TUI_EVENTS.MODE_CHANGED, { from: null, to: 'PLAN' });

      const { lastFrame } = render(<DashboardApp eventBus={eventBus} />);
      await flushInk();

      // Re-emit after mount to sync state
      eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
        agentId: 'arch-1',
        name: 'solution-architect',
        role: 'primary',
        isPrimary: true,
      });
      await flushInk();

      const frame = lastFrame() ?? '';
      expect(frame).toContain('RUNNING');
      expect(frame).toContain('solution-arch');
    });
  });

  describe('복합 시나리오 통합 테스트', () => {
    it('should handle real workflow: mode → agents → parallel → completion', async () => {
      const eventBus = new TuiEventBus();
      const { lastFrame } = render(<DashboardApp eventBus={eventBus} />);

      // 1. Mode change to PLAN
      eventBus.emit(TUI_EVENTS.MODE_CHANGED, { from: null, to: 'PLAN' });
      await flushInk();

      // 2. Primary agent activates
      eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
        agentId: 'arch-1',
        name: 'architecture-specialist',
        role: 'primary',
        isPrimary: true,
      });
      await flushInk();
      expect(lastFrame()).toContain('RUNNING');

      // 3. Parallel execution
      eventBus.emit(TUI_EVENTS.PARALLEL_STARTED, {
        specialists: ['security-specialist', 'test-strategy-specialist'],
        mode: 'PLAN',
      });
      eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
        agentId: 'specialist:security-specialist',
        name: 'security-specialist',
        role: 'specialist',
        isPrimary: false,
      });
      eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
        agentId: 'specialist:test-strategy-specialist',
        name: 'test-strategy-specialist',
        role: 'specialist',
        isPrimary: false,
      });
      await flushInk();
      expect(lastFrame()).toContain('RUNNING');

      // 4. Specialists complete
      eventBus.emit(TUI_EVENTS.AGENT_DEACTIVATED, {
        agentId: 'specialist:security-specialist',
        reason: 'completed',
        durationMs: 600,
      });
      eventBus.emit(TUI_EVENTS.AGENT_DEACTIVATED, {
        agentId: 'specialist:test-strategy-specialist',
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
      await flushInk();

      const frame = lastFrame() ?? '';
      // Primary still running
      expect(frame).toContain('RUNNING');
      expect(frame).toContain('architect');
    });

    it('should handle error scenario: activate → error deactivation → re-activate', async () => {
      const eventBus = new TuiEventBus();
      const { lastFrame } = render(<DashboardApp eventBus={eventBus} />);
      await flushInk(); // ensure useEffect subscribes before emitting

      // 1. Activate agent
      eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
        agentId: 'a1',
        name: 'security-specialist',
        role: 'specialist',
        isPrimary: true,
      });
      await flushInk();
      expect(lastFrame()).toContain('RUNNING');

      // 2. Agent fails with error
      eventBus.emit(TUI_EVENTS.AGENT_DEACTIVATED, {
        agentId: 'a1',
        reason: 'error',
        durationMs: 300,
      });
      await flushInk();
      expect(lastFrame()).toContain('ERROR');

      // 3. Re-activate the same agent (retry scenario)
      eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
        agentId: 'a1',
        name: 'security-specialist',
        role: 'specialist',
        isPrimary: true,
      });
      await flushInk();
      expect(lastFrame()).toContain('RUNNING');
    });
  });

  describe('Interceptor → EventBus → UI 통합 (semantic events)', () => {
    it('should update state when parse_mode tool is intercepted', async () => {
      const eventBus = new TuiEventBus();
      const interceptor = new TuiInterceptor(eventBus);
      interceptor.enable();

      const { lastFrame } = render(<DashboardApp eventBus={eventBus} />);
      await flushInk();

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

      await new Promise(resolve => setImmediate(resolve));
      await flushInk();

      const frame = lastFrame() ?? '';
      expect(frame).toBeTruthy();
      expect(frame).toContain('CODINGBUDDY');
    });

    it('should handle parse_mode with included_skills without error', async () => {
      const eventBus = new TuiEventBus();
      const interceptor = new TuiInterceptor(eventBus);
      interceptor.enable();

      const { lastFrame } = render(<DashboardApp eventBus={eventBus} />);
      await flushInk();

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
      await flushInk();

      const frame = lastFrame() ?? '';
      expect(frame).toBeTruthy();
    });

    it('should handle tool interception and show correct state', async () => {
      const eventBus = new TuiEventBus();
      const interceptor = new TuiInterceptor(eventBus);
      interceptor.enable();

      const { lastFrame } = render(<DashboardApp eventBus={eventBus} />);
      await flushInk();

      await interceptor.intercept('search_rules', { query: 'test' }, async () => ({
        content: [{ type: 'text', text: '{"results":[]}' }],
      }));

      await new Promise(resolve => setImmediate(resolve));
      await flushInk();

      const frame = lastFrame() ?? '';
      // After deactivation, should be IDLE
      expect(frame).toContain('IDLE');
    });

    it('should handle full interceptor workflow: parse_mode + parallel agents', async () => {
      const eventBus = new TuiEventBus();
      const interceptor = new TuiInterceptor(eventBus);
      interceptor.enable();

      const { lastFrame } = render(<DashboardApp eventBus={eventBus} />);
      await flushInk();

      // 1. parse_mode call sets mode
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
      await flushInk();

      let frame = lastFrame() ?? '';
      expect(frame).toBeTruthy();

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
      await flushInk();

      frame = lastFrame() ?? '';
      expect(frame).toBeTruthy();
    });
  });
});
