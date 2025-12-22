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
- **Tech Stack**: 프로젝트의 package.json 참조
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
- Always respond in Korean (한국어)
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
User: 새로운 컴포넌트 구현해줘

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

## Getting Started

1. Ensure `.ai-rules/` directory exists with all common rules
2. Create `.kiro/rules/guidelines.md` with content above
3. Start a Kiro session - it will automatically reference common rules
4. Use PLAN/ACT/EVAL workflow as defined in `.ai-rules/rules/core.md`
