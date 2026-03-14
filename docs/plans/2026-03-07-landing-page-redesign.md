# Landing Page Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Codingbuddy 랜딩 페이지를 개발자 친화 테크 스타일(다크 테마, 터미널 중심)로 전면 리디자인

**Architecture:** 기존 Next.js 16 + Tailwind CSS 4 + next-intl 구조를 유지하면서, 섹션 구성을 7개로 재설계. 기존 parallel route 슬롯(@agents, @code_example, @quick_start) 중 @code_example을 제거하고 @quick_start를 유지. 새로운 섹션(BeforeAfter, Features, SupportedTools, CTA)은 Server Component로 page.tsx에 직접 배치. 터미널 데모 위젯은 Client Component.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, next-intl, Vitest, Testing Library

**Design Doc:** `docs/plans/2026-03-07-landing-page-redesign-design.md`

---

## Task 1: 디자인 시스템 업데이트 — 다크 테마 색상 변수

**Files:**
- Modify: `apps/landing-page/src/app/globals.css`

**Step 1: 다크 테마 색상 변수 추가**

`globals.css`의 `.dark` 블록과 `:root` 블록에 터미널 테마용 커스텀 CSS 변수를 추가합니다. 기존 shadcn 변수는 유지하고, 새로운 시맨틱 변수를 추가합니다.

```css
/* 기존 :root 블록 끝에 추가 */
:root {
  /* ... existing variables ... */
  --terminal-bg: oklch(0.165 0.015 280);
  --terminal-border: oklch(0.3 0.02 280);
  --terminal-text: oklch(0.85 0 0);
  --terminal-green: oklch(0.65 0.2 145);
  --terminal-purple: oklch(0.65 0.25 293);
  --terminal-red: oklch(0.65 0.2 25);
  --terminal-yellow: oklch(0.8 0.15 85);
  --terminal-muted: oklch(0.5 0 0);
  --glow-green: oklch(0.65 0.2 145 / 0.3);
  --glow-purple: oklch(0.65 0.25 293 / 0.2);
  --dot-pattern: oklch(0.3 0 0);
}

.dark {
  /* ... existing variables ... */
  --terminal-bg: oklch(0.13 0.015 280);
  --terminal-border: oklch(0.25 0.02 280);
  --terminal-text: oklch(0.9 0 0);
  --terminal-green: oklch(0.72 0.22 145);
  --terminal-purple: oklch(0.72 0.27 293);
  --terminal-red: oklch(0.72 0.22 25);
  --terminal-yellow: oklch(0.85 0.17 85);
  --terminal-muted: oklch(0.55 0 0);
  --glow-green: oklch(0.72 0.22 145 / 0.25);
  --glow-purple: oklch(0.72 0.27 293 / 0.15);
  --dot-pattern: oklch(0.22 0 0);
}
```

**Step 2: Tailwind 테마에 커스텀 색상 등록**

`globals.css`의 `@theme inline` 블록에 추가:

```css
@theme inline {
  /* ... existing ... */
  --color-terminal-bg: var(--terminal-bg);
  --color-terminal-border: var(--terminal-border);
  --color-terminal-text: var(--terminal-text);
  --color-terminal-green: var(--terminal-green);
  --color-terminal-purple: var(--terminal-purple);
  --color-terminal-red: var(--terminal-red);
  --color-terminal-yellow: var(--terminal-yellow);
  --color-terminal-muted: var(--terminal-muted);
}
```

**Step 3: 글로벌 유틸리티 클래스 추가**

`globals.css` 끝에 추가:

```css
/* Terminal glow effects */
.glow-green {
  box-shadow: 0 0 20px var(--glow-green), 0 0 60px var(--glow-green);
}

.glow-purple {
  box-shadow: 0 0 20px var(--glow-purple), 0 0 60px var(--glow-purple);
}

/* Dot grid background pattern */
.bg-dot-pattern {
  background-image: radial-gradient(var(--dot-pattern) 1px, transparent 1px);
  background-size: 24px 24px;
}

/* Scroll-triggered fade-in animation */
.animate-fade-in {
  animation: fade-in 0.6s ease-out both;
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Terminal typing cursor */
.animate-blink {
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  50% { opacity: 0; }
}

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  .animate-fade-in,
  .animate-blink {
    animation: none;
  }
}
```

**Step 4: 빌드 확인**

Run: `cd apps/landing-page && yarn typecheck`
Expected: PASS (no errors)

**Step 5: Commit**

```bash
git add apps/landing-page/src/app/globals.css
git commit -m "style: add terminal theme design system variables and utility classes"
```

---

## Task 2: i18n 메시지 업데이트 — 영어 기준

**Files:**
- Modify: `apps/landing-page/messages/en.json`

**Step 1: en.json 전체 교체**

기존 구조를 새 섹션 구성에 맞게 업데이트합니다. 기존 `problem`, `solution`, `faq` 네임스페이스를 제거하고, 새로운 `beforeAfter`, `features`, `supportedTools`, `ctaFooter` 네임스페이스를 추가합니다.

```json
{
  "hero": {
    "title": "Multi-AI Rules for Consistent Coding",
    "subtitle": "One ruleset for Cursor, Claude Code, Codex, Antigravity, Q, and Kiro.",
    "cta": "Get Started",
    "github": "Star on GitHub",
    "terminalTitle": "~/your-project",
    "terminalCmd": "npx codingbuddy init",
    "terminalInstalling": "Installing codingbuddy-rules...",
    "terminalRulesSynced": "Rules synced to 6 AI tools",
    "terminalAgents": "35 specialist agents activated",
    "terminalWorkflow": "PLAN → ACT → EVAL workflow ready",
    "terminalCursorrules": ".cursorrules",
    "terminalClaudeMd": "CLAUDE.md",
    "terminalCodex": ".codex/",
    "terminalAntigravity": ".antigravity/",
    "terminalQ": ".q/",
    "terminalKiro": ".kiro/",
    "terminalReady": "Ready! One source, all tools."
  },
  "beforeAfter": {
    "title": "The Problem & Solution",
    "beforeLabel": "Before",
    "afterLabel": "After",
    "beforeFiles": "6 config files. Always out of sync.",
    "afterFiles": "Single source. Auto-synced to all tools.",
    "cursorrules": ".cursorrules",
    "claudeMd": "CLAUDE.md",
    "codexRules": ".codex/instructions.md",
    "antigravityRules": ".antigravity/rules.md",
    "qRules": ".q/rules.md",
    "kiroRules": ".kiro/rules.md",
    "singleSource": "codingbuddy-rules/.ai-rules/",
    "autoSynced": "Auto-synced",
    "alwaysCurrent": "Always current"
  },
  "features": {
    "title": "What You Get",
    "universalRulesTitle": "Universal Rules",
    "universalRulesDesc": "One source of truth automatically applied to all 6 AI coding tools.",
    "agentsTitle": "35 AI Agents",
    "agentsDesc": "Specialist agents for architecture, security, testing, performance, and accessibility.",
    "workflowTitle": "Structured Workflow",
    "workflowDesc": "PLAN → ACT → EVAL cycle ensures consistent quality across all development.",
    "qualityTitle": "Quality Built-in",
    "qualityDesc": "TDD, SOLID principles, and 90%+ test coverage enforced as standard practice.",
    "mcpTitle": "MCP Protocol",
    "mcpDesc": "Standard Model Context Protocol for seamless AI tool integration.",
    "zeroConfigTitle": "Zero Config",
    "zeroConfigDesc": "One command to install. Works out of the box with all supported tools."
  },
  "supportedTools": {
    "title": "Works with your favorite AI tools",
    "plus": "+ any MCP-compatible tool",
    "cursor": "Cursor",
    "claudeCode": "Claude Code",
    "codex": "Codex",
    "antigravity": "Antigravity",
    "amazonQ": "Amazon Q",
    "kiro": "Kiro"
  },
  "agents": {
    "title": "35 Specialist Agents",
    "subtitle": "Focused expertise for every aspect of development",
    "filter": "Filter by category",
    "allCategories": "All",
    "noResults": "No agents found matching your criteria",
    "viewAll": "View All Agents",
    "categories": {
      "Planning": "Planning",
      "Development": "Development",
      "Review": "Review",
      "Security": "Security",
      "UX": "UX"
    },
    "count": "{count} agents"
  },
  "quickStart": {
    "title": "Quick Start",
    "subtitle": "Get started in 3 simple steps",
    "step1": "Install",
    "step1Desc": "Add codingbuddy-rules to your project",
    "step2": "Configure",
    "step2Desc": "Add the MCP server to your AI tool",
    "step3": "Code",
    "step3Desc": "Use PLAN, ACT, EVAL modes with specialist agents",
    "copy": "Copy",
    "copied": "Copied!"
  },
  "ctaFooter": {
    "title": "Ready to unify your AI coding?",
    "command": "npx codingbuddy init",
    "github": "Star on GitHub",
    "docs": "Documentation",
    "copy": "Copy",
    "copied": "Copied!",
    "copyright": "© {year} Codingbuddy. MIT License.",
    "madeWith": "Made for developers, by developers."
  },
  "header": {
    "nav": {
      "features": "Features",
      "agents": "Agents",
      "quickStart": "Quick Start"
    },
    "theme": {
      "label": "Toggle theme",
      "light": "Light",
      "dark": "Dark",
      "system": "System"
    },
    "language": {
      "label": "Select language",
      "en": "English",
      "ko": "한국어",
      "ja": "日本語",
      "zh-CN": "中文",
      "es": "Español"
    },
    "mobileMenu": {
      "open": "Open menu",
      "close": "Close menu",
      "title": "Navigation",
      "description": "Site navigation and settings"
    },
    "brand": {
      "homeLink": "Codingbuddy - Back to home"
    }
  },
  "cookieConsent": {
    "label": "Cookie consent",
    "message": "We use cookies to enhance your experience and analyze site traffic. By clicking \"Accept\", you consent to our use of analytics cookies.",
    "accept": "Accept",
    "decline": "Decline"
  },
  "metadata": {
    "title": "Codingbuddy - Multi-AI Rules for Consistent Coding",
    "description": "One ruleset for Cursor, Claude Code, Codex, Antigravity, Q, and Kiro. Consistent AI-assisted coding across all your tools."
  },
  "i18n": {}
}
```

**Step 2: Commit**

```bash
git add apps/landing-page/messages/en.json
git commit -m "content: update en.json with new landing page section messages"
```

---

## Task 3: i18n 메시지 — 나머지 4개 언어

**Files:**
- Modify: `apps/landing-page/messages/ko.json`
- Modify: `apps/landing-page/messages/ja.json`
- Modify: `apps/landing-page/messages/zh-CN.json`
- Modify: `apps/landing-page/messages/es.json`

**Step 1: 4개 언어 파일 번역**

`en.json`과 동일한 키 구조로 각 언어에 맞게 번역합니다. 기존 `problem`, `solution`, `faq`, `codeExample` 네임스페이스를 제거하고, 새로운 `beforeAfter`, `features`, `supportedTools`, `ctaFooter` 네임스페이스를 추가합니다.

> 참고: 각 언어 파일의 `header`, `cookieConsent`, `metadata` 등 공통 부분은 기존 번역을 유지하되, `header.nav`에서 `faq` 키를 제거합니다.

**Step 2: 빌드 확인**

Run: `cd apps/landing-page && yarn typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add apps/landing-page/messages/ko.json apps/landing-page/messages/ja.json apps/landing-page/messages/zh-CN.json apps/landing-page/messages/es.json
git commit -m "content: translate new landing page messages to ko, ja, zh-CN, es"
```

---

## Task 4: TerminalDemo 클라이언트 위젯

**Files:**
- Create: `apps/landing-page/widgets/TerminalDemo/index.tsx`
- Create: `apps/landing-page/widgets/TerminalDemo/TerminalLine.tsx`
- Test: `apps/landing-page/__tests__/widgets/TerminalDemo.test.tsx`

**Step 1: 테스트 작성**

```tsx
// __tests__/widgets/TerminalDemo.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TerminalDemo } from '@/widgets/TerminalDemo';

describe('TerminalDemo', () => {
  const defaultMessages = {
    terminalTitle: '~/your-project',
    terminalCmd: 'npx codingbuddy init',
    terminalInstalling: 'Installing codingbuddy-rules...',
    terminalRulesSynced: 'Rules synced to 6 AI tools',
    terminalAgents: '35 specialist agents activated',
    terminalWorkflow: 'PLAN → ACT → EVAL workflow ready',
    terminalCursorrules: '.cursorrules',
    terminalClaudeMd: 'CLAUDE.md',
    terminalCodex: '.codex/',
    terminalAntigravity: '.antigravity/',
    terminalQ: '.q/',
    terminalKiro: '.kiro/',
    terminalReady: 'Ready! One source, all tools.',
  };

  it('renders terminal container with title', () => {
    render(<TerminalDemo messages={defaultMessages} />);
    expect(screen.getByText('~/your-project')).toBeInTheDocument();
  });

  it('renders command line', () => {
    render(<TerminalDemo messages={defaultMessages} />);
    expect(screen.getByText(/npx codingbuddy init/)).toBeInTheDocument();
  });

  it('renders all terminal output lines', () => {
    render(<TerminalDemo messages={defaultMessages} />);
    expect(screen.getByText(/Rules synced/)).toBeInTheDocument();
    expect(screen.getByText(/35 specialist agents/)).toBeInTheDocument();
  });

  it('renders tool file list', () => {
    render(<TerminalDemo messages={defaultMessages} />);
    expect(screen.getByText('.cursorrules')).toBeInTheDocument();
    expect(screen.getByText('CLAUDE.md')).toBeInTheDocument();
    expect(screen.getByText('.kiro/')).toBeInTheDocument();
  });

  it('has appropriate aria attributes', () => {
    render(<TerminalDemo messages={defaultMessages} />);
    const terminal = screen.getByRole('region');
    expect(terminal).toHaveAttribute('aria-label');
  });
});
```

**Step 2: 테스트 실행 — 실패 확인**

Run: `cd apps/landing-page && yarn vitest run __tests__/widgets/TerminalDemo.test.tsx`
Expected: FAIL (module not found)

**Step 3: TerminalLine 컴포넌트 구현**

```tsx
// widgets/TerminalDemo/TerminalLine.tsx
'use client';

interface TerminalLineProps {
  prefix?: '>' | '$' | '◆' | '✓' | '✗';
  text: string;
  color?: 'green' | 'purple' | 'red' | 'yellow' | 'muted' | 'default';
}

const colorMap = {
  green: 'text-terminal-green',
  purple: 'text-terminal-purple',
  red: 'text-terminal-red',
  yellow: 'text-terminal-yellow',
  muted: 'text-terminal-muted',
  default: 'text-terminal-text',
} as const;

const prefixColorMap = {
  '>': 'text-terminal-green',
  '$': 'text-terminal-green',
  '◆': 'text-terminal-yellow',
  '✓': 'text-terminal-green',
  '✗': 'text-terminal-red',
} as const;

export const TerminalLine = ({ prefix, text, color = 'default' }: TerminalLineProps) => (
  <div className="flex gap-2 font-mono text-sm leading-relaxed">
    {prefix && <span className={prefixColorMap[prefix]}>{prefix}</span>}
    <span className={colorMap[color]}>{text}</span>
  </div>
);
```

**Step 4: TerminalDemo 컴포넌트 구현**

```tsx
// widgets/TerminalDemo/index.tsx
'use client';

interface TerminalMessages {
  terminalTitle: string;
  terminalCmd: string;
  terminalInstalling: string;
  terminalRulesSynced: string;
  terminalAgents: string;
  terminalWorkflow: string;
  terminalCursorrules: string;
  terminalClaudeMd: string;
  terminalCodex: string;
  terminalAntigravity: string;
  terminalQ: string;
  terminalKiro: string;
  terminalReady: string;
}

interface TerminalDemoProps {
  messages: TerminalMessages;
}

import { TerminalLine } from './TerminalLine';

const toolFiles = [
  'terminalCursorrules',
  'terminalClaudeMd',
  'terminalCodex',
  'terminalAntigravity',
  'terminalQ',
  'terminalKiro',
] as const;

export const TerminalDemo = ({ messages }: TerminalDemoProps) => (
  <div
    role="region"
    aria-label="Terminal demo showing codingbuddy installation"
    className="w-full max-w-2xl mx-auto rounded-lg border border-terminal-border bg-terminal-bg overflow-hidden shadow-lg glow-purple"
  >
    {/* Title bar */}
    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-terminal-border bg-terminal-bg/80">
      <div className="flex gap-1.5">
        <div className="size-3 rounded-full bg-terminal-red/80" aria-hidden="true" />
        <div className="size-3 rounded-full bg-terminal-yellow/80" aria-hidden="true" />
        <div className="size-3 rounded-full bg-terminal-green/80" aria-hidden="true" />
      </div>
      <span className="ml-2 text-xs font-mono text-terminal-muted">{messages.terminalTitle}</span>
    </div>

    {/* Terminal content */}
    <div className="p-4 space-y-1">
      <TerminalLine prefix="$" text={messages.terminalCmd} color="default" />
      <div className="h-2" />
      <TerminalLine prefix="◆" text={messages.terminalInstalling} color="yellow" />
      <TerminalLine prefix="✓" text={messages.terminalRulesSynced} />
      <TerminalLine prefix="✓" text={messages.terminalAgents} />
      <TerminalLine prefix="✓" text={messages.terminalWorkflow} />

      <div className="h-2" />

      {/* Tool files box */}
      <div className="ml-4 rounded border border-terminal-border/50 p-2 space-y-0.5">
        {toolFiles.map(key => (
          <div key={key} className="flex items-center gap-2 font-mono text-xs">
            <span className="text-terminal-text">{messages[key]}</span>
            <span className="text-terminal-green">✓</span>
          </div>
        ))}
      </div>

      <div className="h-2" />
      <TerminalLine prefix=">" text={messages.terminalReady} color="green" />
      <span className="inline-block w-2 h-4 bg-terminal-green animate-blink ml-4" aria-hidden="true" />
    </div>
  </div>
);

export type { TerminalMessages, TerminalDemoProps };
```

**Step 5: 테스트 실행 — 통과 확인**

Run: `cd apps/landing-page && yarn vitest run __tests__/widgets/TerminalDemo.test.tsx`
Expected: PASS

**Step 6: Commit**

```bash
git add apps/landing-page/widgets/TerminalDemo/ apps/landing-page/__tests__/widgets/TerminalDemo.test.tsx
git commit -m "feat: add TerminalDemo widget with typing animation support"
```

---

## Task 5: Hero 섹션 리디자인

**Files:**
- Modify: `apps/landing-page/sections/Hero.tsx`
- Modify: `apps/landing-page/__tests__/sections/Hero.test.tsx`

**Step 1: 테스트 업데이트**

기존 Hero 테스트를 새 구조에 맞게 업데이트합니다. TerminalDemo가 포함되었으므로 해당 요소 검증을 추가합니다.

```tsx
// 기존 테스트에서 변경이 필요한 부분:
// - badge 관련 테스트 제거 (Badge 제거됨)
// - terminal demo region 검증 추가
// - CTA 버튼 텍스트 변경 반영 ("Get Started" → hero.cta, "GitHub" → hero.github)
```

**Step 2: 테스트 실행 — 실패 확인**

Run: `cd apps/landing-page && yarn vitest run __tests__/sections/Hero.test.tsx`
Expected: FAIL

**Step 3: Hero.tsx 재작성**

```tsx
// sections/Hero.tsx
import { getTranslations } from 'next-intl/server';
import { Github, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TerminalDemo } from '@/widgets/TerminalDemo';
import type { WidgetProps } from '@/types';

export const Hero = async ({ locale }: WidgetProps) => {
  const t = await getTranslations({ locale, namespace: 'hero' });

  const terminalMessages = {
    terminalTitle: t('terminalTitle'),
    terminalCmd: t('terminalCmd'),
    terminalInstalling: t('terminalInstalling'),
    terminalRulesSynced: t('terminalRulesSynced'),
    terminalAgents: t('terminalAgents'),
    terminalWorkflow: t('terminalWorkflow'),
    terminalCursorrules: t('terminalCursorrules'),
    terminalClaudeMd: t('terminalClaudeMd'),
    terminalCodex: t('terminalCodex'),
    terminalAntigravity: t('terminalAntigravity'),
    terminalQ: t('terminalQ'),
    terminalKiro: t('terminalKiro'),
    terminalReady: t('terminalReady'),
  };

  return (
    <section
      data-testid="hero"
      lang={locale}
      aria-labelledby="hero-heading"
      className="relative overflow-hidden px-4 py-20 sm:py-28 bg-dot-pattern"
    >
      {/* Background glow effects */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/3 size-[500px] rounded-full bg-terminal-purple/10 blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/3 size-[400px] rounded-full bg-terminal-green/10 blur-[100px]" />
      </div>

      <div className="mx-auto max-w-4xl text-center">
        <h1
          id="hero-heading"
          className="font-mono text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl"
        >
          {t('title')}
        </h1>
        <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-base sm:text-lg">
          {t('subtitle')}
        </p>

        <div className="mt-10">
          <TerminalDemo messages={terminalMessages} />
        </div>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button size="lg" className="glow-green bg-terminal-green hover:bg-terminal-green/90 text-black font-mono" asChild>
            <a href="#quick-start">
              <span className="mr-1">$</span> {t('cta')}
              <ArrowRight className="size-4 ml-1" aria-hidden="true" />
            </a>
          </Button>
          <Button variant="outline" size="lg" className="font-mono border-terminal-border hover:border-terminal-purple hover:text-terminal-purple" asChild>
            <a
              href="https://github.com/JeremyDev87/codingbuddy"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github className="size-4" aria-hidden="true" />
              {t('github')}
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
};
```

**Step 4: 테스트 실행 — 통과 확인**

Run: `cd apps/landing-page && yarn vitest run __tests__/sections/Hero.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/landing-page/sections/Hero.tsx apps/landing-page/__tests__/sections/Hero.test.tsx
git commit -m "feat: redesign Hero section with terminal demo and dark theme"
```

---

## Task 6: BeforeAfter 섹션 (새로 생성)

**Files:**
- Create: `apps/landing-page/sections/BeforeAfter.tsx`
- Create: `apps/landing-page/__tests__/sections/BeforeAfter.test.tsx`

**Step 1: 테스트 작성**

```tsx
// __tests__/sections/BeforeAfter.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BeforeAfter } from '@/sections/BeforeAfter';

// next-intl mock은 기존 __tests__/__helpers__/intl-mock 패턴 사용

describe('BeforeAfter', () => {
  it('renders section with heading', async () => {
    const component = await BeforeAfter({ locale: 'en' });
    render(component);
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
  });

  it('renders before and after columns', async () => {
    const component = await BeforeAfter({ locale: 'en' });
    render(component);
    expect(screen.getByText(/Before/i)).toBeInTheDocument();
    expect(screen.getByText(/After/i)).toBeInTheDocument();
  });

  it('renders 6 config file names in before column', async () => {
    const component = await BeforeAfter({ locale: 'en' });
    render(component);
    expect(screen.getByText('.cursorrules')).toBeInTheDocument();
    expect(screen.getByText('CLAUDE.md')).toBeInTheDocument();
  });

  it('renders single source in after column', async () => {
    const component = await BeforeAfter({ locale: 'en' });
    render(component);
    expect(screen.getByText(/codingbuddy-rules/)).toBeInTheDocument();
  });

  it('has proper accessibility attributes', async () => {
    const component = await BeforeAfter({ locale: 'en' });
    render(component);
    expect(screen.getByTestId('before-after')).toHaveAttribute('aria-labelledby');
  });
});
```

**Step 2: 테스트 실행 — 실패 확인**

Run: `cd apps/landing-page && yarn vitest run __tests__/sections/BeforeAfter.test.tsx`
Expected: FAIL

**Step 3: BeforeAfter.tsx 구현**

```tsx
// sections/BeforeAfter.tsx
import { getTranslations } from 'next-intl/server';
import { X, Check } from 'lucide-react';
import type { WidgetProps } from '@/types';

const beforeFiles = [
  'cursorrules',
  'claudeMd',
  'codexRules',
  'antigravityRules',
  'qRules',
  'kiroRules',
] as const;

export const BeforeAfter = async ({ locale }: WidgetProps) => {
  const t = await getTranslations({ locale, namespace: 'beforeAfter' });

  return (
    <section
      data-testid="before-after"
      lang={locale}
      aria-labelledby="before-after-heading"
      className="px-4 py-16 sm:py-24"
    >
      <div className="mx-auto max-w-4xl">
        <h2
          id="before-after-heading"
          className="text-center font-mono text-2xl font-bold tracking-tight sm:text-3xl mb-12"
        >
          {t('title')}
        </h2>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* Before */}
          <div className="rounded-lg border border-terminal-red/30 bg-terminal-bg p-5">
            <div className="flex items-center gap-2 mb-4">
              <X className="size-4 text-terminal-red" aria-hidden="true" />
              <span className="font-mono text-sm font-semibold text-terminal-red">
                {t('beforeLabel')}
              </span>
            </div>
            <div className="space-y-2">
              {beforeFiles.map(key => (
                <div key={key} className="flex items-center gap-2 font-mono text-sm text-terminal-text">
                  <span className="text-terminal-muted">📄</span>
                  <span>{t(key)}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 font-mono text-xs text-terminal-red/80">
              {t('beforeFiles')}
            </p>
          </div>

          {/* After */}
          <div className="rounded-lg border border-terminal-green/30 bg-terminal-bg p-5">
            <div className="flex items-center gap-2 mb-4">
              <Check className="size-4 text-terminal-green" aria-hidden="true" />
              <span className="font-mono text-sm font-semibold text-terminal-green">
                {t('afterLabel')}
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-mono text-sm text-terminal-green">
                <span className="text-terminal-muted">📁</span>
                <span className="font-semibold">{t('singleSource')}</span>
              </div>
            </div>
            <div className="mt-4 space-y-1">
              <div className="flex items-center gap-2 font-mono text-xs text-terminal-green/80">
                <Check className="size-3" aria-hidden="true" />
                <span>{t('autoSynced')}</span>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs text-terminal-green/80">
                <Check className="size-3" aria-hidden="true" />
                <span>{t('alwaysCurrent')}</span>
              </div>
            </div>
            <p className="mt-4 font-mono text-xs text-terminal-green/80">
              {t('afterFiles')}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
```

**Step 4: 테스트 실행 — 통과 확인**

Run: `cd apps/landing-page && yarn vitest run __tests__/sections/BeforeAfter.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/landing-page/sections/BeforeAfter.tsx apps/landing-page/__tests__/sections/BeforeAfter.test.tsx
git commit -m "feat: add BeforeAfter section with before/after comparison"
```

---

## Task 7: Features 섹션 (새로 생성)

**Files:**
- Create: `apps/landing-page/sections/Features.tsx`
- Create: `apps/landing-page/__tests__/sections/Features.test.tsx`

**Step 1: 테스트 작성**

```tsx
// __tests__/sections/Features.test.tsx
describe('Features', () => {
  it('renders section with heading', async () => { /* ... */ });
  it('renders 6 feature cards', async () => { /* ... */ });
  it('each card has icon, title, and description', async () => { /* ... */ });
  it('has proper accessibility attributes', async () => { /* ... */ });
});
```

**Step 2: 테스트 실행 — 실패 확인**

Run: `cd apps/landing-page && yarn vitest run __tests__/sections/Features.test.tsx`
Expected: FAIL

**Step 3: Features.tsx 구현**

6개 기능을 2x3 그리드로 표시하는 Server Component. 각 카드는 아이콘(lucide) + 제목 + 설명. 다크 카드 스타일 + 호버 시 보더 글로우.

**Step 4: 테스트 실행 — 통과 확인**

Run: `cd apps/landing-page && yarn vitest run __tests__/sections/Features.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/landing-page/sections/Features.tsx apps/landing-page/__tests__/sections/Features.test.tsx
git commit -m "feat: add Features section with 6-card grid"
```

---

## Task 8: SupportedTools 섹션 (새로 생성)

**Files:**
- Create: `apps/landing-page/sections/SupportedTools.tsx`
- Create: `apps/landing-page/__tests__/sections/SupportedTools.test.tsx`

**Step 1: 테스트 작성**

6개 도구 이름이 렌더링되는지, 적절한 접근성 속성이 있는지 검증.

**Step 2: 테스트 실행 — 실패 확인**

**Step 3: SupportedTools.tsx 구현**

6개 도구를 수평 배열로 표시하는 컴팩트 섹션. 각 도구: 이모지/아이콘 + 이름. 하단에 "+ any MCP-compatible tool" 텍스트.

**Step 4: 테스트 실행 — 통과 확인**

**Step 5: Commit**

```bash
git add apps/landing-page/sections/SupportedTools.tsx apps/landing-page/__tests__/sections/SupportedTools.test.tsx
git commit -m "feat: add SupportedTools section with tool logo strip"
```

---

## Task 9: AgentsShowcase 컴팩트 리팩토링

**Files:**
- Modify: `apps/landing-page/widgets/AgentsShowcase/index.tsx`
- Modify: `apps/landing-page/__tests__/widgets/AgentsShowcase.test.tsx`

**Step 1: 기존 테스트 확인 및 업데이트**

- 검색바 제거 반영
- 최대 8개 표시 제한 반영
- "View All Agents" 링크 추가 반영

**Step 2: AgentsShowcase 리팩토링**

주요 변경:
- 검색(searchbox) 제거
- 카테고리 필터 탭 스타일로 변경 (버튼 그룹)
- 한 번에 최대 8개 에이전트만 표시
- "View All Agents →" 버튼 추가
- 터미널 테마 스타일 적용 (다크 카드, 모노 폰트 제목)

**Step 3: 테스트 실행 — 통과 확인**

Run: `cd apps/landing-page && yarn vitest run __tests__/widgets/AgentsShowcase.test.tsx`
Expected: PASS

**Step 4: Commit**

```bash
git add apps/landing-page/widgets/AgentsShowcase/ apps/landing-page/__tests__/widgets/AgentsShowcase.test.tsx
git commit -m "refactor: make AgentsShowcase compact with category tabs and 8-card limit"
```

---

## Task 10: QuickStart 섹션 리디자인 (터미널 스타일)

**Files:**
- Modify: `apps/landing-page/widgets/QuickStart/index.tsx`
- Modify: `apps/landing-page/__tests__/widgets/QuickStart.test.tsx`

**Step 1: 기존 테스트 업데이트**

Accordion → 세로 스텝 플로우 구조로 변경 반영.

**Step 2: QuickStart 리디자인**

주요 변경:
- Accordion 제거 → 세로 스텝 플로우
- 각 스텝: 터미널 코드 블록 스타일
- 스텝 간 세로 화살표/라인 연결
- 복사 버튼 유지

**Step 3: 테스트 실행 — 통과 확인**

**Step 4: Commit**

```bash
git add apps/landing-page/widgets/QuickStart/ apps/landing-page/__tests__/widgets/QuickStart.test.tsx
git commit -m "refactor: redesign QuickStart with terminal-style vertical steps"
```

---

## Task 11: CTAFooter 섹션 (새로 생성, Footer 대체)

**Files:**
- Create: `apps/landing-page/sections/CTAFooter.tsx`
- Create: `apps/landing-page/__tests__/sections/CTAFooter.test.tsx`
- Delete: `apps/landing-page/components/Footer.tsx` (나중에 layout에서 제거)

**Step 1: 테스트 작성**

CTA 영역(명령어, GitHub/Docs 링크) + Footer 영역(저작권, 라이센스) 검증.

**Step 2: 테스트 실행 — 실패 확인**

**Step 3: CTAFooter.tsx 구현**

- 상단: "Ready to unify your AI coding?" 제목
- 중앙: 큰 터미널 블록 `$ npx codingbuddy init` (클릭 복사)
- CTA 버튼: Star on GitHub + Documentation
- 하단: 저작권, MIT License

**Step 4: 테스트 실행 — 통과 확인**

**Step 5: Commit**

```bash
git add apps/landing-page/sections/CTAFooter.tsx apps/landing-page/__tests__/sections/CTAFooter.test.tsx
git commit -m "feat: add CTAFooter section combining CTA and footer"
```

---

## Task 12: Header 네비게이션 업데이트

**Files:**
- Modify: `apps/landing-page/components/Header/index.tsx`
- Modify: `apps/landing-page/__tests__/components/Header.test.tsx`

**Step 1: Header 업데이트**

- nav 항목에서 FAQ 제거
- 남은 항목: Features (#features), Agents (#agents), Quick Start (#quick-start)
- 터미널 스타일 적용: 모노 폰트 로고, 보더 업데이트

**Step 2: 테스트 업데이트 및 통과 확인**

Run: `cd apps/landing-page && yarn vitest run __tests__/components/Header.test.tsx`
Expected: PASS

**Step 3: Commit**

```bash
git add apps/landing-page/components/Header/ apps/landing-page/__tests__/components/Header.test.tsx
git commit -m "refactor: update Header navigation for new section structure"
```

---

## Task 13: 페이지 레이아웃 및 슬롯 구조 업데이트

**Files:**
- Modify: `apps/landing-page/src/app/[locale]/page.tsx`
- Modify: `apps/landing-page/src/app/[locale]/layout.tsx`
- Delete: `apps/landing-page/src/app/[locale]/@code_example/` (전체 디렉토리)
- Delete: `apps/landing-page/sections/Problem.tsx`
- Delete: `apps/landing-page/sections/Solution.tsx`
- Delete: `apps/landing-page/sections/FAQ/`
- Delete: `apps/landing-page/widgets/CodeExample/`
- Delete: `apps/landing-page/components/Footer.tsx`

**Step 1: page.tsx 업데이트**

```tsx
// src/app/[locale]/page.tsx
import type { SlotProps } from '@/types';
import { Hero } from '@/sections/Hero';
import { BeforeAfter } from '@/sections/BeforeAfter';
import { Features } from '@/sections/Features';
import { SupportedTools } from '@/sections/SupportedTools';

const LocalePage = async ({ params }: SlotProps) => {
  const { locale } = await params;

  return (
    <>
      <Hero locale={locale} />
      <BeforeAfter locale={locale} />
      <Features locale={locale} />
      <SupportedTools locale={locale} />
    </>
  );
};

export default LocalePage;
```

**Step 2: layout.tsx 업데이트**

- `code_example` 슬롯 제거
- `Footer` → `CTAFooter` 교체
- `CLIENT_NAMESPACES` 업데이트: `faq`, `codeExample` 제거, `ctaFooter`, `beforeAfter`, `features`, `supportedTools` 추가 (필요시)
- 섹션 순서: children → agents → quick_start → CTAFooter

```tsx
// layout.tsx 변경 포인트:
interface LocaleLayoutProps {
  children: ReactNode;
  agents: ReactNode;
  // code_example: ReactNode;  ← 제거
  quick_start: ReactNode;
  params: Promise<{ locale: string }>;
}
```

**Step 3: 제거할 파일/디렉토리 삭제**

```bash
rm apps/landing-page/sections/Problem.tsx
rm apps/landing-page/sections/Solution.tsx
rm -rf apps/landing-page/sections/FAQ
rm -rf apps/landing-page/widgets/CodeExample
rm apps/landing-page/components/Footer.tsx
rm -rf apps/landing-page/src/app/\[locale\]/@code_example
```

**Step 4: 관련 테스트 정리**

- `__tests__/sections/Problem.test.tsx` 삭제
- `__tests__/sections/Solution.test.tsx` 삭제
- `__tests__/sections/FAQ.test.tsx` 삭제
- `__tests__/widgets/CodeExample.test.tsx` 삭제
- `__tests__/components/Footer.test.tsx` 삭제

**Step 5: 전체 테스트 실행**

Run: `cd apps/landing-page && yarn test`
Expected: ALL PASS (삭제된 테스트 제외, 나머지 모두 통과)

**Step 6: 타입체크**

Run: `cd apps/landing-page && yarn typecheck`
Expected: PASS

**Step 7: Commit**

```bash
git add -A apps/landing-page/
git commit -m "refactor: update page layout with new section structure, remove old sections"
```

---

## Task 14: 전체 검증 및 시각 확인

**Step 1: 전체 린트 + 타입체크 + 테스트**

Run: `cd apps/landing-page && yarn validate`
Expected: ALL PASS

**Step 2: 개발 서버 시각 확인**

Run: `cd apps/landing-page && yarn dev`
- 브라우저에서 http://localhost:3000/en 접속
- 각 섹션 렌더링 확인
- 다크/라이트 테마 전환 확인
- 모바일 반응형 확인
- 다국어 전환 확인 (/ko, /ja, /zh-CN, /es)

**Step 3: 접근성 확인**

Run: `cd apps/landing-page && yarn vitest run __tests__/accessibility/`
Expected: PASS

**Step 4: 빌드 확인**

Run: `cd apps/landing-page && yarn build`
Expected: Build successful

**Step 5: Commit (필요시 수정사항)**

```bash
git add -A apps/landing-page/
git commit -m "fix: address validation issues from full check"
```

---

## Task Summary

| Task | Description | Dependencies |
|------|-------------|-------------|
| 1 | 디자인 시스템 (CSS 변수) | - |
| 2 | i18n 영어 메시지 | - |
| 3 | i18n 나머지 4개 언어 | Task 2 |
| 4 | TerminalDemo 위젯 | Task 1 |
| 5 | Hero 섹션 리디자인 | Task 1, 2, 4 |
| 6 | BeforeAfter 섹션 | Task 1, 2 |
| 7 | Features 섹션 | Task 1, 2 |
| 8 | SupportedTools 섹션 | Task 1, 2 |
| 9 | AgentsShowcase 리팩토링 | Task 1, 2 |
| 10 | QuickStart 리디자인 | Task 1, 2 |
| 11 | CTAFooter 섹션 | Task 1, 2 |
| 12 | Header 업데이트 | Task 2 |
| 13 | 페이지 레이아웃 통합 | Task 5-12 |
| 14 | 전체 검증 | Task 13 |
