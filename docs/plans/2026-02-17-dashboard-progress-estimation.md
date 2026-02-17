# DashboardNode.progress 추정 로직 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** `TOOL_INVOKED` 이벤트 카운트 기반으로 에이전트 progress를 점진적으로 증가시키고, `AGENT_DEACTIVATED(completed)` 시 100%로 설정

**Architecture:** `dashboardReducer`의 `TOOL_INVOKED` case에 agentId 매칭 로직 추가, `AGENT_DEACTIVATED` case에 progress=100 설정. 타입 변경 불필요 (기존 인터페이스 활용).

**Tech Stack:** TypeScript, Vitest

**Issue:** [#472](https://github.com/JeremyDev87/codingbuddy/issues/472)

---

## 현재 상태 분석

| 항목 | 상태 |
|------|------|
| `DashboardNode.progress` 타입 | `number` (이미 존재) |
| `ToolInvokedEvent.agentId` 타입 | `string \| null` (이미 존재) |
| `AGENT_ACTIVATED` → progress | `0` 설정 (정상) |
| `TOOL_INVOKED` → progress | **업데이트 없음 (버그)** |
| `AGENT_DEACTIVATED` → progress | **업데이트 없음 (버그)** |

## Progress 추정 로직

- `TOOL_INVOKED` + 유효한 `agentId` → 해당 에이전트 progress += 5 (최대 95 cap)
- `AGENT_DEACTIVATED(reason=completed)` → progress = 100
- `AGENT_DEACTIVATED(reason=error)` → progress 유지 (현재값 그대로)
- `TOOL_INVOKED` + `agentId=null` → progress 변경 없음

---

### Task 1: TOOL_INVOKED progress 증가 테스트 작성

**Files:**
- Modify: `apps/mcp-server/src/tui/hooks/use-dashboard-state.spec.ts`

**Step 1: Failing test 작성 — TOOL_INVOKED로 progress 증가**

```typescript
it('should increment agent progress on TOOL_INVOKED with matching agentId', () => {
  let state = createInitialDashboardState();
  state = dashboardReducer(state, {
    type: 'AGENT_ACTIVATED',
    payload: { agentId: 'a1', name: 'test-agent', role: 'primary', isPrimary: true },
  });
  expect(state.agents.get('a1')?.progress).toBe(0);

  state = dashboardReducer(state, {
    type: 'TOOL_INVOKED',
    payload: { toolName: 'search_rules', agentId: 'a1', timestamp: Date.now() },
  });
  expect(state.agents.get('a1')?.progress).toBeGreaterThan(0);
});
```

**Step 2: 테스트 실패 확인**

Run: `yarn workspace codingbuddy test -- --run use-dashboard-state.spec.ts`
Expected: FAIL — progress는 여전히 0

---

### Task 2: AGENT_DEACTIVATED progress=100 테스트 작성

**Files:**
- Modify: `apps/mcp-server/src/tui/hooks/use-dashboard-state.spec.ts`

**Step 3: Failing test 작성 — AGENT_DEACTIVATED(completed)로 progress=100**

```typescript
it('should set progress to 100 on AGENT_DEACTIVATED with reason=completed', () => {
  let state = createInitialDashboardState();
  state = dashboardReducer(state, {
    type: 'AGENT_ACTIVATED',
    payload: { agentId: 'a1', name: 'test-agent', role: 'primary', isPrimary: true },
  });
  state = dashboardReducer(state, {
    type: 'AGENT_DEACTIVATED',
    payload: { agentId: 'a1', reason: 'completed', durationMs: 1000 },
  });
  expect(state.agents.get('a1')?.progress).toBe(100);
});
```

**Step 4: Failing test 작성 — progress 95 cap**

```typescript
it('should cap progress at 95 before completion', () => {
  let state = createInitialDashboardState();
  state = dashboardReducer(state, {
    type: 'AGENT_ACTIVATED',
    payload: { agentId: 'a1', name: 'test-agent', role: 'primary', isPrimary: true },
  });
  for (let i = 0; i < 20; i++) {
    state = dashboardReducer(state, {
      type: 'TOOL_INVOKED',
      payload: { toolName: `tool_${i}`, agentId: 'a1', timestamp: Date.now() },
    });
  }
  expect(state.agents.get('a1')?.progress).toBe(95);
});
```

**Step 5: Failing test 작성 — agentId가 null이면 progress 변경 없음**

```typescript
it('should not change progress for TOOL_INVOKED without agentId', () => {
  let state = createInitialDashboardState();
  state = dashboardReducer(state, {
    type: 'AGENT_ACTIVATED',
    payload: { agentId: 'a1', name: 'test-agent', role: 'primary', isPrimary: true },
  });
  state = dashboardReducer(state, {
    type: 'TOOL_INVOKED',
    payload: { toolName: 'search_rules', agentId: null, timestamp: Date.now() },
  });
  expect(state.agents.get('a1')?.progress).toBe(0);
});
```

**Step 6: Failing test 작성 — error 시 progress 유지**

```typescript
it('should keep current progress on AGENT_DEACTIVATED with reason=error', () => {
  let state = createInitialDashboardState();
  state = dashboardReducer(state, {
    type: 'AGENT_ACTIVATED',
    payload: { agentId: 'a1', name: 'test-agent', role: 'primary', isPrimary: true },
  });
  state = dashboardReducer(state, {
    type: 'TOOL_INVOKED',
    payload: { toolName: 'search_rules', agentId: 'a1', timestamp: Date.now() },
  });
  const progressBefore = state.agents.get('a1')?.progress;
  state = dashboardReducer(state, {
    type: 'AGENT_DEACTIVATED',
    payload: { agentId: 'a1', reason: 'error', durationMs: 500 },
  });
  expect(state.agents.get('a1')?.progress).toBe(progressBefore);
});
```

**Step 7: 모든 새 테스트 실패 확인**

Run: `yarn workspace codingbuddy test -- --run use-dashboard-state.spec.ts`
Expected: FAIL — 5개 신규 테스트 실패

---

### Task 3: TOOL_INVOKED reducer에 progress 증가 로직 구현

**Files:**
- Modify: `apps/mcp-server/src/tui/hooks/use-dashboard-state.ts:138-148` (`TOOL_INVOKED` case)

**Step 8: TOOL_INVOKED case 수정**

현재 코드:
```typescript
case 'TOOL_INVOKED': {
  const entry: EventLogEntry = { ... };
  const base = state.eventLog.length >= EVENT_LOG_MAX ? state.eventLog.slice(1) : state.eventLog;
  return { ...state, eventLog: [...base, entry] };
}
```

수정 후:
```typescript
case 'TOOL_INVOKED': {
  const entry: EventLogEntry = {
    timestamp: new Date(action.payload.timestamp).toTimeString().slice(0, 8),
    message: `${action.payload.toolName}${action.payload.agentId ? ` [${action.payload.agentId}]` : ''}`,
    level: 'info',
  };
  const base =
    state.eventLog.length >= EVENT_LOG_MAX ? state.eventLog.slice(1) : state.eventLog;

  const invokedAgentId = action.payload.agentId;
  let agents = state.agents;
  if (invokedAgentId) {
    const agent = state.agents.get(invokedAgentId);
    if (agent && agent.status === 'running') {
      agents = cloneAgents(state.agents);
      agents.set(invokedAgentId, {
        ...agent,
        progress: Math.min(95, agent.progress + 5),
      });
    }
  }

  return { ...state, agents, eventLog: [...base, entry] };
}
```

**Step 9: 관련 테스트 통과 확인**

Run: `yarn workspace codingbuddy test -- --run use-dashboard-state.spec.ts`
Expected: progress increment 관련 3개 테스트 PASS, AGENT_DEACTIVATED 관련 2개 FAIL

---

### Task 4: AGENT_DEACTIVATED reducer에 progress 설정 로직 구현

**Files:**
- Modify: `apps/mcp-server/src/tui/hooks/use-dashboard-state.ts:80-104` (`AGENT_DEACTIVATED` case)

**Step 10: AGENT_DEACTIVATED case 수정**

현재 코드:
```typescript
agents.set(agentId, {
  ...existing,
  status: reason === 'error' ? 'error' : 'done',
});
```

수정 후:
```typescript
agents.set(agentId, {
  ...existing,
  status: reason === 'error' ? 'error' : 'done',
  progress: reason === 'error' ? existing.progress : 100,
});
```

**Step 11: 모든 테스트 통과 확인**

Run: `yarn workspace codingbuddy test -- --run use-dashboard-state.spec.ts`
Expected: ALL PASS

---

### Task 5: 전체 테스트 스위트 확인 및 커밋

**Step 12: 전체 테스트 실행**

Run: `yarn workspace codingbuddy test`
Expected: ALL PASS

**Step 13: 커밋**

```bash
git add apps/mcp-server/src/tui/hooks/use-dashboard-state.ts apps/mcp-server/src/tui/hooks/use-dashboard-state.spec.ts
git commit -m "feat(tui): add progress estimation to DashboardNode via TOOL_INVOKED count (#472)"
```

---

## 변경 영향 범위

| 컴포넌트 | 변경 필요 | 이유 |
|----------|----------|------|
| `use-dashboard-state.ts` | **Yes** | reducer 로직 수정 |
| `use-dashboard-state.spec.ts` | **Yes** | 테스트 추가 |
| `dashboard-types.ts` | No | `DashboardNode.progress: number` 이미 존재 |
| `events/types.ts` | No | `ToolInvokedEvent.agentId` 이미 존재 |
| `flow-map.pure.ts` | No | `buildProgressBar()` 자동 반영 |
| `focused-agent.pure.ts` | No | `formatProgressBar()` 자동 반영 |
| `monitor-panel.pure.ts` | No | `renderAgentTimeline()` 자동 반영 |
