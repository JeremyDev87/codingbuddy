# Landing Page Redesign - Design Document

## Overview

Codingbuddy 랜딩 페이지를 **개발자 친화 테크** 스타일로 전면 리디자인합니다.
터미널 내러티브 접근 방식으로, 페이지 전체가 codingbuddy를 설치하고 사용하는 여정을 보여줍니다.

## Target Audience

- 개인 개발자: AI 코딩 도구를 사용하는 개발자
- 개발팀/테크리드: 팀 단위로 AI 코딩 에이전트를 도입하려는 리더

## CTA Goals

1. GitHub Star 유도
2. `npx codingbuddy init` 설치 유도
3. 문서 사이트 연결

## Design System

### Color Palette

| Token | Light Mode | Dark Mode | Usage |
|-------|-----------|-----------|-------|
| background | #fafafa | #0a0a0f | 페이지 배경 |
| surface | #f4f4f5 | #111118 | 카드/섹션 배경 |
| border | #e4e4e7 | #27272a | 보더, 구분선 |
| text-primary | #09090b | #e4e4e7 | 주요 텍스트 |
| text-muted | #71717a | #a1a1aa | 보조 텍스트 |
| accent-green | #16a34a | #22c55e | 터미널 성공, CTA |
| accent-purple | #7c3aed | #a78bfa | 하이라이트, 글로우 |
| accent-red | #dc2626 | #ef4444 | Before/문제 표시 |
| terminal-bg | #1e1e2e | #1a1a24 | 터미널/코드 블록 배경 |

### Typography

| Element | Font | Weight | Size |
|---------|------|--------|------|
| Headings | JetBrains Mono | 700 | 2rem-3.5rem |
| Body | Inter | 400/500 | 1rem-1.125rem |
| Code/Terminal | JetBrains Mono | 400 | 0.875rem |
| Badge/Label | JetBrains Mono | 500 | 0.75rem |

### Motion

- 스크롤 트리거: CSS `@starting-style` + `IntersectionObserver` 페이드인
- 터미널 타이핑: CSS `@keyframes` + `steps()` 또는 경량 JS
- 호버 글로우: CSS `box-shadow` transition
- 스태거 애니메이션: CSS `animation-delay`
- `prefers-reduced-motion` 존중

## Sections (7개)

### 1. Hero — 터미널 데모

- 상단: 짧은 타이틀 + 한 줄 서브타이틀
- 중앙: 대형 터미널 위젯 (화면 너비 80%)
  - `$ npx codingbuddy init` 타이핑 애니메이션
  - 스피너 → 체크마크 순서 애니메이션
  - 6개 AI 도구 파일 생성 확인 스태거 애니메이션
  - "Ready! One source, all tools." 최종 메시지
- 하단: CTA 버튼 2개
  - `$ Get Started` (그린 글로우, #quick-start로 앵커)
  - `★ Star on GitHub` (보더 스타일)
- 배경: 다크 + 미묘한 도트 그리드 패턴, 터미널 뒤 퍼플/그린 글로우 블러

### 2. Before/After — 문제→해결 시각화

- 좌우 비교 레이아웃 (모바일: 상하)
- Before (왼쪽):
  - 빨간 톤 보더/액센트
  - 6개 설정 파일이 각각 나열됨
  - "6 files. Always out of sync."
- After (오른쪽):
  - 그린 톤 보더/액센트
  - codingbuddy-rules/ 하나의 소스
  - "Single source. Auto-synced."
- 터미널/코드 블록 스타일로 표현
- 스크롤 시 Before가 먼저 나오고 → After로 트랜지션

### 3. Features — 핵심 기능 6개 그리드

- 2x3 그리드 레이아웃 (모바일: 1열)
- 각 카드: 아이콘 + 제목 + 2줄 설명
- 다크 카드 배경 + 미묘한 보더
- 호버 시 액센트 색상 보더 글로우 + 아이콘 스케일업

| 기능 | 아이콘 | 설명 |
|------|--------|------|
| Universal Rules | 🔄 | One source of truth for 6 AI tools |
| 35 AI Agents | 🤖 | Security, a11y, performance specialists |
| Structured Workflow | 📋 | PLAN → ACT → EVAL cycle |
| Quality Built-in | 🧪 | TDD, SOLID, 90%+ coverage |
| MCP Protocol | 🌐 | Standard protocol integration |
| Zero Config | ⚡ | npx init and you're done |

### 4. Supported Tools — 도구 로고 스트립

- 한 줄 수평 배열 (6개 도구 로고/이름)
- 각 도구: 아이콘 + 이름
- 호버 시 글로우
- "+ any MCP-compatible tool" 텍스트
- 짧고 임팩트 있는 섹션

지원 도구: Cursor, Claude Code, Codex, Antigravity, Amazon Q, Kiro

### 5. Agents Showcase — 컴팩트 에이전트 탐색

- 카테고리 필터 탭: Planning, Development, Review, Security, UX
- 한 번에 최대 8개 에이전트 카드 표시
- 카드: 이모지 + 이름 + 카테고리 뱃지 + 1줄 설명
- "View All Agents →" 링크 (별도 페이지 또는 모달)
- 검색은 제거 (컴팩트 우선)

### 6. Quick Start — 터미널 스타일 3단계

- 세로 스텝 플로우, 화살표로 연결
- 각 스텝: 터미널 코드 블록 스타일
  - Step 1: `$ npx codingbuddy init` (패키지 설치)
  - Step 2: MCP 서버 설정 JSON
  - Step 3: 사용 예시 (`PLAN: design auth feature`)
- 스크롤 시 단계별 페이드인 애니메이션
- 각 코드 블록에 복사 버튼

### 7. CTA + Footer — 최종 행동 유도

- 큰 터미널 블록: `$ npx codingbuddy init` (클릭으로 복사)
- CTA 버튼: `★ Star on GitHub` + `📖 Documentation`
- Footer: MIT License, GitHub 링크

## Removed Sections

- **FAQ**: 문서 사이트로 이동 (랜딩에서 제거)
- **Problem / Solution**: Before/After 섹션으로 통합

## Technical Constraints

- Next.js 16 + React 19 유지
- Tailwind CSS 4 유지
- 다국어 5개 언어 유지 (en, ko, zh-CN, ja, es)
- 다크/라이트 테마 지원 (다크 우선)
- 접근성: WCAG 2.1 AA 준수
- `prefers-reduced-motion` 존중
- 기존 테스트 인프라 (Vitest + Testing Library) 유지

## File Structure (예상)

```
src/
├── sections/
│   ├── Hero.tsx              # 터미널 데모 히어로
│   ├── BeforeAfter.tsx       # Before/After 비교
│   ├── Features.tsx          # 핵심 기능 그리드
│   ├── SupportedTools.tsx    # 도구 로고 스트립
│   └── QuickStart.tsx        # 터미널 스타일 3단계
├── widgets/
│   ├── TerminalDemo/         # 터미널 애니메이션 위젯
│   │   ├── index.tsx
│   │   └── typing-animation.tsx
│   ├── AgentsShowcase/       # 컴팩트 에이전트 탐색 (기존 리팩토링)
│   └── CodeBlock/            # 터미널 스타일 코드 블록
├── components/
│   ├── Header/               # 기존 유지 (스타일 업데이트)
│   ├── Footer.tsx            # CTA + Footer 통합
│   └── ui/                   # shadcn/ui 유지
├── app/[locale]/
│   ├── layout.tsx            # 슬롯 구조 변경
│   └── page.tsx              # 새 섹션 구성
└── messages/                 # i18n 메시지 업데이트 (5개 언어)
```
