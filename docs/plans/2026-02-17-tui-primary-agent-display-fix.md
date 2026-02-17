# [Bug Fix] TUI Agent Tree - Primary Agent 표시 수정 (#451)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** `parse_mode` 응답의 `delegates_to` 필드에서 Primary Agent를 추출하여 TUI AgentTree에 표시되도록 수정

**Architecture:** `response-event-extractor`에서 `delegates_to` → `AGENT_ACTIVATED` 이벤트 추출 추가, `tui-interceptor`에서 primary agent 교체 로직 추가, `parse-agent`에 `dispatch_agents` 매핑 추가

**Tech Stack:** TypeScript, NestJS, Vitest

---

## 근본 원인 분석

1. **`extractFromParseMode()`가 `delegates_to` 무시**: `mode:changed`와 `skill:recommended`만 추출하고 primary agent 정보를 추출하지 않음
2. **`dispatchReady` 도입으로 `get_agent_system_prompt` 호출 생략**: `isPrimary: true` 에이전트 생성 경로가 우회됨
3. **`dispatch_agents`가 `TOOL_AGENT_MAP`에 미등록**: 해당 도구 호출 시 이벤트 미발생

## 변경 대상 파일

| 파일 | 변경 내용 |
|------|-----------|
| `apps/mcp-server/src/tui/events/response-event-extractor.ts` | `ExtractedEvent` 타입에 `AGENT_ACTIVATED` 추가, `extractFromParseMode()`에서 `delegates_to` 추출 |
| `apps/mcp-server/src/tui/events/tui-interceptor.ts` | `currentPrimaryAgentId` 필드 + `AGENT_ACTIVATED` case + auto-deactivate |
| `apps/mcp-server/src/tui/events/parse-agent.ts` | `TOOL_AGENT_MAP`에 `dispatch_agents` 추가 |
| `apps/mcp-server/src/tui/events/response-event-extractor.spec.ts` | `delegates_to` 추출 테스트 |
| `apps/mcp-server/src/tui/events/tui-interceptor.spec.ts` | primary agent 교체 테스트 |
| `apps/mcp-server/src/tui/events/parse-agent.spec.ts` | `dispatch_agents` 매핑 테스트 |

---

### Task 1: `ExtractedEvent` 타입에 `AGENT_ACTIVATED` 추가

**Files:**
- Modify: `apps/mcp-server/src/tui/events/response-event-extractor.ts:8-27`

**Step 1: import에 `AgentActivatedEvent` 추가**

```typescript
import {
  TUI_EVENTS,
  type ModeChangedEvent,
  type SkillRecommendedEvent,
  type ParallelStartedEvent,
  type AgentActivatedEvent,       // NEW
} from './types';
```

**Step 2: `ExtractedEvent` union에 `AGENT_ACTIVATED` variant 추가**

```typescript
export type ExtractedEvent =
  | { event: typeof TUI_EVENTS.MODE_CHANGED; payload: ModeChangedEvent }
  | { event: typeof TUI_EVENTS.SKILL_RECOMMENDED; payload: SkillRecommendedEvent }
  | { event: typeof TUI_EVENTS.PARALLEL_STARTED; payload: ParallelStartedEvent }
  | { event: typeof TUI_EVENTS.AGENT_ACTIVATED; payload: AgentActivatedEvent };  // NEW
```

**Step 3: `extractFromParseMode()`에서 `delegates_to` 추출 로직 추가**

기존 `return events;` 직전에 추가:

```typescript
  // agent:activated (primary agent from delegates_to)
  const delegateName = typeof json.delegates_to === 'string' ? json.delegates_to : null;
  if (delegateName) {
    events.push({
      event: TUI_EVENTS.AGENT_ACTIVATED,
      payload: {
        agentId: `primary:${delegateName}`,
        name: delegateName,
        role: 'primary',
        isPrimary: true,
      },
    });
  }
```

> `agentId`에 `primary:` 접두사를 붙여 mode agent(`plan-mode`)와 구분

**Step 4: 빌드 확인**

Run: `cd apps/mcp-server && npx tsc --noEmit`
Expected: 에러 없음

**Step 5: Commit**

```bash
git add apps/mcp-server/src/tui/events/response-event-extractor.ts
git commit -m "fix(tui): extract primary agent from delegates_to in parse_mode response"
```

---

### Task 2: `emitSemanticEvent()`에서 `AGENT_ACTIVATED` 처리 + Primary Agent 교체 로직

**Files:**
- Modify: `apps/mcp-server/src/tui/events/tui-interceptor.ts:7-100`

**Step 1: `currentPrimaryAgentId` 프로퍼티 추가**

`currentMode` 프로퍼티 아래에 추가:

```typescript
private currentPrimaryAgentId: string | null = null;
```

**Step 2: `emitSemanticEvent()`에 `AGENT_ACTIVATED` case 추가**

```typescript
private emitSemanticEvent(evt: ExtractedEvent): void {
    switch (evt.event) {
      case TUI_EVENTS.MODE_CHANGED: {
        const payload = { ...evt.payload, from: this.currentMode };
        this.currentMode = evt.payload.to;
        this.eventBus.emit(TUI_EVENTS.MODE_CHANGED, payload);
        break;
      }
      case TUI_EVENTS.AGENT_ACTIVATED: {
        // 이전 primary agent가 있으면 deactivate
        if (this.currentPrimaryAgentId) {
          this.eventBus.emit(TUI_EVENTS.AGENT_DEACTIVATED, {
            agentId: this.currentPrimaryAgentId,
            reason: 'replaced',
            durationMs: 0,
          });
        }
        this.currentPrimaryAgentId = evt.payload.agentId;
        this.eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, evt.payload);
        break;
      }
      case TUI_EVENTS.SKILL_RECOMMENDED:
        this.eventBus.emit(TUI_EVENTS.SKILL_RECOMMENDED, evt.payload);
        break;
      case TUI_EVENTS.PARALLEL_STARTED:
        this.eventBus.emit(TUI_EVENTS.PARALLEL_STARTED, evt.payload);
        break;
    }
  }
```

**Step 3: `disable()`에서 `currentPrimaryAgentId` 초기화**

```typescript
disable(): void {
    this.enabled = false;
    this.currentMode = null;
    this.currentPrimaryAgentId = null;
  }
```

**Step 4: 빌드 확인**

Run: `cd apps/mcp-server && npx tsc --noEmit`
Expected: 에러 없음

**Step 5: Commit**

```bash
git add apps/mcp-server/src/tui/events/tui-interceptor.ts
git commit -m "fix(tui): handle AGENT_ACTIVATED in emitSemanticEvent with primary agent replacement"
```

---

### Task 3: `TOOL_AGENT_MAP`에 `dispatch_agents` 추가

**Files:**
- Modify: `apps/mcp-server/src/tui/events/parse-agent.ts:10-25`

**Step 1: `dispatch_agents` 항목 추가**

```typescript
const TOOL_AGENT_MAP: Record<string, string> = {
  search_rules: 'query',
  get_agent_details: 'query',
  get_project_config: 'config',
  set_project_root: 'config',
  suggest_config_updates: 'config',
  recommend_skills: 'skill',
  get_skill: 'skill',
  list_skills: 'skill',
  analyze_task: 'analysis',
  generate_checklist: 'checklist',
  read_context: 'context',
  update_context: 'context',
  cleanup_context: 'context',
  get_code_conventions: 'conventions',
  dispatch_agents: 'orchestrator',     // NEW
};
```

**Step 2: Commit**

```bash
git add apps/mcp-server/src/tui/events/parse-agent.ts
git commit -m "fix(tui): add dispatch_agents to TOOL_AGENT_MAP"
```

---

### Task 4: 테스트 추가 - `response-event-extractor.spec.ts`

**Files:**
- Modify: `apps/mcp-server/src/tui/events/response-event-extractor.spec.ts`

**Step 1: `parse_mode → agent:activated` describe 블록 추가**

기존 `parse_mode → skill:recommended` describe 블록 뒤에 추가:

```typescript
  describe('parse_mode → agent:activated', () => {
    it('should extract agent:activated from delegates_to in parse_mode response', () => {
      const result = extractEventsFromResponse(
        'parse_mode',
        makeResponse({
          mode: 'PLAN',
          delegates_to: 'solution-architect',
          included_skills: [],
        }),
      );
      const agentEvent = result.find(e => e.event === TUI_EVENTS.AGENT_ACTIVATED);
      expect(agentEvent).toBeDefined();
      expect(agentEvent!.payload).toEqual({
        agentId: 'primary:solution-architect',
        name: 'solution-architect',
        role: 'primary',
        isPrimary: true,
      });
    });

    it('should not emit agent:activated if delegates_to is missing', () => {
      const result = extractEventsFromResponse(
        'parse_mode',
        makeResponse({ mode: 'PLAN' }),
      );
      const agentEvents = result.filter(e => e.event === TUI_EVENTS.AGENT_ACTIVATED);
      expect(agentEvents).toHaveLength(0);
    });

    it('should not emit agent:activated if delegates_to is not a string', () => {
      const result = extractEventsFromResponse(
        'parse_mode',
        makeResponse({ mode: 'PLAN', delegates_to: 123 }),
      );
      const agentEvents = result.filter(e => e.event === TUI_EVENTS.AGENT_ACTIVATED);
      expect(agentEvents).toHaveLength(0);
    });

    it('should emit mode:changed, skill:recommended, and agent:activated together', () => {
      const result = extractEventsFromResponse(
        'parse_mode',
        makeResponse({
          mode: 'PLAN',
          delegates_to: 'technical-planner',
          included_skills: [{ name: 'writing-plans', reason: 'matched' }],
        }),
      );
      expect(result).toHaveLength(3);
      expect(result[0].event).toBe(TUI_EVENTS.MODE_CHANGED);
      expect(result[1].event).toBe(TUI_EVENTS.SKILL_RECOMMENDED);
      expect(result[2].event).toBe(TUI_EVENTS.AGENT_ACTIVATED);
    });
  });
```

**Step 2: 기존 `should emit both mode:changed and skill:recommended together` 테스트 업데이트 불필요 확인**

기존 테스트는 `delegates_to` 없이 테스트하므로 여전히 `toHaveLength(2)`가 맞음. 변경 불필요.

**Step 3: 테스트 실행**

Run: `cd apps/mcp-server && npx vitest run src/tui/events/response-event-extractor.spec.ts`
Expected: 모든 테스트 PASS

**Step 4: Commit**

```bash
git add apps/mcp-server/src/tui/events/response-event-extractor.spec.ts
git commit -m "test(tui): add tests for delegates_to extraction in parse_mode"
```

---

### Task 5: 테스트 추가 - `tui-interceptor.spec.ts`

**Files:**
- Modify: `apps/mcp-server/src/tui/events/tui-interceptor.spec.ts`

**Step 1: primary agent 관련 테스트 추가**

`when enabled` describe 블록 내에 추가:

```typescript
    it('should emit agent:activated for primary agent from parse_mode delegates_to', async () => {
      const activatedHandler = vi.fn();
      eventBus.on(TUI_EVENTS.AGENT_ACTIVATED, activatedHandler);

      await interceptor.intercept('parse_mode', { prompt: 'PLAN design auth' }, async () => ({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              mode: 'PLAN',
              delegates_to: 'solution-architect',
            }),
          },
        ],
      }));

      await new Promise(resolve => setImmediate(resolve));

      expect(activatedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: 'primary:solution-architect',
          name: 'solution-architect',
          isPrimary: true,
        }),
      );
    });

    it('should deactivate previous primary agent when new parse_mode arrives', async () => {
      const activatedHandler = vi.fn();
      const deactivatedHandler = vi.fn();
      eventBus.on(TUI_EVENTS.AGENT_ACTIVATED, activatedHandler);
      eventBus.on(TUI_EVENTS.AGENT_DEACTIVATED, deactivatedHandler);

      // First call: PLAN with solution-architect
      await interceptor.intercept('parse_mode', { prompt: 'PLAN design auth' }, async () => ({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              mode: 'PLAN',
              delegates_to: 'solution-architect',
            }),
          },
        ],
      }));
      await new Promise(resolve => setImmediate(resolve));

      // Second call: ACT with frontend-developer
      await interceptor.intercept(
        'parse_mode',
        { prompt: 'ACT implement feature' },
        async () => ({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                mode: 'ACT',
                delegates_to: 'frontend-developer',
              }),
            },
          ],
        }),
      );
      await new Promise(resolve => setImmediate(resolve));

      // solution-architect should be deactivated with 'replaced' reason
      expect(deactivatedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: 'primary:solution-architect',
          reason: 'replaced',
        }),
      );
      // frontend-developer should be activated
      expect(activatedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: 'primary:frontend-developer',
          name: 'frontend-developer',
          isPrimary: true,
        }),
      );
    });
```

**Step 2: 테스트 실행**

Run: `cd apps/mcp-server && npx vitest run src/tui/events/tui-interceptor.spec.ts`
Expected: 모든 테스트 PASS

**Step 3: Commit**

```bash
git add apps/mcp-server/src/tui/events/tui-interceptor.spec.ts
git commit -m "test(tui): add tests for primary agent activation and replacement"
```

---

### Task 6: 테스트 추가 - `parse-agent.spec.ts`

**Files:**
- Modify: `apps/mcp-server/src/tui/events/parse-agent.spec.ts`

**Step 1: `dispatch_agents` 테스트 추가**

`mapped general tools` describe 블록 내에 추가:

```typescript
    it('should return agent info for dispatch_agents', () => {
      expect(parseAgentFromToolName('dispatch_agents', { mode: 'EVAL' })).toEqual({
        agentId: 'dispatch_agents',
        name: 'dispatch_agents',
        role: 'orchestrator',
        isPrimary: false,
      });
    });
```

**Step 2: 테스트 실행**

Run: `cd apps/mcp-server && npx vitest run src/tui/events/parse-agent.spec.ts`
Expected: 모든 테스트 PASS

**Step 3: Commit**

```bash
git add apps/mcp-server/src/tui/events/parse-agent.spec.ts
git commit -m "test(tui): add test for dispatch_agents tool mapping"
```

---

## 전체 검증

```bash
cd apps/mcp-server && npx vitest run src/tui/events/
```

Expected: 모든 테스트 PASS (response-event-extractor, tui-interceptor, parse-agent)

## 수동 검증 (TUI)

1. `npx codingbuddy tui`로 TUI 실행
2. AI 클라이언트에서 `PLAN` 키워드로 작업 시작
3. AgentTree에 primary agent(예: `solution-architect`) 표시 확인
4. Mode 전환 시(PLAN→ACT) 이전 primary agent가 교체되어 표시 확인
5. `dispatch_agents` 호출 시 StatusBar에 active count 반영 확인
