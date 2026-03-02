# Antigravity Instructions

## Common AI Rules Reference

This project follows shared AI coding rules from `packages/rules/.ai-rules/` for consistency across all AI assistants (Cursor, Claude Code, Antigravity, Codex, Q, Kiro).

### 📚 Core Workflow (PLAN/ACT/EVAL)

**Source**: `packages/rules/.ai-rules/rules/core.md`

#### Work Modes

You have four modes of operation:

1. **PLAN mode** - Define a plan without making changes
2. **ACT mode** - Execute the plan and make changes
3. **EVAL mode** - Analyze results and propose improvements
4. **AUTO mode** - Autonomous PLAN → ACT → EVAL cycle until quality achieved

**Mode Flow**:
- Start in PLAN mode by default
- Move to ACT when user types `ACT`
- Return to PLAN after ACT completes (automatic)
- Move to EVAL only when user explicitly types `EVAL`
- Move to AUTO when user types `AUTO` (autonomous cycle)

**Mode Indicators**:
- Print `# Mode: PLAN` in plan mode
- Print `# Mode: ACT` in act mode
- Print `# Mode: EVAL` in eval mode
- Print `# Mode: AUTO` in auto mode (with iteration number)

See full workflow details in [packages/rules/.ai-rules/rules/core.md](../../packages/rules/.ai-rules/rules/core.md)

### 🏗️ Project Context

**Source**: `packages/rules/.ai-rules/rules/project.md`

#### Tech Stack

프로젝트의 `package.json`을 참조하세요.

#### Project Structure
```
src/
├── app/          # Next.js App Router
├── entities/     # Domain entities (business logic)
├── features/     # Feature-specific UI components
├── widgets/      # Composite widgets
└── shared/       # Common modules
```

See full project setup in [packages/rules/.ai-rules/rules/project.md](../../packages/rules/.ai-rules/rules/project.md)

### 🎯 Augmented Coding Principles

**Source**: `packages/rules/.ai-rules/rules/augmented-coding.md`

#### TDD Cycle
1. **Red**: Write a failing test
2. **Green**: Implement minimum code to pass
3. **Refactor**: Improve structure after tests pass

#### Core Principles
- **TDD for core logic** (entities, shared/utils, hooks)
- **Test-after for UI** (features, widgets)
- **SOLID principles** and code quality standards
- **90%+ test coverage** goal
- **No mocking** - test real behavior

See full augmented coding guide in [packages/rules/.ai-rules/rules/augmented-coding.md](../../packages/rules/.ai-rules/rules/augmented-coding.md)

### 🤖 Specialist Agents

**Source**: `packages/rules/.ai-rules/agents/`

Available specialist agents:
- **Frontend Developer** - React/Next.js, TDD, design system
- **Code Reviewer** - Quality evaluation, architecture analysis
- **Architecture Specialist** - Layer boundaries, dependency direction
- **Test Strategy Specialist** - Test coverage, TDD workflow
- **Performance Specialist** - Bundle size, rendering optimization
- **Security Specialist** - OAuth 2.0, JWT, XSS/CSRF protection
- **Accessibility Specialist** - WCAG 2.1 AA compliance
- **SEO Specialist** - Metadata API, structured data
- **Design System Specialist** - Design system usage
- **Documentation Specialist** - Documentation quality
- **Code Quality Specialist** - SOLID, DRY, complexity
- **DevOps Engineer** - Docker, Datadog, deployment

See agent details in [packages/rules/.ai-rules/agents/README.md](../../packages/rules/.ai-rules/agents/README.md)

## 🔴 MANDATORY: Keyword Mode Detection

<CODINGBUDDY_CRITICAL_RULE>

**When user message starts with PLAN, ACT, EVAL, or AUTO keyword (or localized: Korean 계획/실행/평가/자동, Japanese 計画/実行/評価/自動, Chinese 计划/执行/评估/自动, Spanish PLANIFICAR/ACTUAR/EVALUAR/AUTOMÁTICO):**

1. **IMMEDIATELY** call `parse_mode` MCP tool with the user's prompt
2. Follow the returned `instructions` **EXACTLY**
3. Apply the returned `rules` as context
4. If `warnings` are present, inform the user
5. **Fallback** (MCP unavailable): Follow mode-specific rules from `packages/rules/.ai-rules/rules/core.md`

**This is MANDATORY, not optional.**

Failure to follow mode rules when these keywords are present will result in:
- Missed critical checklists (Devil's Advocate Analysis, Impact Radius Analysis)
- Incomplete evaluations
- Quality issues not caught before deployment

**Red Flags** (STOP if you think these):

| Thought | Reality |
|---------|---------|
| "I can handle EVAL myself" | NO. Follow mode rules FIRST. |
| "The rules are similar anyway" | NO. Each mode has specific checklists. |
| "I already know what to do" | NO. Rules may have been updated. |

</CODINGBUDDY_CRITICAL_RULE>

Example: `EVAL` → **즉시** EVAL 모드 규칙 적용 → Devil's Advocate Analysis 수행

---

## MCP Server Integration

codingbuddy MCP 서버가 설정되어 있다면, 다음 도구들을 활용하세요:

### 핵심 도구

| 도구 | 용도 |
|------|------|
| `parse_mode` | PLAN/ACT/EVAL/AUTO 모드 키워드 파싱 + Agent/rules 로딩 |
| `search_rules` | 규칙 및 가이드라인 검색 |
| `get_agent_details` | 전문 Agent 프로필 및 전문 분야 조회 |
| `recommend_skills` | 프롬프트 기반 스킬 추천 → `get_skill` 호출 |
| `get_skill` | 스킬 전체 내용 로딩 |
| `update_context` | 컨텍스트 문서 업데이트 (결정, 노트, 진행상황) |

> 전체 도구 목록(17개)은 [antigravity.md](../../packages/rules/.ai-rules/adapters/antigravity.md#mcp-tools)를 참조하세요.

### 설정 방법

MCP 서버 설정은 `.antigravity/config.json`에 추가합니다:

```json
{
  "mcpServers": {
    "codingbuddy": {
      "command": "npx",
      "args": ["-y", "codingbuddy"],
      "env": {
        "CODINGBUDDY_PROJECT_ROOT": "/absolute/path/to/your/project"
      }
    }
  }
}
```

자세한 설정 가이드: [packages/rules/.ai-rules/adapters/antigravity.md](../../packages/rules/.ai-rules/adapters/antigravity.md)

---

## Skills

codingbuddy 스킬은 MCP tool chain을 통해 접근합니다:

1. **자동 추천**: `recommend_skills({ prompt: "사용자 메시지" })` → AI가 적합한 스킬 추천
2. **수동 검색**: `list_skills()` → `get_skill("스킬명")` → 스킬 내용 로딩
3. **슬래시 커맨드**: 사용자가 `/<command>` 입력 시 → `get_skill` 호출

> **Note:** `parse_mode`는 `included_skills`에 매칭된 스킬을 자동 포함합니다.
> PLAN/ACT/EVAL/AUTO 키워드 사용 시 별도의 `recommend_skills` 호출이 불필요합니다.

---

## Context Document

`docs/codingbuddy/context.md`에 모드 간 결정사항을 지속합니다:

- `parse_mode`가 자동으로 컨텍스트 문서를 읽기/생성
- **각 모드 완료 전**: `update_context` 호출 필수
- PLAN/AUTO 모드: 기존 내용 초기화 후 새로 시작
- ACT/EVAL 모드: 기존 내용에 새 섹션 추가

---

## Antigravity-Specific Features

### Task Boundaries & Completion Ordering

**When completing each mode**, execute two calls in strict order:
1. **`update_context`** — Persist decisions, notes, findings to `docs/codingbuddy/context.md` (first)
2. **`task_boundary`** — Signal mode boundary to Antigravity (second)

> `update_context` must be called first to preserve cross-mode context even if the session is interrupted.

`task_boundary` parameters:
- Mode: `PLANNING`, `EXECUTION`, `VERIFICATION`, or `AUTO_ITERATION`
- TaskName: Current work area
- TaskStatus: Next steps
- TaskSummary: Summary of completed work

### Communication

- **Follow project's configured language setting** — use `get_project_config` MCP tool to retrieve current language setting
- Use structured markdown formatting
- Provide clear, actionable feedback

---

For full integration guide, see [packages/rules/.ai-rules/adapters/antigravity.md](../../packages/rules/.ai-rules/adapters/antigravity.md)
