# WSA (Widget-Slot Architecture) Migration Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate 5 landing page sections to WSA pattern — each section becomes a Widget + Slot with independent fault isolation.

**Architecture:** Move `sections/` components into `widgets/` directory, create `@slot/` parallel routes for each, convert `layout.tsx` to Static Shell (no direct component rendering), minimize `page.tsx`.

**Tech Stack:** Next.js 16 (App Router Parallel Routes), React 19, next-intl, Tailwind CSS 4, Vitest + Testing Library

**Issue:** [#660](https://github.com/JeremyDev87/codingbuddy/issues/660) — Sub-issues: #661, #662, #663, #664

---

## Current vs Target Architecture

```
CURRENT:
layout.tsx ─── Header + <main>{children}{agents}{quick_start}</main> + CTAFooter + CookieConsent
page.tsx   ─── <Hero/><BeforeAfter/><Features/><SupportedTools/>

TARGET (Static Shell):
layout.tsx ─── Header + <main>{children}{hero}{before_after}{features}{supported_tools}{agents}{quick_start}{cta_footer}</main> + CookieConsent
page.tsx   ─── null (empty shell)
```

## Existing WSA Pattern (Reference)

Each slot follows this 4-file pattern:
```
@slot_name/
├── page.tsx      # async Server Component → renders Widget with locale
├── default.tsx   # () => null
├── error.tsx     # 'use client' → <SlotError reset={reset} slotName="name" />
└── loading.tsx   # Skeleton UI with aria-busy + sr-only
```

---

## Task 1: Move Hero section to widget (#661)

**Files:**
- Create: `apps/landing-page/widgets/Hero/index.tsx`
- Delete: `apps/landing-page/sections/Hero.tsx` (after Task 3)
- Keep: `apps/landing-page/widgets/TerminalDemo/` (already exists, used by Hero)

**Step 1: Create Hero widget**

Create `apps/landing-page/widgets/Hero/index.tsx` — copy content from `sections/Hero.tsx` as-is (it's already a well-structured async Server Component):

```tsx
import { getTranslations } from 'next-intl/server';
import { ArrowRight, Github } from 'lucide-react';
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
      className="relative overflow-hidden bg-dot-pattern px-4 py-20 sm:py-28"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/3 top-1/4 size-[500px] rounded-full bg-terminal-purple/10 blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/3 size-[400px] rounded-full bg-terminal-green/10 blur-[100px]" />
      </div>

      <div className="mx-auto max-w-4xl text-center">
        <h1 id="hero-heading" className="font-mono text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
          {t('title')}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
          {t('subtitle')}
        </p>
        <div className="mt-10">
          <TerminalDemo messages={terminalMessages} />
        </div>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button size="lg" className="bg-terminal-green font-mono text-black glow-green hover:bg-terminal-green/90" asChild>
            <a href="#quick-start">
              <span className="mr-1">$</span> {t('cta')}
              <ArrowRight className="ml-1 size-4" aria-hidden="true" />
            </a>
          </Button>
          <Button variant="outline" size="lg" className="border-terminal-border font-mono hover:border-terminal-purple hover:text-terminal-purple" asChild>
            <a href="https://github.com/JeremyDev87/codingbuddy" target="_blank" rel="noopener noreferrer">
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

**Step 2: Verify Hero widget imports work**

Run: `cd apps/landing-page && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to Hero widget

**Step 3: Commit**

```bash
git add apps/landing-page/widgets/Hero/index.tsx
git commit -m "refactor(landing-page): create Hero widget from section"
```

---

## Task 2: Move BeforeAfter section to widget (#661)

**Files:**
- Create: `apps/landing-page/widgets/BeforeAfter/index.tsx`

**Step 1: Create BeforeAfter widget**

Create `apps/landing-page/widgets/BeforeAfter/index.tsx` — copy from `sections/BeforeAfter.tsx` as-is:

```tsx
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
        <h2 id="before-after-heading" className="mb-12 text-center font-mono text-2xl font-bold tracking-tight sm:text-3xl">
          {t('title')}
        </h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-lg border border-terminal-red/30 bg-terminal-bg p-5">
            <div className="mb-4 flex items-center gap-2">
              <X className="size-4 text-terminal-red" aria-hidden="true" />
              <span className="font-mono text-sm font-semibold text-terminal-red">{t('beforeLabel')}</span>
            </div>
            <div className="space-y-2">
              {beforeFiles.map(key => (
                <div key={key} className="flex items-center gap-2 font-mono text-sm text-terminal-text">
                  <span className="text-terminal-muted" aria-hidden="true">📄</span>
                  <span>{t(key)}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 font-mono text-xs text-terminal-red/80">{t('beforeFiles')}</p>
          </div>
          <div className="rounded-lg border border-terminal-green/30 bg-terminal-bg p-5">
            <div className="mb-4 flex items-center gap-2">
              <Check className="size-4 text-terminal-green" aria-hidden="true" />
              <span className="font-mono text-sm font-semibold text-terminal-green">{t('afterLabel')}</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-mono text-sm text-terminal-green">
                <span className="text-terminal-muted" aria-hidden="true">📁</span>
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
            <p className="mt-4 font-mono text-xs text-terminal-green/80">{t('afterFiles')}</p>
          </div>
        </div>
      </div>
    </section>
  );
};
```

**Step 2: Commit**

```bash
git add apps/landing-page/widgets/BeforeAfter/index.tsx
git commit -m "refactor(landing-page): create BeforeAfter widget from section"
```

---

## Task 3: Move Features section to widget (#661)

**Files:**
- Create: `apps/landing-page/widgets/Features/index.tsx`

**Step 1: Create Features widget**

Create `apps/landing-page/widgets/Features/index.tsx` — copy from `sections/Features.tsx` as-is.

**Step 2: Commit**

```bash
git add apps/landing-page/widgets/Features/index.tsx
git commit -m "refactor(landing-page): create Features widget from section"
```

---

## Task 4: Move SupportedTools section to widget (#661)

**Files:**
- Create: `apps/landing-page/widgets/SupportedTools/index.tsx`

**Step 1: Create SupportedTools widget**

Create `apps/landing-page/widgets/SupportedTools/index.tsx` — copy from `sections/SupportedTools.tsx` as-is.

**Step 2: Commit**

```bash
git add apps/landing-page/widgets/SupportedTools/index.tsx
git commit -m "refactor(landing-page): create SupportedTools widget from section"
```

---

## Task 5: Move CTAFooter section to widget (#661)

**Files:**
- Create: `apps/landing-page/widgets/CTAFooter/index.tsx`

**Step 1: Create CTAFooter widget**

Create `apps/landing-page/widgets/CTAFooter/index.tsx` — copy from `sections/CTAFooter.tsx` as-is.

**Step 2: Commit**

```bash
git add apps/landing-page/widgets/CTAFooter/index.tsx
git commit -m "refactor(landing-page): create CTAFooter widget from section"
```

---

## Task 6: Create @hero slot (#662)

**Files:**
- Create: `apps/landing-page/src/app/[locale]/@hero/page.tsx`
- Create: `apps/landing-page/src/app/[locale]/@hero/default.tsx`
- Create: `apps/landing-page/src/app/[locale]/@hero/error.tsx`
- Create: `apps/landing-page/src/app/[locale]/@hero/loading.tsx`

**Step 1: Create slot files**

`@hero/page.tsx`:
```tsx
import { Hero } from '@/widgets/Hero';
import type { SlotProps } from '@/types';

const HeroSlot = async ({ params }: SlotProps) => {
  const { locale } = await params;
  return <Hero locale={locale} />;
};

export default HeroSlot;
```

`@hero/default.tsx`:
```tsx
const HeroDefault = () => null;

export default HeroDefault;
```

`@hero/error.tsx`:
```tsx
'use client';

import { SlotError } from '@/components/SlotError';

interface HeroErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const HeroError = ({ reset }: HeroErrorProps) => <SlotError reset={reset} slotName="hero" />;

export default HeroError;
```

`@hero/loading.tsx`:
```tsx
import { Skeleton } from '@/components/ui/skeleton';

const HeroLoading = () => (
  <section aria-busy="true" aria-label="Loading hero">
    <span className="sr-only">Loading hero, please wait...</span>
    <div className="px-4 py-20 sm:py-28">
      <div className="mx-auto max-w-4xl text-center">
        <Skeleton className="mx-auto h-12 w-96 mb-4" />
        <Skeleton className="mx-auto h-6 w-64 mb-10" />
        <Skeleton className="mx-auto h-64 w-full max-w-2xl rounded-lg mb-10" />
        <div className="flex justify-center gap-4">
          <Skeleton className="h-12 w-40 rounded-md" />
          <Skeleton className="h-12 w-40 rounded-md" />
        </div>
      </div>
    </div>
  </section>
);

export default HeroLoading;
```

**Step 2: Commit**

```bash
git add apps/landing-page/src/app/\[locale\]/@hero/
git commit -m "refactor(landing-page): create @hero slot"
```

---

## Task 7: Create @before_after slot (#662)

**Files:**
- Create: `apps/landing-page/src/app/[locale]/@before_after/page.tsx`
- Create: `apps/landing-page/src/app/[locale]/@before_after/default.tsx`
- Create: `apps/landing-page/src/app/[locale]/@before_after/error.tsx`
- Create: `apps/landing-page/src/app/[locale]/@before_after/loading.tsx`

**Step 1: Create slot files**

`@before_after/page.tsx`:
```tsx
import { BeforeAfter } from '@/widgets/BeforeAfter';
import type { SlotProps } from '@/types';

const BeforeAfterSlot = async ({ params }: SlotProps) => {
  const { locale } = await params;
  return <BeforeAfter locale={locale} />;
};

export default BeforeAfterSlot;
```

`@before_after/default.tsx`:
```tsx
const BeforeAfterDefault = () => null;

export default BeforeAfterDefault;
```

`@before_after/error.tsx`:
```tsx
'use client';

import { SlotError } from '@/components/SlotError';

interface BeforeAfterErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const BeforeAfterError = ({ reset }: BeforeAfterErrorProps) => (
  <SlotError reset={reset} slotName="before after" />
);

export default BeforeAfterError;
```

`@before_after/loading.tsx`:
```tsx
import { Skeleton } from '@/components/ui/skeleton';

const BeforeAfterLoading = () => (
  <section aria-busy="true" aria-label="Loading before after comparison">
    <span className="sr-only">Loading comparison, please wait...</span>
    <div className="px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-4xl">
        <Skeleton className="mx-auto h-8 w-64 mb-12" />
        <div className="grid gap-6 sm:grid-cols-2">
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      </div>
    </div>
  </section>
);

export default BeforeAfterLoading;
```

**Step 2: Commit**

```bash
git add apps/landing-page/src/app/\[locale\]/@before_after/
git commit -m "refactor(landing-page): create @before_after slot"
```

---

## Task 8: Create @features slot (#662)

**Files:**
- Create: `apps/landing-page/src/app/[locale]/@features/page.tsx`
- Create: `apps/landing-page/src/app/[locale]/@features/default.tsx`
- Create: `apps/landing-page/src/app/[locale]/@features/error.tsx`
- Create: `apps/landing-page/src/app/[locale]/@features/loading.tsx`

**Step 1: Create slot files**

`@features/page.tsx`:
```tsx
import { Features } from '@/widgets/Features';
import type { SlotProps } from '@/types';

const FeaturesSlot = async ({ params }: SlotProps) => {
  const { locale } = await params;
  return <Features locale={locale} />;
};

export default FeaturesSlot;
```

`@features/default.tsx`:
```tsx
const FeaturesDefault = () => null;

export default FeaturesDefault;
```

`@features/error.tsx`:
```tsx
'use client';

import { SlotError } from '@/components/SlotError';

interface FeaturesErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const FeaturesError = ({ reset }: FeaturesErrorProps) => (
  <SlotError reset={reset} slotName="features" />
);

export default FeaturesError;
```

`@features/loading.tsx`:
```tsx
import { Skeleton } from '@/components/ui/skeleton';

const FeaturesLoading = () => (
  <section aria-busy="true" aria-label="Loading features">
    <span className="sr-only">Loading features, please wait...</span>
    <div className="px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-5xl">
        <Skeleton className="mx-auto h-8 w-48 mb-12" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default FeaturesLoading;
```

**Step 2: Commit**

```bash
git add apps/landing-page/src/app/\[locale\]/@features/
git commit -m "refactor(landing-page): create @features slot"
```

---

## Task 9: Create @supported_tools slot (#662)

**Files:**
- Create: `apps/landing-page/src/app/[locale]/@supported_tools/page.tsx`
- Create: `apps/landing-page/src/app/[locale]/@supported_tools/default.tsx`
- Create: `apps/landing-page/src/app/[locale]/@supported_tools/error.tsx`
- Create: `apps/landing-page/src/app/[locale]/@supported_tools/loading.tsx`

**Step 1: Create slot files**

`@supported_tools/page.tsx`:
```tsx
import { SupportedTools } from '@/widgets/SupportedTools';
import type { SlotProps } from '@/types';

const SupportedToolsSlot = async ({ params }: SlotProps) => {
  const { locale } = await params;
  return <SupportedTools locale={locale} />;
};

export default SupportedToolsSlot;
```

`@supported_tools/default.tsx`:
```tsx
const SupportedToolsDefault = () => null;

export default SupportedToolsDefault;
```

`@supported_tools/error.tsx`:
```tsx
'use client';

import { SlotError } from '@/components/SlotError';

interface SupportedToolsErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const SupportedToolsError = ({ reset }: SupportedToolsErrorProps) => (
  <SlotError reset={reset} slotName="supported tools" />
);

export default SupportedToolsError;
```

`@supported_tools/loading.tsx`:
```tsx
import { Skeleton } from '@/components/ui/skeleton';

const SupportedToolsLoading = () => (
  <section aria-busy="true" aria-label="Loading supported tools">
    <span className="sr-only">Loading supported tools, please wait...</span>
    <div className="px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-4xl text-center">
        <Skeleton className="mx-auto h-6 w-48 mb-8" />
        <div className="flex flex-wrap justify-center gap-6">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-32 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default SupportedToolsLoading;
```

**Step 2: Commit**

```bash
git add apps/landing-page/src/app/\[locale\]/@supported_tools/
git commit -m "refactor(landing-page): create @supported_tools slot"
```

---

## Task 10: Create @cta_footer slot (#662)

**Files:**
- Create: `apps/landing-page/src/app/[locale]/@cta_footer/page.tsx`
- Create: `apps/landing-page/src/app/[locale]/@cta_footer/default.tsx`
- Create: `apps/landing-page/src/app/[locale]/@cta_footer/error.tsx`
- Create: `apps/landing-page/src/app/[locale]/@cta_footer/loading.tsx`

**Step 1: Create slot files**

`@cta_footer/page.tsx`:
```tsx
import { CTAFooter } from '@/widgets/CTAFooter';
import type { SlotProps } from '@/types';

const CTAFooterSlot = async ({ params }: SlotProps) => {
  const { locale } = await params;
  return <CTAFooter locale={locale} />;
};

export default CTAFooterSlot;
```

`@cta_footer/default.tsx`:
```tsx
const CTAFooterDefault = () => null;

export default CTAFooterDefault;
```

`@cta_footer/error.tsx`:
```tsx
'use client';

import { SlotError } from '@/components/SlotError';

interface CTAFooterErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const CTAFooterError = ({ reset }: CTAFooterErrorProps) => (
  <SlotError reset={reset} slotName="footer" />
);

export default CTAFooterError;
```

`@cta_footer/loading.tsx`:
```tsx
import { Skeleton } from '@/components/ui/skeleton';

const CTAFooterLoading = () => (
  <section aria-busy="true" aria-label="Loading footer">
    <span className="sr-only">Loading footer, please wait...</span>
    <div className="px-4 py-16 sm:py-24 text-center">
      <Skeleton className="mx-auto h-8 w-64 mb-8" />
      <Skeleton className="mx-auto h-12 w-80 rounded-lg mb-8" />
      <div className="flex justify-center gap-4">
        <Skeleton className="h-12 w-36 rounded-md" />
        <Skeleton className="h-12 w-36 rounded-md" />
      </div>
    </div>
  </section>
);

export default CTAFooterLoading;
```

**Step 2: Commit**

```bash
git add apps/landing-page/src/app/\[locale\]/@cta_footer/
git commit -m "refactor(landing-page): create @cta_footer slot"
```

---

## Task 11: Convert layout.tsx to Static Shell (#663)

**Files:**
- Modify: `apps/landing-page/src/app/[locale]/layout.tsx`

**Step 1: Update layout.tsx**

Changes needed:
1. Remove `CTAFooter` import from `@/sections/CTAFooter`
2. Add 5 new slot props: `hero`, `before_after`, `features`, `supported_tools`, `cta_footer`
3. Remove direct `<CTAFooter locale={locale} />` rendering
4. Place all 7 slots in correct order inside `<main>`
5. Add `'hero'`, `'beforeAfter'`, `'features'`, `'supportedTools'`, `'ctaFooter'` to `CLIENT_NAMESPACES` (these sections use server-side translations, but CTAFooter needs `ctaFooter` namespace when it eventually becomes client-side; for now only add if needed)

Updated `LocaleLayoutProps`:
```tsx
interface LocaleLayoutProps {
  children: ReactNode;
  hero: ReactNode;
  before_after: ReactNode;
  features: ReactNode;
  supported_tools: ReactNode;
  agents: ReactNode;
  quick_start: ReactNode;
  cta_footer: ReactNode;
  params: Promise<{ locale: string }>;
}
```

Updated component:
```tsx
const LocaleLayout = async ({
  children,
  hero,
  before_after,
  features,
  supported_tools,
  agents,
  quick_start,
  cta_footer,
  params,
}: LocaleLayoutProps) => {
  // ... (same setup code) ...

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded"
          >
            Skip to main content
          </a>
          <NextIntlClientProvider locale={locale} messages={pickClientMessages(messages)}>
            <Header />
            <main id="main-content" className="flex min-h-screen flex-col">
              {children}
              {hero}
              {before_after}
              {features}
              {supported_tools}
              {agents}
              {quick_start}
            </main>
            {cta_footer}
            <Suspense>
              <CookieConsent />
            </Suspense>
          </NextIntlClientProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
};
```

**Key decisions:**
- `{cta_footer}` is placed OUTSIDE `<main>` because it contains a `<footer>` element (semantic HTML — footer should be sibling of main)
- `{children}` stays first (page.tsx will return null)
- Remove single `<Suspense>` wrapper around CTAFooter — fault isolation now handled by slot's error.tsx/loading.tsx
- Remove `import { CTAFooter }` and `import { Suspense }` (Suspense still needed for CookieConsent)

**Step 2: Verify TypeScript**

Run: `cd apps/landing-page && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No type errors

**Step 3: Commit**

```bash
git add apps/landing-page/src/app/\[locale\]/layout.tsx
git commit -m "refactor(landing-page): convert layout.tsx to Static Shell with all slots"
```

---

## Task 12: Minimize page.tsx (#663)

**Files:**
- Modify: `apps/landing-page/src/app/[locale]/page.tsx`

**Step 1: Update page.tsx to empty shell**

```tsx
const LocalePage = () => null;

export default LocalePage;
```

All content previously rendered by page.tsx (Hero, BeforeAfter, Features, SupportedTools) is now served by their respective `@slot/page.tsx` parallel routes.

**Step 2: Commit**

```bash
git add apps/landing-page/src/app/\[locale\]/page.tsx
git commit -m "refactor(landing-page): minimize page.tsx to empty shell"
```

---

## Task 13: Delete old sections/ files (#663)

**Files:**
- Delete: `apps/landing-page/sections/Hero.tsx`
- Delete: `apps/landing-page/sections/BeforeAfter.tsx`
- Delete: `apps/landing-page/sections/Features.tsx`
- Delete: `apps/landing-page/sections/SupportedTools.tsx`
- Delete: `apps/landing-page/sections/CTAFooter.tsx`

**Step 1: Remove old section files**

```bash
rm apps/landing-page/sections/Hero.tsx
rm apps/landing-page/sections/BeforeAfter.tsx
rm apps/landing-page/sections/Features.tsx
rm apps/landing-page/sections/SupportedTools.tsx
rm apps/landing-page/sections/CTAFooter.tsx
```

**Step 2: Check if sections/ directory is now empty**

Run: `ls apps/landing-page/sections/`
Expected: Empty directory (or directory can be removed)

If empty: `rmdir apps/landing-page/sections/`

**Step 3: Verify no broken imports**

Run: `cd apps/landing-page && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors (all imports now point to widgets/)

**Step 4: Commit**

```bash
git add -A apps/landing-page/sections/
git commit -m "refactor(landing-page): remove old sections/ directory"
```

---

## Task 14: Update test imports (#664)

**Files:**
- Modify: `apps/landing-page/__tests__/sections/Hero.test.tsx`
- Modify: `apps/landing-page/__tests__/sections/BeforeAfter.test.tsx`
- Modify: `apps/landing-page/__tests__/sections/Features.test.tsx`
- Modify: `apps/landing-page/__tests__/sections/SupportedTools.test.tsx`
- Modify: `apps/landing-page/__tests__/sections/CTAFooter.test.tsx`

**Step 1: Update all imports from `@/sections/` to `@/widgets/`**

For each test file, change:
```tsx
// Before
import { Hero } from '@/sections/Hero';
// After
import { Hero } from '@/widgets/Hero';
```

Apply same pattern for BeforeAfter, Features, SupportedTools, CTAFooter.

**Step 2: Move test files to `__tests__/widgets/` directory**

```bash
mv apps/landing-page/__tests__/sections/Hero.test.tsx apps/landing-page/__tests__/widgets/Hero.test.tsx
mv apps/landing-page/__tests__/sections/BeforeAfter.test.tsx apps/landing-page/__tests__/widgets/BeforeAfter.test.tsx
mv apps/landing-page/__tests__/sections/Features.test.tsx apps/landing-page/__tests__/widgets/Features.test.tsx
mv apps/landing-page/__tests__/sections/SupportedTools.test.tsx apps/landing-page/__tests__/widgets/SupportedTools.test.tsx
mv apps/landing-page/__tests__/sections/CTAFooter.test.tsx apps/landing-page/__tests__/widgets/CTAFooter.test.tsx
```

**Step 3: Remove empty `__tests__/sections/` directory if empty**

```bash
rmdir apps/landing-page/__tests__/sections/ 2>/dev/null || true
```

**Step 4: Commit**

```bash
git add -A apps/landing-page/__tests__/
git commit -m "refactor(landing-page): move tests from sections/ to widgets/"
```

---

## Task 15: Run full test verification (#664)

**Step 1: Run all landing-page tests**

Run: `cd apps/landing-page && yarn test --run 2>&1`
Expected: All tests pass

**Step 2: Run TypeScript check**

Run: `cd apps/landing-page && npx tsc --noEmit`
Expected: No type errors

**Step 3: Run build**

Run: `cd apps/landing-page && yarn build 2>&1 | tail -20`
Expected: Build succeeds

**Step 4: Final commit (if any fixes needed)**

```bash
git commit -m "fix(landing-page): resolve test/build issues from WSA migration"
```

---

## Summary

| Sub-issue | Tasks | Description |
|-----------|-------|-------------|
| #661 | 1-5 | Move 5 sections → widgets/ |
| #662 | 6-10 | Create 5 @slot directories (4 files each) |
| #663 | 11-13 | Static Shell layout + empty page + delete sections/ |
| #664 | 14-15 | Update test paths + full verification |

**Total new files:** 25 (5 widgets + 20 slot files)
**Total deleted files:** 5 (old sections)
**Total modified files:** 3 (layout.tsx, page.tsx, tests)

**After migration — all 7 regions use WSA:**
| Slot | Widget | Status |
|------|--------|--------|
| `@hero` | `widgets/Hero` | NEW |
| `@before_after` | `widgets/BeforeAfter` | NEW |
| `@features` | `widgets/Features` | NEW |
| `@supported_tools` | `widgets/SupportedTools` | NEW |
| `@agents` | `widgets/AgentsShowcase` | Existing |
| `@quick_start` | `widgets/QuickStart` | Existing |
| `@cta_footer` | `widgets/CTAFooter` | NEW |
