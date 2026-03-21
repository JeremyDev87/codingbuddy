# Multi-Tool Compatibility Matrix

6개 AI 도구의 스킬 호환성 매트릭스, 로딩 방식 비교, MCP 서버 연동 가이드.

## Table of Contents

- [Compatibility Matrix](#compatibility-matrix)
  - [Skill Loading Feature Support](#skill-loading-feature-support)
  - [Frontmatter Field Support](#frontmatter-field-support)
- [Skill Loading Methods](#skill-loading-methods)
  - [Loading Flow by Tool](#loading-flow-by-tool)
  - [Slash Command Mapping](#slash-command-mapping)
  - [Auto-Recommendation](#auto-recommendation)
- [codingbuddy MCP Server Integration](#codingbuddy-mcp-server-integration)
  - [MCP Configuration by Tool](#mcp-configuration-by-tool)
  - [Core MCP Tools](#core-mcp-tools)
  - [Specialist Agent Execution](#specialist-agent-execution)
  - [Context Document Management](#context-document-management)
- [Per-Tool Guide](#per-tool-guide)
- [Tool-Specific Limitations](#tool-specific-limitations)
- [Cross-Tool Skill Writing Guide](#cross-tool-skill-writing-guide)

---

## Compatibility Matrix

### Skill Loading Feature Support

각 도구의 스킬 로딩 관련 기능 지원 현황:

| Feature | Claude Code | Cursor | Codex | Amazon Q | Kiro | Antigravity |
|---------|:-----------:|:------:|:-----:|:--------:|:----:|:-----------:|
| SKILL.md 자동 탐색 | ✅ `.claude/skills/` | ❌ | ❌ | ❌ | ❌ | ❌ |
| 프론트매터 파싱 | ✅ Full | ⚠️ name/description | ❌ | ❌ | ⚠️ | ❌ |
| `disable-model-invocation` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `context: fork` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `allowed-tools` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 레퍼런스 파일 접근 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| MCP 기반 로딩 (`get_skill`) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

**범례:** ✅ 지원 | ⚠️ 부분 지원 | ❌ 미지원

**핵심 차이:**
- **Claude Code**만 네이티브 SKILL.md 파싱을 지원 (프론트매터, 레퍼런스 파일 포함)
- **다른 5개 도구**는 codingbuddy MCP 서버의 `get_skill` 도구를 통해 스킬을 로드
- MCP 기반 로딩은 모든 도구에서 동일하게 동작

### Frontmatter Field Support

각 프론트매터 필드의 도구별 자동 적용 현황:

| Field | Claude Code | Cursor | Codex | Amazon Q | Kiro | Antigravity |
|-------|:-----------:|:------:|:-----:|:--------:|:----:|:-----------:|
| `name` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `description` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `argument-hint` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `allowed-tools` | ✅ | ⚠️ | ⚠️ | ❌ | ⚠️ | ⚠️ |
| `model` | ✅ | ⚠️ | ⚠️ | ❌ | ❌ | ❌ |
| `effort` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `context` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `agent` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `disable-model-invocation` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `user-invocable` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `hooks` | ✅ | ⚠️ | ❌ | ❌ | ✅ | ❌ |

**⚠️ 부분 지원 상세:**
- **Cursor `allowed-tools`**: 도구명은 인식하나 Bash 필터(`Bash(git:*)`)는 미지원
- **Cursor `model`**: 모델 전환 가능하나 프론트매터에서 자동 적용되지 않음
- **Cursor `hooks`**: `.mdc` 규칙의 glob 패턴으로 유사 기능 구현 가능
- **Codex `allowed-tools`/`model`**: 시스템 프롬프트에서 참고 가능하나 자동 적용 미지원
- **Kiro `allowed-tools`**: 도구 제한 인식하나 Bash 필터 미지원
- **Kiro `hooks`**: 이벤트 기반 훅 (`onFileChange`, `onSave`) 지원
- **Antigravity `allowed-tools`**: 도구명 인식하나 자동 적용 미지원

---

## Skill Loading Methods

### Loading Flow by Tool

#### Claude Code

```
사용자: /skill-name [args]
  │
  ├─ (1) 네이티브 Skill 도구 직접 호출 (우선)
  │     └─ SKILL.md 로드 → 프론트매터 파싱 → 레퍼런스 파일 접근 → 실행
  │
  └─ (2) MCP 체인 (대체 경로)
        └─ recommend_skills → get_skill → 내용 반환
```

**특징:**
- 네이티브 Skill 도구가 최우선
- `context: fork` 시 자동으로 서브에이전트 생성
- `allowed-tools` 자동 적용
- `model`/`effort` 자동 전환
- 레퍼런스 파일(`references/`) 직접 접근 가능

#### Cursor

```
사용자: /skill-name [args]
  │
  └─ MCP 체인
        └─ recommend_skills({ prompt }) → get_skill(name) → 내용 표시
```

**특징:**
- `.mdc` 규칙에서 MCP 호출 가이드 포함
- glob 기반 자동 활성화 (`.cursor/rules/auto-agent.mdc`)
- 병렬 실행 불가 → 순차 실행

#### Codex

```
사용자: /skill-name [args]
  │
  └─ MCP 체인
        └─ recommend_skills({ prompt }) → get_skill(name) → 시스템 프롬프트에 포함
```

**특징:**
- 시스템 프롬프트(`.codex/rules/system-prompt.md`)에 키워드 규칙 포함
- 순차 실행만 지원
- 한국어/영어 이중 지원

#### Amazon Q

```
사용자: 스킬 요청
  │
  ├─ MCP 체인 (설정 시)
  │     └─ recommend_skills → get_skill → 내용 참조
  │
  └─ 직접 참조 (대체)
        └─ .ai-rules/ 디렉토리 직접 읽기
```

**특징:**
- MCP 설정이 선택적
- `.q/rules/customizations.md`에서 직접 참조 가능
- AWS 서비스 특화 기능

#### Kiro

```
사용자: /skill-name [args]
  │
  └─ MCP 체인
        └─ recommend_skills → get_skill → 내용 반환
```

**특징:**
- `.kiro/settings/mcp.json`에서 MCP 서버 설정
- 이벤트 기반 훅 (`onFileChange`, `onSave`) 지원
- steering (specs, design docs) 통합

#### Antigravity

```
사용자: /skill-name [args]
  │
  └─ MCP 체인
        └─ recommend_skills → get_skill → 내용 반환
```

**특징:**
- `task_boundary` 도구로 진행 추적
- artifact 관리 기능
- 순차 실행 (병렬 미지원)

### Slash Command Mapping

모든 도구에서 `/skill-name` 형식으로 스킬을 호출할 수 있다:

| 도구 | 네이티브 슬래시 명령 | MCP 경유 슬래시 명령 |
|------|-------------------|-------------------|
| Claude Code | ✅ (Skill 도구) | ✅ (fallback) |
| Cursor | ❌ | ✅ (MCP 체인) |
| Codex | ❌ | ✅ (MCP 체인) |
| Amazon Q | ❌ | ✅ (MCP 체인) |
| Kiro | ❌ | ✅ (MCP 체인) |
| Antigravity | ❌ | ✅ (MCP 체인) |

### Auto-Recommendation

`parse_mode` 응답에 포함되는 `included_skills`로 자동 추천:

```
사용자: "PLAN auth feature 구현"
  │
  └─ parse_mode({ prompt: "PLAN auth feature 구현" })
        └─ 응답에 included_skills[] 포함
              ├─ security-audit (confidence: high)
              ├─ test-driven-development (confidence: medium)
              └─ api-design (confidence: medium)
```

이 기능은 모든 6개 도구에서 동일하게 동작한다.

---

## codingbuddy MCP Server Integration

### MCP Configuration by Tool

#### Claude Code

```json
// .claude/config.json (IDE 수준 설정)
{
  "mcpServers": {
    "codingbuddy": {
      "command": "npx",
      "args": ["-y", "codingbuddy-rules"],
      "env": {
        "CODINGBUDDY_PROJECT_ROOT": "/path/to/project"
      }
    }
  }
}
```

#### Cursor

```json
// .cursor/mcp.json
{
  "mcpServers": {
    "codingbuddy": {
      "command": "npx",
      "args": ["-y", "codingbuddy-rules"],
      "env": {
        "CODINGBUDDY_PROJECT_ROOT": "${workspaceFolder}"
      }
    }
  }
}
```

#### Codex

```json
// GitHub Copilot MCP 설정
{
  "mcpServers": {
    "codingbuddy": {
      "command": "npx",
      "args": ["-y", "codingbuddy-rules"],
      "env": {
        "CODINGBUDDY_PROJECT_ROOT": "/path/to/project"
      }
    }
  }
}
```

#### Amazon Q

```json
// AWS Q MCP 설정
{
  "mcpServers": {
    "codingbuddy": {
      "command": "npx",
      "args": ["-y", "codingbuddy-rules"],
      "env": {
        "CODINGBUDDY_PROJECT_ROOT": "/path/to/project"
      }
    }
  }
}
```

#### Kiro

```json
// .kiro/settings/mcp.json
{
  "mcpServers": {
    "codingbuddy": {
      "command": "npx",
      "args": ["-y", "codingbuddy-rules"],
      "env": {
        "CODINGBUDDY_PROJECT_ROOT": "${workspaceFolder}"
      }
    }
  }
}
```

#### Antigravity

```json
// .antigravity/config.json
{
  "mcpServers": {
    "codingbuddy": {
      "command": "npx",
      "args": ["-y", "codingbuddy-rules"],
      "env": {
        "CODINGBUDDY_PROJECT_ROOT": "/path/to/project"
      }
    }
  }
}
```

**프로젝트 루트 해석 우선순위:**
1. `CODINGBUDDY_PROJECT_ROOT` 환경 변수 (최우선)
2. `roots/list` MCP 기능 (일부 도구 지원)
3. `findProjectRoot()` 자동 탐지 (폴백)

### Core MCP Tools

모든 도구에서 사용 가능한 codingbuddy MCP 도구:

| Tool | Purpose | 사용 시점 |
|------|---------|----------|
| `parse_mode` | 워크플로우 모드 파싱 (PLAN/ACT/EVAL/AUTO) | 키워드 감지 시 즉시 |
| `recommend_skills` | 프롬프트 기반 스킬 추천 | 스킬 검색 시 |
| `get_skill` | 스킬 전체 내용 로드 | 추천 결과 확인 후 |
| `list_skills` | 전체 스킬 목록 조회 | 스킬 탐색 시 |
| `search_rules` | 규칙 검색 | 관련 규칙 확인 시 |
| `get_agent_details` | 에이전트 프로필 조회 | 에이전트 정보 필요 시 |
| `get_project_config` | 프로젝트 설정 조회 | 기술 스택/언어 확인 시 |
| `update_context` | 컨텍스트 문서 업데이트 | 각 모드 완료 시 |
| `dispatch_agents` | 에이전트 디스패치 파라미터 | 병렬/순차 실행 시 |
| `prepare_parallel_agents` | 병렬 에이전트 프롬프트 준비 | 순차 실행 시 |
| `generate_checklist` | 도메인별 체크리스트 생성 | 품질 검증 시 |
| `analyze_task` | 사전 분석 및 리스크 평가 | PLAN 시작 시 |

### Specialist Agent Execution

도구별 전문가 에이전트 실행 패턴:

| 도구 | 실행 방식 | dispatch 소스 |
|------|----------|--------------|
| Claude Code | **병렬** (Task tool + `run_in_background`) | `dispatchReady.dispatchParams` |
| Cursor | **순차** (하나씩 실행) | `prepare_parallel_agents` 프롬프트 |
| Codex | **순차** (하나씩 실행) | `dispatchReady.dispatchParams.prompt` |
| Amazon Q | **순차** (하나씩 실행) | `prepare_parallel_agents` 프롬프트 |
| Kiro | **순차** (하나씩 실행) | `dispatchReady.dispatchParams.prompt` |
| Antigravity | **순차** (하나씩 실행) | `dispatchReady.dispatchParams.prompt` |

**Claude Code (병렬):**
```
parse_mode → dispatchReady
  ├─ primaryAgent.dispatchParams → Task tool
  ├─ parallelAgents[0].dispatchParams → Task tool (background)
  ├─ parallelAgents[1].dispatchParams → Task tool (background)
  └─ TaskOutput로 결과 수집
```

**기타 도구 (순차):**
```
parse_mode → dispatchReady
  ├─ primaryAgent.dispatchParams.prompt → 직접 실행
  ├─ parallelAgents[0].dispatchParams.prompt → 순차 실행
  └─ parallelAgents[1].dispatchParams.prompt → 순차 실행
```

### Context Document Management

`docs/codingbuddy/context.md`를 통한 크로스-모드 컨텍스트 관리:

| 도구 | context 자동 관리 | 강제 적용 | update_context 호출 |
|------|------------------|----------|-------------------|
| Claude Code | ✅ (`parse_mode` 자동) | ✅ (훅으로 강제) | 필수 |
| Cursor | ✅ (`parse_mode` 자동) | ❌ (자발적) | 권장 |
| Codex | ✅ (`parse_mode` 자동) | ❌ (자발적) | 권장 |
| Amazon Q | ✅ (`parse_mode` 자동) | ❌ (자발적) | 권장 |
| Kiro | ✅ (`parse_mode` 자동) | ❌ (자발적) | 권장 |
| Antigravity | ✅ (`parse_mode` 자동) | ❌ (자발적) | 필수 (`task_boundary` 전에) |

---

## Per-Tool Guide

각 도구에서 skill-creator를 사용하는 방법:

### Claude Code

```bash
# 직접 호출 (네이티브)
/skill-creator create my-skill

# MCP 경유
# recommend_skills → get_skill 자동 체인
```

- 프론트매터 모든 필드 자동 적용
- 레퍼런스 파일 직접 접근 (`references/` 디렉토리)
- `context: fork`로 격리 실행 가능

### Cursor, Codex, Amazon Q, Kiro, Antigravity

```
# MCP 체인으로 스킬 로드
1. recommend_skills({ prompt: "create a new skill" })
2. get_skill("skill-creator") → SKILL.md 본문 반환
3. 반환된 지시사항을 따라 스킬 작성
```

- SKILL.md 본문만 반환 (레퍼런스 파일은 별도 `get_skill` 요청 필요)
- 프론트매터는 가이드로 참조 (자동 적용 아님)
- 순차 실행만 지원

---

## Tool-Specific Limitations

### Claude Code
- **강점**: 유일한 네이티브 SKILL.md 파싱, 병렬 에이전트, 훅 강제, 모든 프론트매터 지원
- **제한**: 없음 (모든 기능 지원)

### Cursor
- **강점**: glob 기반 규칙 자동 활성화, `.mdc` 규칙 시스템
- **제한**: 병렬 실행 불가, `context`/`agent`/`effort` 미지원, Bash 필터 미지원

### Codex
- **강점**: 시스템 프롬프트 기반 심층 통합, 한국어/영어 이중 지원
- **제한**: 병렬 실행 불가, 세션 훅 미지원, 프론트매터 자동 적용 불가

### Amazon Q
- **강점**: AWS 서비스 네이티브 통합
- **제한**: MCP 설정 선택적, 프론트매터 자동 적용 미지원

### Kiro
- **강점**: 이벤트 기반 훅, steering 통합, `${workspaceFolder}` 변수 지원
- **제한**: 병렬 실행 불가, `context`/`agent`/`effort` 미지원

### Antigravity
- **강점**: `task_boundary` 진행 추적, artifact 관리
- **제한**: 병렬 실행 불가, 훅 미지원, 프론트매터 자동 적용 미지원

---

## Cross-Tool Skill Writing Guide

모든 6개 도구에서 호환되는 스킬을 작성하기 위한 가이드라인.

### 필수 규칙

1. **`name`과 `description`은 항상 포함** — 모든 도구에서 필수
2. **마크다운 표준 문법 사용** — 도구별 확장 문법 사용 금지
3. **도구 특정 API 참조 금지** — 스킬 본문에서 `Task tool`, `Agent tool` 등 Claude Code 전용 용어 사용 금지

### 권장 규칙

1. **`allowed-tools` 사용 시 기본 도구명만** — Bash 필터(`Bash(git:*)`)는 Claude Code 전용
2. **`context`/`agent`는 Claude Code 보너스로 취급** — 없어도 동작하도록 설계
3. **`hooks`는 선택적 향상으로 취급** — 미지원 도구에서는 무시됨
4. **`model`/`effort`는 힌트로 취급** — 대부분의 도구에서 자동 적용 안 됨

### 호환성 체크리스트

```
- [ ] name과 description만으로 스킬 목적이 명확한가?
- [ ] MCP 도구 없이도 스킬 내용을 이해할 수 있는가?
- [ ] 도구 특정 기능에 의존하지 않는가?
- [ ] 순차 실행에서도 동작하는가? (병렬 가정 금지)
- [ ] Bash 필터 없이도 보안이 유지되는가?
- [ ] 3인칭 서술로 description이 작성되었는가?
```

### 프론트매터 호환성 티어

| Tier | Fields | 자동 적용 도구 수 |
|------|--------|-----------------|
| **Universal** | `name`, `description`, `disable-model-invocation`, `user-invocable` | 6/6 |
| **Broad** | `argument-hint` | 6/6 (UI 표시만) |
| **Moderate** | `allowed-tools` (기본), `model`, `hooks` | 1-3/6 |
| **Claude Code Only** | `context`, `agent`, `effort`, `allowed-tools` (Bash 필터) | 1/6 |

**스킬 작성 시 권장 전략:**
- **Universal 티어 필드로 핵심 동작 보장**
- **상위 티어 필드는 선택적 향상으로 추가**
- **Claude Code Only 필드는 해당 도구에서의 UX 최적화용**
