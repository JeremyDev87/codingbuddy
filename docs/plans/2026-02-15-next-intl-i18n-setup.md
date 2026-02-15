# next-intl i18n Setup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** next-intl v4를 설치하고 5개 언어(en, ko, zh-CN, ja, es)의 i18n 인프라를 구축한다.

**Architecture:** next-intl v4의 App Router 패턴을 따른다. `i18n/routing.ts`에서 라우팅 설정을 정의하고, `i18n/request.ts`에서 서버 요청 설정을 구성한다. `middleware.ts`가 locale 감지 및 리다이렉트를 처리하며, `NextIntlClientProvider`가 클라이언트 컴포넌트에 번역을 제공한다. 기존 `lib/locale.ts`는 next-intl의 routing config를 source of truth로 사용하도록 리팩터링한다.

**Tech Stack:** next-intl 4.x, Next.js 16, TypeScript, Vitest

**Issue:** https://github.com/JeremyDev87/codingbuddy/issues/313

---

## Task 1: next-intl 패키지 설치

**Files:**
- Modify: `apps/landing-page/package.json`

**Step 1: next-intl 설치**

Run: `cd apps/landing-page && yarn add next-intl@4`

**Step 2: 설치 확인**

Run: `cd apps/landing-page && yarn list next-intl`
Expected: next-intl@4.x.x

**Step 3: Commit**

```bash
git add apps/landing-page/package.json apps/landing-page/yarn.lock
git commit -m "feat(landing-page): install next-intl@4 for i18n support"
```

---

## Task 2: i18n 라우팅 설정 생성 (`i18n/routing.ts`)

**Files:**
- Create: `apps/landing-page/i18n/routing.ts`

**Step 1: routing.ts 테스트 작성**

Test: `apps/landing-page/__tests__/i18n/routing.test.ts`

```typescript
import { describe, test, expect } from 'vitest';
import { routing } from '../../i18n/routing';

describe('i18n routing configuration', () => {
  test('supports 5 locales', () => {
    expect(routing.locales).toHaveLength(5);
    expect(routing.locales).toEqual(['en', 'ko', 'zh-CN', 'ja', 'es']);
  });

  test('uses en as default locale', () => {
    expect(routing.defaultLocale).toBe('en');
  });
});
```

**Step 2: 테스트 실패 확인**

Run: `cd apps/landing-page && yarn vitest run __tests__/i18n/routing.test.ts`
Expected: FAIL (module not found)

**Step 3: routing.ts 구현**

```typescript
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'ko', 'zh-CN', 'ja', 'es'],
  defaultLocale: 'en',
  localePrefix: 'always',
});
```

**Step 4: 테스트 통과 확인**

Run: `cd apps/landing-page && yarn vitest run __tests__/i18n/routing.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/landing-page/i18n/routing.ts apps/landing-page/__tests__/i18n/routing.test.ts
git commit -m "feat(landing-page): add i18n routing configuration with 5 locales"
```

---

## Task 3: i18n 요청 설정 생성 (`i18n/request.ts`)

**Files:**
- Create: `apps/landing-page/i18n/request.ts`

**Step 1: request.ts 구현**

```typescript
import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
```

> Note: 이 파일은 next-intl 서버 런타임에서 호출되므로 단위 테스트 대신 통합 테스트로 검증한다.

**Step 2: Commit**

```bash
git add apps/landing-page/i18n/request.ts
git commit -m "feat(landing-page): add i18n request configuration for server components"
```

---

## Task 4: 메시지 파일 5개 생성

**Files:**
- Create: `apps/landing-page/messages/en.json`
- Create: `apps/landing-page/messages/ko.json`
- Create: `apps/landing-page/messages/zh-CN.json`
- Create: `apps/landing-page/messages/ja.json`
- Create: `apps/landing-page/messages/es.json`

**Step 1: 메시지 키 구조 테스트 작성**

Test: `apps/landing-page/__tests__/i18n/messages.test.ts`

```typescript
import { describe, test, expect } from 'vitest';
import en from '../../messages/en.json';
import ko from '../../messages/ko.json';
import zhCN from '../../messages/zh-CN.json';
import ja from '../../messages/ja.json';
import es from '../../messages/es.json';

const allMessages = { en, ko, 'zh-CN': zhCN, ja, es };
const referenceKeys = Object.keys(en);

describe('message files', () => {
  test('all locales have identical top-level keys', () => {
    for (const [locale, messages] of Object.entries(allMessages)) {
      expect(Object.keys(messages), `${locale} top-level keys mismatch`).toEqual(referenceKeys);
    }
  });

  test('all locales have identical nested keys for each section', () => {
    for (const section of referenceKeys) {
      const refNestedKeys = Object.keys((en as Record<string, Record<string, string>>)[section]).sort();
      for (const [locale, messages] of Object.entries(allMessages)) {
        const nestedKeys = Object.keys(
          (messages as Record<string, Record<string, string>>)[section]
        ).sort();
        expect(nestedKeys, `${locale}.${section} keys mismatch`).toEqual(refNestedKeys);
      }
    }
  });

  test('no empty string values in any locale', () => {
    for (const [locale, messages] of Object.entries(allMessages)) {
      for (const [section, content] of Object.entries(messages as Record<string, Record<string, string>>)) {
        for (const [key, value] of Object.entries(content)) {
          expect(value, `${locale}.${section}.${key} is empty`).not.toBe('');
        }
      }
    }
  });
});
```

**Step 2: 테스트 실패 확인**

Run: `cd apps/landing-page && yarn vitest run __tests__/i18n/messages.test.ts`
Expected: FAIL (files not found)

**Step 3: en.json 생성 (레퍼런스)**

```json
{
  "hero": {
    "badge": "Open Source",
    "title": "Multi-AI Rules for Consistent Coding",
    "description": "One ruleset for Cursor, Claude Code, Codex, Antigravity, Q, and Kiro. Consistent AI-assisted coding across all your tools.",
    "cta": "Get Started"
  },
  "agents": {
    "title": "AI Agents",
    "filter": "Filter by category",
    "search": "Search agents..."
  },
  "codeExample": {
    "title": "Code Example",
    "before": "Before",
    "after": "After"
  },
  "quickStart": {
    "title": "Quick Start",
    "step1": "Install the package",
    "step2": "Configure your AI tool",
    "step3": "Start coding"
  },
  "faq": {
    "title": "Frequently Asked Questions"
  }
}
```

**Step 4: ko.json 생성**

```json
{
  "hero": {
    "badge": "오픈 소스",
    "title": "일관된 코딩을 위한 멀티 AI 규칙",
    "description": "Cursor, Claude Code, Codex, Antigravity, Q, Kiro를 위한 하나의 규칙 세트. 모든 도구에서 일관된 AI 지원 코딩.",
    "cta": "시작하기"
  },
  "agents": {
    "title": "AI 에이전트",
    "filter": "카테고리별 필터",
    "search": "에이전트 검색..."
  },
  "codeExample": {
    "title": "코드 예시",
    "before": "이전",
    "after": "이후"
  },
  "quickStart": {
    "title": "빠른 시작",
    "step1": "패키지 설치",
    "step2": "AI 도구 설정",
    "step3": "코딩 시작"
  },
  "faq": {
    "title": "자주 묻는 질문"
  }
}
```

**Step 5: zh-CN.json 생성**

```json
{
  "hero": {
    "badge": "开源",
    "title": "统一 AI 编码规则",
    "description": "一套规则适用于 Cursor、Claude Code、Codex、Antigravity、Q 和 Kiro。所有工具中一致的 AI 辅助编码。",
    "cta": "开始使用"
  },
  "agents": {
    "title": "AI 代理",
    "filter": "按类别筛选",
    "search": "搜索代理..."
  },
  "codeExample": {
    "title": "代码示例",
    "before": "之前",
    "after": "之后"
  },
  "quickStart": {
    "title": "快速入门",
    "step1": "安装包",
    "step2": "配置 AI 工具",
    "step3": "开始编码"
  },
  "faq": {
    "title": "常见问题"
  }
}
```

**Step 6: ja.json 생성**

```json
{
  "hero": {
    "badge": "オープンソース",
    "title": "一貫したコーディングのためのマルチAIルール",
    "description": "Cursor、Claude Code、Codex、Antigravity、Q、Kiro対応の統一ルールセット。すべてのツールで一貫したAI支援コーディング。",
    "cta": "始める"
  },
  "agents": {
    "title": "AIエージェント",
    "filter": "カテゴリで絞り込み",
    "search": "エージェントを検索..."
  },
  "codeExample": {
    "title": "コード例",
    "before": "変更前",
    "after": "変更後"
  },
  "quickStart": {
    "title": "クイックスタート",
    "step1": "パッケージをインストール",
    "step2": "AIツールを設定",
    "step3": "コーディング開始"
  },
  "faq": {
    "title": "よくある質問"
  }
}
```

**Step 7: es.json 생성**

```json
{
  "hero": {
    "badge": "Código Abierto",
    "title": "Reglas Multi-IA para Codificación Consistente",
    "description": "Un conjunto de reglas para Cursor, Claude Code, Codex, Antigravity, Q y Kiro. Codificación asistida por IA consistente en todas tus herramientas.",
    "cta": "Comenzar"
  },
  "agents": {
    "title": "Agentes IA",
    "filter": "Filtrar por categoría",
    "search": "Buscar agentes..."
  },
  "codeExample": {
    "title": "Ejemplo de Código",
    "before": "Antes",
    "after": "Después"
  },
  "quickStart": {
    "title": "Inicio Rápido",
    "step1": "Instalar el paquete",
    "step2": "Configurar tu herramienta IA",
    "step3": "Empezar a codificar"
  },
  "faq": {
    "title": "Preguntas Frecuentes"
  }
}
```

**Step 8: 테스트 통과 확인**

Run: `cd apps/landing-page && yarn vitest run __tests__/i18n/messages.test.ts`
Expected: PASS

**Step 9: Commit**

```bash
git add apps/landing-page/messages/ apps/landing-page/__tests__/i18n/messages.test.ts
git commit -m "feat(landing-page): add i18n message files for 5 languages"
```

---

## Task 5: Middleware 생성

**Files:**
- Create: `apps/landing-page/middleware.ts` (프로젝트 루트, `src/` 아닌 `apps/landing-page/` 직하)

**Step 1: middleware.ts 구현**

```typescript
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  matcher: ['/', '/(en|ko|zh-CN|ja|es)/:path*'],
};
```

**Step 2: Commit**

```bash
git add apps/landing-page/middleware.ts
git commit -m "feat(landing-page): add next-intl middleware for locale routing"
```

---

## Task 6: next.config.ts에 next-intl 플러그인 연동

**Files:**
- Modify: `apps/landing-page/next.config.ts`

**Step 1: createNextIntlPlugin 래핑**

기존 `next.config.ts`의 `export default nextConfig`을 `createNextIntlPlugin()`으로 래핑한다.

```typescript
// 파일 최상단에 import 추가
import createNextIntlPlugin from 'next-intl/plugin';

// 파일 최하단 변경 (기존: export default nextConfig)
const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
```

**Step 2: Commit**

```bash
git add apps/landing-page/next.config.ts
git commit -m "feat(landing-page): integrate next-intl plugin in next.config.ts"
```

---

## Task 7: lib/locale.ts 리팩터링 (routing을 source of truth로)

**Files:**
- Modify: `apps/landing-page/lib/locale.ts`

**Step 1: 기존 테스트가 있으면 확인**

Run: `cd apps/landing-page && yarn vitest run __tests__/lib/locale 2>/dev/null || echo "no locale tests"`

**Step 2: locale.ts 테스트 작성**

Test: `apps/landing-page/__tests__/lib/locale.test.ts`

```typescript
import { describe, test, expect } from 'vitest';
import { SUPPORTED_LOCALES, DEFAULT_LOCALE, isValidLocale } from '../../lib/locale';
import type { SupportedLocale } from '../../lib/locale';

describe('locale utilities', () => {
  test('SUPPORTED_LOCALES includes all 5 locales', () => {
    expect(SUPPORTED_LOCALES).toEqual(['en', 'ko', 'zh-CN', 'ja', 'es']);
  });

  test('DEFAULT_LOCALE is en', () => {
    expect(DEFAULT_LOCALE).toBe('en');
  });

  test('isValidLocale returns true for supported locales', () => {
    expect(isValidLocale('en')).toBe(true);
    expect(isValidLocale('ko')).toBe(true);
    expect(isValidLocale('zh-CN')).toBe(true);
    expect(isValidLocale('ja')).toBe(true);
    expect(isValidLocale('es')).toBe(true);
  });

  test('isValidLocale returns false for unsupported locales', () => {
    expect(isValidLocale('fr')).toBe(false);
    expect(isValidLocale('de')).toBe(false);
    expect(isValidLocale('')).toBe(false);
  });

  test('SupportedLocale type covers all 5 locales', () => {
    const locales: SupportedLocale[] = ['en', 'ko', 'zh-CN', 'ja', 'es'];
    expect(locales).toHaveLength(5);
  });
});
```

**Step 3: 테스트 실패 확인 (기존 코드는 en, ko만 지원)**

Run: `cd apps/landing-page && yarn vitest run __tests__/lib/locale.test.ts`
Expected: FAIL (3 locales missing)

**Step 4: locale.ts를 routing 기반으로 리팩터링**

```typescript
import { routing } from '@/i18n/routing';

export const SUPPORTED_LOCALES = routing.locales;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: SupportedLocale = routing.defaultLocale;

export const isValidLocale = (locale: string): locale is SupportedLocale =>
  SUPPORTED_LOCALES.includes(locale as SupportedLocale);
```

**Step 5: 테스트 통과 확인**

Run: `cd apps/landing-page && yarn vitest run __tests__/lib/locale.test.ts`
Expected: PASS

**Step 6: 기존 import 경로에 영향 없는지 확인**

기존 `@/lib/locale`를 import하는 파일들이 동일하게 동작하는지 확인:
- `src/app/page.tsx` → `DEFAULT_LOCALE` 사용
- `src/app/[locale]/layout.tsx` → `isValidLocale`, `SUPPORTED_LOCALES` 사용
- `types/widgets.ts` → `SupportedLocale` type 사용
- `components/set-document-lang.tsx` → `SupportedLocale` type 사용

Run: `cd apps/landing-page && yarn typecheck`
Expected: 에러 없음

**Step 7: Commit**

```bash
git add apps/landing-page/lib/locale.ts apps/landing-page/__tests__/lib/locale.test.ts
git commit -m "refactor(landing-page): derive locale config from next-intl routing"
```

---

## Task 8: [locale]/layout.tsx에 NextIntlClientProvider 추가

**Files:**
- Modify: `apps/landing-page/src/app/[locale]/layout.tsx`

**Step 1: NextIntlClientProvider 래핑**

기존 layout의 `<main>` 내부를 `NextIntlClientProvider`로 감싼다.

```typescript
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { isValidLocale, SUPPORTED_LOCALES } from '@/lib/locale';
import { SetDocumentLang } from '@/components/set-document-lang';

export const generateStaticParams = () =>
  SUPPORTED_LOCALES.map(locale => ({ locale }));

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

  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <main
        id="main-content"
        lang={locale}
        className="flex min-h-screen flex-col"
      >
        <SetDocumentLang locale={locale} />
        {children}
        {agents}
        {code_example}
        {quick_start}
      </main>
    </NextIntlClientProvider>
  );
};

export default LocaleLayout;
```

**Step 2: Commit**

```bash
git add apps/landing-page/src/app/[locale]/layout.tsx
git commit -m "feat(landing-page): add NextIntlClientProvider to locale layout"
```

---

## Task 9: Root page.tsx의 리다이렉트를 middleware에 위임 (선택적 정리)

**Files:**
- Modify: `apps/landing-page/src/app/page.tsx` (변경 없음 - middleware가 `/` → `/en`을 처리하지만, fallback으로 유지)

> Note: `middleware.ts`가 `/` 경로를 처리하여 기본 locale로 리다이렉트한다. 기존 `src/app/page.tsx`의 `redirect(`/${DEFAULT_LOCALE}`)`는 middleware가 적용되지 않는 경우(SSG 등)의 fallback으로 유지한다.

---

## Task 10: 전체 검증

**Step 1: 타입 체크**

Run: `cd apps/landing-page && yarn typecheck`
Expected: 에러 없음

**Step 2: 전체 테스트**

Run: `cd apps/landing-page && yarn test`
Expected: 전체 PASS

**Step 3: 린트**

Run: `cd apps/landing-page && yarn lint`
Expected: 에러 없음

**Step 4: 빌드 확인**

Run: `cd apps/landing-page && yarn build`
Expected: 빌드 성공

**Step 5: 최종 Commit (필요시)**

```bash
git add -A
git commit -m "feat(landing-page): complete next-intl i18n setup for 5 languages

- Install next-intl@4
- Add i18n routing and request configuration
- Create middleware for locale routing
- Add message files for en, ko, zh-CN, ja, es
- Integrate NextIntlClientProvider in locale layout
- Refactor lib/locale.ts to derive from routing config

Closes #313"
```

---

## 변경 파일 요약

| 액션 | 파일 |
|------|------|
| Create | `apps/landing-page/i18n/routing.ts` |
| Create | `apps/landing-page/i18n/request.ts` |
| Create | `apps/landing-page/middleware.ts` |
| Create | `apps/landing-page/messages/en.json` |
| Create | `apps/landing-page/messages/ko.json` |
| Create | `apps/landing-page/messages/zh-CN.json` |
| Create | `apps/landing-page/messages/ja.json` |
| Create | `apps/landing-page/messages/es.json` |
| Create | `apps/landing-page/__tests__/i18n/routing.test.ts` |
| Create | `apps/landing-page/__tests__/i18n/messages.test.ts` |
| Create | `apps/landing-page/__tests__/lib/locale.test.ts` |
| Modify | `apps/landing-page/next.config.ts` (plugin 래핑) |
| Modify | `apps/landing-page/lib/locale.ts` (routing 기반 리팩터링) |
| Modify | `apps/landing-page/src/app/[locale]/layout.tsx` (NextIntlClientProvider) |
| Modify | `apps/landing-page/package.json` (next-intl 의존성) |

## 아키텍처 다이어그램

```
middleware.ts (locale 감지/리다이렉트)
    ↓
i18n/routing.ts (defineRouting - source of truth)
    ↓                    ↓
lib/locale.ts         i18n/request.ts (getRequestConfig)
(re-export)               ↓
                    messages/{locale}.json
                         ↓
              [locale]/layout.tsx
              (NextIntlClientProvider)
                    ↓
              위젯/컴포넌트 (useTranslations)
```
