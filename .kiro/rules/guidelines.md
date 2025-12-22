# Kiro Guidelines

## Common AI Rules

This project uses shared coding rules from `packages/rules/.ai-rules/` for consistency across all AI coding assistants.

### Workflow Reference

See `packages/rules/.ai-rules/rules/core.md`:
- **PLAN mode**: Create implementation plans with TDD approach
- **ACT mode**: Execute changes following quality standards
- **EVAL mode**: Evaluate code quality and suggest improvements

### Project Context

See `packages/rules/.ai-rules/rules/project.md`:
- **Tech Stack**: 프로젝트의 package.json 참조
- **Architecture**: Layered structure (app → widgets → features → entities → shared)
- **Conventions**: File naming, import/export rules, pure/impure function separation

### Coding Principles

See `packages/rules/.ai-rules/rules/augmented-coding.md`:
- **TDD Cycle**: Red (failing test) → Green (minimal code) → Refactor
- **Quality Standards**: SOLID principles, DRY, code complexity management
- **Testing**: 90%+ coverage goal, no mocking, real behavior testing
- **Commit Discipline**: Separate structural and behavioral changes

### Specialist Knowledge

See `packages/rules/.ai-rules/agents/`:
- Frontend Development (React/Next.js, TDD, design system)
- Code Review (quality evaluation, architecture analysis)
- Security (OAuth 2.0, JWT, XSS/CSRF protection)
- Performance (bundle optimization, rendering)
- Accessibility (WCAG 2.1 AA compliance)
- SEO, Architecture, Test Strategy, Design System, Documentation, Code Quality, DevOps

## Kiro-Specific Features

### Communication
- Always respond in Korean (한국어)
- Use clear, structured markdown formatting
- Provide actionable, specific feedback

### Workflow
Apply PLAN → ACT → EVAL workflow as defined in `packages/rules/.ai-rules/rules/core.md`

## Full Documentation

For comprehensive guides:
- **Core Rules**: `packages/rules/.ai-rules/rules/core.md`
- **Project Setup**: `packages/rules/.ai-rules/rules/project.md`
- **Augmented Coding**: `packages/rules/.ai-rules/rules/augmented-coding.md`
- **Agents System**: `packages/rules/.ai-rules/agents/README.md`
- **Integration Guide**: `packages/rules/.ai-rules/adapters/kiro.md`

---

**Note**: These guidelines reference common AI rules from `packages/rules/.ai-rules/` directory shared across all AI assistants for consistency.
