# EventBus ↔ UI 통합 테스트 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** EventBus에서 발행된 이벤트가 UI 컴포넌트까지 정상적으로 전파되는지 통합 테스트 작성 (이슈 #348)

**Architecture:** 단일 통합 테스트 파일 `eventbus-ui.integration.spec.tsx`에 이슈 체크리스트 7개 항목을 각각 `describe` 블록으로 매핑. 실제 `TuiEventBus` 인스턴스를 사용하고 mock 없이 EventBus→Hook→Component 전체 경로를 검증한다. 기존 `app.spec.tsx`의 단일 이벤트 테스트와 달리, 이벤트 시퀀스와 복합 시나리오에 집중한다.

**Tech Stack:** Vitest, React, Ink, ink-testing-library, TuiEventBus (EventEmitter2)

**Key Insight:** `PARALLEL_STARTED`/`PARALLEL_COMPLETED` 이벤트는 현재 reducer에서 no-op (상태 변경 없음). 실제 UI 변화는 개별 `AGENT_ACTIVATED`/`AGENT_DEACTIVATED` 이벤트로 발생한다. 통합 테스트에서는 PARALLEL 이벤트 + 개별 에이전트 이벤트 조합으로 전체 플로우를 검증한다.

---

### Task 1: 테스트 파일 스캐폴드 및 Agent 활성화 → AgentCard 상태 변화

**Files:**
- Create: `apps/mcp-server/src/tui/eventbus-ui.integration.spec.tsx`

**Step 1: 스캐폴드 + 첫 번째 describe 블록의 failing test 작성**

```tsx
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
```

**Step 2: 테스트 실행하여 pass 확인**

Run: `cd apps/mcp-server && npx vitest run src/tui/eventbus-ui.integration.spec.tsx`
Expected: PASS (2 tests) — 기존 컴포넌트가 이미 구현되어 있으므로 바로 통과

**Step 3: 커밋**

```bash
git add apps/mcp-server/src/tui/eventbus-ui.integration.spec.tsx
git commit -m "test(tui): add integration test scaffold with agent activation tests

Issue #348: Agent 활성화 → AgentCard 상태 변화 검증"
```

---

### Task 2: Agent 비활성화 → AgentCard Idle 전환

**Files:**
- Modify: `apps/mcp-server/src/tui/eventbus-ui.integration.spec.tsx`

**Step 1: 두 번째 describe 블록 작성**

Task 1에서 작성한 파일의 `describe('EventBus ↔ UI Integration')` 안에 다음 `describe` 블록을 추가:

```tsx
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
```

**Step 2: 테스트 실행**

Run: `cd apps/mcp-server && npx vitest run src/tui/eventbus-ui.integration.spec.tsx`
Expected: PASS (5 tests)

**Step 3: 커밋**

```bash
git add apps/mcp-server/src/tui/eventbus-ui.integration.spec.tsx
git commit -m "test(tui): add agent deactivation integration tests

Issue #348: Agent 비활성화 → Idle 전환 (completed/error reason) 검증"
```

---

### Task 3: Mode 변경 → Header 업데이트

**Files:**
- Modify: `apps/mcp-server/src/tui/eventbus-ui.integration.spec.tsx`

**Step 1: 세 번째 describe 블록 작성**

```tsx
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
      // Should NOT still show ACT as current mode
      // (ACT may appear in other contexts, but the mode indicator should be EVAL)
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
```

**Step 2: 테스트 실행**

Run: `cd apps/mcp-server && npx vitest run src/tui/eventbus-ui.integration.spec.tsx`
Expected: PASS (8 tests)

**Step 3: 커밋**

```bash
git add apps/mcp-server/src/tui/eventbus-ui.integration.spec.tsx
git commit -m "test(tui): add mode change integration tests

Issue #348: Mode 변경 → Header 업데이트 검증 (연속 변경 포함)"
```

---

### Task 4: Parallel 시작/완료 → AgentTree 업데이트

**Files:**
- Modify: `apps/mcp-server/src/tui/eventbus-ui.integration.spec.tsx`

**Step 1: 네 번째 describe 블록 작성**

**Note:** `PARALLEL_STARTED`/`PARALLEL_COMPLETED` 이벤트는 현재 reducer에서 no-op. 실제 UI 변화는 개별 `AGENT_ACTIVATED`/`AGENT_DEACTIVATED`로 발생. 테스트에서는 PARALLEL 이벤트 + 개별 에이전트 이벤트 조합으로 전체 parallel 실행 플로우를 검증한다.

```tsx
  describe('Parallel 시작/완료 → AgentTree 업데이트', () => {
    it('should show specialists in AgentTree after PARALLEL_STARTED + individual activations', async () => {
      const eventBus = new TuiEventBus();
      const { lastFrame } = render(<App eventBus={eventBus} />);

      // Primary agent first
      eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
        agentId: 'p1',
        name: 'solution-architect',
        role: 'primary',
        isPrimary: true,
      });

      // Parallel execution starts
      eventBus.emit(TUI_EVENTS.PARALLEL_STARTED, {
        specialists: ['security-specialist', 'test-strategy-specialist'],
        mode: 'PLAN',
      });

      // Individual specialists activate
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

      // Setup: primary + 2 specialists active
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

      // Deactivate specialists one by one
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

      // Only primary agent should remain active
      expect(lastFrame()).toContain('1 active');
    });

    it('should handle full parallel lifecycle: start → activate → deactivate → complete', async () => {
      const eventBus = new TuiEventBus();
      const { lastFrame } = render(<App eventBus={eventBus} />);

      // Phase 1: Mode set
      eventBus.emit(TUI_EVENTS.MODE_CHANGED, { from: null, to: 'PLAN' });
      await tick();
      expect(lastFrame()).toContain('PLAN');

      // Phase 2: Primary agent
      eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
        agentId: 'p1',
        name: 'solution-architect',
        role: 'primary',
        isPrimary: true,
      });
      await tick();
      expect(lastFrame()).toContain('1 active');

      // Phase 3: Parallel start + agents
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

      // Phase 4: Specialists complete
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
```

**Step 2: 테스트 실행**

Run: `cd apps/mcp-server && npx vitest run src/tui/eventbus-ui.integration.spec.tsx`
Expected: PASS (11 tests)

**Step 3: 커밋**

```bash
git add apps/mcp-server/src/tui/eventbus-ui.integration.spec.tsx
git commit -m "test(tui): add parallel execution integration tests

Issue #348: Parallel 시작/완료 → AgentTree 업데이트 검증
PARALLEL_STARTED/COMPLETED + 개별 AGENT 이벤트 조합 플로우"
```

---

### Task 5: Skill 추천 → StatusBar 업데이트

**Files:**
- Modify: `apps/mcp-server/src/tui/eventbus-ui.integration.spec.tsx`

**Step 1: 다섯 번째 describe 블록 작성**

```tsx
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

      // Simultaneous events
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
```

**Step 2: 테스트 실행**

Run: `cd apps/mcp-server && npx vitest run src/tui/eventbus-ui.integration.spec.tsx`
Expected: PASS (13 tests)

**Step 3: 커밋**

```bash
git add apps/mcp-server/src/tui/eventbus-ui.integration.spec.tsx
git commit -m "test(tui): add skill recommendation integration tests

Issue #348: Skill 추천 → StatusBar 업데이트 검증 (다중 스킬, 동시 이벤트)"
```

---

### Task 6: 이벤트 버퍼링 테스트 (TUI 시작 전 이벤트)

**Files:**
- Modify: `apps/mcp-server/src/tui/eventbus-ui.integration.spec.tsx`

**Step 1: 여섯 번째 describe 블록 작성**

**Note:** `useEventBus` hook은 App 마운트 시 `useEffect`에서 리스너를 등록한다. 마운트 전 emit된 이벤트는 리스너가 없으므로 유실된다. 이 테스트는 그 동작을 문서화하고, `AGENTS_LOADED` 같은 초기화 이벤트를 재발행하여 상태를 동기화하는 패턴을 검증한다.

```tsx
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
```

**Step 2: 테스트 실행**

Run: `cd apps/mcp-server && npx vitest run src/tui/eventbus-ui.integration.spec.tsx`
Expected: PASS (16 tests)

**Step 3: 커밋**

```bash
git add apps/mcp-server/src/tui/eventbus-ui.integration.spec.tsx
git commit -m "test(tui): add event buffering integration tests

Issue #348: TUI 시작 전 이벤트 유실 동작 문서화 및
재발행을 통한 상태 동기화 패턴 검증"
```

---

### Task 7: 복합 시나리오 통합 테스트

**Files:**
- Modify: `apps/mcp-server/src/tui/eventbus-ui.integration.spec.tsx`

**Step 1: 일곱 번째 describe 블록 작성**

```tsx
  describe('복합 시나리오 통합 테스트', () => {
    it('should handle real workflow: mode → agents → parallel → skills → completion', async () => {
      const eventBus = new TuiEventBus();
      const { lastFrame } = render(<App eventBus={eventBus} />);

      // 1. Load agent metadata
      const agents: AgentMetadata[] = [
        { id: 'security-specialist', name: 'security-specialist', description: 'Security', category: 'Security', icon: '🔒', expertise: ['security'] },
        { id: 'test-strategy-specialist', name: 'test-strategy-specialist', description: 'Testing', category: 'Testing', icon: '🧪', expertise: ['testing'] },
        { id: 'architecture-specialist', name: 'architecture-specialist', description: 'Architecture', category: 'Architecture', icon: '🏛️', expertise: ['architecture'] },
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
      eventBus.emit(TUI_EVENTS.AGENT_DEACTIVATED, { agentId: 'sec-1', reason: 'completed', durationMs: 600 });
      eventBus.emit(TUI_EVENTS.AGENT_DEACTIVATED, { agentId: 'test-1', reason: 'completed', durationMs: 800 });
      eventBus.emit(TUI_EVENTS.PARALLEL_COMPLETED, {
        specialists: ['security-specialist', 'test-strategy-specialist'],
        results: { 'security-specialist': 'ok', 'test-strategy-specialist': 'ok' },
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
```

**Step 2: 테스트 실행**

Run: `cd apps/mcp-server && npx vitest run src/tui/eventbus-ui.integration.spec.tsx`
Expected: PASS (18 tests)

**Step 3: 커밋**

```bash
git add apps/mcp-server/src/tui/eventbus-ui.integration.spec.tsx
git commit -m "test(tui): add complex scenario integration tests

Issue #348: 실제 워크플로우 및 에러 복구 시나리오 통합 검증"
```

---

### Task 8: 전체 테스트 suite 실행 및 최종 검증

**Step 1: 전체 TUI 테스트 실행**

Run: `cd apps/mcp-server && npx vitest run src/tui/`
Expected: 모든 기존 테스트 + 새 통합 테스트 18개 PASS

**Step 2: 커버리지 확인 (optional)**

Run: `cd apps/mcp-server && npx vitest run src/tui/ --coverage`
Expected: 기존 커버리지 유지 또는 향상

**Step 3: 최종 커밋 (필요 시)**

변경 없으면 skip. 있으면:
```bash
git add -A
git commit -m "test(tui): finalize EventBus-UI integration test suite

Issue #348: 전체 7개 체크리스트 통합 테스트 완료"
```
