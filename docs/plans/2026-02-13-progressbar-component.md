# ProgressBar Component Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** ASCII 문자 기반 ProgressBar 컴포넌트를 구현하여 Agent 카드와 하단 상태바에서 사용

**Architecture:** Ink `<Text>` 컴포넌트를 활용한 순수 함수형 React 컴포넌트. 렌더링 로직(순수 함수)과 컴포넌트(UI)를 분리하여 TDD 적용. 기존 `utils/colors.ts`의 `getStatusColor`와 연동.

**Tech Stack:** React 19, Ink 6.7, TypeScript, Vitest, ink-testing-library

**Issue:** [#340](https://github.com/JeremyDev87/codingbuddy/issues/340) - [Phase 3] ProgressBar Component

---

## 설계 결정 사항

### Props 인터페이스
```typescript
interface ProgressBarProps {
  value: number;       // 0-100, clamped
  width: number;       // 문자 수 (기본값 10)
  color?: string;      // chalk 색상명 (e.g. 'cyan', 'green')
}
```

### 렌더링 로직
- **filled 문자:** `█` (U+2588)
- **empty 문자:** `░` (U+2591)
- `filledCount = Math.round((clampedValue / 100) * width)`
- `emptyCount = width - filledCount`
- 출력 예: `██████░░░░` (value=60, width=10)

### 파일 구조
```
apps/mcp-server/src/tui/
├── components/
│   ├── ProgressBar.tsx          # React 컴포넌트
│   ├── ProgressBar.spec.tsx     # 컴포넌트 테스트
│   ├── progress-bar.pure.ts     # 순수 함수 (렌더링 로직)
│   ├── progress-bar.pure.spec.ts # 순수 함수 테스트
│   └── index.ts                 # barrel export
```

### 순수/비순수 분리 원칙
- `progress-bar.pure.ts` — `buildProgressBar(value, width): string` 순수 함수
- `ProgressBar.tsx` — Ink `<Text>` 컴포넌트 (색상 적용)

---

## Task 1: 순수 함수 테스트 작성 (Red)

**Files:**
- Create: `apps/mcp-server/src/tui/components/progress-bar.pure.spec.ts`

**Step 1: 실패하는 테스트 작성**

```typescript
import { describe, it, expect } from 'vitest';
import { buildProgressBar, clampValue } from './progress-bar.pure';

describe('tui/components/progress-bar.pure', () => {
  describe('clampValue', () => {
    it('should return 0 for negative values', () => {
      expect(clampValue(-10)).toBe(0);
    });

    it('should return 100 for values over 100', () => {
      expect(clampValue(150)).toBe(100);
    });

    it('should return the value as-is for valid range', () => {
      expect(clampValue(65)).toBe(65);
    });

    it('should return 0 for 0', () => {
      expect(clampValue(0)).toBe(0);
    });

    it('should return 100 for 100', () => {
      expect(clampValue(100)).toBe(100);
    });
  });

  describe('buildProgressBar', () => {
    it('should render a full bar for value 100', () => {
      expect(buildProgressBar(100, 10)).toBe('██████████');
    });

    it('should render an empty bar for value 0', () => {
      expect(buildProgressBar(0, 10)).toBe('░░░░░░░░░░');
    });

    it('should render proportional fill for value 50', () => {
      expect(buildProgressBar(50, 10)).toBe('█████░░░░░');
    });

    it('should render proportional fill for value 65', () => {
      // Math.round(65/100 * 10) = Math.round(6.5) = 7
      expect(buildProgressBar(65, 10)).toBe('███████░░░');
    });

    it('should handle width of 1', () => {
      expect(buildProgressBar(50, 1)).toBe('█');
      expect(buildProgressBar(0, 1)).toBe('░');
    });

    it('should handle width of 20', () => {
      const result = buildProgressBar(50, 20);
      expect(result).toHaveLength(20);
      expect(result).toBe('██████████░░░░░░░░░░');
    });

    it('should clamp values below 0', () => {
      expect(buildProgressBar(-10, 10)).toBe('░░░░░░░░░░');
    });

    it('should clamp values above 100', () => {
      expect(buildProgressBar(150, 10)).toBe('██████████');
    });
  });
});
```

**Step 2: 테스트 실행하여 실패 확인**

Run: `yarn workspace codingbuddy test -- --run apps/mcp-server/src/tui/components/progress-bar.pure.spec.ts`
Expected: FAIL — 모듈을 찾을 수 없음

---

## Task 2: 순수 함수 구현 (Green)

**Files:**
- Create: `apps/mcp-server/src/tui/components/progress-bar.pure.ts`

**Step 3: 최소 구현**

```typescript
const FILLED_CHAR = '█';
const EMPTY_CHAR = '░';

export function clampValue(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export function buildProgressBar(value: number, width: number): string {
  const clamped = clampValue(value);
  const filledCount = Math.round((clamped / 100) * width);
  const emptyCount = width - filledCount;
  return FILLED_CHAR.repeat(filledCount) + EMPTY_CHAR.repeat(emptyCount);
}
```

**Step 4: 테스트 실행하여 통과 확인**

Run: `yarn workspace codingbuddy test -- --run apps/mcp-server/src/tui/components/progress-bar.pure.spec.ts`
Expected: PASS — 모든 테스트 통과

**Step 5: 커밋**

```bash
git add apps/mcp-server/src/tui/components/progress-bar.pure.ts apps/mcp-server/src/tui/components/progress-bar.pure.spec.ts
git commit -m "feat(tui): add ProgressBar pure rendering functions (#340)

- buildProgressBar(): ASCII 문자 기반 진행률 바 문자열 생성
- clampValue(): 0-100 범위 클램핑 유틸리티
- █ (filled) + ░ (empty) 문자 사용"
```

---

## Task 3: ProgressBar 컴포넌트 테스트 작성 (Red)

**Files:**
- Create: `apps/mcp-server/src/tui/components/ProgressBar.spec.tsx`

**Step 6: 컴포넌트 테스트 작성**

```typescript
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { ProgressBar } from './ProgressBar';

describe('tui/components/ProgressBar', () => {
  it('should render a progress bar with default width', () => {
    const { lastFrame } = render(<ProgressBar value={50} />);
    expect(lastFrame()).toContain('█████░░░░░');
  });

  it('should render a full bar for value 100', () => {
    const { lastFrame } = render(<ProgressBar value={100} width={10} />);
    expect(lastFrame()).toContain('██████████');
  });

  it('should render an empty bar for value 0', () => {
    const { lastFrame } = render(<ProgressBar value={0} width={10} />);
    expect(lastFrame()).toContain('░░░░░░░░░░');
  });

  it('should respect custom width', () => {
    const { lastFrame } = render(<ProgressBar value={50} width={20} />);
    const frame = lastFrame() ?? '';
    expect(frame).toContain('██████████░░░░░░░░░░');
  });

  it('should apply color prop', () => {
    // ink-testing-library strips ANSI codes, so we verify render doesn't throw
    expect(() => render(<ProgressBar value={50} width={10} color="cyan" />)).not.toThrow();
  });

  it('should clamp value below 0', () => {
    const { lastFrame } = render(<ProgressBar value={-20} width={10} />);
    expect(lastFrame()).toContain('░░░░░░░░░░');
  });

  it('should clamp value above 100', () => {
    const { lastFrame } = render(<ProgressBar value={200} width={10} />);
    expect(lastFrame()).toContain('██████████');
  });
});
```

**Step 7: 테스트 실행하여 실패 확인**

Run: `yarn workspace codingbuddy test -- --run apps/mcp-server/src/tui/components/ProgressBar.spec.tsx`
Expected: FAIL — ProgressBar 모듈을 찾을 수 없음

---

## Task 4: ProgressBar 컴포넌트 구현 (Green)

**Files:**
- Create: `apps/mcp-server/src/tui/components/ProgressBar.tsx`

**Step 8: 컴포넌트 구현**

```tsx
import React from 'react';
import { Text } from 'ink';
import { buildProgressBar } from './progress-bar.pure';

const DEFAULT_WIDTH = 10;

export interface ProgressBarProps {
  value: number;
  width?: number;
  color?: string;
}

export function ProgressBar({ value, width = DEFAULT_WIDTH, color }: ProgressBarProps): React.ReactElement {
  const bar = buildProgressBar(value, width);
  return <Text color={color}>{bar}</Text>;
}
```

**Step 9: 테스트 실행하여 통과 확인**

Run: `yarn workspace codingbuddy test -- --run apps/mcp-server/src/tui/components/ProgressBar.spec.tsx`
Expected: PASS

**Step 10: 커밋**

```bash
git add apps/mcp-server/src/tui/components/ProgressBar.tsx apps/mcp-server/src/tui/components/ProgressBar.spec.tsx
git commit -m "feat(tui): add ProgressBar React component (#340)

- Ink <Text> 기반 ProgressBar 컴포넌트
- Props: value, width (default 10), color (optional)
- 순수 함수 buildProgressBar() 활용"
```

---

## Task 5: Barrel export 및 통합

**Files:**
- Create: `apps/mcp-server/src/tui/components/index.ts`

**Step 11: barrel export 작성**

```typescript
export { ProgressBar, type ProgressBarProps } from './ProgressBar';
export { buildProgressBar, clampValue } from './progress-bar.pure';
```

**Step 12: 전체 테스트 실행**

Run: `yarn workspace codingbuddy test -- --run apps/mcp-server/src/tui/`
Expected: PASS — 기존 테스트 포함 모든 테스트 통과

**Step 13: 커밋**

```bash
git add apps/mcp-server/src/tui/components/index.ts
git commit -m "feat(tui): add components barrel export (#340)"
```

---

## 체크리스트

- [ ] 순수 함수 (`buildProgressBar`, `clampValue`) TDD 완료
- [ ] React 컴포넌트 (`ProgressBar`) TDD 완료
- [ ] Barrel export (`components/index.ts`) 작성
- [ ] 기존 테스트 회귀 없음
- [ ] TypeScript strict mode 준수 (`any` 없음)
- [ ] 기존 `utils/colors.ts` 색상 유틸리티와 호환

## 참고

- **의존성:** #339 (색상 유틸리티) — 이미 머지됨 ✅
- **사용처:** 향후 Agent 카드와 하단 상태바에서 `<ProgressBar value={agent.progress} color={getStatusColor(agent.status)} />` 형태로 사용
- **테스트 커버리지:** 경계값(0, 100), 클램핑(-10, 150), 다양한 width 포함
