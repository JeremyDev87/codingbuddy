# Project Setup

## Project Overview

Yozm IT Frontend Project - React/Next.js based media platform

## Tech Stack

### Core Frameworks
- **Framework**: Next.js 16.0.1 (App Router, Standalone Output)
- **React**: 19.2.0
- **Language**: TypeScript 5.8.3
- **Package Manager**: Yarn 4.2.2
- **Runtime**: Node.js 24.11.0

### State Management & Data
- **State Management**: @tanstack/react-query 5.80.7
- **HTTP Client**: axios 1.9.0

### UI & Styling
- **Styling**: Tailwind CSS 3.4.1
- **Design System**: @wishket/design-system 1.17.2, @wishket/yogokit 0.2.2
- **Animation**: framer-motion 12.17.0, motion 12.17.0
- **Carousel**: embla-carousel 8.6.0 (with autoplay)
- **Responsive**: react-responsive 10.0.0
- **Other UI**: react-modal-sheet 4.4.0, swiper 11.1.12

### Testing
- **Unit Tests**: Jest 29.7.0, @testing-library/react 16.3.0
- **E2E Tests**: Cypress 14.0.0
- **Test Runner**: @swc/jest 0.2.38

### Utilities & Libraries
- **Date**: dayjs 1.11.13
- **Crypto**: crypto-js 4.2.0, jose 5.9.6
- **Parsing**: html-react-parser 5.2.5, qs 6.13.0
- **Charts**: chart.js 4.4.4, react-chartjs-2 5.3.0
- **Images**: sharp 0.33.5, react-easy-crop 5.0.8
- **Error Handling**: react-error-boundary 5.0.0
- **Cookies**: cookies-next 4.2.1

### External Services & APIs
- **AI**: openai 5.23.0, replicate 1.2.0
- **Slack**: @slack/web-api 7.3.2
- **Monitoring**: @datadog/browser-rum 6.21.2, dd-trace 5.69.0
- **Marketing**: @next/third-parties 16.0.1

### Development Tools
- **Linter**: eslint 9.28.0, @wishket/eslint-config-wishket 1.1.0
- **Formatter**: prettier 3.5.3, prettier-plugin-tailwindcss 0.5.14
- **Dependency Analysis**: madge 8.0.0
- **Git Hooks**: husky 8.0.0

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
- **React 19 Features**: Utilize latest React 19 capabilities (use hook, Server Components, etc.)
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

### 2. Package Version Compatibility

- **React 19.2.0 Fixed** (configured in resolutions)
- **Maintain @wishket package compatibility**
  - @wishket/design-system 1.17.2
  - @wishket/yogokit 0.2.2
- **When adding new packages**:
  - Check for conflicts with existing dependencies
  - Verify peer dependencies
  - Review if resolutions are needed

### 3. Pure vs Impure Function Separation

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

### 4. Script Commands

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
- [ ] **React 19 Optimization**: Proper use of React.memo, useMemo, useCallback
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
- @wishket/design-system component usage
- twJoin/twMerge for className composition
- Design tokens (w- prefix)
- Typography component patterns
- Responsive breakpoints

## Project Context

### Platform Purpose
- **IT Media & Knowledge Platform**: IT 업계의 지식과 경험을 공유하는 미디어 플랫폼
- **Content Ecosystem**: 아티클, 저자, 컬렉션, 뉴스레터로 구성된 콘텐츠 생태계
- **Community Driven**: 전문가와 독자가 함께 만드는 IT 지식 커뮤니티

### Key Domains

#### 1. Article (`entities/article`)
- 아티클 조회 (상세, 목록, 카테고리별)
- 아티클 검색 및 필터링
- 조회수 추적 및 통계
- 관련 아티클 추천
- 댓글 및 반응 관리
- 북마크 및 공유

#### 2. Author (`entities/author`)
- 저자 프로필 조회 및 관리
- 저자별 아티클 목록
- 저자 구독 기능
- 저자 팔로워 관리
- 저자 통계 및 분석

#### 3. Collection (`entities/collection`)
- 사용자 컬렉션 생성 및 관리
- 아티클 북마크
- 컬렉션 공유 및 협업
- 컬렉션 카테고리 분류

#### 4. Newsletter (`entities/newsletter`)
- 뉴스레터 구독 관리
- 이메일 발송 및 템플릿
- 구독 해지 및 재구독
- 뉴스레터 통계

#### 5. AskAI (`entities/askAi`)
- AI 기반 Q&A 시스템
- 질문 및 답변 생성
- 대화 히스토리 관리
- AI 모델 통합 (OpenAI)

#### 6. Marketing (`entities/marketing`)
- 마케팅 캠페인 관리
- 광고 배너 및 프로모션
- 사용자 참여 추적

#### 7. Advertisements (`entities/advertisements`)
- 광고 표시 및 관리
- 광고 클릭 추적
- 광고 성과 분석

#### 8. Reviews (`entities/reviews`)
- 제품 리뷰 시스템 (Pick)
- 리뷰 작성 및 관리
- 평점 및 피드백

#### 9. Notification Settings (`entities/notificationSettings`)
- 알림 설정 관리
- 이메일 알림 구독
- 푸시 알림 설정

#### 10. Profile (`entities/profile`)
- 사용자 프로필 관리
- 개인 정보 수정
- 계정 설정

#### 11. SlackBot (`entities/slackbot`)
- Slack 통합 및 알림
- 콘텐츠 로깅
- 팀 협업 기능

### Core Features

#### Authentication & Authorization
- **JWT 기반 인증**: Access token + Refresh token
- **OAuth 2.0 소셜 로그인**: Google, Kakao, Naver
- **세션 관리**: Server-side session handling
- **권한 관리**: 저자, 에디터, 관리자 역할 기반 접근 제어

#### Content Management
- **아티클 관리**: 작성, 수정, 삭제, 발행
- **저자 관리**: 프로필, 통계, 구독
- **컬렉션 관리**: 북마크, 큐레이션
- **뉴스레터**: 구독, 발송, 템플릿 관리
- **AI 콘텐츠**: AskAI Q&A, 이미지 생성 (Replicate)

#### User Experience
- **반응형 디자인**: 모바일, 태블릿, 데스크톱 지원
- **접근성 (a11y)**: WCAG 2.1 AA 준수
- **에러 핸들링**: React error boundary, 사용자 친화적 메시지
- **로딩 상태**: Skeleton, Spinner, Suspense
- **알림 시스템**: 이메일, 푸시, 인앱 알림

#### Security
- **HTTPS 전용**: 모든 통신 암호화
- **CSRF 보호**: Next.js 기본 보호 + SameSite cookies
- **XSS 방지**: React 기본 escape + Content Security Policy
- **Rate Limiting**: API 호출 제한 및 throttling
- **입력 검증**: 클라이언트 및 서버 사이드 검증
- **보안 헤더**: Security headers 설정

#### SEO
- **Metadata API**: Next.js Metadata API 활용
- **구조화 데이터**: JSON-LD (Article, Organization, BreadcrumbList)
- **Open Graph**: 소셜 미디어 공유 최적화
- **Twitter Cards**: Twitter 공유 카드 지원
- **Sitemap**: 동적 sitemap 생성
- **Robots.txt**: 크롤러 제어 설정
- **Semantic HTML**: header, main, article, section 활용

### External Services Integration

#### AI Services
- **OpenAI**: AskAI Q&A 시스템 (GPT-4)
- **Replicate**: AI 이미지 생성

#### Analytics & Monitoring
- **Datadog RUM**: Real User Monitoring
- **Datadog APM**: Application Performance Monitoring
- **Datadog Logs**: Centralized logging

#### Collaboration
- **Slack**: 콘텐츠 로깅 및 팀 알림
- **@slack/web-api**: Slack bot 통합

#### Marketing
- **@next/third-parties**: Third-party 스크립트 최적화
- **Google Tag Manager**: 마케팅 태그 관리

### Technical Features
- **Standalone Deployment**: Docker container optimization
- **Source Maps**: Production debugging support
- **Turbopack**: Fast development server
- **Image Optimization**: AVIF, WebP format support
- **Mobile Responsive**: PWA support consideration
- **Real-time Features**: Animations, interactions

---

This guide helps Cursor effectively understand the project and generate consistent code.
