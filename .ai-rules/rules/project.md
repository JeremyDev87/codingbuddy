# Project Setup

## Project Overview

프로젝트별로 정의하세요. 이 파일은 범용 AI 규칙 템플릿입니다.

## Tech Stack

프로젝트의 `package.json`을 참조하세요. AI 규칙에서는 특정 패키지 버전을 고정하지 않습니다.

## Project Structure

Layered architecture with clear separation of concerns:

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   ├── magazine/          # Main page routing
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
│
├── entities/              # Domain entities (business logic)
│   ├── {domain}/
│   │   ├── apis/          # API call functions (*.ts)
│   │   ├── models/        # React Query hooks (*.ts, *.tsx)
│   │   ├── types.ts       # Type definitions
│   │   └── index.ts       # Public API
│   └── (e.g.) article, author, collection, newsletter
│
├── features/              # Feature-specific UI components
│   ├── {Feature}/
│   │   ├── {Feature}.tsx          # Main component
│   │   ├── {Feature}.parts.tsx    # Sub-components
│   │   ├── {Feature}.types.ts     # Type definitions
│   │   ├── {Feature}.constants.ts # Constants
│   │   ├── {Feature}.unit.spec.tsx # Unit tests
│   │   └── index.ts               # Export
│   └── (e.g.) AppBar, Article, Author, Collection, Landing
│
├── widgets/               # Composite widgets (multiple features combined)
│   ├── {Widget}/
│   │   ├── {Widget}.tsx           # Main widget
│   │   ├── {Widget}.parts.tsx     # Sub-components
│   │   └── index.ts
│   └── (e.g.) ArticleDetailMain, CollectionDetail
│
├── shared/                # Common modules (used across the project)
│   ├── Components/        # Reusable UI components
│   ├── hooks/            # Custom hooks
│   ├── providers/        # React Context Providers
│   ├── utils/            # Utility functions
│   ├── types/            # Common type definitions
│   ├── constants/        # Common constants
│   ├── api/              # Axios instance, error handlers
│   ├── auth/             # Authentication logic
│   └── services/         # Business services
│
├── middleware.ts          # Next.js middleware
└── instrumentation.ts     # Datadog monitoring setup
```

## Development Rules

### 1. Code Writing Rules

#### Core Principles
- **Never use mocking**: Write only real, working code
- **Type Safety**: Follow TypeScript strict mode (`strict: true`)
- **Latest React Features**: Utilize latest React capabilities (Server Components, etc.)
- **Component Naming**: PascalCase, use clear names that indicate functionality
- **React import**: Use named imports for React types (`import { type ReactNode, type FC } from 'react';`)

#### File Naming Convention
- **Component**: `{Feature}.tsx`
- **Sub-components**: `{Feature}.parts.tsx`
- **Types**: `{Feature}.types.ts` or `types.ts`
- **Constants**: `{Feature}.constants.ts` or `constants.ts`
- **Utils**: `{Feature}.utils.ts`
- **Unit Tests**: `{Feature}.unit.spec.tsx`
- **E2E Tests**: `{Feature}.cy.ts`
- **Module Export**: `index.ts`

#### Import/Export Rules
- Each module exports only public API through `index.ts`
- Use absolute paths: `@/` (src directory), `@test/` (test directory)
- Layer dependency direction: `app → widgets → features → entities → shared`

### 2. Pure vs Impure Function Separation

- **Always separate pure and impure functions into different files**
- **Pure functions**: `*.utils.ts`, `*.helpers.ts`
- **Impure functions**: `*.api.ts`, `*.service.ts`, `*.models.ts`

Example:
```typescript
// ✅ Good: Separated
// validation.utils.ts - Pure function
export const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// newsletter.api.ts - Impure function
export const subscribeNewsletter = async (email: string) => { /* API call */ };

// ❌ Bad: Mixed
// newsletter.ts - Mixed together
export const validateEmail = (email: string) => { /* ... */ };
export const subscribeNewsletter = async (email: string) => { /* ... */ };
```

### 3. Script Commands

```bash
# Development
yarn dev          # Start dev server (Turbopack, port 3000)
yarn build        # Production build (standalone output)
yarn start        # Start production server

# Code Quality
yarn lint         # ESLint check

# Testing
yarn test:unit    # Jest unit tests (*.unit.spec.tsx)
yarn test:e2e     # Cypress E2E tests
yarn e2e:open     # Cypress interactive mode

# Git Hooks
yarn prepare      # Husky setup
```

## Development Workflow

For detailed TDD workflows, testing strategies, and code quality practices, refer to **`augmented-coding.md`**.

### Quick Reference

**Development approach:**
- Core logic (entities, shared/utils, hooks): TDD (test-first)
- UI components (features, widgets): Test-after
- Coverage goal: 90%+
- File naming: `*.unit.spec.tsx` for unit tests, `*.cy.ts` for E2E

### Code Review Checklist

#### Required Checks
- [ ] **TypeScript Type Safety**: No `any` usage, all types explicitly defined
- [ ] **Test Coverage**: Maintain 90%+ coverage
- [ ] **ESLint Rules**: Resolve all linting errors
- [ ] **Pure/Impure Separation**: Separate files for pure and impure functions

#### Architecture & Design
- [ ] **Layer Architecture**: Respect layer boundaries and separation of concerns
- [ ] **Dependency Direction**: app → widgets → features → entities → shared
- [ ] **Component Reusability**: DRY principle, utilize shared/Components
- [ ] **Code quality**: See `augmented-coding.md` for SOLID, TDD, and refactoring standards

#### Performance & Optimization
- [ ] **React Optimization**: Proper use of React.memo, useMemo, useCallback
- [ ] **Image Optimization**: Use Next.js Image component
- [ ] **Bundle Size**: Code splitting with dynamic imports
- [ ] **Rendering Optimization**: Prevent unnecessary re-renders

#### UX & Accessibility
- [ ] **Responsive Design**: Support mobile/tablet/desktop
- [ ] **Accessibility (a11y)**: ARIA attributes, keyboard navigation
- [ ] **Loading States**: Provide loading UI (Skeleton, Spinner, etc.)
- [ ] **Error Handling**: Utilize react-error-boundary

## Important Guidelines

### 1. Never Do ❌

- **Mock data or fake implementations**: Only real API integration allowed
- **Type `any` usage**: Explicitly define all types
- **Direct DOM manipulation**: Use React patterns
- **Leave console.log in production code**: Development only
- **Mix pure/impure functions**: Must separate into different files
- **Reverse layer dependencies**: Lower layers cannot import upper layers

### 2. Must Do ✅

- **Write code with real API calls** (no mocking)
- **Design reusable components**
- **Consider accessibility (a11y)**
- **Apply performance optimizations**
- **Utilize error boundaries**
- **Manage server state with React Query**
- **Follow augmented coding practices** (see `augmented-coding.md`)

### 3. Problem-Solving Priority

1. **Find real working solutions** (no mocking)
2. **Maintain consistency after analyzing existing code patterns**
3. **Ensure type safety**
4. **Consider performance impact**

### 4. Design System Usage

See **`styles.mdc`** for comprehensive design system guidelines including:
- Design system component usage
- twJoin/twMerge for className composition
- Design tokens (w- prefix)
- Typography component patterns
- Responsive breakpoints

---

이 가이드는 AI 어시스턴트가 프로젝트를 이해하고 일관된 코드를 생성하는 데 도움을 줍니다.
