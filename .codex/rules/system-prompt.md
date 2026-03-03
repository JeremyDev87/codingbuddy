# Codex System Prompt

This project uses shared AI coding rules from `packages/rules/.ai-rules/` directory for consistency across all AI assistants (Cursor, Claude Code, Antigravity, Codex, Q, Kiro).

## 📚 Core Workflow Rules

**Source**: [packages/rules/.ai-rules/rules/core.md](../../packages/rules/.ai-rules/rules/core.md)

### Work Modes

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

### Agent System

**Auto-activated Agents**:
- **Frontend Developer** (`packages/rules/.ai-rules/agents/frontend-developer.json`): PLAN/ACT modes
- **Code Reviewer** (`packages/rules/.ai-rules/agents/code-reviewer.json`): EVAL mode

**Specialist Agents** (35 available):
- Architecture, Test Strategy, Performance, Security
- Accessibility, SEO, i18n, Documentation
- Code Quality, and more

For complete workflow details, see [packages/rules/.ai-rules/rules/core.md](../../packages/rules/.ai-rules/rules/core.md)

---

## 🏗️ Project Setup

**Source**: [packages/rules/.ai-rules/rules/project.md](../../packages/rules/.ai-rules/rules/project.md)

### Tech Stack

Refer to project's `package.json`.

### Project Structure
```
src/
├── app/          # Next.js App Router
├── entities/     # Domain entities (business logic)
├── features/     # Feature-specific UI components
├── widgets/      # Composite widgets
└── shared/       # Common modules
```

### Development Rules
- **Layer dependency**: app → widgets → features → entities → shared
- **Pure/impure separation**: Separate files for pure and impure functions
- **Server Components**: Default, Client Components only when necessary
- **Test coverage**: 90%+ goal

For complete project setup, see [packages/rules/.ai-rules/rules/project.md](../../packages/rules/.ai-rules/rules/project.md)

---

## 🎯 Augmented Coding Principles

**Source**: [packages/rules/.ai-rules/rules/augmented-coding.md](../../packages/rules/.ai-rules/rules/augmented-coding.md)

### TDD Cycle (Strict Adherence)

Follow the **Red → Green → Refactor** cycle:

1. **Red**: Write a failing test that defines functionality
2. **Green**: Implement minimum code needed to pass
3. **Refactor**: Improve structure only after tests pass

### Core Principles
- **TDD for core logic** (entities, shared/utils, shared/hooks)
- **Test-after for UI** (features, widgets)
- **SOLID principles** and code quality standards
- **90%+ test coverage** goal
- **No mocking** - test real behavior with actual implementations

### Code Quality Standards
- TypeScript strict mode (no `any`)
- DRY (Don't Repeat Yourself)
- Keep methods small (10-20 lines max)
- Minimize state, prefer pure functions
- Tidy First: Separate structural vs behavioral changes

For complete augmented coding guide, see [packages/rules/.ai-rules/rules/augmented-coding.md](../../packages/rules/.ai-rules/rules/augmented-coding.md)

---

## 🤖 Specialist Agents

**Source**: [packages/rules/.ai-rules/agents/](../../packages/rules/.ai-rules/agents/)

All specialist agents are defined in `packages/rules/.ai-rules/agents/` directory:

| Agent | Expertise | Use Cases |
|-------|-----------|-----------|
| Frontend Developer | React/Next.js, TDD, design system | Component implementation, Server Actions |
| Code Reviewer | Quality evaluation, architecture | Code review, production readiness |
| Security Specialist | OAuth 2.0, JWT, XSS/CSRF | Authentication, security audit |
| Accessibility Specialist | WCAG 2.1 AA, ARIA | A11y compliance, screen readers |
| Performance Specialist | Bundle size, Core Web Vitals | Performance tuning, optimization |
| +7 more specialists | Various domains | See agents README |

For complete agent documentation, see [packages/rules/.ai-rules/agents/README.md](../../packages/rules/.ai-rules/agents/README.md)

---

## 🔴 MANDATORY: Keyword Mode Detection

<CODINGBUDDY_CRITICAL_RULE>

**When user message starts with PLAN, ACT, EVAL, or AUTO keyword (or localized: Korean 계획/실행/평가/자동, Japanese 計画/実行/評価/自動, Chinese 计划/执行/评估/自动, Spanish PLANIFICAR/ACTUAR/EVALUAR/AUTOMÁTICO):**

1. **IMMEDIATELY** call `parse_mode` MCP tool with the user's prompt
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

Example: `PLAN design auth feature` → **즉시** parse_mode 호출 → PLAN 모드로 작업

---

## 🔧 MCP Server Configuration

codingbuddy MCP 서버 사용 시 `CODINGBUDDY_PROJECT_ROOT` 환경변수를 프로젝트의 절대 경로로 설정하세요.

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

**Project root resolution priority:**
1. `CODINGBUDDY_PROJECT_ROOT` environment variable (highest priority)
2. `roots/list` MCP capability (support unconfirmed in Codex)
3. `findProjectRoot()` automatic detection (fallback)

> `CODINGBUDDY_PROJECT_ROOT` 없이는 서버가 프로젝트의 `codingbuddy.config.json`을 찾지 못하여
> `language` 등 설정이 기본값으로 동작합니다.

자세한 설정 방법: [packages/rules/.ai-rules/adapters/codex.md](../../packages/rules/.ai-rules/adapters/codex.md)

---

## 💬 Communication

- **Always respond in Korean**
- User frequently modifies code directly, so **always read code and refresh information** instead of relying on memory
- **Start by understanding current code state** for every question

---

## 🛠️ Skills

Skills are structured AI instructions for specialized tasks (brainstorming, TDD, debugging, planning, etc.).

### Skill Access Methods

**Primary (MCP Tool — works with npm install):**

| Tool | Description |
|------|-------------|
| `recommend_skills` | Recommend skills based on user prompt with multi-language support |
| `get_skill` | Load full skill content by name |
| `list_skills` | List all available skills with optional filtering |

**Usage pattern:**
```
User prompt → recommend_skills(prompt) → get_skill(recommended skillName) → follow instructions
```

**Fallback (Monorepo contributors only):**
```bash
cat .ai-rules/skills/<skill-name>/SKILL.md
```

> **Note:** `parse_mode` already embeds matched skill content in `included_skills` — no separate `get_skill` call needed when using mode keywords (PLAN/ACT/EVAL/AUTO).

### Available Skills

Highlighted skills (use `list_skills()` for the complete list):

- `brainstorming` - Explore requirements before implementation
- `test-driven-development` - TDD workflow
- `systematic-debugging` - Debug methodically
- `writing-plans` - Create implementation plans
- `executing-plans` - Execute plans with checkpoints
- `subagent-driven-development` - In-session plan execution
- `dispatching-parallel-agents` - Handle parallel tasks
- `frontend-design` - Build production-grade UI
- `pr-all-in-one` - Unified commit and PR workflow

---

## 📖 Full Documentation

For comprehensive guides:
- **Core Rules**: [packages/rules/.ai-rules/rules/core.md](../../packages/rules/.ai-rules/rules/core.md)
- **Project Setup**: [packages/rules/.ai-rules/rules/project.md](../../packages/rules/.ai-rules/rules/project.md)
- **Augmented Coding**: [packages/rules/.ai-rules/rules/augmented-coding.md](../../packages/rules/.ai-rules/rules/augmented-coding.md)
- **Agents System**: [packages/rules/.ai-rules/agents/README.md](../../packages/rules/.ai-rules/agents/README.md)
- **Integration Guide**: [packages/rules/.ai-rules/adapters/codex.md](../../packages/rules/.ai-rules/adapters/codex.md)

---

**Note**: This file references common AI rules from `packages/rules/.ai-rules/` directory. All AI assistants (Cursor, Claude Code, Antigravity, Codex, Q, Kiro) share the same rules for consistency.
