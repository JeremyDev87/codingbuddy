# JSON-LD Structured Data Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add JSON-LD `SoftwareApplication` structured data to the landing page for improved SEO and Google rich results.

**Architecture:** Create a pure utility function `generateJsonLd()` in `lib/json-ld.ts` that builds the schema.org structured data object. Integrate it into the locale layout via a `<script type="application/ld+json">` tag. Each locale renders with its translated name/description and correct `inLanguage` value.

**Tech Stack:** Next.js 16 App Router, next-intl, Vitest, TypeScript

**Issue:** [#424](https://github.com/JeremyDev87/codingbuddy/issues/424)

---

## Task 1: Create `generateJsonLd` pure function (TDD)

**Files:**
- Create: `apps/landing-page/lib/json-ld.ts`
- Test: `apps/landing-page/__tests__/lib/json-ld.test.ts`

### Step 1: Write the failing test

```typescript
// __tests__/lib/json-ld.test.ts
import { describe, test, expect } from 'vitest';
import { generateJsonLd } from '@/lib/json-ld';

describe('generateJsonLd', () => {
  test('returns valid SoftwareApplication schema', () => {
    const result = generateJsonLd({
      name: 'Codingbuddy - Multi-AI Rules for Consistent Coding',
      description: 'One ruleset for all tools.',
      locale: 'en',
    });

    expect(result).toEqual({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Codingbuddy - Multi-AI Rules for Consistent Coding',
      description: 'One ruleset for all tools.',
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Cross-platform',
      inLanguage: 'en',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
    });
  });

  test('sets inLanguage based on locale parameter', () => {
    const result = generateJsonLd({
      name: 'Codingbuddy',
      description: 'desc',
      locale: 'ko',
    });

    expect(result.inLanguage).toBe('ko');
  });

  test('handles zh-CN locale', () => {
    const result = generateJsonLd({
      name: 'Codingbuddy',
      description: 'desc',
      locale: 'zh-CN',
    });

    expect(result.inLanguage).toBe('zh-CN');
  });
});
```

### Step 2: Run test to verify it fails

Run: `cd apps/landing-page && yarn vitest run __tests__/lib/json-ld.test.ts`
Expected: FAIL - module not found

### Step 3: Write minimal implementation

```typescript
// lib/json-ld.ts
interface JsonLdInput {
  name: string;
  description: string;
  locale: string;
}

interface JsonLdOutput {
  '@context': string;
  '@type': string;
  name: string;
  description: string;
  applicationCategory: string;
  operatingSystem: string;
  inLanguage: string;
  offers: {
    '@type': string;
    price: string;
    priceCurrency: string;
  };
}

export const generateJsonLd = ({ name, description, locale }: JsonLdInput): JsonLdOutput => ({
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name,
  description,
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Cross-platform',
  inLanguage: locale,
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
});
```

### Step 4: Run test to verify it passes

Run: `cd apps/landing-page && yarn vitest run __tests__/lib/json-ld.test.ts`
Expected: PASS (3 tests)

### Step 5: Commit

```bash
git add apps/landing-page/lib/json-ld.ts apps/landing-page/__tests__/lib/json-ld.test.ts
git commit -m "feat(landing-page): add generateJsonLd utility for SEO structured data (#424)"
```

---

## Task 2: Integrate JSON-LD into locale layout

**Files:**
- Modify: `apps/landing-page/src/app/[locale]/layout.tsx`

### Step 1: Add import and JSON-LD script to layout

In `layout.tsx`, add:
1. Import `generateJsonLd` from `@/lib/json-ld`
2. Call `generateJsonLd` in the `LocaleLayout` component with translated title/description
3. Render `<script type="application/ld+json">` inside `<head>` of the `<html>` tag

```tsx
// Add to imports:
import { generateJsonLd } from '@/lib/json-ld';

// In LocaleLayout component, after `const messages = await getMessages()`:
const t = await getTranslations({ locale, namespace: 'metadata' });
const jsonLd = generateJsonLd({
  name: t('title'),
  description: t('description'),
  locale,
});

// In JSX, add <head> with script before <body>:
<html lang={locale} suppressHydrationWarning>
  <head>
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  </head>
  <body ...>
```

**Note:** `getTranslations` is already imported. However, `generateMetadata` already calls `getTranslations` for `metadata` namespace. In the layout component itself, we need a separate `getTranslations` call since `generateMetadata` runs in a different context.

### Step 2: Run existing tests to verify no regressions

Run: `cd apps/landing-page && yarn vitest run`
Expected: All tests pass

### Step 3: Commit

```bash
git add apps/landing-page/src/app/[locale]/layout.tsx
git commit -m "feat(landing-page): add JSON-LD structured data to locale layout (#424)"
```

---

## Task 3: Add layout integration test for JSON-LD

**Files:**
- Modify: `apps/landing-page/__tests__/i18n/layout.test.ts`

### Step 1: Write the test

Add a new test to the existing `layout.test.ts` to verify `generateMetadata` still works and that the `generateJsonLd` function is being used correctly. Since full layout rendering requires Next.js server context, we test the pure function integration:

```typescript
// Add to existing layout.test.ts:
import { generateJsonLd } from '../../lib/json-ld';

test('JSON-LD can be generated for each supported locale', () => {
  for (const locale of SUPPORTED_LOCALES) {
    const result = generateJsonLd({
      name: `Test App - ${locale}`,
      description: `Description for ${locale}`,
      locale,
    });

    expect(result['@context']).toBe('https://schema.org');
    expect(result['@type']).toBe('SoftwareApplication');
    expect(result.inLanguage).toBe(locale);
    expect(result.name).toContain(locale);
  }
});
```

### Step 2: Run tests to verify

Run: `cd apps/landing-page && yarn vitest run __tests__/i18n/layout.test.ts`
Expected: PASS (3 tests)

### Step 3: Commit

```bash
git add apps/landing-page/__tests__/i18n/layout.test.ts
git commit -m "test(landing-page): add JSON-LD locale integration test (#424)"
```

---

## Task 4: Validate build and full test suite

### Step 1: Run full test suite

Run: `cd apps/landing-page && yarn test`
Expected: All tests pass

### Step 2: Run type check

Run: `cd apps/landing-page && yarn typecheck`
Expected: No type errors

### Step 3: Run lint & format check

Run: `cd apps/landing-page && yarn lint && yarn format:check`
Expected: No issues

### Step 4: Final commit (if any formatting fixes needed)

```bash
git add -A
git commit -m "style(landing-page): format JSON-LD files (#424)"
```

---

## Summary

| Task | Description | Files | TDD |
|------|-------------|-------|-----|
| 1 | `generateJsonLd` pure function | `lib/json-ld.ts`, `__tests__/lib/json-ld.test.ts` | Red -> Green |
| 2 | Layout integration | `src/app/[locale]/layout.tsx` | - |
| 3 | Layout integration test | `__tests__/i18n/layout.test.ts` | Green |
| 4 | Build & test validation | - | Verify |

**Estimated changes:** ~40 LOC new code, ~50 LOC new tests
