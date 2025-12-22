<p align="center">
  <a href="philosophy.md">English</a> |
  <a href="ko/philosophy.md">한국어</a> |
  <a href="zh-CN/philosophy.md">中文</a> |
  <a href="ja/philosophy.md">日本語</a> |
  <a href="es/philosophy.md">Español</a>
</p>

# Philosophy

This document explains the vision, core beliefs, and design principles behind Codingbuddy.

## Vision

**One source of truth for AI coding rules across all AI assistants.**

Today's development teams use multiple AI coding tools—Cursor, Claude Code, GitHub Copilot, and more. Each tool has its own configuration format, leading to:

- Duplicated rules across multiple config files
- Inconsistent coding standards depending on which AI tool is used
- Maintenance burden when rules need to be updated

Codingbuddy solves this by providing a unified rules system that works with any AI assistant.

## Core Beliefs

### 1. AI-Agnostic Rules

Rules should be written once and work everywhere. No vendor lock-in, no tool-specific syntax in core rules. Each AI tool adapts to the common format through lightweight adapters.

### 2. Progressive Disclosure

Start simple, go deep when needed:

- **Quick Start**: Get running in 2 minutes with `npx codingbuddy init`
- **Configuration**: Customize tech stack, architecture, and conventions
- **Specialist Agents**: Access domain experts (security, performance, accessibility)
- **Full Customization**: Extend with project-specific rules

### 3. Convention Over Configuration

Sensible defaults that work for most projects:

- PLAN → ACT → EVAL workflow
- TDD-first development approach
- 80%+ test coverage target
- SOLID principles and clean code

Override only what you need to change.

### 4. Community-Driven Standards

The best practices come from real-world experience:

- Rules are based on proven patterns from production codebases
- Specialist agents encode domain expertise from practitioners
- Open source and open to contributions

## Design Principles

### Single Source of Truth

```
packages/rules/.ai-rules/           ← The authoritative source
├── rules/           ← Core rules (workflow, quality, project)
├── agents/          ← Specialist knowledge
└── adapters/        ← Tool-specific integration guides
```

All AI tool configurations reference `packages/rules/.ai-rules/`. Update once, all tools benefit.

### Separation of Concerns

| Layer | Purpose | Format |
|-------|---------|--------|
| **Rules** | What to do (workflow, quality standards) | Markdown |
| **Agents** | Who knows what (specialist expertise) | JSON |
| **Adapters** | How to integrate (tool-specific setup) | Markdown |

This separation allows:

- Rules to evolve independently of tool support
- New agents without changing core rules
- New tool support without modifying existing rules

### Extensibility Over Complexity

The system is designed to be extended, not configured:

- Add new specialist agents by creating JSON files
- Support new AI tools by writing adapter guides
- Include project-specific context without modifying core rules

Simple things should be simple. Complex things should be possible.

## The Workflow Model

Codingbuddy introduces a structured workflow for AI-assisted development:

```
PLAN → ACT → EVAL
```

### PLAN Mode (Default)

- Understand requirements
- Design implementation approach
- Identify risks and edge cases
- No code changes made

### ACT Mode

- Execute the plan
- Follow TDD: Red → Green → Refactor
- Make incremental, tested changes

### EVAL Mode

- Review implementation quality
- Identify improvements
- Suggest refactoring opportunities

This workflow prevents the common pitfall of AI assistants jumping straight into code without proper planning.

## What Codingbuddy Is Not

- **Not a code generator**: It provides rules and context, not generated code
- **Not a replacement for human judgment**: It augments, not replaces, developer decision-making
- **Not a one-size-fits-all solution**: It's designed to be customized per project

## Further Reading

- [Getting Started](./getting-started.md) - Quick setup guide
- [Supported Tools](./supported-tools.md) - AI tool integration
- [Core Rules](../packages/rules/.ai-rules/rules/core.md) - Workflow details
- [Agents System](../packages/rules/.ai-rules/agents/README.md) - Specialist agents
