# [Phase 1] Parse --tui CLI Flag and Integrate with main.ts

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** `--tui` 플래그를 감지하여 TUI Agent Monitor를 시작하고, NestJS DI의 TuiEventBus를 Ink 컴포넌트에 전달한다.

**Architecture:** `main.ts`의 `bootstrap()`에서 `--tui` 플래그 감지 후 NestJS 앱 생성 → DI에서 `TuiEventBus` 조회 → `startTui()`에 전달. stdio 모드에서는 stdout 보호를 위해 stderr로 TUI 렌더링.

**Tech Stack:** NestJS, React (Ink), EventEmitter2, Vitest

**Issue:** https://github.com/JeremyDev87/codingbuddy/issues/333

---

## Task 1: `hasTuiFlag()` 순수 함수 추출 및 테스트

**Files:**
- Create: `apps/mcp-server/src/tui/cli-flags.ts`
- Create: `apps/mcp-server/src/tui/cli-flags.spec.ts`

**Step 1: 실패하는 테스트 작성**

```typescript
// cli-flags.spec.ts
import { describe, it, expect } from 'vitest';
import { hasTuiFlag } from './cli-flags';

describe('hasTuiFlag', () => {
  it('should return true when --tui is present', () => {
    expect(hasTuiFlag(['node', 'main.ts', '--tui'])).toBe(true);
  });

  it('should return false when --tui is absent', () => {
    expect(hasTuiFlag(['node', 'main.ts'])).toBe(false);
  });

  it('should return false for empty argv', () => {
    expect(hasTuiFlag([])).toBe(false);
  });

  it('should not match partial flags like --tui-debug', () => {
    expect(hasTuiFlag(['node', 'main.ts', '--tui-debug'])).toBe(false);
  });
});
```

**Step 2: 테스트 실패 확인**

Run: `yarn workspace codingbuddy vitest run src/tui/cli-flags.spec.ts`
Expected: FAIL - module not found

**Step 3: 최소 구현**

```typescript
// cli-flags.ts
/**
 * Check if --tui flag is present in process arguments
 */
export function hasTuiFlag(argv: readonly string[]): boolean {
  return argv.includes('--tui');
}
```

**Step 4: 테스트 통과 확인**

Run: `yarn workspace codingbuddy vitest run src/tui/cli-flags.spec.ts`
Expected: PASS

**Step 5: 커밋**

```bash
git add apps/mcp-server/src/tui/cli-flags.ts apps/mcp-server/src/tui/cli-flags.spec.ts
git commit -m "feat(tui): add hasTuiFlag utility with tests"
```

---

## Task 2: `TuiEventsModule`을 `AppModule`에 등록

**Files:**
- Modify: `apps/mcp-server/src/app.module.ts`

**Step 1: `AppModule`에 `TuiEventsModule` import 추가**

```typescript
// app.module.ts - imports 배열에 추가
import { TuiEventsModule } from './tui/events/events.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    RulesModule,
    McpModule,
    KeywordModule,
    AgentModule,
    ChecklistModule,
    ContextModule,
    TuiEventsModule,
  ],
})
export class AppModule {}
```

**Step 2: 기존 테스트 통과 확인**

Run: `yarn workspace codingbuddy vitest run`
Expected: PASS (기존 테스트에 영향 없음)

**Step 3: 커밋**

```bash
git add apps/mcp-server/src/app.module.ts
git commit -m "feat(tui): register TuiEventsModule in AppModule"
```

---

## Task 3: `startTui()` 시그니처 업데이트 - eventBus와 stdout 수용

**Files:**
- Modify: `apps/mcp-server/src/tui/index.tsx`
- Modify: `apps/mcp-server/src/tui/app.tsx`
- Modify: `apps/mcp-server/src/tui/app.spec.tsx`

**Step 1: `App` 컴포넌트에 eventBus prop 추가 테스트**

```typescript
// app.spec.tsx - 기존 테스트 유지 + 새 테스트 추가
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { App } from './app';
import { TuiEventBus } from './events';

describe('tui/App', () => {
  it('should render the application title', () => {
    const { lastFrame } = render(<App />);
    expect(lastFrame()).toContain('Codingbuddy TUI Agent Monitor');
  });

  it('should render without errors', () => {
    expect(() => render(<App />)).not.toThrow();
  });

  it('should accept eventBus prop without errors', () => {
    const eventBus = new TuiEventBus();
    expect(() => render(<App eventBus={eventBus} />)).not.toThrow();
  });
});
```

**Step 2: 테스트 실패 확인**

Run: `yarn workspace codingbuddy vitest run src/tui/app.spec.tsx`
Expected: FAIL - eventBus prop not accepted

**Step 3: `App` 컴포넌트 수정 - eventBus prop 수용**

```tsx
// app.tsx
import React from 'react';
import { Text, Box } from 'ink';
import type { TuiEventBus } from './events';

export interface AppProps {
  eventBus?: TuiEventBus;
}

export function App({ eventBus }: AppProps): React.ReactElement {
  return (
    <Box flexDirection="column">
      <Text bold>Codingbuddy TUI Agent Monitor</Text>
    </Box>
  );
}
```

**Step 4: 테스트 통과 확인**

Run: `yarn workspace codingbuddy vitest run src/tui/app.spec.tsx`
Expected: PASS

**Step 5: `startTui()` 시그니처 업데이트**

```tsx
// index.tsx
import React from 'react';
import { render } from 'ink';
import type { Instance, RenderOptions } from 'ink';
import { App } from './app';
import type { TuiEventBus } from './events';

export interface StartTuiOptions {
  eventBus: TuiEventBus;
  stdout?: NodeJS.WriteStream;
}

/**
 * Start the TUI Agent Monitor
 * Returns Ink instance for lifecycle management (e.g. unmount on shutdown)
 */
export function startTui(options: StartTuiOptions): Instance {
  const renderOptions: RenderOptions = {};
  if (options.stdout) {
    renderOptions.stdout = options.stdout;
  }
  return render(<App eventBus={options.eventBus} />, renderOptions);
}

export { App } from './app';
export type { AppProps } from './app';
export * from './types';
```

**Step 6: 테스트 통과 확인**

Run: `yarn workspace codingbuddy vitest run src/tui/`
Expected: PASS

**Step 7: 커밋**

```bash
git add apps/mcp-server/src/tui/app.tsx apps/mcp-server/src/tui/app.spec.tsx apps/mcp-server/src/tui/index.tsx
git commit -m "feat(tui): update startTui to accept eventBus and stdout options"
```

---

## Task 4: `bootstrap()`에 `--tui` 플래그 통합

**Files:**
- Modify: `apps/mcp-server/src/main.ts`

**Step 1: main.ts에 TUI 통합 로직 추가**

`bootstrap()` 함수에서:
- NestJS 앱 생성 후 `--tui` 플래그 체크
- `TuiEventBus`를 DI에서 조회
- transport 모드에 따라 stdout 스트림 결정
- `startTui()` 호출
- Ink instance 반환하여 shutdown에 활용

```typescript
// main.ts - bootstrap() 함수 내 변경사항

import { hasTuiFlag } from './tui/cli-flags';
import type { Instance } from 'ink';

export async function bootstrap(): Promise<void> {
  const transportMode = process.env.MCP_TRANSPORT || 'stdio';
  const tuiEnabled = hasTuiFlag(process.argv);

  if (transportMode === 'sse') {
    const { Logger } = await import('@nestjs/common');
    const logger = new Logger('Bootstrap');
    const corsOrigin = parseCorsOrigin(process.env.CORS_ORIGIN);
    const app = await NestFactory.create(AppModule, {
      cors: corsOrigin !== false ? { origin: corsOrigin } : false,
    });
    const port = process.env.PORT || 3000;
    await app.listen(port);

    // Log CORS configuration (기존 로직 유지)
    if (corsOrigin === false) {
      logger.warn('SSE mode: CORS disabled (set CORS_ORIGIN to enable)');
    } else if (corsOrigin === true) {
      logger.warn('SSE mode: CORS enabled for all origins (*)');
    } else {
      logger.log(`SSE mode: CORS enabled for: ${JSON.stringify(corsOrigin)}`);
    }

    logger.log(`MCP Server running in SSE mode on port ${port}`);

    // TUI: SSE 모드에서는 stdout 사용
    if (tuiEnabled) {
      const { TuiEventBus } = await import('./tui/events');
      const { startTui } = await import('./tui');
      const eventBus = app.get(TuiEventBus);
      const instance = startTui({ eventBus });
      setupGracefulShutdown(instance);
      logger.log('TUI Agent Monitor started (stdout)');
    }
  } else {
    // Stdio Mode
    debugLog('Starting in stdio mode...');
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: false,
    });
    const mcpService = app.get(McpService);
    await mcpService.startStdio();
    debugLog('MCP Server connected via stdio');

    // TUI: stdio 모드에서는 stderr 사용 (stdout은 MCP JSON-RPC용)
    if (tuiEnabled) {
      const { TuiEventBus } = await import('./tui/events');
      const { startTui } = await import('./tui');
      const eventBus = app.get(TuiEventBus);
      const instance = startTui({ eventBus, stdout: process.stderr });
      setupGracefulShutdown(instance);
      debugLog('TUI Agent Monitor started (stderr)');
    }
  }
}
```

**Step 2: 기존 테스트 통과 확인**

Run: `yarn workspace codingbuddy vitest run`
Expected: PASS (--tui 없이 기존 동작 변경 없음)

**Step 3: 커밋**

```bash
git add apps/mcp-server/src/main.ts
git commit -m "feat(tui): integrate --tui flag detection in bootstrap"
```

---

## Task 5: Graceful Shutdown 핸들러 구현

**Files:**
- Modify: `apps/mcp-server/src/main.ts`

**Step 1: `setupGracefulShutdown()` 함수 작성**

```typescript
// main.ts - bootstrap() 앞에 추가

/**
 * Set up graceful shutdown for Ink TUI instance
 * Unmounts the Ink application on SIGINT to ensure clean terminal state
 */
function setupGracefulShutdown(instance: Instance): void {
  const shutdown = (): void => {
    debugLog('Graceful shutdown: unmounting TUI...');
    instance.unmount();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
```

**Step 2: 기존 테스트 통과 확인**

Run: `yarn workspace codingbuddy vitest run`
Expected: PASS

**Step 3: 커밋**

```bash
git add apps/mcp-server/src/main.ts
git commit -m "feat(tui): add graceful shutdown handler for Ink unmount"
```

---

## Task 6: `start:tui` 스크립트 추가

**Files:**
- Modify: `apps/mcp-server/package.json`

**Step 1: package.json scripts에 start:tui 추가**

```json
{
  "scripts": {
    "start:tui": "yarn ts-node src/main.ts --tui",
    "start:dev": "yarn ts-node src/main.ts"
  }
}
```

**Step 2: 스크립트 동작 확인**

Run: `yarn workspace codingbuddy start:tui`
Expected: TUI Agent Monitor 화면이 stderr에 렌더링 (stdio 모드 기본)

Run: `MCP_TRANSPORT=sse yarn workspace codingbuddy start:tui`
Expected: SSE 모드 + TUI 렌더링

**Step 3: 커밋**

```bash
git add apps/mcp-server/package.json
git commit -m "feat(tui): add start:tui script to package.json"
```

---

## Task 7: `tui/index.tsx` export 정리 및 통합 테스트

**Files:**
- Modify: `apps/mcp-server/src/tui/index.tsx`

**Step 1: index.tsx에서 cli-flags re-export**

```tsx
// index.tsx 하단에 추가
export { hasTuiFlag } from './cli-flags';
```

**Step 2: 전체 테스트 실행**

Run: `yarn workspace codingbuddy vitest run`
Expected: ALL PASS

**Step 3: 타입 체크**

Run: `yarn workspace codingbuddy typecheck`
Expected: PASS

**Step 4: Lint 및 포맷 체크**

Run: `yarn workspace codingbuddy lint && yarn workspace codingbuddy format:check`
Expected: PASS (또는 format 자동 수정 후 PASS)

**Step 5: 최종 커밋**

```bash
git add apps/mcp-server/src/tui/index.tsx
git commit -m "feat(tui): export hasTuiFlag from tui module"
```

---

## 완료 기준 체크리스트

- [ ] `--tui` 플래그로 TUI 모드 시작 (빈 화면이라도 에러 없이)
- [ ] `--tui` 없이 실행 시 기존 동작 변경 없음
- [ ] stdio 모드: TUI가 stderr로 렌더링
- [ ] SSE 모드: TUI가 stdout으로 렌더링
- [ ] `TuiEventBus`가 NestJS DI에서 조회되어 Ink에 전달
- [ ] SIGINT 시 Ink unmount로 깔끔한 터미널 상태 복원
- [ ] `start:tui` 스크립트 동작
- [ ] 모든 기존 테스트 통과
- [ ] TypeScript 타입 체크 통과
