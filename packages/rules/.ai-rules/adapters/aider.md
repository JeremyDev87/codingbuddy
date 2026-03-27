# Aider Integration Guide

Guide for using codingbuddy with Aider (CLI AI pair programming tool).

## Overview

codingbuddy integrates with Aider through:

1. **AGENTS.md** - Industry standard format compatible with all AI tools
2. **CONVENTIONS.md** - Aider's native convention file format
3. **`.aider.conf.yml`** - Aider configuration file

## Two Usage Contexts

### End Users (Your Project)

End users provide codingbuddy rules to Aider via read-only convention files:

```bash
# Load codingbuddy rules as read-only context
aider --read CONVENTIONS.md
```

Or configure in `.aider.conf.yml`:

```yaml
read:
  - CONVENTIONS.md
```

### Monorepo Contributors

Contributors to the codingbuddy repository can reference `.ai-rules/` files directly:

```bash
# Load multiple rule files as read-only context
aider --read packages/rules/.ai-rules/rules/core.md \
      --read packages/rules/.ai-rules/rules/augmented-coding.md \
      --read packages/rules/.ai-rules/rules/project.md \
      --read AGENTS.md
```

Or in `.aider.conf.yml`:

```yaml
read:
  - packages/rules/.ai-rules/rules/core.md
  - packages/rules/.ai-rules/rules/augmented-coding.md
  - packages/rules/.ai-rules/rules/project.md
  - AGENTS.md
```

## DRY Principle

**Single Source of Truth**: `packages/rules/.ai-rules/`

- All Agent definitions, rules, skills managed only in `.ai-rules/`
- `CONVENTIONS.md` acts as a **pointer or summary** referencing `.ai-rules/`
- No duplication; reference source files via `--read`

## Aider Configuration System

### `.aider.conf.yml`

Aider's primary configuration file using YAML format. Loaded from these locations (in order, later files take priority):

1. **Home directory** (`~/.aider.conf.yml`) - Global personal settings
2. **Git root** (`.aider.conf.yml`) - Project-level settings
3. **Current directory** (`.aider.conf.yml`) - Directory-specific settings

### Configuration Example

```yaml
# .aider.conf.yml - codingbuddy integration

# Load codingbuddy rules as read-only context
read:
  - CONVENTIONS.md
  - AGENTS.md

# Recommended settings for codingbuddy workflow
auto-commits: true
suggest-shell-commands: true
```

### List Format Options

Lists can be specified as bullet lists or inline arrays:

```yaml
# Bullet list
read:
  - CONVENTIONS.md
  - AGENTS.md

# Inline array
read: [CONVENTIONS.md, AGENTS.md]
```

### CONVENTIONS.md

Aider's native mechanism for specifying coding guidelines. Create a `CONVENTIONS.md` in your project root:

```markdown
# Project Conventions

## Workflow
Follow PLAN/ACT/EVAL workflow modes.
- Start in PLAN mode for analysis and planning
- Move to ACT mode for implementation (TDD: Red -> Green -> Refactor)
- Use EVAL mode for code quality evaluation

## Code Quality
- TypeScript strict mode (no `any`)
- 90%+ test coverage goal
- SOLID principles
- No mocking - test real behavior

## TDD Cycle
1. Write a failing test (Red)
2. Implement minimum code to pass (Green)
3. Refactor for clarity (Refactor)

## Project Structure
See `packages/rules/.ai-rules/rules/project.md` for layered architecture details.

## Specialist Agents
See `packages/rules/.ai-rules/agents/README.md` for available specialists.
```

Load it with:

```bash
aider --read CONVENTIONS.md
```

> **Tip:** Use `--read` (read-only) instead of `--file` (editable) for convention files. This prevents accidental modifications and enables prompt caching.

### `.aiderignore`

Aider supports `.aiderignore` for excluding files from its context, using `.gitignore`-style patterns:

```gitignore
# .aiderignore
node_modules/
dist/
*.min.js
*.lock
```

Place in the git root directory. For custom ignore files, use `--aiderignore <filename>`.

## Integration Methods

### Method 1: CONVENTIONS.md (Recommended for End Users)

Create a `CONVENTIONS.md` summarizing your project's coding standards, then load it as read-only context:

```bash
aider --read CONVENTIONS.md
```

### Method 2: Direct `.ai-rules/` References (Recommended for Contributors)

Load specific rule files directly for comprehensive coverage:

```yaml
# .aider.conf.yml
read:
  - packages/rules/.ai-rules/rules/core.md
  - packages/rules/.ai-rules/rules/augmented-coding.md
  - packages/rules/.ai-rules/rules/project.md
  - AGENTS.md
```

### Method 3: Combined Approach

Use `CONVENTIONS.md` for quick reference and load detailed rules separately:

```yaml
# .aider.conf.yml
read:
  - CONVENTIONS.md
  - packages/rules/.ai-rules/rules/core.md
```

## Directory Structure

```
project/
├── .aider.conf.yml              # Aider configuration
├── .aiderignore                 # File exclusion patterns
├── CONVENTIONS.md               # Coding conventions (for Aider)
├── AGENTS.md                    # Cross-platform agent definitions
├── packages/rules/.ai-rules/
│   ├── rules/
│   │   ├── core.md
│   │   ├── project.md
│   │   └── augmented-coding.md
│   ├── agents/
│   │   └── *.json
│   └── adapters/
│       └── aider.md             # This guide
└── ~/.aider.conf.yml            # Global user settings
```

## Usage

### Basic Workflow

```bash
# Start Aider with codingbuddy conventions
aider --read CONVENTIONS.md

# In the Aider chat, reference workflow modes
> Please follow PLAN mode to design this feature first

# Add specific files for editing
> /add src/auth/login.ts

# Add read-only context
> /read packages/rules/.ai-rules/agents/security-specialist.json
```

### In-Chat Commands

| Command | Purpose |
|---------|---------|
| `/add <file>` | Add file for editing |
| `/read <file>` | Add file as read-only context |
| `/drop <file>` | Remove file from context |
| `/ask <question>` | Ask without making changes |
| `/architect <request>` | Use architect mode for planning |

### Architect Mode

Aider's `/architect` command maps naturally to codingbuddy's PLAN mode:

```bash
# PLAN mode equivalent
> /architect Design a user authentication system with JWT

# ACT mode equivalent (regular chat)
> Implement the authentication system following TDD
```

### Using Specialist Context

Load specialist agent definitions as read-only context for focused reviews:

```bash
# Security review
> /read packages/rules/.ai-rules/agents/security-specialist.json
> Review the auth implementation from a security perspective

# Performance review
> /read packages/rules/.ai-rules/agents/performance-specialist.json
> Analyze performance bottlenecks in this module
```

## Community Conventions

Aider maintains a community conventions repository at [github.com/Aider-AI/conventions](https://github.com/Aider-AI/conventions) with pre-built convention files for various tech stacks. These can complement codingbuddy rules.

## MCP Support

> **Note:** As of early 2026, Aider does not natively support MCP servers. Rules integration relies on the `--read` flag and `CONVENTIONS.md` approach described above. If MCP support is added in the future, the same codingbuddy MCP server configuration used by other tools can be applied.

### Workaround: Using Aider with MCP-Provided Rules

Export rules from the MCP server to files, then load them in Aider:

```bash
# Export rules content to a file (manual step)
# Then load in Aider
aider --read exported-rules.md
```

## Skills

Without MCP support, Aider accesses codingbuddy skills through file references:

### Using Skills

```bash
# Load a skill as read-only context
> /read packages/rules/.ai-rules/skills/systematic-debugging/SKILL.md
> Debug this authentication failure using the systematic debugging approach

> /read packages/rules/.ai-rules/skills/test-driven-development/SKILL.md
> Implement this feature following TDD workflow
```

### Available Skills

| Skill | File |
|-------|------|
| Systematic Debugging | `skills/systematic-debugging/SKILL.md` |
| Test-Driven Development | `skills/test-driven-development/SKILL.md` |
| Brainstorming | `skills/brainstorming/SKILL.md` |
| Writing Plans | `skills/writing-plans/SKILL.md` |
| Executing Plans | `skills/executing-plans/SKILL.md` |
| Frontend Design | `skills/frontend-design/SKILL.md` |

## Known Limitations

Aider is a CLI tool with a different architecture than IDE-based AI assistants:

| Feature | Status | Workaround |
|---------|--------|------------|
| **MCP Server support** | ❌ Not available | Use `--read` flag with convention/rule files |
| **Mode keywords (PLAN/ACT/EVAL/AUTO)** | ❌ Not native | Manually instruct Aider to follow mode workflows |
| **Specialist agent dispatch** | ❌ Not available | Load specialist JSON as read-only context with `/read` |
| **Background subagents** | ❌ Not available | Sequential analysis only |
| **Session hooks** | ❌ Not available | Rely on `.aider.conf.yml` for always-on settings |
| **Context document persistence** | ❌ Not available | Manually manage context between sessions |
| **Skills auto-detection** | ❌ Not available | Manually load skills via `/read` |
| **Autonomous loop (AUTO mode)** | ❌ Not available | Use Aider's interactive chat loop manually |

### Aider Strengths

Despite these limitations, Aider offers unique advantages:

- **CLI-native**: Works in any terminal, SSH sessions, CI/CD pipelines
- **Git-aware**: Automatic commits, diff-based editing
- **Repo-map**: Automatic codebase understanding via tree-sitter
- **Multi-model**: Supports OpenAI, Anthropic, local models, and more
- **Prompt caching**: Read-only files are cached for efficient token usage
- **Architect mode**: Built-in plan-then-implement workflow

## AGENTS.md

Industry standard format compatible with all AI tools (Aider, Cursor, Claude Code, Codex, etc.):

```markdown
# AGENTS.md

This project uses codingbuddy MCP server to manage AI Agents.

## Quick Start
...
```

See `AGENTS.md` in project root for details. Aider can read this file:

```bash
aider --read AGENTS.md
```

## Verification Status

> Documentation based on Aider public documentation and community resources. Runtime verification has been performed for core features.

| Pattern | Status | Notes |
|---------|--------|-------|
| `CONVENTIONS.md` loading via `--read` | ✅ Verified | Documented in official Aider docs |
| `.aider.conf.yml` configuration | ✅ Verified | YAML format with multi-location loading |
| `.aiderignore` file support | ✅ Verified | `.gitignore`-style patterns |
| Read-only file context (`/read`) | ✅ Verified | Files cached with prompt caching enabled |
| Architect mode for planning | ✅ Verified | Maps to PLAN mode workflow |
| MCP server integration | ❌ Not supported | No native MCP support as of early 2026 |
| AGENTS.md compatibility | ✅ Verified | Standard markdown, loadable via `--read` |
| Community conventions repo | ✅ Verified | Available at github.com/Aider-AI/conventions |

## Reference

- [Aider Documentation](https://aider.chat/docs/)
- [Aider Conventions Guide](https://aider.chat/docs/usage/conventions.html)
- [Aider Configuration](https://aider.chat/docs/config/aider_conf.html)
- [Aider Options Reference](https://aider.chat/docs/config/options.html)
- [Aider In-Chat Commands](https://aider.chat/docs/usage/commands.html)
- [Community Conventions Repository](https://github.com/Aider-AI/conventions)
- [AGENTS.md Official Spec](https://agents.md)
- [codingbuddy Documentation](../../docs/)
