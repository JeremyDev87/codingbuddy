# Project Setup

## Project Overview

Define per project. This file is a universal AI rules template.

## Tech Stack

Refer to the project's `package.json`. AI rules do not pin specific package versions.

## Project Structure

Define per project. Below is a layered architecture example:

```
src/
├── app/                    # Entry point / Router
│   ├── api/               # API Routes
│   ├── (pages)/           # Page routing
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
│
├── entities/              # Domain entities (business logic)
│   └── {domain}/
│       ├── apis/          # API call functions (*.ts)
│       ├── models/        # Data models / hooks (*.ts, *.tsx)
│       ├── types.ts       # Type definitions
│       └── index.ts       # Public API
│
├── features/              # Feature-specific UI components
│   └── {Feature}/
│       ├── {Feature}.tsx          # Main component
│       ├── {Feature}.parts.tsx    # Sub-components
│       ├── {Feature}.types.ts     # Type definitions
│       ├── {Feature}.constants.ts # Constants
│       ├── {Feature}.unit.spec.tsx # Unit tests
│       └── index.ts               # Export
│
├── widgets/               # Composite widgets (multiple features combined)
│   └── {Widget}/
│       ├── {Widget}.tsx           # Main widget
│       ├── {Widget}.parts.tsx     # Sub-components
│       └── index.ts
│
└── shared/                # Common modules (used across the project)
    ├── components/        # Reusable UI components
    ├── hooks/            # Custom hooks
    ├── providers/        # Context providers / State management
    ├── utils/            # Utility functions
    ├── types/            # Common type definitions
    ├── constants/        # Common constants
    ├── api/              # API client, error handlers
    ├── auth/             # Authentication logic
    └── services/         # Business services
```

## Development Rules

### 1. Code Writing Rules

#### Core Principles
- **Never use mocking**: Write only real, working code
- **Type Safety**: Follow strict type checking mode
- **Latest Framework Features**: Utilize latest framework capabilities
- **Component Naming**: PascalCase, use clear names that indicate functionality
- **Type imports**: Use named imports for types (e.g., `import { type SomeType } from 'module';`)

#### File Naming Convention
- **Component**: `{Feature}.tsx`
- **Sub-components**: `{Feature}.parts.tsx`
- **Types**: `{Feature}.types.ts` or `types.ts`
- **Constants**: `{Feature}.constants.ts` or `constants.ts`
- **Utils**: `{Feature}.utils.ts`
- **Unit Tests**: `{Feature}.unit.spec.tsx` or `{Feature}.test.ts`
- **E2E Tests**: `{Feature}.e2e.ts` or `{Feature}.cy.ts`
- **Module Export**: `index.ts`

#### Import/Export Rules
- Each module exports only public API through `index.ts`
- Use absolute paths configured in the project (e.g., `@/`, `~/`)
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

// user.api.ts - Impure function
export const createUser = async (data: UserData) => { /* API call */ };

// ❌ Bad: Mixed
// user.ts - Mixed together
export const validateEmail = (email: string) => { /* ... */ };
export const createUser = async (data: UserData) => { /* ... */ };
```

### 3. Script Commands

Refer to the project's `package.json` scripts section. Common commands:

```bash
# Development
yarn dev          # Start dev server
yarn build        # Production build
yarn start        # Start production server

# Code Quality
yarn lint         # Linting check
yarn format       # Code formatting

# Testing
yarn test         # Run tests
yarn test:coverage # Run tests with coverage
```

Actual commands may vary per project. Check the project's package.json.

## Development Workflow

For detailed TDD workflows, testing strategies, and code quality practices, refer to **`augmented-coding.md`**.

### Quick Reference

**Development approach:**
- Core logic (entities, shared/utils, hooks): TDD (test-first)
- UI components (features, widgets): Test-after
- Coverage goal: 90%+

### Code Review Checklist

#### Required Checks
- [ ] **TypeScript Type Safety**: No `any` usage, all types explicitly defined
- [ ] **Test Coverage**: Maintain 90%+ coverage
- [ ] **Linting Rules**: Resolve all linting errors
- [ ] **Pure/Impure Separation**: Separate files for pure and impure functions

#### Architecture & Design
- [ ] **Layer Architecture**: Respect layer boundaries and separation of concerns
- [ ] **Dependency Direction**: app → widgets → features → entities → shared
- [ ] **Component Reusability**: DRY principle, utilize shared components
- [ ] **Code quality**: See `augmented-coding.md` for SOLID, TDD, and refactoring standards

#### Performance & Optimization
- [ ] **Framework Optimization**: Proper use of framework-specific optimization techniques
- [ ] **Image Optimization**: Use framework's Image component
- [ ] **Bundle Size**: Code splitting with dynamic imports
- [ ] **Rendering Optimization**: Prevent unnecessary re-renders

#### UX & Accessibility
- [ ] **Responsive Design**: Support mobile/tablet/desktop
- [ ] **Accessibility (a11y)**: ARIA attributes, keyboard navigation
- [ ] **Loading States**: Provide loading UI (Skeleton, Spinner, etc.)
- [ ] **Error Handling**: Utilize error boundaries

## Important Guidelines

### 1. Never Do ❌

- **Mock data or fake implementations**: Only real API integration allowed
- **Type `any` usage**: Explicitly define all types
- **Direct DOM manipulation**: Use framework patterns
- **Leave console.log in production code**: Development only
- **Mix pure/impure functions**: Must separate into different files
- **Reverse layer dependencies**: Lower layers cannot import upper layers

### 2. Must Do ✅

- **Write code with real API calls** (no mocking)
- **Design reusable components**
- **Consider accessibility (a11y)**
- **Apply performance optimizations**
- **Utilize error boundaries**
- **Follow augmented coding practices** (see `augmented-coding.md`)

### 3. Problem-Solving Priority

1. **Find real working solutions** (no mocking)
2. **Maintain consistency after analyzing existing code patterns**
3. **Ensure type safety**
4. **Consider performance impact**

### 4. Design System Usage

Refer to the project's design system documentation. General guidelines:
- Prioritize project design system components
- Use className composition utilities as defined in project
- Maintain design token consistency
- Follow typography patterns
- Respect responsive breakpoints

---

This guide helps AI assistants understand the project and generate consistent code.
