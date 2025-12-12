# Antigravity Instructions

## Common AI Rules Reference

This project follows shared AI coding rules from `.ai-rules/` for consistency across all AI assistants (Cursor, Claude Code, Antigravity, Codex, Q, Kiro).

### 📚 Core Workflow (PLAN/ACT/EVAL)

**Source**: `.ai-rules/rules/core.md`

#### Work Modes

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

See full workflow details in [.ai-rules/rules/core.md](../../.ai-rules/rules/core.md)

### 🏗️ Project Context

**Source**: `.ai-rules/rules/project.md`

#### Tech Stack
- Framework: Next.js 16.0.1 (App Router)
- React: 19.2.0
- TypeScript: 5.8.3
- Package Manager: Yarn 4.2.2
- Runtime: Node.js 24.11.0

#### Project Structure
```
src/
├── app/          # Next.js App Router
├── entities/     # Domain entities (business logic)
├── features/     # Feature-specific UI components
├── widgets/      # Composite widgets
└── shared/       # Common modules
```

See full project setup in [.ai-rules/rules/project.md](../../.ai-rules/rules/project.md)

### 🎯 Augmented Coding Principles

**Source**: `.ai-rules/rules/augmented-coding.md`

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

See full augmented coding guide in [.ai-rules/rules/augmented-coding.md](../../.ai-rules/rules/augmented-coding.md)

### 🤖 Specialist Agents

**Source**: `.ai-rules/agents/`

Available specialist agents:
- **Frontend Developer** - React/Next.js, TDD, design system
- **Code Reviewer** - Quality evaluation, architecture analysis
- **Architecture Specialist** - Layer boundaries, dependency direction
- **Test Strategy Specialist** - Test coverage, TDD workflow
- **Performance Specialist** - Bundle size, rendering optimization
- **Security Specialist** - OAuth 2.0, JWT, XSS/CSRF protection
- **Accessibility Specialist** - WCAG 2.1 AA compliance
- **SEO Specialist** - Metadata API, structured data
- **Design System Specialist** - @wishket/design-system usage
- **Documentation Specialist** - Documentation quality
- **Code Quality Specialist** - SOLID, DRY, complexity
- **DevOps Engineer** - Docker, Datadog, deployment

See agent details in [.ai-rules/agents/README.md](../../.ai-rules/agents/README.md)

## Antigravity-Specific Features

### Task Boundaries

Use `task_boundary` tool for tracking progress in different modes:
- Mode: PLANNING, EXECUTION, or VERIFICATION
- TaskName: Current work area
- TaskStatus: Next steps
- TaskSummary: Work completed so far

### Communication

- **Always respond in Korean (한국어)** as specified in common rules
- Use structured markdown formatting
- Provide clear, actionable feedback

---

For full integration guide, see [.ai-rules/adapters/antigravity.md](../../.ai-rules/adapters/antigravity.md)
