# [TUI] Wire Up Objectives from parse_mode Response - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** `FocusedAgentPanel`에 항상 빈 배열로 전달되는 `objectives`를 `parse_mode` 응답의 `originalPrompt`에서 추출하여 실제 데이터로 연결한다.

**Architecture:** 기존 이벤트 기반 아키텍처(EventBus → Extractor → Reducer → React)를 그대로 따른다. 새 이벤트 `OBJECTIVE_SET`을 정의하고, `extractFromParseMode()`에서 추출, reducer에서 상태 반영, `DashboardApp`에서 `state.objectives`를 전달하는 흐름.

**Tech Stack:** TypeScript, Vitest, React (Ink)

**Issue:** https://github.com/JeremyDev87/codingbuddy/issues/473

---

## Task 1: 이벤트 타입 정의 (`ObjectiveSetEvent` + `TUI_EVENTS.OBJECTIVE_SET`)

**Files:**
- Modify: `apps/mcp-server/src/tui/events/types.ts`

### Step 1: `ObjectiveSetEvent` 인터페이스 추가

`types.ts` 파일에 새 이벤트 인터페이스를 추가한다:

```typescript
export interface ObjectiveSetEvent {
  objective: string;
}
```

### Step 2: `TUI_EVENTS`에 `OBJECTIVE_SET` 추가

```typescript
export const TUI_EVENTS = Object.freeze({
  // ... existing
  OBJECTIVE_SET: 'objective:set',
} as const);
```

### Step 3: `TuiEventMap`에 매핑 추가

```typescript
export interface TuiEventMap {
  // ... existing
  [TUI_EVENTS.OBJECTIVE_SET]: ObjectiveSetEvent;
}
```

### Step 4: 빌드 확인

Run: `yarn workspace codingbuddy exec tsc --noEmit --project tsconfig.json 2>&1 | head -20`
Expected: 타입 에러 없음 (또는 아직 사용하지 않는 타입이므로 기존 에러만)

### Step 5: Commit

```bash
git add apps/mcp-server/src/tui/events/types.ts
git commit -m "feat(tui): add ObjectiveSetEvent type and OBJECTIVE_SET to TUI_EVENTS"
```

---

## Task 2: Extractor 테스트 작성 (RED)

**Files:**
- Modify: `apps/mcp-server/src/tui/events/response-event-extractor.spec.ts`

### Step 1: `OBJECTIVE_SET` 추출 테스트 추가

`describe('parse_mode → ...')` 섹션 내에 새 describe 블록을 추가:

```typescript
describe('parse_mode → objective:set', () => {
  it('should extract OBJECTIVE_SET from parse_mode with originalPrompt', () => {
    const events = extractEventsFromResponse(
      makeResponse('parse_mode', {
        mode: 'PLAN',
        originalPrompt: 'implement auth feature',
        delegates_to: 'technical-planner',
      }),
    );
    const objectiveEvent = events.find(e => e.event === TUI_EVENTS.OBJECTIVE_SET);
    expect(objectiveEvent).toBeDefined();
    expect(objectiveEvent!.payload).toEqual({ objective: 'implement auth feature' });
  });

  it('should not extract OBJECTIVE_SET when originalPrompt is missing', () => {
    const events = extractEventsFromResponse(
      makeResponse('parse_mode', {
        mode: 'PLAN',
        delegates_to: 'technical-planner',
      }),
    );
    const objectiveEvent = events.find(e => e.event === TUI_EVENTS.OBJECTIVE_SET);
    expect(objectiveEvent).toBeUndefined();
  });

  it('should not extract OBJECTIVE_SET when originalPrompt is empty string', () => {
    const events = extractEventsFromResponse(
      makeResponse('parse_mode', {
        mode: 'PLAN',
        originalPrompt: '   ',
        delegates_to: 'technical-planner',
      }),
    );
    const objectiveEvent = events.find(e => e.event === TUI_EVENTS.OBJECTIVE_SET);
    expect(objectiveEvent).toBeUndefined();
  });
});
```

### Step 2: 테스트 실행하여 실패 확인

Run: `yarn workspace codingbuddy test -- --run response-event-extractor.spec.ts`
Expected: FAIL — `OBJECTIVE_SET`이 `TUI_EVENTS`에는 있지만 extractor가 아직 추출하지 않으므로 `objectiveEvent`가 `undefined`

---

## Task 3: Extractor 구현 (GREEN)

**Files:**
- Modify: `apps/mcp-server/src/tui/events/response-event-extractor.ts`

### Step 1: `ExtractedEvent` 유니온에 `OBJECTIVE_SET` 변형 추가

```typescript
export type ExtractedEvent =
  // ... existing variants
  | {
      event: typeof TUI_EVENTS.OBJECTIVE_SET;
      payload: ObjectiveSetEvent;
    };
```

import에 `ObjectiveSetEvent`도 추가.

### Step 2: `extractFromParseMode()`에 추출 로직 추가

`return events;` 직전에 추가:

```typescript
// objective:set
if (typeof json.originalPrompt === 'string' && json.originalPrompt.trim()) {
  events.push({
    event: TUI_EVENTS.OBJECTIVE_SET,
    payload: { objective: json.originalPrompt.trim() },
  });
}
```

### Step 3: 테스트 실행하여 통과 확인

Run: `yarn workspace codingbuddy test -- --run response-event-extractor.spec.ts`
Expected: PASS

### Step 4: Commit

```bash
git add apps/mcp-server/src/tui/events/response-event-extractor.ts apps/mcp-server/src/tui/events/response-event-extractor.spec.ts
git commit -m "feat(tui): extract OBJECTIVE_SET from parse_mode originalPrompt"
```

---

## Task 4: DashboardState에 `objectives` 필드 추가 + Reducer 테스트 작성 (RED)

**Files:**
- Modify: `apps/mcp-server/src/tui/dashboard-types.ts`
- Modify: `apps/mcp-server/src/tui/hooks/use-dashboard-state.ts`
- Modify: `apps/mcp-server/src/tui/hooks/use-dashboard-state.spec.ts`

### Step 1: `DashboardState`에 `objectives` 필드 추가

`apps/mcp-server/src/tui/dashboard-types.ts`:

```typescript
export interface DashboardState {
  // ... existing fields
  objectives: string[];
}
```

### Step 2: `createInitialDashboardState()`에 초기값 추가

`apps/mcp-server/src/tui/hooks/use-dashboard-state.ts`:

```typescript
export function createInitialDashboardState(): DashboardState {
  return {
    // ... existing
    objectives: [],
  };
}
```

### Step 3: Reducer 테스트 작성

`apps/mcp-server/src/tui/hooks/use-dashboard-state.spec.ts`에 추가:

```typescript
it('should set objectives on OBJECTIVE_SET', () => {
  let state = createInitialDashboardState();
  state = dashboardReducer(state, {
    type: 'OBJECTIVE_SET',
    payload: { objective: 'implement auth feature' },
  });
  expect(state.objectives).toEqual(['implement auth feature']);
});

it('should replace objectives on new OBJECTIVE_SET (not accumulate)', () => {
  let state = createInitialDashboardState();
  state = dashboardReducer(state, {
    type: 'OBJECTIVE_SET',
    payload: { objective: 'first task' },
  });
  state = dashboardReducer(state, {
    type: 'OBJECTIVE_SET',
    payload: { objective: 'second task' },
  });
  expect(state.objectives).toEqual(['second task']);
});
```

### Step 4: 테스트 실행하여 실패 확인

Run: `yarn workspace codingbuddy test -- --run use-dashboard-state.spec.ts`
Expected: FAIL — `DashboardAction`에 `OBJECTIVE_SET` 타입이 없어서 컴파일 에러 또는 exhaustive check 실패

---

## Task 5: Reducer 구현 (GREEN)

**Files:**
- Modify: `apps/mcp-server/src/tui/hooks/use-dashboard-state.ts`

### Step 1: `DashboardAction`에 `OBJECTIVE_SET` 추가

```typescript
export type DashboardAction =
  // ... existing
  | { type: 'OBJECTIVE_SET'; payload: ObjectiveSetEvent };
```

import에 `ObjectiveSetEvent`도 추가.

### Step 2: Reducer에 케이스 추가

`dashboardReducer`의 switch 문에 추가 (no-op 케이스들 위에):

```typescript
case 'OBJECTIVE_SET':
  return { ...state, objectives: [action.payload.objective] };
```

### Step 3: 테스트 실행하여 통과 확인

Run: `yarn workspace codingbuddy test -- --run use-dashboard-state.spec.ts`
Expected: PASS

### Step 4: Commit

```bash
git add apps/mcp-server/src/tui/dashboard-types.ts apps/mcp-server/src/tui/hooks/use-dashboard-state.ts apps/mcp-server/src/tui/hooks/use-dashboard-state.spec.ts
git commit -m "feat(tui): add objectives to DashboardState with OBJECTIVE_SET reducer"
```

---

## Task 6: EventBus 구독 추가 + DashboardApp 연결

**Files:**
- Modify: `apps/mcp-server/src/tui/hooks/use-dashboard-state.ts`
- Modify: `apps/mcp-server/src/tui/dashboard-app.tsx`

### Step 1: `useDashboardState`에 `OBJECTIVE_SET` 구독 추가

`apps/mcp-server/src/tui/hooks/use-dashboard-state.ts`의 `useDashboardState` 함수에 추가:

```typescript
const onObjectiveSet = (p: ObjectiveSetEvent) =>
  dispatch({ type: 'OBJECTIVE_SET', payload: p });

eventBus.on(TUI_EVENTS.OBJECTIVE_SET, onObjectiveSet);

// cleanup에도 추가:
eventBus.off(TUI_EVENTS.OBJECTIVE_SET, onObjectiveSet);
```

### Step 2: `DashboardApp`에서 `EMPTY_OBJECTIVES` 제거하고 `state.objectives` 사용

`apps/mcp-server/src/tui/dashboard-app.tsx`:

1. `const EMPTY_OBJECTIVES: string[] = [];` 상수 삭제
2. narrow 레이아웃과 wide 레이아웃 모두에서 `objectives={EMPTY_OBJECTIVES}` → `objectives={state.objectives}`로 변경

### Step 3: 전체 테스트 실행

Run: `yarn workspace codingbuddy test`
Expected: ALL PASS

### Step 4: 빌드 확인

Run: `yarn workspace codingbuddy exec tsc --noEmit --project tsconfig.json 2>&1 | head -20`
Expected: 타입 에러 없음

### Step 5: Commit

```bash
git add apps/mcp-server/src/tui/hooks/use-dashboard-state.ts apps/mcp-server/src/tui/dashboard-app.tsx
git commit -m "feat(tui): wire objectives from parse_mode to FocusedAgentPanel (#473)"
```

---

## Summary

| Task | 파일 | 내용 |
|------|------|------|
| 1 | `events/types.ts` | `ObjectiveSetEvent` + `TUI_EVENTS.OBJECTIVE_SET` + `TuiEventMap` |
| 2 | `response-event-extractor.spec.ts` | Extractor 테스트 3개 (RED) |
| 3 | `response-event-extractor.ts` | `ExtractedEvent` 확장 + `extractFromParseMode()` 로직 (GREEN) |
| 4 | `dashboard-types.ts`, `use-dashboard-state.ts/spec.ts` | State 타입 + 초기값 + Reducer 테스트 2개 (RED) |
| 5 | `use-dashboard-state.ts` | `DashboardAction` + Reducer 케이스 (GREEN) |
| 6 | `use-dashboard-state.ts`, `dashboard-app.tsx` | EventBus 구독 + `EMPTY_OBJECTIVES` 제거 |
