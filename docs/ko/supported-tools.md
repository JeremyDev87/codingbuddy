<p align="center">
  <a href="../supported-tools.md">English</a> |
  <a href="supported-tools.md">한국어</a> |
  <a href="../zh-CN/supported-tools.md">中文</a> |
  <a href="../ja/supported-tools.md">日本語</a> |
  <a href="../es/supported-tools.md">Español</a>
</p>

# 지원 AI 도구

Codingbuddy는 통합 규칙 시스템을 통해 여러 AI 코딩 어시스턴트와 함께 작동합니다.

## 개요

| 도구 | 통합 방식 | 설정 가이드 |
|------|-----------|-------------|
| [Claude Code](#claude-code) | MCP 서버 | [가이드](../../packages/rules/.ai-rules/adapters/claude-code.md) |
| [Cursor](#cursor) | Rules 디렉토리 | [가이드](../../packages/rules/.ai-rules/adapters/cursor.md) |
| [GitHub Copilot / Codex](#github-copilot--codex) | Instructions 파일 | [가이드](../../packages/rules/.ai-rules/adapters/codex.md) |
| [Antigravity](#antigravity) | Config 디렉토리 | [가이드](../../packages/rules/.ai-rules/adapters/antigravity.md) |
| [Amazon Q](#amazon-q) | Rules 디렉토리 | [가이드](../../packages/rules/.ai-rules/adapters/q.md) |
| [Kiro](#kiro) | Spec 디렉토리 | [가이드](../../packages/rules/.ai-rules/adapters/kiro.md) |

## Claude Code

**통합 방식**: MCP (Model Context Protocol) 서버

Claude Code는 MCP를 통해 연결되어 프로젝트 설정, 규칙, 전문가 에이전트에 대한 전체 접근을 제공합니다.

### 빠른 설정

1. Claude Desktop 설정에 추가:

   **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

   **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

   ```json
   {
     "mcpServers": {
       "codingbuddy": {
         "command": "npx",
         "args": ["codingbuddy-mcp"]
       }
     }
   }
   ```

2. Claude Desktop 재시작

### 기능

- 전체 MCP 리소스 접근 (설정, 규칙, 에이전트)
- 도구 호출 (search_rules, get_agent_details, parse_mode)
- 프롬프트 템플릿 (activate_agent)

[전체 가이드](../../packages/rules/.ai-rules/adapters/claude-code.md)

## Cursor

**통합 방식**: Rules 디렉토리

Cursor는 프로젝트별 지침을 위해 `.cursor/rules/`를 사용합니다.

### 빠른 설정

1. `.cursor/rules/` 디렉토리 생성
2. 공통 규칙 참조:

```markdown
<!-- .cursor/rules/codingbuddy.md -->

# 프로젝트 규칙

`packages/rules/.ai-rules/`의 공통 규칙을 따릅니다:

- 워크플로우: @packages/rules/.ai-rules/rules/core.md
- 품질: @packages/rules/.ai-rules/rules/augmented-coding.md
- 컨텍스트: @packages/rules/.ai-rules/rules/project.md
```

### 기능

- `@` 문법으로 파일 참조
- 프로젝트별 커스터마이징
- 파일 참조를 통한 에이전트 컨텍스트

[전체 가이드](../../packages/rules/.ai-rules/adapters/cursor.md)

## GitHub Copilot / Codex

**통합 방식**: Instructions 파일

GitHub Copilot은 커스텀 지침을 위해 `.github/copilot-instructions.md`를 사용합니다.

### 빠른 설정

1. Instructions 파일 생성:

```markdown
<!-- .github/copilot-instructions.md -->

# 코딩 표준

`packages/rules/.ai-rules/rules/`의 가이드라인을 따릅니다:

## 워크플로우
core.md에 정의된 PLAN → ACT → EVAL 워크플로우 사용

## 코드 품질
- TDD 접근 방식 (Red → Green → Refactor)
- TypeScript strict 모드
- 80% 이상 테스트 커버리지
```

### 기능

- Markdown 기반 지침
- 저장소 전체 설정
- 팀 공유 설정

[전체 가이드](../../packages/rules/.ai-rules/adapters/codex.md)

## Antigravity

**통합 방식**: Config 디렉토리

Antigravity (Gemini 기반)는 설정을 위해 `.antigravity/`를 사용합니다.

### 빠른 설정

1. `.antigravity/rules/` 디렉토리 생성
2. 규칙 참조 추가:

```markdown
<!-- .antigravity/rules/project.md -->

# 프로젝트 가이드라인

참조: packages/rules/.ai-rules/rules/core.md
참조: packages/rules/.ai-rules/rules/augmented-coding.md
```

### 기능

- Gemini 모델 통합
- 규칙 파일 참조
- 프로젝트 컨텍스트 인식

[전체 가이드](../../packages/rules/.ai-rules/adapters/antigravity.md)

## Amazon Q

**통합 방식**: Rules 디렉토리

Amazon Q Developer는 커스텀 규칙을 위해 `.q/rules/`를 사용합니다.

### 빠른 설정

1. `.q/rules/` 디렉토리 생성
2. 통합 규칙 추가:

```markdown
<!-- .q/rules/codingbuddy.md -->

# 개발 표준

일관된 코딩 관행을 위해 packages/rules/.ai-rules/를 따릅니다.

주요 파일:
- packages/rules/.ai-rules/rules/core.md (워크플로우)
- packages/rules/.ai-rules/rules/augmented-coding.md (TDD)
```

### 기능

- AWS 통합
- 엔터프라이즈 기능
- 커스텀 규칙 지원

[전체 가이드](../../packages/rules/.ai-rules/adapters/q.md)

## Kiro

**통합 방식**: Spec 디렉토리

Kiro는 사양과 스티어링 파일을 위해 `.kiro/`를 사용합니다.

### 빠른 설정

1. `.kiro/steering/` 디렉토리 생성
2. 스티어링 파일 추가:

```markdown
<!-- .kiro/steering/codingbuddy.md -->

# 프로젝트 스티어링

packages/rules/.ai-rules/의 규칙 적용:
- 워크플로우 모드 (PLAN/ACT/EVAL)
- TDD 개발
- 코드 품질 표준
```

### 기능

- 사양 기반 개발
- 스티어링 파일 시스템
- 작업 관리 통합

[전체 가이드](../../packages/rules/.ai-rules/adapters/kiro.md)

## 새 도구 추가하기

Codingbuddy는 추가 AI 도구를 지원하도록 설계되었습니다:

1. `packages/rules/.ai-rules/adapters/{tool}.md`에 어댑터 가이드 생성
2. `.{tool}/` 도구 디렉토리 생성
3. `packages/rules/.ai-rules/`의 공통 규칙 참조

자세한 내용은 [기여하기](../../CONTRIBUTING.md)를 참조하세요.

## 비교

| 기능 | Claude | Cursor | Copilot | Antigravity | Q | Kiro |
|------|--------|--------|---------|-------------|---|------|
| MCP 지원 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 파일 참조 | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| 에이전트 활성화 | ✅ | ⚠️ | ❌ | ⚠️ | ⚠️ | ⚠️ |
| 프로젝트 설정 | ✅ | ⚠️ | ❌ | ⚠️ | ⚠️ | ⚠️ |

✅ 전체 지원 | ⚠️ 부분 지원 (파일 참조 통해) | ❌ 미지원

## 다음 단계

- [시작하기](./getting-started.md) - 초기 설정
- [철학](./philosophy.md) - 설계 원칙
- [API 레퍼런스](../api.md) - MCP 기능
