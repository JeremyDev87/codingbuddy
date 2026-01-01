# Custom Instructions for Claude Code

## Project Rules

Follow the common rules defined in `packages/rules/.ai-rules/` for consistency across all AI coding assistants.

### 📚 Core Workflow

**Source**: `packages/rules/.ai-rules/rules/core.md`

**Work Modes**:
- **PLAN mode**: Create implementation plans with TDD approach
- **ACT mode**: Execute changes following quality standards
- **EVAL mode**: Evaluate code quality and suggest improvements

**Mode Flow**: PLAN (default) → ACT (user types "ACT") → PLAN (automatic) → EVAL (user types "EVAL")

**Mode Indicators**: Always print `# Mode: PLAN|ACT|EVAL` at the start of responses

### 🏗️ Project Context

**Source**: `packages/rules/.ai-rules/rules/project.md`

**Tech Stack**: 프로젝트의 `package.json` 참조

**Architecture**:
- Layered structure: app → widgets → features → entities → shared
- Pure/impure function separation required
- Server Components as default

### 🎯 Code Quality

**Source**: `packages/rules/.ai-rules/rules/augmented-coding.md`

**TDD Cycle**: Red (failing test) → Green (minimal code) → Refactor

**Principles**:
- TDD for core logic (entities, shared/utils, hooks)
- Test-after for UI (features, widgets)
- SOLID principles, DRY, 90%+ test coverage
- No mocking - test real behavior
- TypeScript strict mode (no `any`)

### 🤖 Specialist Agents

**Source**: `packages/rules/.ai-rules/agents/`

**Available Specialists** (12 agents):
- Frontend Developer, Code Reviewer
- Architecture, Test Strategy, Performance, Security
- Accessibility, SEO, Design System, Documentation
- Code Quality, DevOps Engineer

See [packages/rules/.ai-rules/agents/README.md](../../packages/rules/.ai-rules/agents/README.md) for details.

## 🔴 MANDATORY: Keyword Mode Detection

<CODINGBUDDY_CRITICAL_RULE>

**When user message starts with PLAN, ACT, or EVAL keyword (or localized: Korean 계획/실행/평가, Japanese 計画/実行/評価, Chinese 计划/执行/评估, Spanish PLANIFICAR/ACTUAR/EVALUAR):**

1. **IMMEDIATELY** call `mcp__codingbuddy__parse_mode` with the user's prompt
2. Follow the returned `instructions` **EXACTLY**
3. Apply the returned `rules` as context
4. If `warnings` are present, inform the user

**This is MANDATORY, not optional.**

Failure to call `parse_mode` when these keywords are present will result in:
- Missed critical checklists (Devil's Advocate Analysis, Impact Radius Analysis)
- Incomplete evaluations
- Quality issues not caught before deployment

**Red Flags** (STOP if you think these):
| Thought | Reality |
|---------|---------|
| "I can handle EVAL myself" | NO. Call parse_mode FIRST. |
| "The rules are similar anyway" | NO. Each mode has specific checklists. |
| "I'll save a tool call" | NO. parse_mode MUST be called FIRST. |
| "I already know what to do" | NO. Rules may have been updated. |

</CODINGBUDDY_CRITICAL_RULE>

예시: `PLAN 인증 기능 설계` → **즉시** parse_mode 호출 → PLAN 모드로 작업

## Claude Code Specific

- Always respond in **Korean (한국어)**
- Use structured markdown formatting
- Provide clear, actionable feedback
- Reference project context from `packages/rules/.ai-rules/rules/project.md`
- Follow PLAN → ACT → EVAL workflow when appropriate

## Full Documentation

For comprehensive guides:
- **Core Rules**: [packages/rules/.ai-rules/rules/core.md](../../packages/rules/.ai-rules/rules/core.md)
- **Project Setup**: [packages/rules/.ai-rules/rules/project.md](../../packages/rules/.ai-rules/rules/project.md)
- **Augmented Coding**: [packages/rules/.ai-rules/rules/augmented-coding.md](../../packages/rules/.ai-rules/rules/augmented-coding.md)
- **Agents System**: [packages/rules/.ai-rules/agents/README.md](../../packages/rules/.ai-rules/agents/README.md)
- **Claude Integration**: [packages/rules/.ai-rules/adapters/claude-code.md](../../packages/rules/.ai-rules/adapters/claude-code.md)

---

**Note**: These instructions reference common AI rules from `packages/rules/.ai-rules/` directory shared across all AI assistants (Cursor, Claude Code, Antigravity, Codex, Q, Kiro) for consistency.
