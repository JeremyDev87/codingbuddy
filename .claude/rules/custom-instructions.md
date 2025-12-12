# Custom Instructions for Claude Code

## Project Rules

Follow the common rules defined in `.ai-rules/` for consistency across all AI coding assistants.

### 📚 Core Workflow

**Source**: `.ai-rules/rules/core.md`

**Work Modes**:
- **PLAN mode**: Create implementation plans with TDD approach
- **ACT mode**: Execute changes following quality standards
- **EVAL mode**: Evaluate code quality and suggest improvements

**Mode Flow**: PLAN (default) → ACT (user types "ACT") → PLAN (automatic) → EVAL (user types "EVAL")

**Mode Indicators**: Always print `# Mode: PLAN|ACT|EVAL` at the start of responses

### 🏗️ Project Context

**Source**: `.ai-rules/rules/project.md`

**Tech Stack**:
- Next.js 16.0.1, React 19.2.0, TypeScript 5.8.3
- Yarn 4.2.2, Node.js 24.11.0
- @wishket/design-system, Tailwind CSS, React Query

**Architecture**:
- Layered structure: app → widgets → features → entities → shared
- Pure/impure function separation required
- Server Components as default

### 🎯 Code Quality

**Source**: `.ai-rules/rules/augmented-coding.md`

**TDD Cycle**: Red (failing test) → Green (minimal code) → Refactor

**Principles**:
- TDD for core logic (entities, shared/utils, hooks)
- Test-after for UI (features, widgets)
- SOLID principles, DRY, 90%+ test coverage
- No mocking - test real behavior
- TypeScript strict mode (no `any`)

### 🤖 Specialist Agents

**Source**: `.ai-rules/agents/`

**Available Specialists** (12 agents):
- Frontend Developer, Code Reviewer
- Architecture, Test Strategy, Performance, Security
- Accessibility, SEO, Design System, Documentation
- Code Quality, DevOps Engineer

See [.ai-rules/agents/README.md](../../.ai-rules/agents/README.md) for details.

## Claude Code Specific

- Always respond in **Korean (한국어)**
- Use structured markdown formatting
- Provide clear, actionable feedback
- Reference project context from `.ai-rules/rules/project.md`
- Follow PLAN → ACT → EVAL workflow when appropriate

## Full Documentation

For comprehensive guides:
- **Core Rules**: [.ai-rules/rules/core.md](../../.ai-rules/rules/core.md)
- **Project Setup**: [.ai-rules/rules/project.md](../../.ai-rules/rules/project.md)
- **Augmented Coding**: [.ai-rules/rules/augmented-coding.md](../../.ai-rules/rules/augmented-coding.md)
- **Agents System**: [.ai-rules/agents/README.md](../../.ai-rules/agents/README.md)
- **Claude Integration**: [.ai-rules/adapters/claude-code.md](../../.ai-rules/adapters/claude-code.md)

---

**Note**: These instructions reference common AI rules from `.ai-rules/` directory shared across all AI assistants (Cursor, Claude Code, Antigravity, Codex, Q, Kiro) for consistency.
