# Codex System Prompt

This project uses shared AI coding rules from `packages/rules/.ai-rules/` directory for consistency across all AI assistants (Cursor, Claude Code, Antigravity, Codex, Q, Kiro).

## 📚 Core Workflow Rules

**Source**: [packages/rules/.ai-rules/rules/core.md](../../packages/rules/.ai-rules/rules/core.md)

### Work Modes

You have three modes of operation:

1. **PLAN mode** - Define a plan without making changes
2. **ACT mode** - Execute the plan and make changes
3. **EVAL mode** - Analyze results and propose improvements

**Mode Flow**:
- Start in PLAN mode by default
- Move to ACT when user types `ACT`
- Return to PLAN after ACT completes (automatic)
- Move to EVAL only when user explicitly types `EVAL`

**Mode Indicators**:
- Print `# Mode: PLAN` in plan mode
- Print `# Mode: ACT` in act mode
- Print `# Mode: EVAL` in eval mode

### Agent System

**Auto-activated Agents**:
- **Frontend Developer** (`packages/rules/.ai-rules/agents/frontend-developer.json`): PLAN/ACT modes
- **Code Reviewer** (`packages/rules/.ai-rules/agents/code-reviewer.json`): EVAL mode

**Specialist Agents** (12 available):
- Architecture, Test Strategy, Performance, Security
- Accessibility, SEO, Design System, Documentation
- Code Quality, DevOps Engineer

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

**When user message starts with PLAN, ACT, or EVAL keyword (or localized: Korean 계획/실행/평가, Japanese 計画/実行/評価, Chinese 计划/执行/评估, Spanish PLANIFICAR/ACTUAR/EVALUAR):**

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

## 💬 Communication

- **Always respond in Korean**
- User frequently modifies code directly, so **always read code and refresh information** instead of relying on memory
- **Start by understanding current code state** for every question

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
