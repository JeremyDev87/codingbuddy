# Codex Adapter Configuration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create actual configuration files for Codex (GitHub Copilot) to achieve the same level of MCP integration as Cursor/Claude

**Architecture:** Include common rules reference and Keyword Invocation settings in `.codex/rules/system-prompt.md` file. Update `packages/rules/.ai-rules/adapters/codex.md` guide document. Document setup method in `docs/codex-adapter-configuration.md`.

**Tech Stack:** Markdown, GitHub Copilot/Codex CLI, MCP Server

---

## Task 1: Create .codex/rules/system-prompt.md

**Files:**
- Create: `.codex/rules/system-prompt.md`

**Step 1: Verify directory**

Run: `ls -la .codex/rules/`
Expected: Empty directory confirmed

**Step 2: Create system-prompt.md file**

```markdown
# Codex System Prompt

This project uses shared AI coding rules from `packages/rules/.ai-rules/` directory for consistency across all AI assistants (Cursor, Claude Code, Antigravity, Codex, Q, Kiro).

## Core Workflow Rules

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

## Project Setup

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

## Augmented Coding Principles

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

## Specialist Agents

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

## Keyword Invocation

When user prompt starts with `PLAN`, `ACT`, or `EVAL`:
1. Call `parse_mode` MCP tool with the full prompt
2. Follow returned `instructions` for the detected mode
3. Use returned `rules` as context for the task
4. If `warnings` exist, inform the user

Example: `PLAN design auth feature` → call parse_mode → work in PLAN mode

---

## Communication

- **Always respond in Korean**
- User frequently modifies code directly, so **always read code and refresh information** instead of relying on memory
- **Start by understanding current code state** for every question

---

## Full Documentation

For comprehensive guides:
- **Core Rules**: [packages/rules/.ai-rules/rules/core.md](../../packages/rules/.ai-rules/rules/core.md)
- **Project Setup**: [packages/rules/.ai-rules/rules/project.md](../../packages/rules/.ai-rules/rules/project.md)
- **Augmented Coding**: [packages/rules/.ai-rules/rules/augmented-coding.md](../../packages/rules/.ai-rules/rules/augmented-coding.md)
- **Agents System**: [packages/rules/.ai-rules/agents/README.md](../../packages/rules/.ai-rules/agents/README.md)
- **Integration Guide**: [packages/rules/.ai-rules/adapters/codex.md](../../packages/rules/.ai-rules/adapters/codex.md)

---

**Note**: This file references common AI rules from `packages/rules/.ai-rules/` directory. All AI assistants (Cursor, Claude Code, Antigravity, Codex, Q, Kiro) share the same rules for consistency.
```

**Step 3: Verify file creation**

Run: `cat .codex/rules/system-prompt.md | head -20`
Expected: File content output

**Step 4: Commit**

```bash
git add .codex/rules/system-prompt.md
git commit -m "feat(codex): add system-prompt.md configuration file

- Add common AI rules reference
- Include PLAN/ACT/EVAL workflow modes
- Add keyword invocation instructions
- Match structure with Cursor/Claude adapters"
```

---

## Task 2: Write docs/codex-adapter-configuration.md

**Files:**
- Modify: `docs/codex-adapter-configuration.md` (currently empty)

**Step 1: Check current file state**

Run: `cat docs/codex-adapter-configuration.md`
Expected: Empty file or minimal content

**Step 2: Write document**

```markdown
# Codex Adapter Configuration Guide

This guide explains how to use the Codebuddy MCP server in GitHub Copilot/Codex CLI environment.

## Overview

This project uses common AI coding rules from `packages/rules/.ai-rules/` directory. Follow the setup below to leverage these rules in Codex environment.

## Prerequisites

- GitHub Copilot or Codex CLI installed
- MCP server runtime environment

## Configuration Files

### 1. System Prompt (Required)

**File location**: `.codex/rules/system-prompt.md`

This file provides the context needed for Codex to understand project rules:

- Common AI rules reference (`packages/rules/.ai-rules/`)
- PLAN/ACT/EVAL workflow modes
- Keyword Invocation setup
- TDD and code quality guidelines

### 2. MCP Server Connection (Optional)

Using MCP server enables additional features:

```json
{
  "mcpServers": {
    "codebuddy": {
      "command": "npx",
      "args": ["codebuddy-mcp-server"]
    }
  }
}
```

## Available MCP Tools

Tools available when connected to MCP server:

| Tool | Description |
|------|-------------|
| `search_rules` | Search rules and guidelines |
| `get_agent_details` | Get specific AI agent information |
| `parse_mode` | Parse PLAN/ACT/EVAL keywords and return mode-specific rules |

## Keyword Invocation

When a prompt starts with specific keywords, it automatically works in that mode:

| Keyword | Mode | Description |
|---------|------|-------------|
| `PLAN` | Planning Mode | Task planning and design phase |
| `ACT` | Action Mode | Actual task execution phase |
| `EVAL` | Evaluation Mode | Result review and evaluation phase |

### Usage Examples

```
PLAN design user authentication feature
```

```
ACT implement login API endpoint
```

```
EVAL review security of implemented auth logic
```

## Directory Structure

```
.codex/
└── rules/
    └── system-prompt.md    # Codex system prompt (required)

packages/rules/.ai-rules/                  # Common AI rules (shared across all AI tools)
├── rules/
│   ├── core.md             # Core workflow
│   ├── project.md          # Project setup
│   └── augmented-coding.md # Coding guidelines
├── agents/
│   └── *.json              # Specialist agent definitions
└── adapters/
    └── codex.md            # Codex integration guide
```

## Comparison with Other Adapters

| Feature | Cursor | Claude Code | Codex |
|---------|--------|-------------|-------|
| Config Location | `.cursor/rules/` | `.claude/rules/` | `.codex/rules/` |
| Main Config | `imports.mdc` | `custom-instructions.md` | `system-prompt.md` |
| MCP Support | ✅ | ✅ | ✅ |
| Keyword Invocation | ✅ | ✅ | ✅ |
| Common Rules | `packages/rules/.ai-rules/` | `packages/rules/.ai-rules/` | `packages/rules/.ai-rules/` |

## Troubleshooting

### MCP Server Connection Issues

1. Verify MCP server is running
2. Check configuration file path
3. Review logs for error messages

### Keyword Not Recognized

- Keywords are case-insensitive (`PLAN`, `plan`, `Plan` all work)
- Keyword must be followed by a space and prompt content

## Related Documentation

- [Core Rules](../packages/rules/.ai-rules/rules/core.md)
- [Project Setup](../packages/rules/.ai-rules/rules/project.md)
- [Augmented Coding](../packages/rules/.ai-rules/rules/augmented-coding.md)
- [Codex Integration Guide](../packages/rules/.ai-rules/adapters/codex.md)
- [Keyword Invocation](./keyword-invocation.md)
```

**Step 3: Verify file creation**

Run: `cat docs/codex-adapter-configuration.md | head -30`
Expected: Document content output

**Step 4: Commit**

```bash
git add docs/codex-adapter-configuration.md
git commit -m "docs: add Codex adapter configuration guide

- Document .codex/rules/ structure
- Explain MCP server connection
- List available tools (search_rules, get_agent_details, parse_mode)
- Add keyword invocation examples
- Compare with Cursor/Claude adapters"
```

---

## Task 3: Update packages/rules/.ai-rules/adapters/codex.md

**Files:**
- Modify: `packages/rules/.ai-rules/adapters/codex.md:40-77`

**Step 1: Check current file**

Run: `cat packages/rules/.ai-rules/adapters/codex.md`
Expected: Existing guide document confirmed

**Step 2: Update - Change Option 2 section to actual implementation**

Replace existing "### Option 2: Using .codex/ directory" section (lines 40-56) with:

```markdown
### Option 2: Using .codex/ directory (Recommended)

This project includes a pre-configured `.codex/rules/system-prompt.md` file.

**Included features:**
- Common AI rules reference from `packages/rules/.ai-rules/`
- PLAN/ACT/EVAL workflow modes
- Keyword Invocation support
- TDD and code quality guidelines
- Specialist agents reference

**File location**: `.codex/rules/system-prompt.md`

See [docs/codex-adapter-configuration.md](../../docs/codex-adapter-configuration.md) for detailed configuration guide.
```

**Step 3: Update Directory Structure section**

Replace existing Directory Structure section (lines 57-77) with:

```markdown
## Directory Structure

```
.codex/
└── rules/
    └── system-prompt.md    # Codex system prompt (pre-configured)

.github/
└── copilot-instructions.md  # GitHub Copilot instructions (optional)

packages/rules/.ai-rules/                   # Common rules for all AI tools
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
```

**Step 4: Verify file modification**

Run: `cat packages/rules/.ai-rules/adapters/codex.md | grep -A 5 "Option 2"`
Expected: Updated content confirmed

**Step 5: Commit**

```bash
git add packages/rules/.ai-rules/adapters/codex.md
git commit -m "docs(codex): update adapter guide with actual configuration

- Mark .codex/ option as recommended
- Reference pre-configured system-prompt.md
- Link to detailed configuration guide
- Update directory structure"
```

---

## Task 4: Final Verification

**Step 1: Verify all files exist**

Run:
```bash
ls -la .codex/rules/system-prompt.md
ls -la docs/codex-adapter-configuration.md
ls -la packages/rules/.ai-rules/adapters/codex.md
```
Expected: All files exist

**Step 2: Verify link validity**

Run:
```bash
# Check files referenced from system-prompt.md
ls -la packages/rules/.ai-rules/rules/core.md
ls -la packages/rules/.ai-rules/rules/project.md
ls -la packages/rules/.ai-rules/rules/augmented-coding.md
ls -la packages/rules/.ai-rules/agents/README.md
```
Expected: All referenced files exist

**Step 3: Check git status**

Run: `git status`
Expected: Only committed changes shown or clean

---

## Summary

| Task | Files | Description |
|------|-------|-------------|
| Task 1 | `.codex/rules/system-prompt.md` | Create Codex system prompt |
| Task 2 | `docs/codex-adapter-configuration.md` | Write configuration guide document |
| Task 3 | `packages/rules/.ai-rules/adapters/codex.md` | Update adapter guide |
| Task 4 | - | Final verification |

**Total commits**: 3
**New files**: 1 (system-prompt.md)
**Modified files**: 2 (codex-adapter-configuration.md, codex.md)
