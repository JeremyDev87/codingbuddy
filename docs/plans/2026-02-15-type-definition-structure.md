# Type Definition Structure 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Landing page 프로젝트에 Agent, Widget 공용 타입 정의 구조를 구축하여 타입 안전성 확보

**Architecture:** `apps/landing-page/types/` 디렉토리에 barrel export 패턴으로 타입 모듈을 구성. 기존 `jest-axe.d.ts`는 유지하고, `agents.ts`, `widgets.ts`를 추가한 뒤 `index.ts`에서 re-export.

**Tech Stack:** TypeScript 5.x, Next.js 16, React 19

**Issue:** https://github.com/JeremyDev87/codingbuddy/issues/311

---

## 현재 상태 분석

| 항목 | 상태 |
|------|------|
| `types/` 디렉토리 | 이미 존재 (`jest-axe.d.ts` 포함) |
| `tsconfig.json` path alias | 이미 설정됨 (`@/types`, `@/*`) |
| 선행 이슈 #309 | CLOSED (완료) |
| 기존 테스트 | `__tests__/lib/utils.test.ts`, `__tests__/setup.test.ts`, `__tests__/accessibility/page.test.tsx` |

## 설계 결정사항

1. **AgentCategory**: 이슈 명세의 5개 카테고리 (`Planning`, `Development`, `Review`, `Security`, `UX`) 그대로 사용
2. **Agent 인터페이스**: 실제 agent JSON 구조(`packages/rules/.ai-rules/agents/*.json`)의 핵심 필드를 랜딩 페이지용으로 단순화
3. **테스트 전략**: 순수 타입 정의이므로 타입 내보내기 검증 테스트 + TypeScript 컴파일 검증(`typecheck`)
4. **tsconfig.json**: path alias가 이미 설정되어 있으므로 수정 불필요

---

## Task 1: Agent 타입 테스트 작성 (Red)

**Files:**
- Create: `apps/landing-page/__tests__/types/agents.test.ts`

**Step 1: 실패하는 테스트 작성**

```typescript
// __tests__/types/agents.test.ts
import { describe, test, expect, expectTypeOf } from 'vitest';
import type {
  Agent,
  AgentCategory,
  AgentFilter,
} from '../../types/agents';

describe('Agent types', () => {
  test('Agent interface has required properties', () => {
    const agent: Agent = {
      id: 'frontend-developer',
      name: 'Frontend Developer',
      description: 'React/Next.js specialist',
      category: 'Development',
      icon: '💻',
      tags: ['react', 'nextjs'],
      expertise: ['React', 'TypeScript'],
    };

    expect(agent.id).toBe('frontend-developer');
    expect(agent.category).toBe('Development');
    expect(agent.tags).toHaveLength(2);
    expect(agent.expertise).toHaveLength(2);
  });

  test('AgentCategory is a valid union type', () => {
    const categories: AgentCategory[] = [
      'Planning',
      'Development',
      'Review',
      'Security',
      'UX',
    ];

    expect(categories).toHaveLength(5);
  });

  test('AgentFilter supports optional fields', () => {
    const filterAll: AgentFilter = {};
    const filterByCategory: AgentFilter = { category: 'Security' };
    const filterBySearch: AgentFilter = { searchQuery: 'react' };
    const filterBoth: AgentFilter = {
      category: 'Development',
      searchQuery: 'next',
    };
    const filterCategoryAll: AgentFilter = { category: 'all' };

    expect(filterAll).toBeDefined();
    expect(filterByCategory.category).toBe('Security');
    expect(filterBySearch.searchQuery).toBe('react');
    expect(filterBoth.category).toBe('Development');
    expect(filterCategoryAll.category).toBe('all');
  });
});
```

**Step 2: 테스트가 실패하는지 확인**

Run: `cd apps/landing-page && yarn test --run __tests__/types/agents.test.ts`
Expected: FAIL - `Cannot find module '../../types/agents'`

---

## Task 2: Agent 타입 구현 (Green)

**Files:**
- Create: `apps/landing-page/types/agents.ts`

**Step 3: 최소 구현**

```typescript
// types/agents.ts
/**
 * AI Agent Type Definitions
 * @description Landing page에서 사용하는 AI 에이전트 공용 타입
 */

/** 에이전트 카테고리 분류 */
export type AgentCategory =
  | 'Planning'
  | 'Development'
  | 'Review'
  | 'Security'
  | 'UX';

/** AI 에이전트 인터페이스 */
export interface Agent {
  /** 고유 에이전트 ID */
  id: string;
  /** 에이전트 이름 */
  name: string;
  /** 에이전트 설명 */
  description: string;
  /** 카테고리 (Planning, Development, Review, Security, UX) */
  category: AgentCategory;
  /** 아이콘 이모지 */
  icon: string;
  /** 태그 목록 */
  tags: string[];
  /** 전문 분야 */
  expertise: string[];
}

/** 에이전트 필터링 옵션 */
export interface AgentFilter {
  /** 카테고리 필터 ('all'이면 전체) */
  category?: AgentCategory | 'all';
  /** 검색어 */
  searchQuery?: string;
}
```

**Step 4: 테스트 통과 확인**

Run: `cd apps/landing-page && yarn test --run __tests__/types/agents.test.ts`
Expected: PASS

**Step 5: 커밋**

```bash
git add apps/landing-page/types/agents.ts apps/landing-page/__tests__/types/agents.test.ts
git commit -m "feat(landing-page): add agent type definitions with tests"
```

---

## Task 3: Widget 타입 테스트 작성 (Red)

**Files:**
- Create: `apps/landing-page/__tests__/types/widgets.test.ts`

**Step 6: 실패하는 테스트 작성**

```typescript
// __tests__/types/widgets.test.ts
import { describe, test, expect } from 'vitest';
import type {
  WidgetProps,
  CodeExampleProps,
  QuickStartStep,
} from '../../types/widgets';

describe('Widget types', () => {
  test('WidgetProps has locale property', () => {
    const props: WidgetProps = { locale: 'ko' };

    expect(props.locale).toBe('ko');
  });

  test('CodeExampleProps extends WidgetProps', () => {
    const props: CodeExampleProps = {
      locale: 'en',
      beforeCode: 'const x = 1;',
      afterCode: 'const x: number = 1;',
    };

    expect(props.locale).toBe('en');
    expect(props.beforeCode).toBeDefined();
    expect(props.afterCode).toBeDefined();
  });

  test('QuickStartStep has required properties', () => {
    const step: QuickStartStep = {
      step: 1,
      title: 'Install dependencies',
      code: 'yarn add codingbuddy',
    };

    expect(step.step).toBe(1);
    expect(step.title).toBe('Install dependencies');
    expect(step.code).toBeDefined();
  });

  test('QuickStartStep language is optional', () => {
    const stepWithLang: QuickStartStep = {
      step: 2,
      title: 'Configure',
      code: '{ "name": "project" }',
      language: 'json',
    };
    const stepWithoutLang: QuickStartStep = {
      step: 1,
      title: 'Install',
      code: 'yarn add codingbuddy',
    };

    expect(stepWithLang.language).toBe('json');
    expect(stepWithoutLang.language).toBeUndefined();
  });
});
```

**Step 7: 테스트가 실패하는지 확인**

Run: `cd apps/landing-page && yarn test --run __tests__/types/widgets.test.ts`
Expected: FAIL - `Cannot find module '../../types/widgets'`

---

## Task 4: Widget 타입 구현 (Green)

**Files:**
- Create: `apps/landing-page/types/widgets.ts`

**Step 8: 최소 구현**

```typescript
// types/widgets.ts
/**
 * Widget Common Type Definitions
 * @description Landing page 위젯 공용 타입
 */

/** 위젯 기본 Props */
export interface WidgetProps {
  /** i18n 로케일 */
  locale: string;
}

/** 코드 비교 예시 Props */
export interface CodeExampleProps extends WidgetProps {
  /** 변경 전 코드 */
  beforeCode: string;
  /** 변경 후 코드 */
  afterCode: string;
}

/** 빠른 시작 가이드 단계 */
export interface QuickStartStep {
  /** 단계 번호 */
  step: number;
  /** 단계 제목 */
  title: string;
  /** 코드 스니펫 */
  code: string;
  /** 코드 언어 (bash, json 등) */
  language?: string;
}
```

**Step 9: 테스트 통과 확인**

Run: `cd apps/landing-page && yarn test --run __tests__/types/widgets.test.ts`
Expected: PASS

**Step 10: 커밋**

```bash
git add apps/landing-page/types/widgets.ts apps/landing-page/__tests__/types/widgets.test.ts
git commit -m "feat(landing-page): add widget type definitions with tests"
```

---

## Task 5: Barrel Export 생성 및 통합 검증

**Files:**
- Create: `apps/landing-page/types/index.ts`
- Create: `apps/landing-page/__tests__/types/index.test.ts`

**Step 11: Barrel export 테스트 작성**

```typescript
// __tests__/types/index.test.ts
import { describe, test, expect } from 'vitest';
import type {
  Agent,
  AgentCategory,
  AgentFilter,
  WidgetProps,
  CodeExampleProps,
  QuickStartStep,
} from '../../types';

describe('types barrel export', () => {
  test('all agent types are re-exported', () => {
    const agent: Agent = {
      id: 'test',
      name: 'Test',
      description: 'Test agent',
      category: 'Development',
      icon: '🧪',
      tags: [],
      expertise: [],
    };
    const filter: AgentFilter = { category: 'all' };
    const category: AgentCategory = 'Planning';

    expect(agent).toBeDefined();
    expect(filter).toBeDefined();
    expect(category).toBeDefined();
  });

  test('all widget types are re-exported', () => {
    const widget: WidgetProps = { locale: 'ko' };
    const codeExample: CodeExampleProps = {
      locale: 'en',
      beforeCode: '',
      afterCode: '',
    };
    const step: QuickStartStep = {
      step: 1,
      title: 'Test',
      code: '',
    };

    expect(widget).toBeDefined();
    expect(codeExample).toBeDefined();
    expect(step).toBeDefined();
  });
});
```

**Step 12: Barrel export 파일 생성**

```typescript
// types/index.ts
export type { Agent, AgentCategory, AgentFilter } from './agents';
export type { WidgetProps, CodeExampleProps, QuickStartStep } from './widgets';
```

**Step 13: 전체 테스트 통과 확인**

Run: `cd apps/landing-page && yarn test --run __tests__/types/`
Expected: PASS (3 test files)

**Step 14: TypeScript 컴파일 검증**

Run: `cd apps/landing-page && yarn typecheck`
Expected: No errors

**Step 15: 커밋**

```bash
git add apps/landing-page/types/index.ts apps/landing-page/__tests__/types/index.test.ts
git commit -m "feat(landing-page): add barrel export for shared type definitions"
```

---

## 완료 기준 (Success Criteria)

- [x] `types/agents.ts` - Agent, AgentCategory, AgentFilter 타입 정의
- [x] `types/widgets.ts` - WidgetProps, CodeExampleProps, QuickStartStep 타입 정의
- [x] `types/index.ts` - Barrel export
- [x] TSDoc 주석 포함
- [x] `tsconfig.json` path alias 설정 (이미 완료)
- [x] TypeScript 에러 없음 (`yarn typecheck`)
- [x] 테스트 통과 (`yarn test`)
- [ ] 변경사항 커밋
