# EventBus (EventEmitter2) Module Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** TUI Agent Monitor의 핵심 이벤트 시스템인 EventBus를 EventEmitter2 기반의 NestJS Injectable 서비스로 구현한다.

**Architecture:** EventEmitter2를 래핑한 `TuiEventBus` 클래스를 NestJS `@Injectable()` 서비스로 구현. 6개의 타입-세이프 이벤트 인터페이스를 정의하고, emit/on/off/once 메서드를 제공한다. `TuiEventsModule`로 NestJS DI 컨테이너에 등록.

**Tech Stack:** TypeScript, EventEmitter2 6.4.9, NestJS, Vitest

**GitHub Issue:** [#332](https://github.com/JeremyDev87/codingbuddy/issues/332)

---

## 현재 상태 분석

### 이미 존재하는 것
- `eventemitter2@6.4.9` 설치 완료 (#330 CLOSED)
- `apps/mcp-server/src/tui/events/` 디렉토리 (.gitkeep만 존재)
- `apps/mcp-server/src/tui/types.ts`에 기본 이벤트 타입 정의:
  - `TUI_EVENT_TYPES`: `['agent:start', 'agent:progress', 'agent:complete', 'agent:fail', 'mode:change']`
  - `TuiEvent<T>` 제네릭 인터페이스
  - `AgentState`, `Mode` 타입

### 설계 결정

1. **이벤트 타입 확장**: 기존 `TUI_EVENT_TYPES`를 이슈에서 요구하는 6개 이벤트로 확장/매핑
   - `agent:activated` → `AgentActivatedEvent`
   - `agent:deactivated` → `AgentDeactivatedEvent`
   - `mode:changed` → `ModeChangedEvent`
   - `skill:recommended` → `SkillRecommendedEvent`
   - `parallel:started` → `ParallelStartedEvent`
   - `parallel:completed` → `ParallelCompletedEvent`

2. **타입 안전성**: 각 이벤트별 payload 인터페이스를 정의하고, EventEmitter2 emit/on을 타입-세이프하게 래핑

3. **기존 `tui/types.ts` 유지**: 새 이벤트 타입은 `events/types.ts`에 별도 정의. 기존 `TUI_EVENT_TYPES`는 하위 호환을 위해 유지하되, deprecated 표시 후 새 타입으로 확장

---

## Task 1: 이벤트 인터페이스 정의 (events/types.ts)

**Files:**
- Create: `apps/mcp-server/src/tui/events/types.ts`
- Modify: `apps/mcp-server/src/tui/types.ts` (TUI_EVENT_TYPES 확장)

### Step 1: 실패하는 테스트 작성

**File:** Create `apps/mcp-server/src/tui/events/types.spec.ts`

```typescript
import { describe, it, expect } from 'vitest';
import {
  TUI_EVENTS,
  type AgentActivatedEvent,
  type AgentDeactivatedEvent,
  type ModeChangedEvent,
  type SkillRecommendedEvent,
  type ParallelStartedEvent,
  type ParallelCompletedEvent,
  type TuiEventMap,
} from './types';

describe('tui/events/types', () => {
  describe('TUI_EVENTS', () => {
    it('should define all 6 event names', () => {
      expect(TUI_EVENTS).toEqual({
        AGENT_ACTIVATED: 'agent:activated',
        AGENT_DEACTIVATED: 'agent:deactivated',
        MODE_CHANGED: 'mode:changed',
        SKILL_RECOMMENDED: 'skill:recommended',
        PARALLEL_STARTED: 'parallel:started',
        PARALLEL_COMPLETED: 'parallel:completed',
      });
    });

    it('should be readonly', () => {
      expect(Object.isFrozen(TUI_EVENTS)).toBe(true);
    });
  });

  describe('event interfaces type compatibility', () => {
    it('should create AgentActivatedEvent', () => {
      const event: AgentActivatedEvent = {
        agentId: 'agent-1',
        name: 'frontend-developer',
        role: 'Frontend Developer',
        isPrimary: true,
      };
      expect(event.agentId).toBe('agent-1');
    });

    it('should create AgentDeactivatedEvent', () => {
      const event: AgentDeactivatedEvent = {
        agentId: 'agent-1',
        reason: 'completed',
      };
      expect(event.reason).toBe('completed');
    });

    it('should create ModeChangedEvent', () => {
      const event: ModeChangedEvent = {
        from: 'PLAN',
        to: 'ACT',
      };
      expect(event.to).toBe('ACT');
    });

    it('should create SkillRecommendedEvent', () => {
      const event: SkillRecommendedEvent = {
        skillName: 'brainstorming',
        reason: 'Creative task detected',
      };
      expect(event.skillName).toBe('brainstorming');
    });

    it('should create ParallelStartedEvent', () => {
      const event: ParallelStartedEvent = {
        specialists: ['security-specialist', 'performance-specialist'],
        mode: 'EVAL',
      };
      expect(event.specialists).toHaveLength(2);
    });

    it('should create ParallelCompletedEvent', () => {
      const event: ParallelCompletedEvent = {
        specialists: ['security-specialist'],
        results: { 'security-specialist': 'completed' },
      };
      expect(event.results).toBeDefined();
    });
  });

  describe('TuiEventMap', () => {
    it('should map event names to payload types', () => {
      const map: TuiEventMap = {
        'agent:activated': {
          agentId: 'a1',
          name: 'test',
          role: 'tester',
          isPrimary: false,
        },
        'agent:deactivated': { agentId: 'a1', reason: 'done' },
        'mode:changed': { from: 'PLAN', to: 'ACT' },
        'skill:recommended': { skillName: 's1', reason: 'r' },
        'parallel:started': { specialists: [], mode: 'PLAN' },
        'parallel:completed': { specialists: [], results: {} },
      };
      expect(map['agent:activated'].agentId).toBe('a1');
    });
  });
});
```

### Step 2: 테스트 실행하여 실패 확인

Run: `yarn workspace codingbuddy exec vitest run src/tui/events/types.spec.ts`
Expected: FAIL - 모듈을 찾을 수 없음

### Step 3: 이벤트 타입 구현

**File:** Create `apps/mcp-server/src/tui/events/types.ts`

```typescript
/**
 * TUI EventBus Event Types and Interfaces
 *
 * Defines the 6 core events for the TUI Agent Monitor event system.
 * Each event has a typed payload interface for type-safe emit/subscribe.
 */
import type { Mode } from '../../keyword/keyword.types';

/**
 * Event name constants for the TUI EventBus
 */
export const TUI_EVENTS = Object.freeze({
  AGENT_ACTIVATED: 'agent:activated',
  AGENT_DEACTIVATED: 'agent:deactivated',
  MODE_CHANGED: 'mode:changed',
  SKILL_RECOMMENDED: 'skill:recommended',
  PARALLEL_STARTED: 'parallel:started',
  PARALLEL_COMPLETED: 'parallel:completed',
} as const);

export type TuiEventName = (typeof TUI_EVENTS)[keyof typeof TUI_EVENTS];

/** Payload when a specialist agent is activated */
export interface AgentActivatedEvent {
  agentId: string;
  name: string;
  role: string;
  isPrimary: boolean;
}

/** Payload when a specialist agent is deactivated */
export interface AgentDeactivatedEvent {
  agentId: string;
  reason: string;
}

/** Payload when the workflow mode changes */
export interface ModeChangedEvent {
  from: Mode | null;
  to: Mode;
}

/** Payload when a skill is recommended */
export interface SkillRecommendedEvent {
  skillName: string;
  reason: string;
}

/** Payload when parallel specialist execution starts */
export interface ParallelStartedEvent {
  specialists: string[];
  mode: Mode;
}

/** Payload when parallel specialist execution completes */
export interface ParallelCompletedEvent {
  specialists: string[];
  results: Record<string, string>;
}

/**
 * Maps event names to their payload types for type-safe emit/subscribe.
 */
export interface TuiEventMap {
  [TUI_EVENTS.AGENT_ACTIVATED]: AgentActivatedEvent;
  [TUI_EVENTS.AGENT_DEACTIVATED]: AgentDeactivatedEvent;
  [TUI_EVENTS.MODE_CHANGED]: ModeChangedEvent;
  [TUI_EVENTS.SKILL_RECOMMENDED]: SkillRecommendedEvent;
  [TUI_EVENTS.PARALLEL_STARTED]: ParallelStartedEvent;
  [TUI_EVENTS.PARALLEL_COMPLETED]: ParallelCompletedEvent;
}
```

### Step 4: 테스트 통과 확인

Run: `yarn workspace codingbuddy exec vitest run src/tui/events/types.spec.ts`
Expected: PASS

### Step 5: 커밋

```bash
git add apps/mcp-server/src/tui/events/types.ts apps/mcp-server/src/tui/events/types.spec.ts
git commit -m "feat(tui): define 6 event interfaces for EventBus (#332)"
```

---

## Task 2: TuiEventBus 서비스 구현 (events/event-bus.ts)

**Files:**
- Create: `apps/mcp-server/src/tui/events/event-bus.ts`
- Create: `apps/mcp-server/src/tui/events/event-bus.spec.ts`

### Step 1: 실패하는 테스트 작성

**File:** Create `apps/mcp-server/src/tui/events/event-bus.spec.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TuiEventBus } from './event-bus';
import { TUI_EVENTS } from './types';
import type {
  AgentActivatedEvent,
  ModeChangedEvent,
  ParallelCompletedEvent,
} from './types';

describe('TuiEventBus', () => {
  let eventBus: TuiEventBus;

  beforeEach(() => {
    eventBus = new TuiEventBus();
  });

  describe('emit and on', () => {
    it('should emit and receive agent:activated event', () => {
      const handler = vi.fn();
      const payload: AgentActivatedEvent = {
        agentId: 'agent-1',
        name: 'frontend-developer',
        role: 'Frontend Developer',
        isPrimary: true,
      };

      eventBus.on(TUI_EVENTS.AGENT_ACTIVATED, handler);
      eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, payload);

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith(payload);
    });

    it('should emit and receive mode:changed event', () => {
      const handler = vi.fn();
      const payload: ModeChangedEvent = { from: 'PLAN', to: 'ACT' };

      eventBus.on(TUI_EVENTS.MODE_CHANGED, handler);
      eventBus.emit(TUI_EVENTS.MODE_CHANGED, payload);

      expect(handler).toHaveBeenCalledWith(payload);
    });

    it('should support multiple listeners for same event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const payload: AgentActivatedEvent = {
        agentId: 'a1',
        name: 'test',
        role: 'tester',
        isPrimary: false,
      };

      eventBus.on(TUI_EVENTS.AGENT_ACTIVATED, handler1);
      eventBus.on(TUI_EVENTS.AGENT_ACTIVATED, handler2);
      eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, payload);

      expect(handler1).toHaveBeenCalledOnce();
      expect(handler2).toHaveBeenCalledOnce();
    });
  });

  describe('off', () => {
    it('should remove a specific listener', () => {
      const handler = vi.fn();
      eventBus.on(TUI_EVENTS.AGENT_ACTIVATED, handler);
      eventBus.off(TUI_EVENTS.AGENT_ACTIVATED, handler);

      eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
        agentId: 'a1',
        name: 'test',
        role: 'tester',
        isPrimary: false,
      });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('once', () => {
    it('should only fire handler once', () => {
      const handler = vi.fn();
      const payload: ModeChangedEvent = { from: null, to: 'PLAN' };

      eventBus.once(TUI_EVENTS.MODE_CHANGED, handler);
      eventBus.emit(TUI_EVENTS.MODE_CHANGED, payload);
      eventBus.emit(TUI_EVENTS.MODE_CHANGED, payload);

      expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe('removeAllListeners', () => {
    it('should remove all listeners for a specific event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.on(TUI_EVENTS.AGENT_ACTIVATED, handler1);
      eventBus.on(TUI_EVENTS.AGENT_ACTIVATED, handler2);
      eventBus.removeAllListeners(TUI_EVENTS.AGENT_ACTIVATED);

      eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
        agentId: 'a1',
        name: 'test',
        role: 'tester',
        isPrimary: false,
      });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });

    it('should remove all listeners when called without args', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.on(TUI_EVENTS.AGENT_ACTIVATED, handler1);
      eventBus.on(TUI_EVENTS.MODE_CHANGED, handler2);
      eventBus.removeAllListeners();

      eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
        agentId: 'a1',
        name: 'test',
        role: 'tester',
        isPrimary: false,
      });
      eventBus.emit(TUI_EVENTS.MODE_CHANGED, { from: null, to: 'PLAN' });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });
  });

  describe('listenerCount', () => {
    it('should return number of listeners for an event', () => {
      expect(eventBus.listenerCount(TUI_EVENTS.AGENT_ACTIVATED)).toBe(0);

      eventBus.on(TUI_EVENTS.AGENT_ACTIVATED, vi.fn());
      expect(eventBus.listenerCount(TUI_EVENTS.AGENT_ACTIVATED)).toBe(1);

      eventBus.on(TUI_EVENTS.AGENT_ACTIVATED, vi.fn());
      expect(eventBus.listenerCount(TUI_EVENTS.AGENT_ACTIVATED)).toBe(2);
    });
  });

  describe('NestJS compatibility', () => {
    it('should be instantiable (Injectable-ready)', () => {
      expect(eventBus).toBeDefined();
      expect(eventBus).toBeInstanceOf(TuiEventBus);
    });
  });
});
```

### Step 2: 테스트 실행하여 실패 확인

Run: `yarn workspace codingbuddy exec vitest run src/tui/events/event-bus.spec.ts`
Expected: FAIL - 모듈을 찾을 수 없음

### Step 3: EventBus 구현

**File:** Create `apps/mcp-server/src/tui/events/event-bus.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from 'eventemitter2';
import type { TuiEventMap, TuiEventName } from './types';

type EventHandler<T> = (payload: T) => void;

/**
 * TuiEventBus - Type-safe event bus for TUI Agent Monitor
 *
 * Wraps EventEmitter2 to provide type-safe emit/on/off/once operations
 * for TUI events. Registered as NestJS Injectable for DI sharing.
 */
@Injectable()
export class TuiEventBus {
  private readonly logger = new Logger(TuiEventBus.name);
  private readonly emitter = new EventEmitter2();

  emit<K extends TuiEventName>(event: K, payload: TuiEventMap[K]): void {
    this.logger.debug?.(`Emitting event: ${event}`);
    this.emitter.emit(event, payload);
  }

  on<K extends TuiEventName>(
    event: K,
    handler: EventHandler<TuiEventMap[K]>,
  ): void {
    this.emitter.on(event, handler as (...args: unknown[]) => void);
  }

  off<K extends TuiEventName>(
    event: K,
    handler: EventHandler<TuiEventMap[K]>,
  ): void {
    this.emitter.off(event, handler as (...args: unknown[]) => void);
  }

  once<K extends TuiEventName>(
    event: K,
    handler: EventHandler<TuiEventMap[K]>,
  ): void {
    this.emitter.once(event, handler as (...args: unknown[]) => void);
  }

  removeAllListeners(event?: TuiEventName): void {
    this.emitter.removeAllListeners(event);
  }

  listenerCount(event: TuiEventName): number {
    return this.emitter.listenerCount(event);
  }
}
```

### Step 4: 테스트 통과 확인

Run: `yarn workspace codingbuddy exec vitest run src/tui/events/event-bus.spec.ts`
Expected: PASS

### Step 5: 커밋

```bash
git add apps/mcp-server/src/tui/events/event-bus.ts apps/mcp-server/src/tui/events/event-bus.spec.ts
git commit -m "feat(tui): implement TuiEventBus with EventEmitter2 (#332)"
```

---

## Task 3: NestJS 모듈 등록 (events/events.module.ts)

**Files:**
- Create: `apps/mcp-server/src/tui/events/events.module.ts`
- Create: `apps/mcp-server/src/tui/events/index.ts` (barrel export)
- Remove: `apps/mcp-server/src/tui/events/.gitkeep`

### Step 1: NestJS 모듈 생성

**File:** Create `apps/mcp-server/src/tui/events/events.module.ts`

```typescript
import { Module, Global } from '@nestjs/common';
import { TuiEventBus } from './event-bus';

@Global()
@Module({
  providers: [TuiEventBus],
  exports: [TuiEventBus],
})
export class TuiEventsModule {}
```

> `@Global()` 사용 이유: EventBus는 TUI 전체에서 공유되는 싱글톤이므로, 모든 모듈에서 import 없이 사용 가능하게 한다.

### Step 2: Barrel export 생성

**File:** Create `apps/mcp-server/src/tui/events/index.ts`

```typescript
export { TuiEventBus } from './event-bus';
export { TuiEventsModule } from './events.module';
export {
  TUI_EVENTS,
  type TuiEventName,
  type TuiEventMap,
  type AgentActivatedEvent,
  type AgentDeactivatedEvent,
  type ModeChangedEvent,
  type SkillRecommendedEvent,
  type ParallelStartedEvent,
  type ParallelCompletedEvent,
} from './types';
```

### Step 3: .gitkeep 제거

```bash
rm apps/mcp-server/src/tui/events/.gitkeep
```

### Step 4: 빌드 확인

Run: `yarn workspace codingbuddy build`
Expected: 빌드 성공

### Step 5: 커밋

```bash
git add apps/mcp-server/src/tui/events/
git commit -m "feat(tui): add TuiEventsModule and barrel exports (#332)"
```

---

## Task 4: tui/types.ts 이벤트 타입 확장

**Files:**
- Modify: `apps/mcp-server/src/tui/types.ts`
- Modify: `apps/mcp-server/src/tui/types.spec.ts`

### Step 1: types.ts에서 새 이벤트 타입 re-export 및 TUI_EVENT_TYPES 확장

`tui/types.ts`의 `TUI_EVENT_TYPES`를 새 6개 이벤트로 확장:

```typescript
// 기존 TUI_EVENT_TYPES 유지 + 새 이벤트 타입 추가
export const TUI_EVENT_TYPES = Object.freeze([
  'agent:start',
  'agent:progress',
  'agent:complete',
  'agent:fail',
  'mode:change',
  // New EventBus events
  'agent:activated',
  'agent:deactivated',
  'mode:changed',
  'skill:recommended',
  'parallel:started',
  'parallel:completed',
] as const);
```

### Step 2: types.spec.ts 업데이트

`TUI_EVENT_TYPES` 테스트에 새 이벤트 추가.

### Step 3: 테스트 통과 확인

Run: `yarn workspace codingbuddy exec vitest run src/tui/types.spec.ts`
Expected: PASS

### Step 4: 커밋

```bash
git add apps/mcp-server/src/tui/types.ts apps/mcp-server/src/tui/types.spec.ts
git commit -m "feat(tui): extend TUI_EVENT_TYPES with EventBus events (#332)"
```

---

## Task 5: 전체 테스트 실행 및 빌드 검증

### Step 1: 전체 EventBus 테스트 실행

Run: `yarn workspace codingbuddy exec vitest run src/tui/events/`
Expected: 모든 테스트 PASS

### Step 2: TUI 관련 전체 테스트

Run: `yarn workspace codingbuddy exec vitest run src/tui/`
Expected: 모든 테스트 PASS

### Step 3: 빌드 확인

Run: `yarn workspace codingbuddy build`
Expected: 빌드 성공, 에러 없음

### Step 4: 전체 테스트 스위트

Run: `yarn workspace codingbuddy test`
Expected: 전체 PASS

### Step 5: 최종 커밋 (필요시)

---

## 완료 체크리스트 (이슈 기준)

| 요구사항 | Task | 상태 |
|----------|------|------|
| `events/event-bus.ts` - TuiEventBus 클래스 | Task 2 | 📋 |
| `events/types.ts` - 6개 이벤트 인터페이스 | Task 1 | 📋 |
| NestJS `@Injectable()` 등록 | Task 2 + 3 | 📋 |
| 단위 테스트 (`event-bus.spec.ts`) | Task 2 | 📋 |
| EventBus emit/on/off 검증 | Task 2 | 📋 |
| 모든 이벤트 타입 테스트 | Task 1 + 2 | 📋 |
| NestJS 모듈 주입 가능 | Task 3 | 📋 |

## 파일 구조 (최종)

```
apps/mcp-server/src/tui/events/
├── event-bus.ts          # TuiEventBus @Injectable() 서비스
├── event-bus.spec.ts     # EventBus 단위 테스트
├── events.module.ts      # TuiEventsModule (@Global)
├── types.ts              # 6개 이벤트 인터페이스 + TUI_EVENTS 상수
├── types.spec.ts         # 이벤트 타입 테스트
└── index.ts              # Barrel exports
```
