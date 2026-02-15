# Widget-Slot Architecture (WSA) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Next.js Parallel Routes를 활용하여 위젯별 독립적인 loading/error 상태를 가진 Widget-Slot Architecture를 구현한다.

**Architecture:** `src/app/[locale]/` 하위에 `@agents`, `@code_example`, `@quick_start` 3개의 parallel route slot을 생성한다. 각 slot은 독립적인 loading.tsx와 error.tsx를 가지며, 대응하는 widget placeholder 컴포넌트를 렌더링한다. 기존 `src/app/layout.tsx`(Root Layout)는 유지하고, 새로운 `src/app/[locale]/layout.tsx`(Locale Layout)가 slot props를 받는다.

**Tech Stack:** Next.js 16 Parallel Routes, React 19 Server Components, TypeScript 5.x, shadcn/ui (Skeleton), Vitest

**Issue:** [#312](https://github.com/JeremyDev87/codingbuddy/issues/312)

---

## 사전 분석 및 설계 결정

### 현재 상태
- `src/app/layout.tsx` - Root Layout (fonts, ThemeProvider, Toaster, CookieConsent)
- `src/app/page.tsx` - 기본 Next.js 페이지 (placeholder)
- `types/` - Agent, Widget 타입 정의 완료 (#311)
- `components/ui/` - shadcn/ui 12개 컴포넌트 설치 완료 (#310)
- **Skeleton 컴포넌트 미설치** - loading.tsx에 필요하므로 설치 필요

### 설계 결정

| 결정 | 선택 | 근거 |
|------|------|------|
| 디렉토리 위치 | `src/app/[locale]/` | 기존 `src/app/` 구조 유지. 이슈의 `app/[locale]/`은 상대 경로로 해석 |
| i18n 방식 | locale 유틸리티 (next-intl 없이) | next-intl 미설치 상태. 향후 별도 이슈로 next-intl 통합 예정. 지금은 locale 파라미터 검증만 구현 |
| Root Layout | 기존 유지 + `lang` 속성 동적화 | Root Layout은 font, ThemeProvider 등 글로벌 설정 담당 유지 |
| Locale Layout | 신규 생성 | slot props 수신 및 독립적 렌더링 담당 |
| Widget 구조 | `widgets/<Name>/index.tsx` | tsconfig 경로 별칭 `@/widgets/*` 활용 |

### 최종 디렉토리 구조

```
src/app/
├── layout.tsx                    (기존 Root Layout - lang 속성 동적화)
├── page.tsx                      (기존 → redirect to /en or 삭제)
├── [locale]/
│   ├── layout.tsx                (Locale Layout - slot props 수신)
│   ├── page.tsx                  (Page Orchestrator - 정적 섹션)
│   ├── @agents/
│   │   ├── page.tsx              (AgentsShowcase 위젯 렌더링)
│   │   ├── loading.tsx           (Skeleton UI)
│   │   ├── error.tsx             (Error Boundary)
│   │   └── default.tsx           (Fallback)
│   ├── @code_example/
│   │   ├── page.tsx
│   │   ├── loading.tsx
│   │   └── default.tsx
│   └── @quick_start/
│       ├── page.tsx
│       ├── loading.tsx
│       └── default.tsx
lib/
├── locale.ts                     (locale 검증 유틸리티)
widgets/
├── AgentsShowcase/
│   └── index.tsx                 (placeholder)
├── CodeExample/
│   └── index.tsx                 (placeholder)
└── QuickStart/
    └── index.tsx                 (placeholder)
```

---

## Task 1: Skeleton 컴포넌트 설치

**Files:**
- Create: `components/ui/skeleton.tsx` (shadcn/ui CLI로 자동 생성)

**Step 1: shadcn/ui Skeleton 설치**

```bash
cd apps/landing-page
npx shadcn@latest add skeleton --yes
```

**Step 2: 설치 확인**

```bash
ls components/ui/skeleton.tsx
```

Expected: 파일 존재

**Step 3: 커밋**

```bash
git add components/ui/skeleton.tsx
git commit -m "feat(landing-page): add shadcn/ui Skeleton component for WSA loading states"
```

---

## Task 2: locale 유틸리티 생성 (TDD)

**Files:**
- Create: `apps/landing-page/lib/locale.ts`
- Test: `apps/landing-page/__tests__/lib/locale.test.ts`

**Step 1: 실패하는 테스트 작성**

```typescript
// __tests__/lib/locale.test.ts
import { describe, it, expect } from 'vitest';
import { SUPPORTED_LOCALES, DEFAULT_LOCALE, isValidLocale } from '@/lib/locale';

describe('locale utilities', () => {
  describe('SUPPORTED_LOCALES', () => {
    it('should contain en and ko', () => {
      expect(SUPPORTED_LOCALES).toContain('en');
      expect(SUPPORTED_LOCALES).toContain('ko');
    });
  });

  describe('DEFAULT_LOCALE', () => {
    it('should be en', () => {
      expect(DEFAULT_LOCALE).toBe('en');
    });
  });

  describe('isValidLocale', () => {
    it('should return true for supported locales', () => {
      expect(isValidLocale('en')).toBe(true);
      expect(isValidLocale('ko')).toBe(true);
    });

    it('should return false for unsupported locales', () => {
      expect(isValidLocale('fr')).toBe(false);
      expect(isValidLocale('')).toBe(false);
      expect(isValidLocale('invalid')).toBe(false);
    });
  });
});
```

**Step 2: 테스트 실행 - 실패 확인**

```bash
cd apps/landing-page && yarn test --reporter=verbose -- __tests__/lib/locale.test.ts
```

Expected: FAIL - `Cannot find module '@/lib/locale'`

**Step 3: 최소 구현**

```typescript
// lib/locale.ts
export const SUPPORTED_LOCALES = ['en', 'ko'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: SupportedLocale = 'en';

export const isValidLocale = (locale: string): locale is SupportedLocale =>
  SUPPORTED_LOCALES.includes(locale as SupportedLocale);
```

**Step 4: 테스트 실행 - 성공 확인**

```bash
cd apps/landing-page && yarn test --reporter=verbose -- __tests__/lib/locale.test.ts
```

Expected: PASS (3 tests)

**Step 5: 커밋**

```bash
git add apps/landing-page/lib/locale.ts apps/landing-page/__tests__/lib/locale.test.ts
git commit -m "feat(landing-page): add locale validation utilities with tests"
```

---

## Task 3: Widget Placeholder 컴포넌트 생성 (TDD)

**Files:**
- Create: `apps/landing-page/widgets/AgentsShowcase/index.tsx`
- Create: `apps/landing-page/widgets/CodeExample/index.tsx`
- Create: `apps/landing-page/widgets/QuickStart/index.tsx`
- Test: `apps/landing-page/__tests__/widgets/AgentsShowcase.test.tsx`
- Test: `apps/landing-page/__tests__/widgets/CodeExample.test.tsx`
- Test: `apps/landing-page/__tests__/widgets/QuickStart.test.tsx`

**Step 1: 실패하는 테스트 작성 (3개 위젯)**

```typescript
// __tests__/widgets/AgentsShowcase.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AgentsShowcase } from '@/widgets/AgentsShowcase';

describe('AgentsShowcase', () => {
  it('should render with locale prop', () => {
    render(<AgentsShowcase locale="en" />);
    expect(screen.getByTestId('agents-showcase')).toBeInTheDocument();
  });

  it('should display section heading', () => {
    render(<AgentsShowcase locale="en" />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('AI Agents');
  });
});
```

```typescript
// __tests__/widgets/CodeExample.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CodeExample } from '@/widgets/CodeExample';

describe('CodeExample', () => {
  it('should render with required props', () => {
    render(
      <CodeExample locale="en" beforeCode="// before" afterCode="// after" />
    );
    expect(screen.getByTestId('code-example')).toBeInTheDocument();
  });

  it('should display section heading', () => {
    render(
      <CodeExample locale="en" beforeCode="// before" afterCode="// after" />
    );
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Code Example');
  });
});
```

```typescript
// __tests__/widgets/QuickStart.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QuickStart } from '@/widgets/QuickStart';

describe('QuickStart', () => {
  it('should render with locale prop', () => {
    render(<QuickStart locale="en" />);
    expect(screen.getByTestId('quick-start')).toBeInTheDocument();
  });

  it('should display section heading', () => {
    render(<QuickStart locale="en" />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Quick Start');
  });
});
```

**Step 2: 테스트 실행 - 실패 확인**

```bash
cd apps/landing-page && yarn test --reporter=verbose -- __tests__/widgets/
```

Expected: FAIL - modules not found

**Step 3: 최소 구현**

```typescript
// widgets/AgentsShowcase/index.tsx
import type { WidgetProps } from '@/types';

export const AgentsShowcase = ({ locale }: WidgetProps) => (
  <section data-testid="agents-showcase" lang={locale}>
    <h2>AI Agents</h2>
    <p>Agents showcase widget - coming soon</p>
  </section>
);
```

```typescript
// widgets/CodeExample/index.tsx
import type { CodeExampleProps } from '@/types';

export const CodeExample = ({ locale, beforeCode, afterCode }: CodeExampleProps) => (
  <section data-testid="code-example" lang={locale}>
    <h2>Code Example</h2>
    <p>Code example widget - coming soon</p>
  </section>
);
```

```typescript
// widgets/QuickStart/index.tsx
import type { WidgetProps } from '@/types';

export const QuickStart = ({ locale }: WidgetProps) => (
  <section data-testid="quick-start" lang={locale}>
    <h2>Quick Start</h2>
    <p>Quick start widget - coming soon</p>
  </section>
);
```

**Step 4: 테스트 실행 - 성공 확인**

```bash
cd apps/landing-page && yarn test --reporter=verbose -- __tests__/widgets/
```

Expected: PASS (6 tests)

**Step 5: 커밋**

```bash
git add apps/landing-page/widgets/ apps/landing-page/__tests__/widgets/
git commit -m "feat(landing-page): add widget placeholder components with tests"
```

---

## Task 4: Parallel Routes 구조 생성 - Slot 파일들

**Files:**
- Create: `apps/landing-page/src/app/[locale]/@agents/page.tsx`
- Create: `apps/landing-page/src/app/[locale]/@agents/loading.tsx`
- Create: `apps/landing-page/src/app/[locale]/@agents/error.tsx`
- Create: `apps/landing-page/src/app/[locale]/@agents/default.tsx`
- Create: `apps/landing-page/src/app/[locale]/@code_example/page.tsx`
- Create: `apps/landing-page/src/app/[locale]/@code_example/loading.tsx`
- Create: `apps/landing-page/src/app/[locale]/@code_example/default.tsx`
- Create: `apps/landing-page/src/app/[locale]/@quick_start/page.tsx`
- Create: `apps/landing-page/src/app/[locale]/@quick_start/loading.tsx`
- Create: `apps/landing-page/src/app/[locale]/@quick_start/default.tsx`

**Step 1: @agents slot 파일 생성**

```typescript
// src/app/[locale]/@agents/page.tsx
import { AgentsShowcase } from '@/widgets/AgentsShowcase';

interface AgentsSlotProps {
  params: Promise<{ locale: string }>;
}

const AgentsSlot = async ({ params }: AgentsSlotProps) => {
  const { locale } = await params;
  return <AgentsShowcase locale={locale} />;
};

export default AgentsSlot;
```

```typescript
// src/app/[locale]/@agents/loading.tsx
import { Skeleton } from '@/components/ui/skeleton';

const AgentsLoading = () => (
  <section aria-busy="true" aria-label="Loading agents">
    <Skeleton className="h-8 w-48 mb-4" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-32 w-full rounded-lg" />
      ))}
    </div>
  </section>
);

export default AgentsLoading;
```

```typescript
// src/app/[locale]/@agents/error.tsx
'use client';

interface AgentsErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const AgentsError = ({ error, reset }: AgentsErrorProps) => (
  <section role="alert" aria-live="assertive">
    <h2>Failed to load agents</h2>
    <p>{error.message}</p>
    <button onClick={reset} type="button">
      Try again
    </button>
  </section>
);

export default AgentsError;
```

```typescript
// src/app/[locale]/@agents/default.tsx
const AgentsDefault = () => null;

export default AgentsDefault;
```

**Step 2: @code_example slot 파일 생성**

```typescript
// src/app/[locale]/@code_example/page.tsx
import { CodeExample } from '@/widgets/CodeExample';

interface CodeExampleSlotProps {
  params: Promise<{ locale: string }>;
}

// 임시 코드 예시 데이터 (향후 CMS/API에서 가져올 예정)
const PLACEHOLDER_BEFORE = '// Without Codingbuddy\n// Each AI tool has different rules...';
const PLACEHOLDER_AFTER = '// With Codingbuddy\n// One ruleset for all AI tools!';

const CodeExampleSlot = async ({ params }: CodeExampleSlotProps) => {
  const { locale } = await params;
  return (
    <CodeExample
      locale={locale}
      beforeCode={PLACEHOLDER_BEFORE}
      afterCode={PLACEHOLDER_AFTER}
    />
  );
};

export default CodeExampleSlot;
```

```typescript
// src/app/[locale]/@code_example/loading.tsx
import { Skeleton } from '@/components/ui/skeleton';

const CodeExampleLoading = () => (
  <section aria-busy="true" aria-label="Loading code example">
    <Skeleton className="h-8 w-48 mb-4" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Skeleton className="h-64 w-full rounded-lg" />
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  </section>
);

export default CodeExampleLoading;
```

```typescript
// src/app/[locale]/@code_example/default.tsx
const CodeExampleDefault = () => null;

export default CodeExampleDefault;
```

**Step 3: @quick_start slot 파일 생성**

```typescript
// src/app/[locale]/@quick_start/page.tsx
import { QuickStart } from '@/widgets/QuickStart';

interface QuickStartSlotProps {
  params: Promise<{ locale: string }>;
}

const QuickStartSlot = async ({ params }: QuickStartSlotProps) => {
  const { locale } = await params;
  return <QuickStart locale={locale} />;
};

export default QuickStartSlot;
```

```typescript
// src/app/[locale]/@quick_start/loading.tsx
import { Skeleton } from '@/components/ui/skeleton';

const QuickStartLoading = () => (
  <section aria-busy="true" aria-label="Loading quick start guide">
    <Skeleton className="h-8 w-48 mb-4" />
    <div className="space-y-4">
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-24 w-full rounded-lg" />
      ))}
    </div>
  </section>
);

export default QuickStartLoading;
```

```typescript
// src/app/[locale]/@quick_start/default.tsx
const QuickStartDefault = () => null;

export default QuickStartDefault;
```

**Step 4: 커밋**

```bash
git add apps/landing-page/src/app/\[locale\]/
git commit -m "feat(landing-page): add parallel route slot files for WSA"
```

---

## Task 5: Locale Layout 및 Page Orchestrator 생성

**Files:**
- Create: `apps/landing-page/src/app/[locale]/layout.tsx`
- Create: `apps/landing-page/src/app/[locale]/page.tsx`
- Modify: `apps/landing-page/src/app/layout.tsx` (lang 속성 동적화)
- Modify: `apps/landing-page/src/app/page.tsx` (redirect 또는 교체)

**Step 1: Locale Layout 작성**

```typescript
// src/app/[locale]/layout.tsx
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { isValidLocale } from '@/lib/locale';

interface LocaleLayoutProps {
  children: ReactNode;
  agents: ReactNode;
  code_example: ReactNode;
  quick_start: ReactNode;
  params: Promise<{ locale: string }>;
}

const LocaleLayout = async ({
  children,
  agents,
  code_example,
  quick_start,
  params,
}: LocaleLayoutProps) => {
  const { locale } = await params;

  if (!isValidLocale(locale)) {
    notFound();
  }

  return (
    <main id="main-content" className="flex min-h-screen flex-col">
      {children}
      {agents}
      {code_example}
      {quick_start}
    </main>
  );
};

export default LocaleLayout;
```

**Step 2: Page Orchestrator 작성**

```typescript
// src/app/[locale]/page.tsx
interface LocalePageProps {
  params: Promise<{ locale: string }>;
}

const LocalePage = async ({ params }: LocalePageProps) => {
  const { locale } = await params;

  return (
    <section className="py-16 px-4 text-center">
      <h1 className="text-4xl font-bold tracking-tight">
        Codingbuddy
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Multi-AI Rules for Consistent Coding
      </p>
    </section>
  );
};

export default LocalePage;
```

**Step 3: Root Layout 수정 - lang 속성 동적화**

기존 `src/app/layout.tsx`에서 `<html lang="en">`을 유지한다.
(향후 next-intl 통합 시 동적 locale 반영 예정. 현재는 Root Layout에서 locale 접근 불가.)

**Step 4: 기존 Root page.tsx를 locale redirect로 변경**

```typescript
// src/app/page.tsx
import { redirect } from 'next/navigation';
import { DEFAULT_LOCALE } from '@/lib/locale';

const RootPage = () => {
  redirect(`/${DEFAULT_LOCALE}`);
};

export default RootPage;
```

**Step 5: 커밋**

```bash
git add apps/landing-page/src/app/
git commit -m "feat(landing-page): add locale layout with slot rendering and page orchestrator"
```

---

## Task 6: 통합 테스트 및 타입 체크

**Files:**
- Test: `apps/landing-page/__tests__/app/locale-layout.test.tsx`

**Step 1: Locale Layout 통합 테스트 작성**

```typescript
// __tests__/app/locale-layout.test.tsx
import { describe, it, expect } from 'vitest';

describe('Locale Layout Structure', () => {
  it('should have all required slot directories', async () => {
    // 파일 시스템 구조 검증 (빌드 타임 보장)
    const slotFiles = [
      '@agents/page.tsx',
      '@agents/loading.tsx',
      '@agents/error.tsx',
      '@agents/default.tsx',
      '@code_example/page.tsx',
      '@code_example/loading.tsx',
      '@code_example/default.tsx',
      '@quick_start/page.tsx',
      '@quick_start/loading.tsx',
      '@quick_start/default.tsx',
    ];

    for (const file of slotFiles) {
      const exists = await import(`../../src/app/[locale]/${file}`)
        .then(() => true)
        .catch(() => false);
      expect(exists, `${file} should exist`).toBe(true);
    }
  });
});
```

**Step 2: 전체 테스트 실행**

```bash
cd apps/landing-page && yarn test
```

Expected: ALL PASS

**Step 3: 타입 체크**

```bash
cd apps/landing-page && yarn typecheck
```

Expected: 에러 없음

**Step 4: 린트 체크**

```bash
cd apps/landing-page && yarn lint
```

Expected: 에러 없음

**Step 5: 커밋**

```bash
git add apps/landing-page/__tests__/app/
git commit -m "test(landing-page): add locale layout integration tests"
```

---

## Task 7: 최종 검증 및 정리

**Step 1: 전체 validate 실행**

```bash
cd apps/landing-page && yarn validate
```

Expected: lint + format + typecheck + test + circular dependency 모두 PASS

**Step 2: 빌드 확인**

```bash
cd apps/landing-page && yarn build
```

Expected: 빌드 성공

**Step 3: 최종 커밋 (필요 시)**

변경사항 있으면 정리 커밋

---

## Success Criteria

- [x] Skeleton 컴포넌트 설치됨
- [ ] locale 유틸리티 테스트 통과
- [ ] 3개 widget placeholder 테스트 통과
- [ ] Parallel routes 구조 생성 (`@agents`, `@code_example`, `@quick_start`)
- [ ] 각 slot에 독립적 loading/error 상태
- [ ] Locale Layout이 slot props를 정상 수신
- [ ] Root page가 default locale로 redirect
- [ ] `yarn validate` 전체 통과
- [ ] `yarn build` 성공

## 향후 작업 (Out of Scope)

- **next-intl 통합**: 별도 이슈로 `NextIntlClientProvider` 설정 및 번역 파일 구조 추가
- **Widget 실제 구현**: 각 위젯의 실제 UI/로직은 별도 이슈
- **SEO metadata**: locale별 메타데이터는 i18n 통합 후 추가
