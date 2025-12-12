# Cursor Integration Guide

This guide explains how to use the common AI rules (`.ai-rules/`) in Cursor.

## Overview

Cursor continues to use its native `.cursor/` directory structure while referencing the common rules from `.ai-rules/`.

## Integration Method

### 1. Reference Common Rules

Create `.cursor/rules/imports.mdc` to reference common rules:

```markdown
---
description: Common AI Rules Import
globs:
alwaysApply: true
---

# Common Rules

This project uses shared rules from `.ai-rules/` directory for all AI assistants.

## 📚 Core Rules
See [../../.ai-rules/rules/core.md](../../.ai-rules/rules/core.md) for:
- PLAN/ACT/EVAL workflow modes
- Agent activation rules
- Communication guidelines

## 🏗️ Project Setup
See [../../.ai-rules/rules/project.md](../../.ai-rules/rules/project.md) for:
- Tech stack and dependencies
- Project structure and architecture
- Development rules and conventions
- Domain knowledge and business context

## 🎯 Augmented Coding Principles
See [../../.ai-rules/rules/augmented-coding.md](../../.ai-rules/rules/augmented-coding.md) for:
- TDD cycle (Red → Green → Refactor)
- Code quality standards (SOLID, DRY)
- Testing best practices
- Commit discipline

## 🤖 Specialist Agents
See [../../.ai-rules/agents/README.md](../../.ai-rules/agents/README.md) for available specialist agents:
- Frontend Developer, Code Reviewer
- Architecture, Test Strategy, Performance, Security
- Accessibility, SEO, Design System, Documentation
- Code Quality, DevOps Engineer
```

### 2. Keep Cursor-Specific Features

Maintain `.cursor/rules/cursor-specific.mdc` for Cursor-only features:

```markdown
---
description: Cursor-specific configurations
globs:
alwaysApply: true
---

# Cursor-Specific Features

## File Globbing

[Add Cursor-specific glob patterns here]

## Agent Tool Integration

[Add Cursor-specific todo_write tool usage]
```

## Current Structure

```
.cursor/
├── agents/              # Keep for Cursor compatibility
├── rules/
│   ├── core.mdc        # Keep existing (can add reference to .ai-rules)
│   ├── project.mdc     # Keep existing (can add reference to .ai-rules)
│   ├── augmented-coding.mdc  # Keep existing
│   ├── imports.mdc     # NEW: References to .ai-rules
│   └── cursor-specific.mdc   # NEW: Cursor-only features
└── config.json         # Cursor configuration

.ai-rules/              # Common rules for all AI tools
├── rules/
│   ├── core.md
│   ├── project.md
│   └── augmented-coding.md
├── agents/
│   └── *.json
└── adapters/
    └── cursor.md (this file)
```

## Usage

### In Cursor Chat

Reference rules directly:
```
@.ai-rules/rules/core.md
@.ai-rules/agents/frontend-developer.json

Create a new feature following our common workflow
```

### In Cursor Composer

The `.cursor/rules/imports.mdc` with `alwaysApply: true` will automatically apply common rules to all Composer sessions.

## Benefits

- ✅ Seamless integration with existing Cursor setup
- ✅ Access to common rules shared across all AI tools
- ✅ Cursor-specific features (globs, alwaysApply) still work
- ✅ Easy to update: change `.ai-rules/` once, all tools benefit

## Maintenance

When updating rules:
1. Update `.ai-rules/rules/*.md` for changes affecting all AI tools
2. Update `.cursor/rules/*.mdc` only for Cursor-specific changes
3. Keep both in sync for best experience
