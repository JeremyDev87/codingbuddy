# [Phase 2] TuiInterceptor 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** MCP 도구 디스패치 레이어에 인터셉터를 삽입하여 Agent 활동을 자동 캡처하고 TUI EventBus로 이벤트를 emit

**Architecture:** `TuiInterceptor`는 `@Injectable()` NestJS 서비스로, `McpService.registerToolsOn`의 `CallToolRequestSchema` 핸들러를 래핑하여 도구 호출 전후에 이벤트를 발행합니다. `--tui` 플래그가 없으면 완전히 비활성화됩니다.

**Tech Stack:** NestJS, TypeScript, vitest, rxjs (finalize)

**Issue:** https://github.com/JeremyDev87/codingbuddy/issues/335

---

## 설계 결정 사항

### 왜 APP_INTERCEPTOR 대신 직접 통합인가?

이 코드베이스에서 MCP 도구 호출은 NestJS HTTP 컨트롤러 파이프라인을 통과하지 않습니다:
- **Stdio 모드**: `NestFactory.createApplicationContext` → HTTP 컨트롤러 없음
- **SSE 모드**: `McpController.handleMessages` → `SSEServerTransport.handlePostMessage` → MCP SDK `Server`가 직접 처리

두 모드 모두 도구 호출은 `McpService.registerToolsOn`의 `CallToolRequestSchema` 핸들러에서 디스패치됩니다. 따라서 인터셉터를 이 레벨에서 통합합니다.

### AgentDeactivatedEvent 확장

현재 `AgentDeactivatedEvent`에는 `duration` 필드가 없습니다. 이슈에서 실행 시간 측정을 요구하므로 `durationMs` 필드를 추가합니다.

### parseAgentFromToolName 로직

도구 이름과 인자를 분석하여 Agent 활동을 감지합니다:
- `get_agent_system_prompt` → `args.agentName`으로 에이전트 활성화
- `get_agent_details` → `args.agentName`으로 에이전트 조회 (활성화 아님)
- `prepare_parallel_agents` → 병렬 실행 (별도 이벤트)
- 기타 도구 → Agent 활동 없음 (인터셉트하지 않음)

---

## Task 1: AgentDeactivatedEvent에 durationMs 필드 추가

**Files:**
- Modify: `apps/mcp-server/src/tui/events/types.ts`
- Modify: `apps/mcp-server/src/tui/events/types.spec.ts`

**Step 1: 실패하는 테스트 작성**

`types.spec.ts`에 `durationMs` 필드가 `AgentDeactivatedEvent`에 존재하는지 확인하는 타입 테스트를 추가합니다.

```typescript
it('AgentDeactivatedEvent should include durationMs', () => {
  const event: AgentDeactivatedEvent = {
    agentId: 'agent-1',
    reason: 'completed',
    durationMs: 150,
  };
  expect(event.durationMs).toBe(150);
});
```

**Step 2: 테스트 실패 확인**

Run: `cd apps/mcp-server && yarn vitest run src/tui/events/types.spec.ts`
Expected: FAIL - `durationMs`가 `AgentDeactivatedEvent`에 없음

**Step 3: 최소 구현**

`types.ts`의 `AgentDeactivatedEvent` 인터페이스에 `durationMs` 필드 추가:

```typescript
export interface AgentDeactivatedEvent {
  agentId: string;
  reason: string;
  durationMs: number;
}
```

**Step 4: 테스트 통과 확인**

Run: `cd apps/mcp-server && yarn vitest run src/tui/events/types.spec.ts`
Expected: PASS

**Step 5: 커밋**

```bash
git add apps/mcp-server/src/tui/events/types.ts apps/mcp-server/src/tui/events/types.spec.ts
git commit -m "feat(tui): add durationMs field to AgentDeactivatedEvent"
```

---

## Task 2: parseAgentFromToolName 순수 함수 구현

**Files:**
- Create: `apps/mcp-server/src/tui/events/parse-agent.ts`
- Create: `apps/mcp-server/src/tui/events/parse-agent.spec.ts`

**Step 1: 실패하는 테스트 작성**

```typescript
import { describe, it, expect } from 'vitest';
import { parseAgentFromToolName } from './parse-agent';

describe('parseAgentFromToolName', () => {
  it('should return agent info for get_agent_system_prompt', () => {
    const result = parseAgentFromToolName('get_agent_system_prompt', {
      agentName: 'security-specialist',
      context: { mode: 'EVAL' },
    });
    expect(result).toEqual({
      agentId: 'security-specialist',
      name: 'security-specialist',
      role: 'specialist',
      isPrimary: true,
    });
  });

  it('should return null for non-agent tool names', () => {
    expect(parseAgentFromToolName('search_rules', {})).toBeNull();
    expect(parseAgentFromToolName('parse_mode', { prompt: 'PLAN test' })).toBeNull();
    expect(parseAgentFromToolName('get_project_config', {})).toBeNull();
  });

  it('should return null when get_agent_system_prompt has no agentName', () => {
    expect(parseAgentFromToolName('get_agent_system_prompt', {})).toBeNull();
    expect(parseAgentFromToolName('get_agent_system_prompt', undefined)).toBeNull();
  });

  it('should return null for get_agent_details (read-only, not activation)', () => {
    expect(parseAgentFromToolName('get_agent_details', { agentName: 'test' })).toBeNull();
  });

  it('should return null for prepare_parallel_agents (separate event path)', () => {
    expect(
      parseAgentFromToolName('prepare_parallel_agents', {
        specialists: ['security', 'performance'],
      }),
    ).toBeNull();
  });
});
```

**Step 2: 테스트 실패 확인**

Run: `cd apps/mcp-server && yarn vitest run src/tui/events/parse-agent.spec.ts`
Expected: FAIL - 모듈이 존재하지 않음

**Step 3: 최소 구현**

```typescript
import type { AgentActivatedEvent } from './types';

export function parseAgentFromToolName(
  toolName: string,
  args: Record<string, unknown> | undefined,
): AgentActivatedEvent | null {
  if (toolName !== 'get_agent_system_prompt') {
    return null;
  }

  const agentName = typeof args?.agentName === 'string' ? args.agentName : null;
  if (!agentName) {
    return null;
  }

  return {
    agentId: agentName,
    name: agentName,
    role: 'specialist',
    isPrimary: true,
  };
}
```

**Step 4: 테스트 통과 확인**

Run: `cd apps/mcp-server && yarn vitest run src/tui/events/parse-agent.spec.ts`
Expected: PASS

**Step 5: 커밋**

```bash
git add apps/mcp-server/src/tui/events/parse-agent.ts apps/mcp-server/src/tui/events/parse-agent.spec.ts
git commit -m "feat(tui): implement parseAgentFromToolName pure function"
```

---

## Task 3: TuiInterceptor 클래스 구현

**Files:**
- Create: `apps/mcp-server/src/tui/events/tui-interceptor.ts`
- Create: `apps/mcp-server/src/tui/events/tui-interceptor.spec.ts`

**Step 1: 실패하는 테스트 작성**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TuiInterceptor } from './tui-interceptor';
import { TuiEventBus } from './event-bus';
import { TUI_EVENTS } from './types';

describe('TuiInterceptor', () => {
  let interceptor: TuiInterceptor;
  let eventBus: TuiEventBus;

  beforeEach(() => {
    eventBus = new TuiEventBus();
    interceptor = new TuiInterceptor(eventBus);
  });

  describe('when disabled', () => {
    it('should pass through without emitting events', async () => {
      const emitSpy = vi.spyOn(eventBus, 'emit');
      const result = await interceptor.intercept(
        'get_agent_system_prompt',
        { agentName: 'test-agent', context: { mode: 'EVAL' } },
        async () => ({ content: [{ type: 'text', text: 'ok' }] }),
      );
      expect(result).toEqual({ content: [{ type: 'text', text: 'ok' }] });
      expect(emitSpy).not.toHaveBeenCalled();
    });
  });

  describe('when enabled', () => {
    beforeEach(() => {
      interceptor.enable();
    });

    it('should emit agent:activated and agent:deactivated for agent tools', async () => {
      const activatedHandler = vi.fn();
      const deactivatedHandler = vi.fn();
      eventBus.on(TUI_EVENTS.AGENT_ACTIVATED, activatedHandler);
      eventBus.on(TUI_EVENTS.AGENT_DEACTIVATED, deactivatedHandler);

      await interceptor.intercept(
        'get_agent_system_prompt',
        { agentName: 'security-specialist', context: { mode: 'EVAL' } },
        async () => ({ content: [{ type: 'text', text: 'ok' }] }),
      );

      // Events emitted via setImmediate, flush microtasks
      await new Promise(resolve => setImmediate(resolve));

      expect(activatedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: 'security-specialist',
          name: 'security-specialist',
        }),
      );
      expect(deactivatedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: 'security-specialist',
          reason: 'completed',
          durationMs: expect.any(Number),
        }),
      );
    });

    it('should emit agent:deactivated with error reason on failure', async () => {
      const deactivatedHandler = vi.fn();
      eventBus.on(TUI_EVENTS.AGENT_DEACTIVATED, deactivatedHandler);

      await expect(
        interceptor.intercept(
          'get_agent_system_prompt',
          { agentName: 'test-agent', context: { mode: 'EVAL' } },
          async () => { throw new Error('tool failed'); },
        ),
      ).rejects.toThrow('tool failed');

      await new Promise(resolve => setImmediate(resolve));

      expect(deactivatedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: 'test-agent',
          reason: 'error',
        }),
      );
    });

    it('should not emit events for non-agent tools', async () => {
      const emitSpy = vi.spyOn(eventBus, 'emit');

      await interceptor.intercept(
        'search_rules',
        { query: 'test' },
        async () => ({ content: [{ type: 'text', text: 'result' }] }),
      );

      await new Promise(resolve => setImmediate(resolve));

      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('should measure execution duration', async () => {
      const deactivatedHandler = vi.fn();
      eventBus.on(TUI_EVENTS.AGENT_DEACTIVATED, deactivatedHandler);

      await interceptor.intercept(
        'get_agent_system_prompt',
        { agentName: 'test', context: { mode: 'EVAL' } },
        async () => {
          await new Promise(r => setTimeout(r, 10));
          return { content: [{ type: 'text', text: 'ok' }] };
        },
      );

      await new Promise(resolve => setImmediate(resolve));

      const event = deactivatedHandler.mock.calls[0][0];
      expect(event.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('enable/disable', () => {
    it('should be disabled by default', () => {
      expect(interceptor.isEnabled()).toBe(false);
    });

    it('should be enabled after enable()', () => {
      interceptor.enable();
      expect(interceptor.isEnabled()).toBe(true);
    });

    it('should be disabled after disable()', () => {
      interceptor.enable();
      interceptor.disable();
      expect(interceptor.isEnabled()).toBe(false);
    });
  });
});
```

**Step 2: 테스트 실패 확인**

Run: `cd apps/mcp-server && yarn vitest run src/tui/events/tui-interceptor.spec.ts`
Expected: FAIL - 모듈이 존재하지 않음

**Step 3: 최소 구현**

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { TuiEventBus } from './event-bus';
import { TUI_EVENTS } from './types';
import { parseAgentFromToolName } from './parse-agent';

@Injectable()
export class TuiInterceptor {
  private readonly logger = new Logger(TuiInterceptor.name);
  private enabled = false;

  constructor(private readonly eventBus: TuiEventBus) {}

  enable(): void {
    this.enabled = true;
    this.logger.log('TuiInterceptor enabled');
  }

  disable(): void {
    this.enabled = false;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async intercept<T>(
    toolName: string,
    args: Record<string, unknown> | undefined,
    execute: () => Promise<T>,
  ): Promise<T> {
    if (!this.enabled) {
      return execute();
    }

    const agentInfo = parseAgentFromToolName(toolName, args);

    if (!agentInfo) {
      return execute();
    }

    // Emit agent:activated asynchronously to prevent MCP response delay
    setImmediate(() => {
      this.eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, agentInfo);
    });

    const startTime = Date.now();

    try {
      const result = await execute();

      setImmediate(() => {
        this.eventBus.emit(TUI_EVENTS.AGENT_DEACTIVATED, {
          agentId: agentInfo.agentId,
          reason: 'completed',
          durationMs: Date.now() - startTime,
        });
      });

      return result;
    } catch (error) {
      setImmediate(() => {
        this.eventBus.emit(TUI_EVENTS.AGENT_DEACTIVATED, {
          agentId: agentInfo.agentId,
          reason: 'error',
          durationMs: Date.now() - startTime,
        });
      });

      throw error;
    }
  }
}
```

**Step 4: 테스트 통과 확인**

Run: `cd apps/mcp-server && yarn vitest run src/tui/events/tui-interceptor.spec.ts`
Expected: PASS

**Step 5: 커밋**

```bash
git add apps/mcp-server/src/tui/events/tui-interceptor.ts apps/mcp-server/src/tui/events/tui-interceptor.spec.ts
git commit -m "feat(tui): implement TuiInterceptor with agent event emission"
```

---

## Task 4: TuiEventsModule에 TuiInterceptor 등록 및 export 업데이트

**Files:**
- Modify: `apps/mcp-server/src/tui/events/events.module.ts`
- Modify: `apps/mcp-server/src/tui/events/index.ts`

**Step 1: events.module.ts 수정**

```typescript
@Module({
  providers: [TuiEventBus, TuiInterceptor],
  exports: [TuiEventBus, TuiInterceptor],
})
export class TuiEventsModule {}
```

**Step 2: index.ts에 export 추가**

```typescript
export { TuiInterceptor } from './tui-interceptor';
export { parseAgentFromToolName } from './parse-agent';
```

**Step 3: 기존 테스트 통과 확인**

Run: `cd apps/mcp-server && yarn vitest run src/tui/events/`
Expected: 모든 테스트 PASS

**Step 4: 커밋**

```bash
git add apps/mcp-server/src/tui/events/events.module.ts apps/mcp-server/src/tui/events/index.ts
git commit -m "feat(tui): register TuiInterceptor in TuiEventsModule"
```

---

## Task 5: McpService에 TuiInterceptor 통합

**Files:**
- Modify: `apps/mcp-server/src/mcp/mcp.service.ts`
- Modify: `apps/mcp-server/src/mcp/mcp.module.ts`
- Modify: `apps/mcp-server/src/mcp/mcp.service.spec.ts`

**Step 1: McpModule에 TuiEventsModule import 추가**

`mcp.module.ts`의 imports 배열에 `TuiEventsModule` 추가:

```typescript
imports: [
  // ... existing imports
  TuiEventsModule,  // <-- 추가
],
```

**Step 2: McpService constructor에 TuiInterceptor 주입**

```typescript
constructor(
  private rulesService: RulesService,
  private configService: ConfigService,
  @Inject(TOOL_HANDLERS) private toolHandlers: ToolHandler[],
  private tuiInterceptor: TuiInterceptor,  // <-- 추가
) {
```

**Step 3: registerToolsOn에 인터셉터 래핑 적용**

`CallToolRequestSchema` 핸들러를 수정하여 `tuiInterceptor.intercept`로 래핑:

```typescript
server.setRequestHandler(CallToolRequestSchema, async request => {
  const { name, arguments: args } = request.params;

  return this.tuiInterceptor.intercept(name, args, async () => {
    for (const handler of this.toolHandlers) {
      const result = await handler.handle(name, args);
      if (result !== null) {
        return result;
      }
    }
    throw new McpError(ErrorCode.MethodNotFound, `Tool not found: ${name}`);
  });
});
```

**Step 4: mcp.service.spec.ts 업데이트**

기존 테스트에서 `TuiInterceptor` mock 추가. `TuiInterceptor`의 `intercept` 메서드가 pass-through로 동작하도록 mock:

```typescript
const mockTuiInterceptor = {
  intercept: vi.fn((name, args, execute) => execute()),
  enable: vi.fn(),
  disable: vi.fn(),
  isEnabled: vi.fn(() => false),
};
```

**Step 5: 전체 테스트 통과 확인**

Run: `cd apps/mcp-server && yarn vitest run src/mcp/`
Expected: 모든 테스트 PASS

**Step 6: 커밋**

```bash
git add apps/mcp-server/src/mcp/mcp.service.ts apps/mcp-server/src/mcp/mcp.module.ts apps/mcp-server/src/mcp/mcp.service.spec.ts
git commit -m "feat(tui): integrate TuiInterceptor into MCP tool dispatch layer"
```

---

## Task 6: --tui 플래그 연동 (main.ts에서 인터셉터 활성화)

**Files:**
- Modify: `apps/mcp-server/src/main.ts`
- Modify: `apps/mcp-server/src/main.spec.ts`

**Step 1: main.ts의 bootstrap에서 TUI 활성화 시 인터셉터 enable**

`bootstrap` 함수의 `tuiEnabled` 분기에서 `TuiInterceptor.enable()` 호출 추가:

```typescript
// Stdio mode에서:
if (tuiEnabled && process.stderr.isTTY) {
  try {
    const { TuiInterceptor } = await import('./tui/events');
    const tuiInterceptor = app.get(TuiInterceptor);
    tuiInterceptor.enable();
    await initTui(app, process.stderr);
    debugLog('TUI Agent Monitor started (stderr)');
  } catch (error) {
    debugLog(`Failed to start TUI Agent Monitor: ${error}`);
  }
}

// SSE mode에서 유사하게:
if (tuiEnabled) {
  try {
    const { TuiInterceptor } = await import('./tui/events');
    const tuiInterceptor = app.get(TuiInterceptor);
    tuiInterceptor.enable();
    await initTui(app);
    logger.log('TUI Agent Monitor started (stdout)');
  } catch (error) {
    logger.error('Failed to start TUI Agent Monitor', error);
  }
}
```

**Step 2: main.spec.ts 업데이트**

TUI 활성화 시 `TuiInterceptor.enable()`이 호출되는지 확인하는 테스트 추가.

**Step 3: 전체 테스트 통과 확인**

Run: `cd apps/mcp-server && yarn vitest run src/main.spec.ts`
Expected: PASS

**Step 4: 커밋**

```bash
git add apps/mcp-server/src/main.ts apps/mcp-server/src/main.spec.ts
git commit -m "feat(tui): enable TuiInterceptor when --tui flag is present (#335)"
```

---

## Task 7: 전체 테스트 실행 및 최종 검증

**Step 1: 전체 테스트 스위트 실행**

Run: `cd apps/mcp-server && yarn test`
Expected: 모든 테스트 PASS

**Step 2: 빌드 확인**

Run: `cd apps/mcp-server && yarn build`
Expected: 빌드 성공 (TypeScript 컴파일 에러 없음)

**Step 3: 최종 커밋 (필요시)**

---

## 파일 변경 요약

| 파일 | 변경 유형 | 설명 |
|------|-----------|------|
| `tui/events/types.ts` | 수정 | `AgentDeactivatedEvent`에 `durationMs` 추가 |
| `tui/events/types.spec.ts` | 수정 | `durationMs` 타입 테스트 추가 |
| `tui/events/parse-agent.ts` | 생성 | `parseAgentFromToolName` 순수 함수 |
| `tui/events/parse-agent.spec.ts` | 생성 | 파서 유닛 테스트 |
| `tui/events/tui-interceptor.ts` | 생성 | `TuiInterceptor` 클래스 |
| `tui/events/tui-interceptor.spec.ts` | 생성 | 인터셉터 유닛 테스트 |
| `tui/events/events.module.ts` | 수정 | TuiInterceptor 등록 |
| `tui/events/index.ts` | 수정 | 새 심볼 export |
| `mcp/mcp.service.ts` | 수정 | 인터셉터 주입 및 도구 디스패치 래핑 |
| `mcp/mcp.module.ts` | 수정 | TuiEventsModule import |
| `mcp/mcp.service.spec.ts` | 수정 | 인터셉터 mock 추가 |
| `main.ts` | 수정 | --tui 플래그로 인터셉터 활성화 |
| `main.spec.ts` | 수정 | 활성화 테스트 |
