<p align="center">
  <a href="README.md">English</a> |
  <a href="README.ko.md">한국어</a> |
  <a href="README.zh-CN.md">中文</a> |
  <a href="README.ja.md">日本語</a> |
  <a href="README.es.md">Español</a>
</p>

# Codingbuddy

[![CI](https://github.com/JeremyDev87/codingbuddy/actions/workflows/dev.yml/badge.svg)](https://github.com/JeremyDev87/codingbuddy/actions/workflows/dev.yml)
[![npm version](https://img.shields.io/npm/v/codingbuddy.svg)](https://www.npmjs.com/package/codingbuddy)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<p align="center">
  <img src="docs/ai-rules-architecture.svg" alt="Codingbuddy 멀티에이전트 아키텍처" width="800"/>
</p>

## 코드를 위한 AI 전문가 팀

**Codingbuddy는 35개의 AI 에이전트를 조율하여 인간 전문가 팀 수준의 코드 품질을 제공합니다.**

단일 AI는 모든 것의 전문가가 될 수 없습니다. Codingbuddy는 아키텍트, 개발자, 보안 전문가, 접근성 전문가 등으로 구성된 AI 개발팀을 구성하여, 코드가 전문가 수준에 도달할 때까지 협업하며 검토하고 개선합니다.

---

## 비전

### 문제점

AI에게 코드를 요청하면 단일 관점만 얻게 됩니다. 보안 검토도 없고, 접근성 검사도 없으며, 아키텍처 검증도 없습니다. 그저 하나의 AI가 모든 것을 "그럭저럭" 하지만 어떤 것도 탁월하게 하지 못합니다.

인간 개발팀에는 전문가들이 있습니다:
- 시스템을 설계하는 **아키텍트**
- 취약점을 찾는 **보안 엔지니어**
- 엣지 케이스를 잡는 **QA 전문가**
- 병목을 최적화하는 **성능 전문가**

### 우리의 해결책

**Codingbuddy는 AI 코딩에 전문가 팀 모델을 도입합니다.**

하나의 AI가 모든 것을 시도하는 대신, Codingbuddy는 협업하는 여러 전문 에이전트를 조율합니다:

```
┌─────────────────────────────────────────────────────────────┐
│                      당신의 요청                              │
│              "사용자 인증 구현해줘"                            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 📋 PLAN: 솔루션 아키텍트 + 아키텍처 전문가                    │
│          → 시스템 아키텍처 설계                               │
│          → 보안 요구사항 정의                                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 🚀 ACT: 백엔드 개발자 + 테스트 전략 전문가                    │
│         → TDD로 구현                                         │
│         → 품질 기준 준수                                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 🔍 EVAL: 코드 리뷰어 + 병렬 전문가들                          │
│          🔒 보안      → JWT 취약점?                           │
│          ♿ 접근성    → WCAG 준수?                            │
│          ⚡ 성능      → 최적화 필요?                          │
│          📏 품질      → SOLID 원칙?                           │
└─────────────────────────────────────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
        Critical > 0?              Critical = 0 AND
        High > 0?                  High = 0
              │                           │
              ▼                           ▼
        개선사항과 함께              ✅ 품질 달성
        PLAN으로 복귀              자신감 있게 배포
```

---

## 빠른 시작

**Node.js 18+ 및 npm 9+ (또는 yarn 4+) 필요**

### Claude Code 플러그인 (권장)

가장 빠른 시작 방법 — 하네스 엔지니어링, 자율 루프, 에이전트 협업을 포함한 전체 프레임워크:

```bash
# 플러그인 설치
claude plugin install codingbuddy@jeremydev87

# 전체 기능을 위한 MCP 서버 설치
npm install -g codingbuddy

# 프로젝트 초기화
npx codingbuddy init
```

| 문서 | 설명 |
|------|------|
| [플러그인 설정 가이드](docs/plugin-guide.md) | 설치 및 설정 |
| [빠른 참조](docs/plugin-quick-reference.md) | 명령어와 모드 한눈에 보기 |
| [아키텍처](docs/plugin-architecture.md) | 플러그인과 MCP 작동 방식 |

### MCP 서버 (기타 AI 도구)

Cursor, GitHub Copilot, Antigravity, Amazon Q, Kiro 등 MCP 호환 도구:

```bash
# 프로젝트 초기화
npx codingbuddy init
```

AI 도구의 MCP 설정에 추가:

```json
{
  "mcpServers": {
    "codingbuddy": {
      "command": "npx",
      "args": ["codingbuddy", "mcp"]
    }
  }
}
```

### 사용 방법

```
PLAN: 이메일 인증과 함께 사용자 등록 구현해줘
→ AI 팀이 아키텍처 계획

ACT
→ AI 팀이 TDD로 구현

EVAL
→ AI 팀이 8개 이상 관점에서 검토

AUTO: 완전한 인증 시스템 만들어줘
→ AI 팀이 품질 달성까지 반복
```

[전체 시작 가이드 →](docs/ko/getting-started.md)

---

## 멀티에이전트 아키텍처

### 3계층 에이전트 시스템

| 계층 | 에이전트 | 역할 |
|------|----------|------|
| **모드 에이전트** (4개) | plan-mode, act-mode, eval-mode, auto-mode | 워크플로우 오케스트레이션 |
| **주요 에이전트** (16개) | solution-architect, technical-planner, frontend-developer, backend-developer 등 | 핵심 구현 |
| **전문가 에이전트** (15개) | security, accessibility, performance, test-strategy 등 | 도메인 전문성 |

### 에이전트 협업 예시

기능을 요청하면 에이전트들이 자동으로 협업합니다:

```
🤖 solution-architect    → 접근 방식 설계
   └── 👤 architecture-specialist  → 레이어 경계 검증
   └── 👤 test-strategy-specialist → 테스트 커버리지 계획

🤖 backend-developer     → 코드 구현
   └── 👤 security-specialist      → 인증 패턴 검토
   └── 👤 event-architecture       → 메시지 플로우 설계

🤖 code-reviewer         → 품질 평가
   └── 👤 4개 전문가 병렬 실행    → 다차원 검토
```

---

## 품질 보증 사이클

### PLAN → ACT → EVAL 루프

Codingbuddy는 품질 주도 개발 사이클을 적용합니다:

1. **PLAN**: 코딩 전 설계 (아키텍처, 테스트 전략)
2. **ACT**: TDD와 품질 기준으로 구현
3. **EVAL**: 다중 전문가 검토 (보안, 성능, 접근성, 품질)
4. **반복**: 품질 목표 달성까지 지속

### AUTO 모드: 자율 품질 달성

```bash
# 원하는 것만 설명하세요
AUTO: 리프레시 토큰과 JWT 인증 구현해줘

# Codingbuddy가 자동으로:
# → 구현 계획
# → TDD로 코드 작성
# → 4개 이상 전문가로 검토
# → Critical=0 AND High=0까지 반복
# → 프로덕션 준비 코드 제공
```

### 종료 기준

| 심각도 | 배포 전 수정 필수 |
|--------|------------------|
| 🔴 Critical | 예 - 즉각적인 보안/데이터 이슈 |
| 🟠 High | 예 - 중요한 문제 |
| 🟡 Medium | 선택 - 기술 부채 |
| 🟢 Low | 선택 - 개선 사항 |

---

## 차별점

| 기존 AI 코딩 | Codingbuddy |
|-------------|-------------|
| 단일 AI 관점 | 35개 전문가 에이전트 관점 |
| "생성하고 기도하기" | 계획 → 구현 → 검증 |
| 품질 게이트 없음 | Critical=0, High=0 필수 |
| 수동 검토 필요 | 자동 다차원 검토 |
| 일관성 없는 품질 | 기준 충족까지 반복 개선 |

---

## 터미널 대시보드 (TUI)

Codingbuddy는 AI 어시스턴트와 함께 에이전트 활동, 작업 진행 상황, 워크플로우 상태를 실시간으로 표시하는 내장 터미널 UI를 제공합니다.

### 빠른 시작

```bash
# TUI를 활성화하여 MCP 서버 실행
npx codingbuddy mcp --tui
```

### 기능

| 패널 | 설명 |
|------|------|
| **FlowMap** | 활성 에이전트, 단계, 진행 상황을 시각적으로 표시 |
| **FocusedAgent** | 현재 활성 에이전트의 실시간 뷰와 활동 스파크라인 |
| **Checklist** | PLAN/ACT/EVAL 컨텍스트에서 작업 완료 추적 |
| **Activity Chart** | 실시간 도구 호출 바 차트 |
| **멀티 세션** | 여러 Claude Code 세션이 단일 TUI 창 공유 |

---

## v5.4.0 새로운 기능

**질문-우선 플래닝** — Codingbuddy가 이제 계획 전에 먼저 질문합니다. 모호한 프롬프트는 명확화 질문을 트리거하고, 명확한 프롬프트는 Discover→Design→Plan 단계를 사용자 확인과 함께 진행합니다.

**카운슬 씬** — PLAN, EVAL, AUTO 모드에서 어떤 전문 에이전트가 구성되었는지 보여주는 오프닝 씬으로 시작합니다.

**권한 예측** — 실행 전에 필요한 권한 클래스(repo-write, network, external)를 미리 표시하여 승인 준비를 할 수 있습니다.

**실행 게이트** — 플래닝 단계가 탐색 이전이면 전문가 디스패치를 억제하여 조기 작업을 방지합니다.

**카운슬 상태 파이프라인** — 도구 실행 중 에이전트 핸드오프, 단계 전환, 블로커를 실시간 뱃지로 표시합니다.

```
◕‿◕ CB v5.4.0 | PLAN 🟢 | 12m | ~$0.23 | Cache:87% | Ctx:45%
```

---

## 지원 AI 도구

| 도구 | 상태 |
|------|------|
| Claude Code | ✅ 전체 MCP + 플러그인 |
| Cursor | ✅ 지원 |
| GitHub Copilot | ✅ 지원 |
| Antigravity | ✅ 지원 |
| Amazon Q | ✅ 지원 |
| Kiro | ✅ 지원 |
| OpenCode | ✅ 지원 |

[설정 가이드 →](docs/ko/supported-tools.md)

---

## 설정

### AI 모델 설정

`codingbuddy.config.json`에서 기본 AI 모델을 설정합니다:

```json
{
  "ai": {
    "defaultModel": "claude-sonnet-4-20250514"
  }
}
```

| 모델 | 적합한 용도 |
|------|------------|
| `claude-opus-4-*` | 복잡한 아키텍처, 심층 분석 |
| `claude-sonnet-4-*` | 일반 개발 (기본값) |
| `claude-haiku-3-5-*` | 빠른 조회 (코딩에는 권장하지 않음) |

### Verbosity 설정

verbosity 레벨로 토큰 사용량을 최적화합니다:

```json
{
  "verbosity": "compact"
}
```

| 레벨 | 용도 |
|------|------|
| `minimal` | 최대 토큰 절약, 필수 정보만 |
| `compact` | 균형 잡힌 포맷, 간결한 출력 (기본값) |
| `standard` | 완전한 포맷, 구조화된 응답 |
| `detailed` | 확장된 설명, 예제 포함 |

---

## 문서

| 문서 | 설명 |
|------|------|
| [시작하기](docs/ko/getting-started.md) | 설치 및 빠른 설정 |
| [철학](docs/ko/philosophy.md) | 비전과 설계 원칙 |
| [에이전트 시스템](packages/rules/.ai-rules/agents/README.md) | 전체 에이전트 참조 |
| [스킬 라이브러리](packages/rules/.ai-rules/skills/README.md) | 재사용 가능한 워크플로우 스킬 (TDD, 디버깅, PR 등) |
| [지원 도구](docs/ko/supported-tools.md) | AI 도구 통합 가이드 |
| [설정](docs/config-schema.md) | 설정 파일 옵션 |
| [API 레퍼런스](docs/api.md) | MCP 서버 기능 |

---

## 기여하기

기여를 환영합니다! 자세한 내용은 [CONTRIBUTING.md](CONTRIBUTING.md)를 참조하세요.

## 라이선스

MIT © [Codingbuddy](https://github.com/JeremyDev87/codingbuddy)
