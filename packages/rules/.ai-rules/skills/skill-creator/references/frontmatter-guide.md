# Skill Frontmatter v2.0 Field Guide

스킬 SKILL.md 파일의 YAML 프론트매터 필드 레퍼런스.

## Table of Contents

- [Overview](#overview)
- [Field Reference Table](#field-reference-table)
- [Field Details](#field-details)
  - [name](#name)
  - [description](#description)
  - [argument-hint](#argument-hint)
  - [allowed-tools](#allowed-tools)
  - [model](#model)
  - [effort](#effort)
  - [context](#context)
  - [agent](#agent)
  - [disable-model-invocation](#disable-model-invocation)
  - [user-invocable](#user-invocable)
  - [hooks](#hooks)
- [Decision Tree](#decision-tree)
- [Description Writing Guide](#description-writing-guide)
- [Complete Examples](#complete-examples)

---

## Overview

모든 스킬은 `SKILL.md` 파일에 YAML 프론트매터를 포함한다. 프론트매터는 스킬의 메타데이터를 정의하며, codingbuddy MCP 서버와 각 AI 도구가 스킬을 검색, 로드, 실행하는 데 사용한다.

**프론트매터 구조:**
```yaml
---
name: skill-name
description: Use when [trigger condition]. [What it does].
# ... 추가 필드 (선택)
---

# Skill Content (Markdown)
...
```

**v2.0 변경사항:**
- `model` 필드 추가: 권장 AI 모델 지정
- `effort` 필드 추가: 추론 노력 수준 제어 (`low/medium/high/max`)
- `hooks` 필드 추가: 이벤트 기반 자동 실행 (object 타입)

---

## Field Reference Table

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | `string` | **Yes** | 디렉토리명 | 슬래시 커맨드명 (소문자, 숫자, 하이픈, 최대 64자) |
| `description` | `string` | **Yes** | 첫 번째 문단 | 용도 + 자동 트리거 조건 (200자 권장, 최대 1024자) |
| `argument-hint` | `string` | No | — | 자동완성 인수 힌트 |
| `allowed-tools` | `string` | No | all | 사용 가능한 도구 목록 |
| `model` | `string` | No | 세션 기본값 | 모델 오버라이드 |
| `effort` | `string` | No | 세션 기본값 | `low` / `medium` / `high` / `max` |
| `context` | `string` | No | inline | `fork`: 격리된 서브에이전트 |
| `agent` | `string` | No | general-purpose | 서브에이전트 타입 |
| `disable-model-invocation` | `boolean` | No | `false` | AI 자동 호출 차단 |
| `user-invocable` | `boolean` | No | `true` | `/` 메뉴에 표시 여부 |
| `hooks` | `object` | No | — | 스킬 라이프사이클 훅 |

---

## Field Details

### name

스킬의 고유 식별자. 디렉토리명과 일치해야 하며 슬래시 커맨드(`/name`)로 사용된다.

| Property | Value |
|----------|-------|
| Type | `string` |
| Required | **Yes** |
| Default | 디렉토리명 |
| Pattern | `^[a-z][a-z0-9-]*$` |
| Max Length | 64자 |

**규칙:**
- 소문자, 숫자, 하이픈만 사용
- 스킬 디렉토리명과 동일해야 함
- 단어 2-4개 권장

**예시:**
```yaml
name: test-driven-development
name: security-audit
name: pr-all-in-one
```

---

### description

스킬의 용도와 자동 트리거 조건을 설명한다. `recommend_skills` 검색의 핵심 매칭 필드.

| Property | Value |
|----------|-------|
| Type | `string` |
| Required | **Yes** |
| Default | SKILL.md 첫 번째 문단 |
| Recommended Length | 200자 |
| Max Length | 1024자 |

**규칙:**
- 구체적인 트리거 문구 포함 ("Use when...", "Use this skill when the user asks to...")
- 3인칭 서술 ("Explains code..." not "Explain code...")
- 200자 권장, 최대 1024자

**예시:**
```yaml
# Good - 트리거 조건이 명확, 3인칭 서술
description: Use when implementing any feature or bugfix, before writing implementation code

# Good - 여러 상황 + 결과 기술
description: Use before deploying to staging or production. Covers pre-deploy validation, environment verification, rollback planning, health checks, and post-deploy monitoring.

# Good - 3인칭으로 동작 기술
description: Explains code structure, logic flow, and design decisions with context-appropriate detail.

# Bad - 너무 모호
description: A skill for testing

# Bad - 1인칭/명령형 (2인칭도 피할 것)
description: Explain the code to me

# Bad - 1024자 초과
description: This comprehensive skill provides detailed guidance for implementing test-driven development...
```

---

### argument-hint

사용자가 스킬 호출 시 전달할 수 있는 위치 인수를 안내한다. 자동완성 UI에 표시된다.

| Property | Value |
|----------|-------|
| Type | `string` |
| Required | No |
| Format | `[arg1] [arg2]` (대괄호로 감싼 인수명) |

**규칙:**
- 대괄호 `[]`로 각 인수를 감싸기
- 복수 인수는 공백으로 구분
- 인수명은 kebab-case
- 모든 인수는 선택적

**예시:**
```yaml
argument-hint: [file-or-symbol]
argument-hint: [pr-url-or-number]
argument-hint: [target-branch] [issue-id]
argument-hint: [scope-or-path]
argument-hint: [capability-name]
argument-hint: [target-module-or-path]
```

**사용 패턴:**
```bash
# 사용자 호출
/code-explanation src/auth/login.ts
/pr-review 123
/pr-all-in-one main 741
```

---

### allowed-tools

스킬 실행 시 사용 가능한 도구를 제한한다. 미지정 시 모든 도구 사용 가능.

| Property | Value |
|----------|-------|
| Type | `string` |
| Required | No |
| Default | 모든 도구 허용 |
| Format | 쉼표+공백 구분 도구 목록 |

**사용 가능한 도구:**
- `Read` — 파일 읽기
- `Write` — 파일 쓰기
- `Edit` — 파일 편집
- `Grep` — 내용 검색
- `Glob` — 파일 패턴 검색
- `Bash` — 셸 명령 실행
- `Agent` — 서브에이전트 실행

**Bash 필터링 (Claude Code 전용):**
```yaml
# Bash 전체 허용
allowed-tools: Read, Grep, Glob, Bash

# git 명령만 허용
allowed-tools: Read, Grep, Glob, Bash(git:*)

# git과 gh 명령만 허용
allowed-tools: Read, Grep, Glob, Bash(gh:*, git:*)
```

> **주의:** Bash 필터(`Bash(git:*)`)는 Claude Code에서만 지원된다. 다른 도구에서는 기본 도구명만 인식한다.

**예시 패턴:**

| 스킬 유형 | 권장 allowed-tools |
|-----------|-------------------|
| 읽기 전용 분석 | `Read, Grep, Glob` |
| 코드 분석 + git | `Read, Grep, Glob, Bash(git:*)` |
| PR 리뷰 | `Read, Grep, Glob, Bash(gh:*, git:*)` |
| 성능 분석 | `Read, Grep, Glob, Bash` |
| 리팩토링 | `Read, Write, Edit, Grep, Glob, Bash` |

---

### model

스킬 실행에 권장되는 AI 모델을 지정한다. v2.0에서 추가.

| Property | Value |
|----------|-------|
| Type | `string` |
| Required | No |
| Default | 세션 기본 모델 |

**사용 가능한 값:**
- `opus` — 복잡한 추론이 필요한 스킬
- `sonnet` — 일반적인 코딩 스킬
- `haiku` — 간단한 분류/변환 스킬

**사용 시점:**
- 높은 추론 능력이 필요한 스킬: `opus`
- 빠른 응답이 중요한 스킬: `haiku`
- 대부분의 스킬: 미지정 (세션 기본값 사용)

**예시:**
```yaml
model: opus    # 복잡한 아키텍처 분석
model: sonnet  # 일반 코드 작성
model: haiku   # 간단한 코드 설명
```

> **호환성:** Claude Code에서만 자동 전환. 다른 도구에서는 힌트로만 사용.

---

### effort

AI 모델의 추론 노력 수준을 제어한다. v2.0에서 추가.

| Property | Value |
|----------|-------|
| Type | `string` |
| Required | No |
| Default | 세션 기본값 |
| Values | `low`, `medium`, `high`, `max` |

**각 수준의 의미:**
- `low` — 빠른 분류, 간단한 변환. 최소 추론
- `medium` — 일반적인 코딩 작업 (기본)
- `high` — 깊은 분석, 복잡한 문제 해결
- `max` — 최대 추론. 보안 감사, 아키텍처 설계 등 가장 까다로운 작업

**예시:**
```yaml
effort: max    # 보안 감사 - 최대 추론
effort: high   # 아키텍처 분석 - 깊은 분석
effort: low    # 코드 포맷팅 - 빠른 처리
```

> **호환성:** Claude Code에서만 자동 적용. 다른 도구에서는 무시.

---

### context

스킬의 실행 컨텍스트를 지정한다. 격리된 환경에서 실행해야 하는 스킬에 사용.

| Property | Value |
|----------|-------|
| Type | `string` |
| Required | No |
| Default | `inline` (메인 컨텍스트에서 실행) |
| Values | `fork` |

**`fork`의 의미:**
- 독립된 서브에이전트에서 실행
- 메인 대화 컨텍스트에 영향 없음
- 읽기 전용 분석 작업에 적합

**사용 시점:**
- 코드 분석/리뷰 스킬 (메인 컨텍스트 오염 방지)
- 대량 파일 읽기가 필요한 스킬
- 독립적인 결과 보고가 필요한 스킬

**예시:**
```yaml
context: fork  # 격리된 환경에서 PR 리뷰 실행
```

> **호환성:** Claude Code에서만 지원. 다른 도구에서는 무시 (inline으로 실행).

---

### agent

스킬 실행에 권장되는 에이전트 타입을 지정한다. `context: fork`와 함께 사용.

| Property | Value |
|----------|-------|
| Type | `string` |
| Required | No |
| Default | `general-purpose` |
| Values | `Explore`, `general-purpose` |

**에이전트 타입:**
- `Explore` — 빠른 코드 탐색/검색 특화 (읽기 전용)
- `general-purpose` — 전체 도구 접근 (읽기+쓰기+Bash)

**사용 시점:**
- 코드 설명, PR 리뷰 등 읽기 전용: `Explore`
- 성능 분석, 보안 감사 등 Bash 필요: `general-purpose`

**예시:**
```yaml
# 코드 설명 스킬 - Explore로 빠른 검색
context: fork
agent: Explore
allowed-tools: Read, Grep, Glob

# 보안 감사 - general-purpose로 git 접근
context: fork
agent: general-purpose
allowed-tools: Read, Grep, Glob, Bash(git:*)
```

> **호환성:** Claude Code에서만 지원. 다른 도구에서는 무시.

---

### disable-model-invocation

`true`로 설정하면 AI 모델이 스킬을 자동으로 호출하지 않는다. 사용자가 명시적으로 `/skill-name`으로 호출해야만 실행된다.

| Property | Value |
|----------|-------|
| Type | `boolean` |
| Required | No |
| Default | `false` |

**사용 시점:**
- 부작용(side effect)이 있는 스킬: 커밋, 배포, 푸시, DB 마이그레이션
- 위험한 작업을 포함하는 스킬: 데이터 삭제, 프로덕션 변경
- 사용자의 명시적 의도가 필요한 스킬

**예시:**
```yaml
# 배포 체크리스트 - 사용자가 명시적으로 호출해야 함
disable-model-invocation: true

# DB 마이그레이션 - 위험한 작업 포함
disable-model-invocation: true
```

**현재 사용 중인 스킬:**
- `deployment-checklist`
- `database-migration`
- `incident-response`
- `pr-all-in-one`

> **호환성:** 모든 도구에서 지원.

---

### user-invocable

`false`로 설정하면 사용자가 `/` 메뉴에서 스킬을 볼 수 없고 직접 호출할 수 없다. 시스템 내부에서만 사용된다.

| Property | Value |
|----------|-------|
| Type | `boolean` |
| Required | No |
| Default | `true` |

**사용 시점:**
- 배경 지식 스킬: 다른 스킬이나 에이전트가 참조하는 정보
- 내부 전용 스킬: `parse_mode`에서 자동 로드되는 컨텍스트

**예시:**
```yaml
# 내부 전용 - 사용자에게 표시하지 않음
user-invocable: false
```

**현재 사용 중인 스킬:**
- `context-management`
- `widget-slot-architecture`

> **호환성:** 모든 도구에서 지원.

---

### hooks

이벤트 기반으로 스킬을 자동 실행하는 트리거를 설정한다. v2.0에서 추가.

| Property | Value |
|----------|-------|
| Type | `object` |
| Required | No |

**훅 이벤트:**

```yaml
hooks:
  PreToolUse:
    - matcher: "Bash"
      action: "invoke"
  PostToolUse:
    - matcher: "Write"
      action: "invoke"
  session-start:
    action: "load"
```

**지원 이벤트:**
- `PreToolUse` — 도구 호출 전 실행
- `PostToolUse` — 도구 호출 후 실행
- `session-start` — 세션 시작 시 자동 로드

**예시:**
```yaml
# 커밋 전 자동 리뷰
hooks:
  PreToolUse:
    - matcher: "Bash"
      pattern: "git commit"
      action: "invoke"
```

> **호환성:** Claude Code에서 완전 지원. Kiro에서 이벤트 기반 훅 지원. 다른 도구에서는 무시.

---

## Decision Tree

스킬 프론트매터 필드를 결정하기 위한 의사결정 트리:

```
스킬에 부작용(side effect)이 있는가? (커밋, 푸시, 배포 등)
├── YES → disable-model-invocation: true
└── NO → 배경 지식 스킬인가? (아키텍처 참조 등)
    ├── YES → user-invocable: false
    └── NO → 기본값 유지

읽기 전용 분석 스킬인가?
├── YES → context: fork, agent: Explore
└── NO → Bash 실행이 필요한 분석 스킬인가?
    ├── YES → context: fork, agent: general-purpose
    └── NO → 기본 컨텍스트 (inline)

특정 도구만 사용해야 하는가?
├── YES → allowed-tools: [필요한 도구 목록]
└── NO → allowed-tools 생략 (전체 허용)
```

**의사결정 요약표:**

| 질문 | 조건 | 설정할 필드 |
|------|------|-------------|
| 부작용 있음? | 커밋/배포/DB 변경 | `disable-model-invocation: true` |
| 내부 전용? | 사용자 미호출 | `user-invocable: false` |
| 인수 있음? | CLI에서 인수 전달 | `argument-hint: [arg-name]` |
| 도구 제한? | 특정 도구만 허용 | `allowed-tools: [도구 목록]` |
| 격리 필요? | 독립 실행, 읽기 전용 | `context: fork` |
| 에이전트 유형? | fork 시 | `agent: Explore` 또는 `general-purpose` |
| 모델 지정? | 특수 모델 필요 | `model: opus` 등 |
| 노력 조정? | 분석 깊이 조절 | `effort: low/medium/high/max` |
| 자동 실행? | 이벤트 트리거 | `hooks: { ... }` |

---

## Description Writing Guide

`description`은 `recommend_skills`의 매칭에 직접 영향을 미치는 핵심 필드다.

### 작성 원칙

1. **트리거 문구 포함** — "Use when...", "Use this skill when..."
2. **3인칭 서술** — "Explains code..." (O), "Explain code..." (X)
3. **200자 권장, 최대 1024자** — 검색 최적화, 간결함 유지
4. **구체적 상황 기술** — "코딩할 때"가 아닌 "feature 구현 전"

### 트리거 문구 패턴

| 패턴 | 사용 시점 | 예시 |
|------|----------|------|
| `Use when [동작]ing` | 진행 중 활동 | `Use when implementing any feature` |
| `Use before [동작]ing` | 사전 준비 | `Use before deploying to production` |
| `Use after [동작]ing` | 사후 검증 | `Use after completing a development branch` |
| `Use when encountering` | 문제 대응 | `Use when encountering any bug or test failure` |
| `Use this skill when the user asks to` | 사용자 요청 | `Use this skill when the user asks to review a PR` |

### 3인칭 서술 가이드

| Good (3인칭) | Bad (명령형/2인칭) |
|-------------|------------------|
| Explains code structure and logic flow | Explain the code |
| Generates comprehensive test suites | Generate tests |
| Analyzes security vulnerabilities | Analyze security |
| Covers validation, rollback, monitoring | Cover all cases |

### Good vs Bad Examples

**Good:**
```yaml
# 트리거 + 3인칭 서술
description: Use when implementing any feature or bugfix, before writing implementation code

# 여러 상황 + 커버리지 기술
description: Use before deploying to staging or production. Covers pre-deploy validation, environment verification, rollback planning, health checks, and post-deploy monitoring.

# 3인칭으로 동작 기술
description: Explains code structure, logic flow, and design decisions with context-appropriate detail.
```

**Bad:**
```yaml
# 너무 모호
description: A testing skill

# 명령형 (1인칭/2인칭)
description: Explain the code to me

# 트리거 조건 없음
description: Helps with code quality

# 1024자 초과
description: This comprehensive skill provides detailed guidance for implementing test-driven development practices including red-green-refactor cycles with support for multiple testing frameworks and assertion libraries across various programming languages and environments with special attention to edge cases and boundary conditions and performance optimization and integration testing and end-to-end testing and mutation testing and property-based testing and snapshot testing and visual regression testing...
```

### 키워드 매칭 최적화

`recommend_skills`는 사용자 프롬프트와 description을 매칭한다. 관련 키워드를 포함하면 매칭 정확도가 높아진다:

```yaml
# "test", "tdd", "feature", "bugfix" 키워드 매칭 가능
description: Use when implementing any feature or bugfix, before writing implementation code

# "deploy", "staging", "production", "validation" 매칭 가능
description: Use before deploying to staging or production. Covers pre-deploy validation...
```

---

## Complete Examples

### 읽기 전용 분석 스킬

```yaml
---
name: code-explanation
description: Use when you need to understand unfamiliar code. Explains code structure, logic flow, and design decisions with context-appropriate detail.
context: fork
agent: Explore
allowed-tools: Read, Grep, Glob
argument-hint: [file-or-symbol]
---
```

### 부작용 있는 체크리스트 스킬

```yaml
---
name: deployment-checklist
description: Use before deploying to staging or production. Covers pre-deploy validation, environment verification, rollback planning, health checks, and post-deploy monitoring.
disable-model-invocation: true
---
```

### 복잡한 분석 스킬 (v2.0)

```yaml
---
name: security-audit
description: Use when reviewing code for security vulnerabilities. Covers OWASP Top 10, authentication, authorization, input validation, and dependency risks.
context: fork
agent: general-purpose
allowed-tools: Read, Grep, Glob, Bash(git:*)
argument-hint: [scope-or-path]
model: opus
effort: max
---
```

### CLI 인수 + 부작용 스킬

```yaml
---
name: pr-all-in-one
description: Run local CI checks and ship changes - create branch, commit, push, and PR. Optionally link to a GitHub issue. Use when changes are ready to ship.
disable-model-invocation: true
argument-hint: [target-branch] [issue-id]
---
```

### 내부 전용 배경 지식 스킬

```yaml
---
name: context-management
description: Background knowledge for managing conversation context and memory across sessions. Not directly invocable by users.
user-invocable: false
---
```

### 이벤트 기반 자동 실행 스킬 (v2.0)

```yaml
---
name: pre-commit-review
description: Use to automatically review code before committing. Checks for common issues, security vulnerabilities, and code quality.
allowed-tools: Read, Grep, Glob
hooks:
  PreToolUse:
    - matcher: "Bash"
      pattern: "git commit"
      action: "invoke"
---
```
