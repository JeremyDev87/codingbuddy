# Antigravity Integration Guide

This guide explains how to use the common AI rules (`.ai-rules/`) in Antigravity (Google Gemini-based coding assistant).

## Overview

Antigravity uses the `.antigravity/` directory for its custom instructions and configuration, referencing the common rules from `.ai-rules/`.

## Integration Method

### 1. Create Antigravity Configuration

Create `.antigravity/rules/instructions.md` to reference common rules:

```markdown
# Antigravity Instructions

## Common AI Rules Reference

This project follows shared AI coding rules from `.ai-rules/` for consistency across all AI assistants (Cursor, Claude Code, Antigravity, etc.).

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

See full workflow details in `.ai-rules/rules/core.md`

### 🏗️ Project Context

**Source**: `.ai-rules/rules/project.md`

#### Tech Stack

See project `package.json`.

#### Project Structure
```
src/
├── app/          # Next.js App Router
├── entities/     # Domain entities (business logic)
├── features/     # Feature-specific UI components
├── widgets/      # Composite widgets
└── shared/       # Common modules
```

See full project setup in `.ai-rules/rules/project.md`

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

See full augmented coding guide in `.ai-rules/rules/augmented-coding.md`

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
- **Design System Specialist** - Design system usage
- **Documentation Specialist** - Documentation quality
- **Code Quality Specialist** - SOLID, DRY, complexity
- **DevOps Engineer** - Docker, Datadog, deployment

See agent details in `.ai-rules/agents/README.md`

## Antigravity-Specific Features

### Task Boundaries

Antigravity supports `task_boundary` tool for tracking progress:
```python
task_boundary(
  TaskName="Implementing Feature",
  Mode="EXECUTION",
  TaskSummary="Created component with TDD",
  TaskStatus="Writing tests",
  PredictedTaskSize=10
)
```

### Artifact Management

Antigravity uses artifact files for:
- Implementation plans: `implementation_plan.md`
- Task tracking: `task.md`
- Walkthroughs: `walkthrough.md`

### Communication

- **Follow project's configured language setting**
- Use structured markdown formatting
- Provide clear, actionable feedback

## Directory Structure

```
.antigravity/
├── rules/
│   └── instructions.md  # This file - references .ai-rules
└── config.json          # Antigravity configuration (if needed)

.ai-rules/              # Common rules for all AI tools
├── rules/
│   ├── core.md          # Workflow modes
│   ├── project.md       # Project setup
│   └── augmented-coding.md  # TDD principles
├── agents/
│   └── *.json          # Specialist agents
└── adapters/
    └── antigravity.md  # This guide
```

## Usage in Antigravity

### Reference Rules Directly

When working with Antigravity, it automatically has access to:
- `.ai-rules/rules/` for workflow and coding standards
- `.ai-rules/agents/` for specialist domain knowledge
- Project-specific configuration in `.antigravity/rules/`

### Workflow Example

```
User: Build a new newsletter feature

AI: # Mode: PLAN
    ## 📋 Plan Overview
    [Following .ai-rules/rules/core.md workflow]
    [Using .ai-rules/rules/project.md tech stack]
    [Applying .ai-rules/rules/augmented-coding.md TDD principles]
    
User: ACT

AI: # Mode: ACT
    [Execute with .ai-rules/agents/frontend-developer.json guidelines]

User: EVAL

AI: # Mode: EVAL
    [Evaluate with .ai-rules/agents/code-reviewer.json framework]
```

## Benefits

- ✅ Same rules as Cursor and other AI tools (consistency)
- ✅ Leverage Antigravity's task tracking and artifacts
- ✅ Access to all specialist agent knowledge
- ✅ Easy to update: change `.ai-rules/` once, all tools benefit

## AUTO Mode

AUTO mode enables autonomous PLAN -> ACT -> EVAL cycling until quality criteria are met.

### Triggering AUTO Mode

Use the `AUTO` keyword (or localized versions) at the start of your message:

| Language | Keyword |
|----------|---------|
| English | `AUTO` |
| Korean | `자동` |
| Japanese | `自動` |
| Chinese | `自动` |
| Spanish | `AUTOMATICO` |

### Example Usage

```
User: AUTO Build a new payment system feature

AI: # Mode: AUTO (Iteration 1/3)
    ## Phase: PLAN
    [Following .ai-rules/rules/core.md workflow]

    ## Phase: ACT
    [Execute with .ai-rules guidelines]

    ## Phase: EVAL
    [Evaluate with quality criteria]

    ### Quality Status
    - Critical: 0
    - High: 0

    ✅ AUTO mode completed successfully!
```

### Workflow

1. **PLAN Phase**: Creates implementation plan with quality criteria
2. **ACT Phase**: Executes implementation following TDD workflow
3. **EVAL Phase**: Evaluates quality against exit criteria
4. **Loop/Exit**: Continues cycling until:
   - Success: `Critical = 0 AND High = 0`
   - Failure: Max iterations reached (default: 3)

### Antigravity-Specific Integration

AUTO mode works with Antigravity's task boundary tracking:

```python
task_boundary(
  TaskName="AUTO: Feature Implementation",
  Mode="AUTO_ITERATION",
  TaskSummary="Iteration 1/3 - PLAN phase completed",
  TaskStatus="Executing ACT phase",
  PredictedTaskSize=30
)
```

### Configuration

Configure in `codingbuddy.config.js`:

```javascript
module.exports = {
  auto: {
    maxIterations: 3
  }
};
```

### When to Use

- Large feature implementations requiring multiple refinement cycles
- Complex refactoring with quality verification
- Bug fixes needing comprehensive testing
- Code quality improvements with measurable criteria

## Maintenance

When updating rules:
1. Update `.ai-rules/rules/*.md` for changes affecting all AI tools
2. Update `.antigravity/rules/instructions.md` only for Antigravity-specific features
3. Common rules propagate automatically to all sessions
