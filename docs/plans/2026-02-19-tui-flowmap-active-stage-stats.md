# TUI FlowMap: activeStage 배선 + 스테이지별 통계 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** FlowMap의 파이프라인 헤더에 activeStage를 실제로 연결하고 스테이지별 에이전트 통계를 표시한다.

**Architecture:** `dashboard-app.tsx`에서 누락된 `activeStage` prop을 `FlowMap`에 전달하고, `flow-map.pure.ts`의 `renderPipelineHeader` 함수를 확장해 에이전트 `Map`을 받아 스테이지별 running/done 수를 표시한다. 비활성 스테이지 컬럼의 에이전트 노드는 `dim: true`로 렌더링해 시각적 강조를 추가한다.

**Tech Stack:** TypeScript, React (ink), Vitest

**참고 이슈:** [#571](https://github.com/JeremyDev87/codingbuddy/issues/571)

---

## Task 1: `activeStage` prop 배선 수정 (1-line bug fix)

**Files:**
- Modify: `apps/mcp-server/src/tui/dashboard-app.tsx:73-79` (narrow FlowMap)
- Modify: `apps/mcp-server/src/tui/dashboard-app.tsx:88-94` (wide FlowMap)

### Step 1: narrow 레이아웃 FlowMap에 prop 추가

`apps/mcp-server/src/tui/dashboard-app.tsx` 73-79번 줄:

```tsx
// Before
<FlowMap
  agents={state.agents}
  edges={state.edges}
  layoutMode={layoutMode}
  width={grid.flowMap.width}
  height={grid.flowMap.height}
/>

// After
<FlowMap
  agents={state.agents}
  edges={state.edges}
  layoutMode={layoutMode}
  width={grid.flowMap.width}
  height={grid.flowMap.height}
  activeStage={state.currentMode}
/>
```

### Step 2: wide 레이아웃 FlowMap에도 동일하게 prop 추가

`apps/mcp-server/src/tui/dashboard-app.tsx` 88-94번 줄에 동일하게 적용.

### Step 3: TypeScript 타입 오류 없음 확인

```bash
cd apps/mcp-server && npx tsc --noEmit 2>&1 | head -20
```

Expected: 오류 없음

### Step 4: commit

```bash
git add apps/mcp-server/src/tui/dashboard-app.tsx
git commit -m "fix(tui): wire activeStage prop to FlowMap from state.currentMode"
```

---

## Task 2: `renderPipelineHeader` 스테이지 통계 — RED

**Files:**
- Modify: `apps/mcp-server/src/tui/components/flow-map.pure.spec.ts`

### Step 1: 실패 테스트 작성

`renderPipelineHeader` describe 블록 끝에 추가:

```typescript
it('should show running and done counts when agents provided', () => {
  const buf = new ColorBuffer(80, 2);
  const agents = new Map([
    ['a1', makeAgent({ id: 'a1', name: 'A', stage: 'PLAN', status: 'running' })],
    ['a2', makeAgent({ id: 'a2', name: 'B', stage: 'PLAN', status: 'running' })],
    ['a3', makeAgent({ id: 'a3', name: 'C', stage: 'PLAN', status: 'done' })],
  ]);
  renderPipelineHeader(buf, 80, 'PLAN', false, agents);
  const text = bufferToString(buf);
  expect(text).toContain('2↑');
  expect(text).toContain('1✓');
});

it('should not show stats when no agents provided', () => {
  const buf = new ColorBuffer(80, 2);
  renderPipelineHeader(buf, 80, 'PLAN');
  const text = bufferToString(buf);
  expect(text).not.toContain('↑');
  expect(text).not.toContain('✓');
});

it('should not show stats when running+done is zero', () => {
  const buf = new ColorBuffer(80, 2);
  const agents = new Map([
    ['a1', makeAgent({ id: 'a1', name: 'A', stage: 'PLAN', status: 'idle' })],
  ]);
  renderPipelineHeader(buf, 80, 'PLAN', false, agents);
  const text = bufferToString(buf);
  expect(text).not.toContain('↑');
  expect(text).not.toContain('✓');
});

it('should show only running when done is zero', () => {
  const buf = new ColorBuffer(80, 2);
  const agents = new Map([
    ['a1', makeAgent({ id: 'a1', name: 'A', stage: 'ACT', status: 'running' })],
  ]);
  renderPipelineHeader(buf, 80, 'ACT', false, agents);
  const text = bufferToString(buf);
  expect(text).toContain('1↑');
  expect(text).not.toContain('✓');
});
```

### Step 2: 테스트 실행해 실패 확인

```bash
cd apps/mcp-server && npx vitest run src/tui/components/flow-map.pure.spec.ts 2>&1 | tail -20
```

Expected: FAIL (renderPipelineHeader에 5번째 인자가 없어 타입 오류 또는 동작 불일치)

### Step 3: commit (RED)

```bash
git add apps/mcp-server/src/tui/components/flow-map.pure.spec.ts
git commit -m "test(tui): RED - renderPipelineHeader per-stage agent stats"
```

---

## Task 3: `renderPipelineHeader` 스테이지 통계 — GREEN

**Files:**
- Modify: `apps/mcp-server/src/tui/components/flow-map.pure.ts`

### Step 1: 스테이지별 카운트 헬퍼 함수 추가

`flow-map.pure.ts`의 `renderPipelineHeader` 바로 위에 추가:

```typescript
/**
 * Count running and done agents for a specific stage.
 */
function countStageRunningDone(
  agents: Map<string, DashboardNode>,
  stage: Mode,
): { running: number; done: number } {
  let running = 0;
  let done = 0;
  for (const agent of agents.values()) {
    if (agent.stage !== stage) continue;
    if (agent.status === 'running') running++;
    else if (agent.status === 'done') done++;
  }
  return { running, done };
}
```

### Step 2: `renderPipelineHeader` 시그니처에 `agents` 파라미터 추가

```typescript
export function renderPipelineHeader(
  buf: ColorBuffer,
  width: number,
  activeStage: Mode | null,
  hasAutoAgents = false,
  agents?: Map<string, DashboardNode>,  // NEW: optional
): void {
```

### Step 3: 스테이지 이름 렌더링 후 통계 삽입

stage 이름 렌더링(`buf.writeText(x, 0, stage, stageStyle)`) 직후:

```typescript
// Stage name
buf.writeText(x, 0, stage, stageStyle);
x += stage.length;

// NEW: Per-stage stats
if (agents && agents.size > 0) {
  const { running, done } = countStageRunningDone(agents, stage);
  if (running > 0 || done > 0) {
    const parts: string[] = [];
    if (running > 0) parts.push(`${running}↑`);
    if (done > 0) parts.push(`${done}✓`);
    const statsStr = ` (${parts.join(' ')})`;
    buf.writeText(x, 0, statsStr, { fg: 'gray', dim: !isActive });
    x += statsStr.length;
  }
}
```

### Step 4: `STAGE_SLOT_WIDTH` 상수 업데이트

```typescript
// Before
const STAGE_SLOT_WIDTH = 8;

// After
const STAGE_SLOT_WIDTH = 16; // arrow + space + label + stats "(N↑ N✓)"
```

### Step 5: 테스트 실행해 PASS 확인

```bash
cd apps/mcp-server && npx vitest run src/tui/components/flow-map.pure.spec.ts 2>&1 | tail -20
```

Expected: PASS (모든 테스트 통과)

### Step 6: commit (GREEN)

```bash
git add apps/mcp-server/src/tui/components/flow-map.pure.ts
git commit -m "feat(tui): renderPipelineHeader shows per-stage running/done counts"
```

---

## Task 4: `renderFlowMap`에 `agents` 전달 (stats propagation)

**Files:**
- Modify: `apps/mcp-server/src/tui/components/flow-map.pure.ts`

### Step 1: `renderFlowMap` 내 `renderPipelineHeader` 호출에 `agents` 추가

`renderFlowMap` 함수 내 `// 1. Pipeline header` 주석 아래:

```typescript
// Before
renderPipelineHeader(buf, width, activeStage, hasAutoAgents);

// After
renderPipelineHeader(buf, width, activeStage, hasAutoAgents, agents);
```

### Step 2: 기존 테스트 전체 실행

```bash
cd apps/mcp-server && npx vitest run src/tui/components/flow-map.pure.spec.ts 2>&1 | tail -30
```

Expected: 모든 테스트 PASS

### Step 3: commit

```bash
git add apps/mcp-server/src/tui/components/flow-map.pure.ts
git commit -m "feat(tui): pass agents to renderPipelineHeader for per-stage stats"
```

---

## Task 5: 비활성 스테이지 컬럼 dimming — RED

**Files:**
- Modify: `apps/mcp-server/src/tui/components/flow-map.pure.spec.ts`

### Step 1: 실패 테스트 작성

`renderFlowMap (wide)` describe 블록 끝에 추가:

```typescript
it('should dim agents in inactive stage columns when activeStage is set', () => {
  const agents = new Map([
    ['plan-1', makeAgent({ id: 'plan-1', name: 'Planner', stage: 'PLAN', status: 'running' })],
    ['act-1', makeAgent({ id: 'act-1', name: 'Developer', stage: 'ACT', status: 'running' })],
  ]);
  const buf = renderFlowMap(agents, [], 120, 30, 'PLAN');
  const lines = buf.toLines();

  // Find 'D' of 'Developer' (ACT stage — should be dimmed)
  let devCellDimmed = false;
  for (const row of lines) {
    for (let i = 0; i < row.length - 7; i++) {
      if (
        row[i].char === 'D' &&
        row[i + 1]?.char === 'e' &&
        row[i + 2]?.char === 'v'
      ) {
        devCellDimmed = row[i].style.dim === true;
        break;
      }
    }
    if (devCellDimmed) break;
  }
  expect(devCellDimmed).toBe(true);
});

it('should not dim agents when activeStage is null', () => {
  const agents = new Map([
    ['act-1', makeAgent({ id: 'act-1', name: 'Developer', stage: 'ACT', status: 'running' })],
  ]);
  const buf = renderFlowMap(agents, [], 120, 30, null);
  const lines = buf.toLines();

  let devCellDimmed = false;
  for (const row of lines) {
    for (let i = 0; i < row.length - 7; i++) {
      if (row[i].char === 'D' && row[i + 1]?.char === 'e') {
        devCellDimmed = row[i].style.dim === true;
        break;
      }
    }
    if (devCellDimmed !== undefined) break;
  }
  expect(devCellDimmed).toBe(false);
});
```

### Step 2: 테스트 실행해 실패 확인

```bash
cd apps/mcp-server && npx vitest run src/tui/components/flow-map.pure.spec.ts 2>&1 | tail -20
```

Expected: FAIL

### Step 3: commit (RED)

```bash
git add apps/mcp-server/src/tui/components/flow-map.pure.spec.ts
git commit -m "test(tui): RED - inactive stage column dimming"
```

---

## Task 6: 비활성 스테이지 컬럼 dimming — GREEN

**Files:**
- Modify: `apps/mcp-server/src/tui/components/flow-map.pure.ts`

### Step 1: `drawAgentNode`에 `dimmed` 파라미터 추가

```typescript
function drawAgentNode(
  buf: ColorBuffer,
  x: number,
  y: number,
  boxW: number,
  agent: DashboardNode,
  dimmed = false,  // NEW
): void {
  const borderStyle = dimmed ? { dim: true as const } : getStatusStyle(agent.status);

  if (agent.isPrimary) {
    buf.drawDoubleBox(x, y, boxW, NODE_HEIGHT, borderStyle);
  } else {
    buf.drawRoundBox(x, y, boxW, NODE_HEIGHT, borderStyle);
  }

  const textStyle = dimmed ? { dim: true as const } : getNodeTextStyle(agent.status);
  const icon = STATUS_ICONS[agent.status];
  const maxNameLen = Math.max(1, boxW - 5);
  const nameStr = ...;
  buf.writeText(x + 2, y + 1, nameStr, textStyle);
  buf.writeText(x + 2 + nameStr.length + 1, y + 1, icon, dimmed ? { dim: true } : STATUS_STYLES[agent.status]);

  // Row 2: progress / mode indicator (모두 dimmed 스타일 적용)
  if (agent.isPrimary) {
    const filledStyle = dimmed ? { dim: true as const } : PROGRESS_BAR_STYLES.filled;
    const emptyStyle = dimmed ? { dim: true as const } : PROGRESS_BAR_STYLES.empty;
    // ... 기존 로직에 filledStyle/emptyStyle 사용
  } else if (agent.isParallel) {
    buf.writeText(x + 2, y + 2, '⫸ parallel', dimmed ? { dim: true } : PARALLEL_STYLES.parallel);
  } else {
    buf.writeText(x + 2, y + 2, '→ single', dimmed ? { dim: true } : PARALLEL_STYLES.single);
  }
}
```

### Step 2: `renderFlowMap`에서 dimming 조건 계산

`// 2. Draw glow effect` 부분 수정:

```typescript
// 2. Draw glow effect — only for active stage (or when no activeStage)
for (const [id, pos] of positions) {
  const agent = agents.get(id);
  if (!agent) continue;
  const isInactive = activeStage !== null && agent.stage !== activeStage;
  if (agent.status === 'running' && agent.isPrimary && !isInactive) {
    drawGlow(buf, pos.x, pos.y, pos.width, pos.height, GLOW_STYLE);
  }
}

// 3. Draw agent boxes with visual hierarchy
for (const [id, pos] of positions) {
  const agent = agents.get(id);
  if (!agent) continue;
  const isInactive = activeStage !== null && agent.stage !== activeStage;
  drawAgentNode(buf, pos.x, pos.y, pos.width, agent, isInactive);
}
```

### Step 3: 모든 테스트 실행해 PASS 확인

```bash
cd apps/mcp-server && npx vitest run src/tui/components/flow-map.pure.spec.ts 2>&1 | tail -30
```

Expected: 모든 테스트 PASS

### Step 4: commit (GREEN)

```bash
git add apps/mcp-server/src/tui/components/flow-map.pure.ts
git commit -m "feat(tui): dim inactive stage columns when activeStage is set"
```

---

## Task 7: 최종 검증

### Step 1: 전체 TUI 관련 테스트 실행

```bash
cd apps/mcp-server && npx vitest run src/tui 2>&1 | tail -30
```

Expected: 모든 테스트 PASS

### Step 2: TypeScript 타입 체크

```bash
cd apps/mcp-server && npx tsc --noEmit 2>&1 | grep -v node_modules | head -20
```

Expected: 오류 없음

### Step 3: commit

```bash
git add -A
git commit -m "chore(tui): verify all FlowMap activeStage + stats tests pass"
```

---

## Acceptance Criteria 체크리스트

- [ ] `state.currentMode`가 `activeStage`로 FlowMap에 전달됨 (narrow & wide 모두)
- [ ] 파이프라인 헤더에 `▸ PLAN (2↑ 1✓)` 형태로 스테이지별 카운트 표시
- [ ] running+done이 0인 스테이지에는 통계 없음
- [ ] `activeStage`가 null이면 모든 컬럼 정상 밝기
- [ ] 비활성 스테이지 에이전트는 `dim: true`로 렌더링
- [ ] 비활성 스테이지 running primary agent에는 glow 없음
- [ ] `flow-map.pure.spec.ts` 신규 테스트 포함 전체 PASS
- [ ] TypeScript strict 모드 오류 없음
