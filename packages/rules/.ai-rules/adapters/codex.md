# GitHub Copilot / Codex Integration Guide

This guide explains how to use the common AI rules (`.ai-rules/`) with GitHub Copilot and Codex.

## Overview

GitHub Copilot can use custom instructions from `.github/` or `.codex/` directory.

## Integration Method

### Option 1: Using .github/copilot-instructions.md

Create `.github/copilot-instructions.md`:

```markdown
# GitHub Copilot Custom Instructions

## Common AI Rules

This project uses shared rules from `.ai-rules/` directory.

### Workflow (PLAN/ACT/EVAL)
Refer to `.ai-rules/rules/core.md` for detailed workflow guidance.

### Tech Stack & Project Structure
- See `.ai-rules/rules/project.md` for complete project setup
- Refer to project's package.json
- Layered architecture: app → widgets → features → entities → shared

### Coding Standards
- See `.ai-rules/rules/augmented-coding.md`
- TDD for core logic, test-after for UI
- SOLID principles, 90%+ test coverage
- No mocking, test real behavior

### Specialist Knowledge
- Refer to `.ai-rules/agents/*.json` for domain-specific guidance
```

### Option 2: Using .codex/ directory (Recommended)

This project includes a pre-configured `.codex/rules/system-prompt.md` file.

**Included features:**
- Common AI rules reference from `.ai-rules/`
- PLAN/ACT/EVAL workflow modes
- Keyword Invocation support
- TDD and code quality guidelines
- Specialist agents reference

**File location**: `.codex/rules/system-prompt.md`

See [docs/codex-adapter-configuration.md](../../docs/codex-adapter-configuration.md) for detailed configuration guide.

## Directory Structure

```
.codex/
└── rules/
    └── system-prompt.md    # Codex system prompt (pre-configured)

.github/
└── copilot-instructions.md  # GitHub Copilot instructions (optional)

.ai-rules/                   # Common rules for all AI tools
├── rules/
│   ├── core.md
│   ├── project.md
│   └── augmented-coding.md
├── agents/
│   └── *.json
└── adapters/
    └── codex.md             # This guide
```

## Configuration Guide

For detailed setup instructions, see:
- **Quick Start**: [docs/codex-adapter-configuration.md](../../docs/codex-adapter-configuration.md)
- **Keyword Invocation**: [docs/keyword-invocation.md](../../docs/keyword-invocation.md)

## Usage

### In GitHub Copilot Chat

```
You: Implement new feature following our TDD workflow

Copilot: [References .ai-rules/rules/augmented-coding.md]
         [Follows project structure from .ai-rules/rules/project.md]
```

### In Code Completions

Copilot will use context from:
- `.ai-rules/rules/project.md` for naming conventions
- `.ai-rules/rules/augmented-coding.md` for code quality patterns
- Existing codebase structure

## GitHub Copilot Workspace Integration

When using Copilot Workspace:
1. It automatically reads `.github/copilot-instructions.md`
2. Can reference `.ai-rules/` files for detailed context
3. Applies rules across all generated code

## Benefits

- ✅ Better code suggestions aligned with project standards
- ✅ Consistent with other AI tools (Cursor, Claude, etc.)
- ✅ Leverages GitHub's integration
- ✅ Easy to maintain

## Limitations

- GitHub Copilot has shorter context compared to chat-based tools
- Instructions must be concise
- Best used as reference + code completion, not full workflow execution

## Maintenance

1. Update `.ai-rules/rules/*.md` for universal rule changes
2. Keep `.github/copilot-instructions.md` concise (Copilot's context limit)
3. Link to detailed rules in `.ai-rules/` rather than duplicating
