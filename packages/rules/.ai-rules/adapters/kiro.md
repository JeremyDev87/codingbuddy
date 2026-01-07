# Kiro Integration Guide

This guide explains how to use the common AI rules (`.ai-rules/`) with Kiro.

## Overview

Kiro uses the `.kiro/` directory for custom guidelines and configuration.

## Integration Method

### Create Kiro Configuration

Create `.kiro/rules/guidelines.md`:

```markdown
# Kiro Guidelines

## Common AI Rules

This project uses shared coding rules from `.ai-rules/` for consistency across all AI coding assistants.

### Workflow Reference

See `.ai-rules/rules/core.md` for:
- **PLAN mode**: Create implementation plans with TDD approach
- **ACT mode**: Execute changes following quality standards
- **EVAL mode**: Evaluate code quality and suggest improvements

### Project Context

See `.ai-rules/rules/project.md` for:
- **Tech Stack**: See project package.json
- **Architecture**: Layered structure (app → widgets → features → entities → shared)
- **Conventions**: File naming, import/export rules, pure/impure function separation

### Coding Principles

See `.ai-rules/rules/augmented-coding.md` for:
- **TDD Cycle**: Red (failing test) → Green (minimal code) → Refactor
- **Quality Standards**: SOLID principles, DRY, code complexity management
- **Testing**: 90%+ coverage goal, no mocking, real behavior testing
- **Commit Discipline**: Separate structural and behavioral changes

### Specialist Knowledge

See `.ai-rules/agents/` for domain expertise:
- Frontend Development (React/Next.js, TDD, design system)
- Code Review (quality evaluation, architecture analysis)
- Security (OAuth 2.0, JWT, XSS/CSRF protection)
- Performance (bundle optimization, rendering)
- Accessibility (WCAG 2.1 AA compliance)
- And more...

## Kiro-Specific Features

[Add Kiro-specific customizations here]

### Communication
- Follow project's configured language setting
- Use clear, structured markdown formatting
- Provide actionable, specific feedback
```

## Directory Structure

```
.kiro/
├── rules/
│   └── guidelines.md  # References .ai-rules
└── config.json        # Kiro configuration (optional)

.ai-rules/
├── rules/
│   ├── core.md
│   ├── project.md
│   └── augmented-coding.md
├── agents/
│   └── *.json
└── adapters/
    └── kiro.md  # This guide
```

## Usage

### In Kiro Session

```
User: Build a new component

Kiro: # Mode: PLAN
      [Follows .ai-rules/rules/core.md workflow]
      [References .ai-rules/rules/project.md for structure]
      [Applies .ai-rules/rules/augmented-coding.md TDD]

User: ACT

Kiro: # Mode: ACT
      [Executes with quality standards from .ai-rules]
```

### Code Generation

Kiro will generate code following:
- Project structure from `.ai-rules/rules/project.md`
- Code quality patterns from `.ai-rules/rules/augmented-coding.md`
- Specialist knowledge from `.ai-rules/agents/*.json`

## Benefits

- ✅ Consistent standards across all AI tools (Cursor, Claude, Antigravity, Q, etc.)
- ✅ Well-defined workflow and quality expectations
- ✅ Access to specialist domain knowledge
- ✅ Easy maintenance: update `.ai-rules/` once, all tools benefit

## Kiro-Specific Advantages

[Document Kiro's unique capabilities here and how they complement common rules]

## Maintenance

1. Update `.ai-rules/rules/*.md` for changes affecting all AI tools
2. Update `.kiro/rules/guidelines.md` only for Kiro-specific features
3. Common rules propagate automatically to all Kiro sessions

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
User: AUTO 새로운 컴포넌트 구현해줘

Kiro: # Mode: AUTO (Iteration 1/3)
      ## Phase: PLAN
      [Follows .ai-rules/rules/core.md workflow]

      ## Phase: ACT
      [Executes with quality standards from .ai-rules]

      ## Phase: EVAL
      [Evaluates against quality criteria]

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

## Getting Started

1. Ensure `.ai-rules/` directory exists with all common rules
2. Create `.kiro/rules/guidelines.md` with content above
3. Start a Kiro session - it will automatically reference common rules
4. Use PLAN/ACT/EVAL/AUTO workflow as defined in `.ai-rules/rules/core.md`
