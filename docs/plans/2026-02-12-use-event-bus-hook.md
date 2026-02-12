# [Phase 2] useEventBus React Hook 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** React 컴포넌트가 EventBus를 구독하여 Agent 상태, 워크플로우 모드, 스킬 추천을 실시간으로 추적하는 커스텀 Hook 구현

**Architecture:** `useEventBus`는 `TuiEventBus` 인스턴스를 props로 받아 6개 이벤트를 구독하고, `useReducer`로 상태를 관리합니다. `useAgentState`는 agent 배열을 받아 active/idle 필터링과 primary agent 추적을 수행하는 파생 상태 Hook입니다. 모든 구독은 `useEffect` cleanup으로 메모리 누수를 방지합니다.

**Tech Stack:** React, Ink, TypeScript, vitest, ink-testing-library

**Issue:** https://github.com/JeremyDev87/codingbuddy/issues/337

---

## 설계 결정 사항

### Hook 디렉토리 구조

```
apps/mcp-server/src/tui/
├── hooks/
│   ├── index.ts                  # Public exports
│   ├── use-event-bus.ts          # EventBus 구독 Hook
│   ├── use-event-bus.spec.tsx    # useEventBus 테스트
│   ├── use-agent-state.ts        # Agent 상태 파생 Hook
│   └── use-agent-state.spec.tsx  # useAgentState 테스트
```

### 왜 useReducer인가?

`useEventBus`는 6개의 서로 다른 이벤트에서 상태를 업데이트해야 합니다. `useState`를 여러 개 사용하면 이벤트 핸들러마다 별도의 setter를 참조해야 하고, 상태 간 일관성이 깨질 수 있습니다. `useReducer`는:
- 단일 dispatch로 모든 이벤트를 처리
- reducer가 순수함수이므로 별도 테스트 가능
- 핸들러에서 `dispatch`만 참조하므로 의존성 안정적

### Agent 상태 관리 전략

`agent:activated` → `AgentState`를 `Map`에 추가 (status: 'running')
`agent:deactivated` → 해당 agent의 status를 'completed' 또는 'failed'로 변경
`parallel:started` → 병렬 그룹 시작 기록
`parallel:completed` → 병렬 그룹 완료 기록

### useAgentState 순수 파생 설계

`useAgentState`는 `useMemo`로 구현하여 agents 배열이 변경될 때만 재계산합니다. 이벤트 구독 없이 순수 계산만 수행하여 관심사 분리를 달성합니다.

### Hook API (이슈 스펙 반영)

```typescript
// useEventBus - EventBus 구독 및 전체 상태 관리
const { agents, mode, skills } = useEventBus(eventBus);

// useAgentState - Agent 배열에서 파생 상태 계산
const { activeAgents, idleAgents, primaryAgent } = useAgentState(agents);
```

### EventBusState 타입

```typescript
interface EventBusState {
  agents: AgentState[];
  mode: Mode | null;
  skills: SkillRecommendedEvent[];
}
```

---

## Task 1: useEventBus reducer 순수함수 구현

**Files:**
- Create: `apps/mcp-server/src/tui/hooks/use-event-bus.ts`
- Create: `apps/mcp-server/src/tui/hooks/use-event-bus.spec.tsx`

### Step 1: 실패하는 테스트 작성

`use-event-bus.spec.tsx`에 reducer 순수함수 테스트를 작성합니다. reducer는 export하여 Hook과 별도로 테스트합니다.

```typescript
import { describe, it, expect } from 'vitest';
import {
  eventBusReducer,
  initialState,
  type EventBusState,
  type EventBusAction,
} from './use-event-bus';
import type { AgentActivatedEvent, AgentDeactivatedEvent, ModeChangedEvent, SkillRecommendedEvent } from '../events';

describe('eventBusReducer', () => {
  describe('AGENT_ACTIVATED', () => {
    it('should add agent with running status', () => {
      const action: EventBusAction = {
        type: 'AGENT_ACTIVATED',
        payload: { agentId: 'a1', name: 'security', role: 'specialist', isPrimary: true },
      };
      const state = eventBusReducer(initialState, action);
      expect(state.agents).toHaveLength(1);
      expect(state.agents[0]).toEqual({
        id: 'a1', name: 'security', role: 'specialist',
        status: 'running', progress: 0, isPrimary: true,
      });
    });

    it('should update existing agent to running on re-activation', () => {
      const prev: EventBusState = {
        ...initialState,
        agents: [{ id: 'a1', name: 'security', role: 'specialist', status: 'completed', progress: 100, isPrimary: false }],
      };
      const action: EventBusAction = {
        type: 'AGENT_ACTIVATED',
        payload: { agentId: 'a1', name: 'security', role: 'specialist', isPrimary: true },
      };
      const state = eventBusReducer(prev, action);
      expect(state.agents).toHaveLength(1);
      expect(state.agents[0].status).toBe('running');
      expect(state.agents[0].isPrimary).toBe(true);
    });
  });

  describe('AGENT_DEACTIVATED', () => {
    it('should set agent status to completed', () => {
      const prev: EventBusState = {
        ...initialState,
        agents: [{ id: 'a1', name: 'security', role: 'specialist', status: 'running', progress: 0, isPrimary: true }],
      };
      const action: EventBusAction = {
        type: 'AGENT_DEACTIVATED',
        payload: { agentId: 'a1', reason: 'completed', durationMs: 500 },
      };
      const state = eventBusReducer(prev, action);
      expect(state.agents[0].status).toBe('completed');
    });

    it('should set agent status to failed on error reason', () => {
      const prev: EventBusState = {
        ...initialState,
        agents: [{ id: 'a1', name: 'security', role: 'specialist', status: 'running', progress: 0, isPrimary: true }],
      };
      const action: EventBusAction = {
        type: 'AGENT_DEACTIVATED',
        payload: { agentId: 'a1', reason: 'error', durationMs: 100 },
      };
      const state = eventBusReducer(prev, action);
      expect(state.agents[0].status).toBe('failed');
    });

    it('should not mutate state for unknown agent', () => {
      const action: EventBusAction = {
        type: 'AGENT_DEACTIVATED',
        payload: { agentId: 'unknown', reason: 'completed', durationMs: 0 },
      };
      const state = eventBusReducer(initialState, action);
      expect(state).toBe(initialState);
    });
  });

  describe('MODE_CHANGED', () => {
    it('should update mode', () => {
      const action: EventBusAction = {
        type: 'MODE_CHANGED',
        payload: { from: null, to: 'PLAN' },
      };
      const state = eventBusReducer(initialState, action);
      expect(state.mode).toBe('PLAN');
    });
  });

  describe('SKILL_RECOMMENDED', () => {
    it('should append skill to list', () => {
      const action: EventBusAction = {
        type: 'SKILL_RECOMMENDED',
        payload: { skillName: 'brainstorming', reason: 'creative task' },
      };
      const state = eventBusReducer(initialState, action);
      expect(state.skills).toHaveLength(1);
      expect(state.skills[0]).toEqual({ skillName: 'brainstorming', reason: 'creative task' });
    });
  });
});
```

### Step 2: 테스트 실패 확인

Run: `cd apps/mcp-server && yarn vitest run src/tui/hooks/use-event-bus.spec.tsx`
Expected: FAIL - `use-event-bus.ts` 모듈이 존재하지 않음

### Step 3: 최소 구현 - reducer 및 타입

`use-event-bus.ts`에 reducer 순수함수를 구현합니다:

```typescript
import { useEffect, useReducer } from 'react';
import type { TuiEventBus } from '../events';
import {
  TUI_EVENTS,
  type AgentActivatedEvent,
  type AgentDeactivatedEvent,
  type ModeChangedEvent,
  type SkillRecommendedEvent,
  type ParallelStartedEvent,
  type ParallelCompletedEvent,
} from '../events';
import type { AgentState, Mode } from '../types';

export interface EventBusState {
  agents: AgentState[];
  mode: Mode | null;
  skills: SkillRecommendedEvent[];
}

export type EventBusAction =
  | { type: 'AGENT_ACTIVATED'; payload: AgentActivatedEvent }
  | { type: 'AGENT_DEACTIVATED'; payload: AgentDeactivatedEvent }
  | { type: 'MODE_CHANGED'; payload: ModeChangedEvent }
  | { type: 'SKILL_RECOMMENDED'; payload: SkillRecommendedEvent }
  | { type: 'PARALLEL_STARTED'; payload: ParallelStartedEvent }
  | { type: 'PARALLEL_COMPLETED'; payload: ParallelCompletedEvent };

export const initialState: EventBusState = {
  agents: [],
  mode: null,
  skills: [],
};

export function eventBusReducer(
  state: EventBusState,
  action: EventBusAction,
): EventBusState {
  switch (action.type) {
    case 'AGENT_ACTIVATED': {
      const { agentId, name, role, isPrimary } = action.payload;
      const existing = state.agents.findIndex((a) => a.id === agentId);
      const agent: AgentState = {
        id: agentId, name, role,
        status: 'running', progress: 0, isPrimary,
      };
      if (existing >= 0) {
        const next = [...state.agents];
        next[existing] = agent;
        return { ...state, agents: next };
      }
      return { ...state, agents: [...state.agents, agent] };
    }
    case 'AGENT_DEACTIVATED': {
      const idx = state.agents.findIndex((a) => a.id === action.payload.agentId);
      if (idx < 0) return state;
      const next = [...state.agents];
      next[idx] = {
        ...next[idx],
        status: action.payload.reason === 'error' ? 'failed' : 'completed',
      };
      return { ...state, agents: next };
    }
    case 'MODE_CHANGED':
      return { ...state, mode: action.payload.to };
    case 'SKILL_RECOMMENDED':
      return { ...state, skills: [...state.skills, action.payload] };
    case 'PARALLEL_STARTED':
    case 'PARALLEL_COMPLETED':
      return state;
    default:
      return state;
  }
}
```

### Step 4: 테스트 통과 확인

Run: `cd apps/mcp-server && yarn vitest run src/tui/hooks/use-event-bus.spec.tsx`
Expected: PASS

### Step 5: 커밋

```bash
git add apps/mcp-server/src/tui/hooks/use-event-bus.ts apps/mcp-server/src/tui/hooks/use-event-bus.spec.tsx
git commit -m "feat(tui): add eventBusReducer pure function for useEventBus hook (#337)"
```

---

## Task 2: useEventBus Hook - EventBus 구독/해제

**Files:**
- Modify: `apps/mcp-server/src/tui/hooks/use-event-bus.ts`
- Modify: `apps/mcp-server/src/tui/hooks/use-event-bus.spec.tsx`

### Step 1: 실패하는 테스트 작성

`renderHook`으로 useEventBus Hook을 테스트합니다. `TuiEventBus` 인스턴스를 직접 생성(NestJS DI 없이)하여 이벤트를 emit하고 상태 변화를 검증합니다.

```typescript
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';
import { Text } from 'ink';
import { TuiEventBus, TUI_EVENTS } from '../events';
import { useEventBus } from './use-event-bus';

// ink-testing-library에 renderHook이 없으므로 테스트 컴포넌트를 사용
function TestComponent({ eventBus }: { eventBus: TuiEventBus }) {
  const { agents, mode, skills } = useEventBus(eventBus);
  return (
    <Text>
      {JSON.stringify({ agentCount: agents.length, mode, skillCount: skills.length })}
    </Text>
  );
}

describe('useEventBus', () => {
  let eventBus: TuiEventBus;

  beforeEach(() => {
    eventBus = new TuiEventBus();
  });

  it('should return initial state', () => {
    const { lastFrame } = render(<TestComponent eventBus={eventBus} />);
    expect(lastFrame()).toContain('"agentCount":0');
    expect(lastFrame()).toContain('"mode":null');
    expect(lastFrame()).toContain('"skillCount":0');
  });

  it('should update agents on AGENT_ACTIVATED event', async () => {
    const { lastFrame } = render(<TestComponent eventBus={eventBus} />);
    await act(() => {
      eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
        agentId: 'a1', name: 'security', role: 'specialist', isPrimary: true,
      });
    });
    expect(lastFrame()).toContain('"agentCount":1');
  });

  it('should update mode on MODE_CHANGED event', async () => {
    const { lastFrame } = render(<TestComponent eventBus={eventBus} />);
    await act(() => {
      eventBus.emit(TUI_EVENTS.MODE_CHANGED, { from: null, to: 'PLAN' });
    });
    expect(lastFrame()).toContain('"mode":"PLAN"');
  });

  it('should cleanup listeners on unmount', () => {
    const { unmount } = render(<TestComponent eventBus={eventBus} />);
    expect(eventBus.listenerCount(TUI_EVENTS.AGENT_ACTIVATED)).toBeGreaterThan(0);
    unmount();
    expect(eventBus.listenerCount(TUI_EVENTS.AGENT_ACTIVATED)).toBe(0);
  });
});
```

> **참고**: `act`는 Ink의 테스트 유틸리티에서 상태 업데이트를 동기화하는 데 사용합니다. ink-testing-library에서 `act`를 제공하지 않으면 React `act`를 직접 사용하거나 `await new Promise(setImmediate)` 패턴을 적용합니다. 실제 구현 시 Ink 환경에 맞는 방법을 선택하세요.

### Step 2: 테스트 실패 확인

Run: `cd apps/mcp-server && yarn vitest run src/tui/hooks/use-event-bus.spec.tsx`
Expected: FAIL - `useEventBus`가 export되지 않음

### Step 3: useEventBus Hook 구현

`use-event-bus.ts`에 Hook 함수를 추가합니다:

```typescript
export function useEventBus(eventBus: TuiEventBus): EventBusState {
  const [state, dispatch] = useReducer(eventBusReducer, initialState);

  useEffect(() => {
    const onActivated = (p: AgentActivatedEvent) =>
      dispatch({ type: 'AGENT_ACTIVATED', payload: p });
    const onDeactivated = (p: AgentDeactivatedEvent) =>
      dispatch({ type: 'AGENT_DEACTIVATED', payload: p });
    const onModeChanged = (p: ModeChangedEvent) =>
      dispatch({ type: 'MODE_CHANGED', payload: p });
    const onSkill = (p: SkillRecommendedEvent) =>
      dispatch({ type: 'SKILL_RECOMMENDED', payload: p });
    const onParallelStarted = (p: ParallelStartedEvent) =>
      dispatch({ type: 'PARALLEL_STARTED', payload: p });
    const onParallelCompleted = (p: ParallelCompletedEvent) =>
      dispatch({ type: 'PARALLEL_COMPLETED', payload: p });

    eventBus.on(TUI_EVENTS.AGENT_ACTIVATED, onActivated);
    eventBus.on(TUI_EVENTS.AGENT_DEACTIVATED, onDeactivated);
    eventBus.on(TUI_EVENTS.MODE_CHANGED, onModeChanged);
    eventBus.on(TUI_EVENTS.SKILL_RECOMMENDED, onSkill);
    eventBus.on(TUI_EVENTS.PARALLEL_STARTED, onParallelStarted);
    eventBus.on(TUI_EVENTS.PARALLEL_COMPLETED, onParallelCompleted);

    return () => {
      eventBus.off(TUI_EVENTS.AGENT_ACTIVATED, onActivated);
      eventBus.off(TUI_EVENTS.AGENT_DEACTIVATED, onDeactivated);
      eventBus.off(TUI_EVENTS.MODE_CHANGED, onModeChanged);
      eventBus.off(TUI_EVENTS.SKILL_RECOMMENDED, onSkill);
      eventBus.off(TUI_EVENTS.PARALLEL_STARTED, onParallelStarted);
      eventBus.off(TUI_EVENTS.PARALLEL_COMPLETED, onParallelCompleted);
    };
  }, [eventBus]);

  return state;
}
```

### Step 4: 테스트 통과 확인

Run: `cd apps/mcp-server && yarn vitest run src/tui/hooks/use-event-bus.spec.tsx`
Expected: PASS

### Step 5: 커밋

```bash
git add apps/mcp-server/src/tui/hooks/use-event-bus.ts apps/mcp-server/src/tui/hooks/use-event-bus.spec.tsx
git commit -m "feat(tui): implement useEventBus hook with EventBus subscription (#337)"
```

---

## Task 3: useAgentState 파생 상태 Hook 구현

**Files:**
- Create: `apps/mcp-server/src/tui/hooks/use-agent-state.ts`
- Create: `apps/mcp-server/src/tui/hooks/use-agent-state.spec.tsx`

### Step 1: 실패하는 테스트 작성

`useAgentState`는 순수 파생 Hook이므로 `useMemo` 기반으로 테스트합니다.

```typescript
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { Text } from 'ink';
import { useAgentState } from './use-agent-state';
import type { AgentState } from '../types';

function TestComponent({ agents }: { agents: AgentState[] }) {
  const { activeAgents, idleAgents, primaryAgent } = useAgentState(agents);
  return (
    <Text>
      {JSON.stringify({
        active: activeAgents.length,
        idle: idleAgents.length,
        primary: primaryAgent?.name ?? null,
      })}
    </Text>
  );
}

describe('useAgentState', () => {
  it('should return empty arrays when no agents', () => {
    const { lastFrame } = render(<TestComponent agents={[]} />);
    expect(lastFrame()).toContain('"active":0');
    expect(lastFrame()).toContain('"idle":0');
    expect(lastFrame()).toContain('"primary":null');
  });

  it('should separate active and idle agents', () => {
    const agents: AgentState[] = [
      { id: 'a1', name: 'security', role: 'specialist', status: 'running', progress: 0, isPrimary: false },
      { id: 'a2', name: 'perf', role: 'specialist', status: 'completed', progress: 100, isPrimary: false },
      { id: 'a3', name: 'quality', role: 'specialist', status: 'idle', progress: 0, isPrimary: false },
    ];
    const { lastFrame } = render(<TestComponent agents={agents} />);
    expect(lastFrame()).toContain('"active":1');
    expect(lastFrame()).toContain('"idle":2');
  });

  it('should track primary agent', () => {
    const agents: AgentState[] = [
      { id: 'a1', name: 'security', role: 'specialist', status: 'running', progress: 0, isPrimary: true },
      { id: 'a2', name: 'perf', role: 'specialist', status: 'running', progress: 0, isPrimary: false },
    ];
    const { lastFrame } = render(<TestComponent agents={agents} />);
    expect(lastFrame()).toContain('"primary":"security"');
  });

  it('should return null primary when no primary agent is running', () => {
    const agents: AgentState[] = [
      { id: 'a1', name: 'security', role: 'specialist', status: 'completed', progress: 100, isPrimary: true },
    ];
    const { lastFrame } = render(<TestComponent agents={agents} />);
    expect(lastFrame()).toContain('"primary":null');
  });

  it('should count failed agents as idle', () => {
    const agents: AgentState[] = [
      { id: 'a1', name: 'security', role: 'specialist', status: 'failed', progress: 0, isPrimary: false },
    ];
    const { lastFrame } = render(<TestComponent agents={agents} />);
    expect(lastFrame()).toContain('"active":0');
    expect(lastFrame()).toContain('"idle":1');
  });
});
```

### Step 2: 테스트 실패 확인

Run: `cd apps/mcp-server && yarn vitest run src/tui/hooks/use-agent-state.spec.tsx`
Expected: FAIL - `use-agent-state.ts` 모듈 없음

### Step 3: useAgentState Hook 구현

```typescript
import { useMemo } from 'react';
import type { AgentState } from '../types';

export interface AgentStateView {
  activeAgents: AgentState[];
  idleAgents: AgentState[];
  primaryAgent: AgentState | null;
}

export function useAgentState(agents: AgentState[]): AgentStateView {
  return useMemo(() => {
    const activeAgents = agents.filter((a) => a.status === 'running');
    const idleAgents = agents.filter((a) => a.status !== 'running');
    const primaryAgent = activeAgents.find((a) => a.isPrimary) ?? null;
    return { activeAgents, idleAgents, primaryAgent };
  }, [agents]);
}
```

### Step 4: 테스트 통과 확인

Run: `cd apps/mcp-server && yarn vitest run src/tui/hooks/use-agent-state.spec.tsx`
Expected: PASS

### Step 5: 커밋

```bash
git add apps/mcp-server/src/tui/hooks/use-agent-state.ts apps/mcp-server/src/tui/hooks/use-agent-state.spec.tsx
git commit -m "feat(tui): implement useAgentState derived state hook (#337)"
```

---

## Task 4: hooks/index.ts barrel export 생성

**Files:**
- Create: `apps/mcp-server/src/tui/hooks/index.ts`

### Step 1: index.ts 작성

```typescript
export { useEventBus, eventBusReducer, initialState } from './use-event-bus';
export type { EventBusState, EventBusAction } from './use-event-bus';
export { useAgentState } from './use-agent-state';
export type { AgentStateView } from './use-agent-state';
```

### Step 2: 빌드 확인

Run: `cd apps/mcp-server && yarn build`
Expected: 컴파일 성공

### Step 3: 커밋

```bash
git add apps/mcp-server/src/tui/hooks/index.ts
git commit -m "feat(tui): add hooks barrel export (#337)"
```

---

## Task 5: App 컴포넌트에 Hook 통합

**Files:**
- Modify: `apps/mcp-server/src/tui/app.tsx`
- Modify: `apps/mcp-server/src/tui/app.spec.tsx`

### Step 1: 실패하는 테스트 작성

`app.spec.tsx`에 Hook 통합 테스트를 추가합니다:

```typescript
it('should display mode when eventBus emits MODE_CHANGED', async () => {
  const eventBus = new TuiEventBus();
  const { lastFrame } = render(<App eventBus={eventBus} />);
  await act(() => {
    eventBus.emit(TUI_EVENTS.MODE_CHANGED, { from: null, to: 'PLAN' });
  });
  expect(lastFrame()).toContain('PLAN');
});

it('should display active agent count when agents are activated', async () => {
  const eventBus = new TuiEventBus();
  const { lastFrame } = render(<App eventBus={eventBus} />);
  await act(() => {
    eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
      agentId: 'a1', name: 'security', role: 'specialist', isPrimary: true,
    });
  });
  expect(lastFrame()).toContain('security');
});
```

### Step 2: 테스트 실패 확인

Run: `cd apps/mcp-server && yarn vitest run src/tui/app.spec.tsx`
Expected: FAIL - 모드 텍스트가 렌더링되지 않음

### Step 3: App 컴포넌트 업데이트

`app.tsx`를 Hook을 사용하도록 수정합니다:

```tsx
import React from 'react';
import { Text, Box } from 'ink';
import type { TuiEventBus } from './events';
import { useEventBus } from './hooks';
import { useAgentState } from './hooks';

export interface AppProps {
  eventBus?: TuiEventBus;
}

export function App({ eventBus }: AppProps): React.ReactElement {
  if (!eventBus) {
    return (
      <Box flexDirection="column">
        <Text bold>Codingbuddy TUI Agent Monitor</Text>
      </Box>
    );
  }

  const { agents, mode, skills } = useEventBus(eventBus);
  const { activeAgents, primaryAgent } = useAgentState(agents);

  return (
    <Box flexDirection="column">
      <Text bold>Codingbuddy TUI Agent Monitor</Text>
      {mode && <Text>Mode: {mode}</Text>}
      {primaryAgent && <Text>Primary: {primaryAgent.name}</Text>}
      {activeAgents.length > 0 && (
        <Text>Active: {activeAgents.map((a) => a.name).join(', ')}</Text>
      )}
    </Box>
  );
}
```

> **참고**: `eventBus`가 없는 경우는 early return으로 처리하여 Hook 호출 순서를 보장합니다. 또는 Hook 내부에서 eventBus가 undefined일 때 no-op으로 처리하는 방법도 있습니다. 실제 구현 시 Hooks rules of React(조건부 Hook 호출 불가)를 준수하도록 설계하세요.

### Step 4: 테스트 통과 확인

Run: `cd apps/mcp-server && yarn vitest run src/tui/app.spec.tsx`
Expected: PASS

### Step 5: 전체 TUI 테스트 통과 확인

Run: `cd apps/mcp-server && yarn vitest run src/tui/`
Expected: 모든 테스트 PASS

### Step 6: 커밋

```bash
git add apps/mcp-server/src/tui/app.tsx apps/mcp-server/src/tui/app.spec.tsx
git commit -m "feat(tui): integrate useEventBus and useAgentState hooks into App (#337)"
```

---

## Task 6: tui/index.tsx에서 hooks re-export

**Files:**
- Modify: `apps/mcp-server/src/tui/index.tsx`

### Step 1: re-export 추가

기존 export에 hooks를 추가합니다:

```typescript
// 기존 exports 유지
export { App } from './app';
export type { AppProps } from './app';
export * from './types';
// hooks 추가
export { useEventBus, useAgentState } from './hooks';
export type { EventBusState, AgentStateView } from './hooks';
```

### Step 2: 빌드 확인

Run: `cd apps/mcp-server && yarn build`
Expected: 컴파일 성공

### Step 3: 전체 테스트 통과 확인

Run: `cd apps/mcp-server && yarn vitest run`
Expected: 모든 테스트 PASS

### Step 4: 커밋

```bash
git add apps/mcp-server/src/tui/index.tsx
git commit -m "feat(tui): re-export hooks from tui barrel (#337)"
```

---

## 주의사항

### React Hooks Rules of React 준수
- `useEventBus`와 `useAgentState`는 컴포넌트 최상위에서만 호출
- 조건부 Hook 호출 불가 → `eventBus`가 optional인 경우 컴포넌트를 분리하거나 Hook 내부에서 no-op 처리

### 메모리 누수 방지
- `useEffect` cleanup에서 반드시 6개 이벤트 리스너 모두 해제
- `off` 호출 시 동일한 함수 참조를 사용해야 하므로 핸들러를 `useEffect` 내부에 선언

### Ink 테스트 환경
- `ink-testing-library`의 `render`를 사용하되, 비동기 상태 업데이트는 `act` 또는 `await` 패턴 필요
- Ink은 React 18 concurrent 기능을 제한적으로 지원하므로 실제 테스트 시 동기화 방법 확인 필요

### 타입 안전성
- `EventBusAction` discriminated union으로 reducer의 타입 안전성 보장
- `TuiEventMap`의 타입과 reducer action payload 타입이 일치하도록 유지
