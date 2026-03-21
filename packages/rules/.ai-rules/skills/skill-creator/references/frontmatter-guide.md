# Skill Frontmatter v2.0 Field Guide

Reference for YAML frontmatter fields in skill SKILL.md files.

## Table of Contents

- [Overview](#overview)
- [Field Reference Table](#field-reference-table)
- [Field Details](#field-details)
  - [name](#name)
  - [description](#description)
  - [argument-hint](#argument-hint)
  - [allowed-tools](#allowed-tools)
  - [model](#model)
  - [effort](#effort)
  - [context](#context)
  - [agent](#agent)
  - [disable-model-invocation](#disable-model-invocation)
  - [user-invocable](#user-invocable)
  - [hooks](#hooks)
- [Decision Tree](#decision-tree)
- [Description Writing Guide](#description-writing-guide)
- [Complete Examples](#complete-examples)

---

## Overview

Every skill includes YAML frontmatter in its `SKILL.md` file. The frontmatter defines the skill's metadata and is used by the codingbuddy MCP server and each AI tool to search, load, and execute skills.

**Frontmatter structure:**
```yaml
---
name: skill-name
description: Use when [trigger condition]. [What it does].
# ... additional fields (optional)
---

# Skill Content (Markdown)
...
```

**v2.0 changes:**
- Added `model` field: Specifies recommended AI model
- Added `effort` field: Controls reasoning effort level (`low/medium/high/max`)
- Added `hooks` field: Event-driven automatic execution (object type)

---

## Field Reference Table

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | `string` | **Yes** | Directory name | Slash command name (lowercase, digits, hyphens, max 64 chars) |
| `description` | `string` | **Yes** | First paragraph | Purpose + auto-trigger condition (200 chars recommended, max 1024 chars) |
| `argument-hint` | `string` | No | — | Autocomplete argument hint |
| `allowed-tools` | `string` | No | all | List of available tools |
| `model` | `string` | No | Session default | Model override |
| `effort` | `string` | No | Session default | `low` / `medium` / `high` / `max` |
| `context` | `string` | No | inline | `fork`: Isolated sub-agent |
| `agent` | `string` | No | general-purpose | Sub-agent type |
| `disable-model-invocation` | `boolean` | No | `false` | Block AI auto-invocation |
| `user-invocable` | `boolean` | No | `true` | Whether to show in `/` menu |
| `hooks` | `object` | No | — | Skill lifecycle hooks |

---

## Field Details

### name

The skill's unique identifier. Must match the directory name and is used as a slash command (`/name`).

| Property | Value |
|----------|-------|
| Type | `string` |
| Required | **Yes** |
| Default | Directory name |
| Pattern | `^[a-z][a-z0-9-]*$` |
| Max Length | 64 chars |

**Rules:**
- Use only lowercase letters, digits, and hyphens
- Must be identical to the skill directory name
- 2-4 words recommended

**Examples:**
```yaml
name: test-driven-development
name: security-audit
name: pr-all-in-one
```

---

### description

Describes the skill's purpose and auto-trigger conditions. This is the key matching field for `recommend_skills` search.

| Property | Value |
|----------|-------|
| Type | `string` |
| Required | **Yes** |
| Default | First paragraph of SKILL.md |
| Recommended Length | 200 chars |
| Max Length | 1024 chars |

**Rules:**
- Include specific trigger phrases ("Use when...", "Use this skill when the user asks to...")
- Use third-person narration ("Explains code..." not "Explain code...")
- 200 chars recommended, max 1024 chars

**Examples:**
```yaml
# Good - Clear trigger condition, third-person narration
description: Use when implementing any feature or bugfix, before writing implementation code

# Good - Multiple situations + result description
description: Use before deploying to staging or production. Covers pre-deploy validation, environment verification, rollback planning, health checks, and post-deploy monitoring.

# Good - Third-person action description
description: Explains code structure, logic flow, and design decisions with context-appropriate detail.

# Bad - Too vague
description: A skill for testing

# Bad - First-person/imperative (also avoid second-person)
description: Explain the code to me

# Bad - Exceeds 1024 chars
description: This comprehensive skill provides detailed guidance for implementing test-driven development...
```

---

### argument-hint

Guides positional arguments that users can pass when invoking the skill. Displayed in the autocomplete UI.

| Property | Value |
|----------|-------|
| Type | `string` |
| Required | No |
| Format | `[arg1] [arg2]` (argument names wrapped in brackets) |

**Rules:**
- Wrap each argument in brackets `[]`
- Separate multiple arguments with spaces
- Use kebab-case for argument names
- All arguments are optional

**Examples:**
```yaml
argument-hint: [file-or-symbol]
argument-hint: [pr-url-or-number]
argument-hint: [target-branch] [issue-id]
argument-hint: [scope-or-path]
argument-hint: [capability-name]
argument-hint: [target-module-or-path]
```

**Usage pattern:**
```bash
# User invocation
/code-explanation src/auth/login.ts
/pr-review 123
/pr-all-in-one main 741
```

---

### allowed-tools

Restricts which tools can be used during skill execution. If not specified, all tools are available.

| Property | Value |
|----------|-------|
| Type | `string` |
| Required | No |
| Default | All tools allowed |
| Format | Comma+space separated tool list |

**Available tools:**
- `Read` — Read files
- `Write` — Write files
- `Edit` — Edit files
- `Grep` — Content search
- `Glob` — File pattern search
- `Bash` — Execute shell commands
- `Agent` — Execute sub-agents

**Bash filtering (Claude Code only):**
```yaml
# Allow all Bash
allowed-tools: Read, Grep, Glob, Bash

# Allow only git commands
allowed-tools: Read, Grep, Glob, Bash(git:*)

# Allow only git and gh commands
allowed-tools: Read, Grep, Glob, Bash(gh:*, git:*)
```

> **Note:** Bash filters (`Bash(git:*)`) are only supported in Claude Code. Other tools recognize only basic tool names.

**Example patterns:**

| Skill type | Recommended allowed-tools |
|------------|--------------------------|
| Read-only analysis | `Read, Grep, Glob` |
| Code analysis + git | `Read, Grep, Glob, Bash(git:*)` |
| PR review | `Read, Grep, Glob, Bash(gh:*, git:*)` |
| Performance analysis | `Read, Grep, Glob, Bash` |
| Refactoring | `Read, Write, Edit, Grep, Glob, Bash` |

---

### model

Specifies the recommended AI model for skill execution. Added in v2.0.

| Property | Value |
|----------|-------|
| Type | `string` |
| Required | No |
| Default | Session default model |

**Available values:**
- `opus` — Skills requiring complex reasoning
- `sonnet` — General coding skills
- `haiku` — Simple classification/transformation skills

**When to use:**
- Skills requiring high reasoning ability: `opus`
- Skills where fast response is important: `haiku`
- Most skills: Leave unspecified (uses session default)

**Examples:**
```yaml
model: opus    # Complex architecture analysis
model: sonnet  # General code writing
model: haiku   # Simple code explanation
```

> **Compatibility:** Auto-switching only in Claude Code. Used as a hint only in other tools.

---

### effort

Controls the AI model's reasoning effort level. Added in v2.0.

| Property | Value |
|----------|-------|
| Type | `string` |
| Required | No |
| Default | Session default |
| Values | `low`, `medium`, `high`, `max` |

**Meaning of each level:**
- `low` — Quick classification, simple transformations. Minimal reasoning
- `medium` — General coding tasks (default)
- `high` — Deep analysis, complex problem solving
- `max` — Maximum reasoning. Security audits, architecture design, and other most demanding tasks

**Examples:**
```yaml
effort: max    # Security audit - maximum reasoning
effort: high   # Architecture analysis - deep analysis
effort: low    # Code formatting - fast processing
```

> **Compatibility:** Auto-applied only in Claude Code. Ignored in other tools.

---

### context

Specifies the skill's execution context. Used for skills that need to run in an isolated environment.

| Property | Value |
|----------|-------|
| Type | `string` |
| Required | No |
| Default | `inline` (runs in main context) |
| Values | `fork` |

**What `fork` means:**
- Runs in an independent sub-agent
- Does not affect the main conversation context
- Suitable for read-only analysis tasks

**When to use:**
- Code analysis/review skills (to prevent main context pollution)
- Skills requiring large-scale file reading
- Skills that need independent result reporting

**Examples:**
```yaml
context: fork  # Run PR review in isolated environment
```

> **Compatibility:** Only supported in Claude Code. Ignored in other tools (runs inline).

---

### agent

Specifies the recommended agent type for skill execution. Used together with `context: fork`.

| Property | Value |
|----------|-------|
| Type | `string` |
| Required | No |
| Default | `general-purpose` |
| Values | `Explore`, `general-purpose` |

**Agent types:**
- `Explore` — Specialized for fast code exploration/search (read-only)
- `general-purpose` — Full tool access (read+write+Bash)

**When to use:**
- Read-only tasks like code explanation, PR review: `Explore`
- Tasks requiring Bash like performance analysis, security audit: `general-purpose`

**Examples:**
```yaml
# Code explanation skill - Fast search with Explore
context: fork
agent: Explore
allowed-tools: Read, Grep, Glob

# Security audit - git access with general-purpose
context: fork
agent: general-purpose
allowed-tools: Read, Grep, Glob, Bash(git:*)
```

> **Compatibility:** Only supported in Claude Code. Ignored in other tools.

---

### disable-model-invocation

When set to `true`, the AI model will not automatically invoke the skill. The skill will only run when the user explicitly calls it with `/skill-name`.

| Property | Value |
|----------|-------|
| Type | `boolean` |
| Required | No |
| Default | `false` |

**When to use:**
- Skills with side effects: commits, deployments, pushes, DB migrations
- Skills involving dangerous operations: data deletion, production changes
- Skills requiring explicit user intent

**Examples:**
```yaml
# Deployment checklist - must be explicitly invoked by user
disable-model-invocation: true

# DB migration - involves dangerous operations
disable-model-invocation: true
```

**Currently used by:**
- `deployment-checklist`
- `database-migration`
- `incident-response`
- `pr-all-in-one`

> **Compatibility:** Supported by all tools.

---

### user-invocable

When set to `false`, the skill is not visible in the `/` menu and cannot be directly invoked by users. Used only internally by the system.

| Property | Value |
|----------|-------|
| Type | `boolean` |
| Required | No |
| Default | `true` |

**When to use:**
- Background knowledge skills: Information referenced by other skills or agents
- Internal-only skills: Context auto-loaded by `parse_mode`

**Examples:**
```yaml
# Internal only - not shown to users
user-invocable: false
```

**Currently used by:**
- `context-management`
- `widget-slot-architecture`

> **Compatibility:** Supported by all tools.

---

### hooks

Sets up triggers to automatically execute skills based on events. Added in v2.0.

| Property | Value |
|----------|-------|
| Type | `object` |
| Required | No |

**Hook events:**

```yaml
hooks:
  PreToolUse:
    - matcher: "Bash"
      action: "invoke"
  PostToolUse:
    - matcher: "Write"
      action: "invoke"
  session-start:
    action: "load"
```

**Supported events:**
- `PreToolUse` — Execute before tool invocation
- `PostToolUse` — Execute after tool invocation
- `session-start` — Auto-load at session start

**Examples:**
```yaml
# Automatic review before commit
hooks:
  PreToolUse:
    - matcher: "Bash"
      pattern: "git commit"
      action: "invoke"
```

> **Compatibility:** Fully supported in Claude Code. Event-based hooks supported in Kiro. Ignored in other tools.

---

## Decision Tree

Decision tree for determining skill frontmatter fields:

```
Does the skill have side effects? (commits, pushes, deployments, etc.)
├── YES → disable-model-invocation: true
└── NO → Is it a background knowledge skill? (architecture reference, etc.)
    ├── YES → user-invocable: false
    └── NO → Keep defaults

Is it a read-only analysis skill?
├── YES → context: fork, agent: Explore
└── NO → Is it an analysis skill that needs Bash execution?
    ├── YES → context: fork, agent: general-purpose
    └── NO → Default context (inline)

Should only specific tools be used?
├── YES → allowed-tools: [required tool list]
└── NO → Omit allowed-tools (allow all)
```

**Decision summary table:**

| Question | Condition | Field to set |
|----------|-----------|-------------|
| Has side effects? | Commits/deployments/DB changes | `disable-model-invocation: true` |
| Internal only? | Not user-invoked | `user-invocable: false` |
| Has arguments? | CLI argument passing | `argument-hint: [arg-name]` |
| Tool restriction? | Only specific tools allowed | `allowed-tools: [tool list]` |
| Needs isolation? | Independent execution, read-only | `context: fork` |
| Agent type? | When using fork | `agent: Explore` or `general-purpose` |
| Specific model? | Special model needed | `model: opus` etc. |
| Effort adjustment? | Adjust analysis depth | `effort: low/medium/high/max` |
| Auto-execution? | Event trigger | `hooks: { ... }` |

---

## Description Writing Guide

`description` is the key field that directly affects `recommend_skills` matching.

### Writing Principles

1. **Include trigger phrases** — "Use when...", "Use this skill when..."
2. **Third-person narration** — "Explains code..." (O), "Explain code..." (X)
3. **200 chars recommended, max 1024 chars** — Search optimization, maintain brevity
4. **Describe specific situations** — Not "when coding" but "before implementing a feature"

### Trigger Phrase Patterns

| Pattern | When to use | Example |
|---------|------------|---------|
| `Use when [action]ing` | During an activity | `Use when implementing any feature` |
| `Use before [action]ing` | Pre-activity preparation | `Use before deploying to production` |
| `Use after [action]ing` | Post-activity verification | `Use after completing a development branch` |
| `Use when encountering` | Problem response | `Use when encountering any bug or test failure` |
| `Use this skill when the user asks to` | User request | `Use this skill when the user asks to review a PR` |

### Third-Person Narration Guide

| Good (Third-person) | Bad (Imperative/Second-person) |
|---------------------|-------------------------------|
| Explains code structure and logic flow | Explain the code |
| Generates comprehensive test suites | Generate tests |
| Analyzes security vulnerabilities | Analyze security |
| Covers validation, rollback, monitoring | Cover all cases |

### Good vs Bad Examples

**Good:**
```yaml
# Trigger + third-person narration
description: Use when implementing any feature or bugfix, before writing implementation code

# Multiple situations + coverage description
description: Use before deploying to staging or production. Covers pre-deploy validation, environment verification, rollback planning, health checks, and post-deploy monitoring.

# Third-person action description
description: Explains code structure, logic flow, and design decisions with context-appropriate detail.
```

**Bad:**
```yaml
# Too vague
description: A testing skill

# Imperative (first-person/second-person)
description: Explain the code to me

# No trigger condition
description: Helps with code quality

# Exceeds 1024 chars
description: This comprehensive skill provides detailed guidance for implementing test-driven development practices including red-green-refactor cycles with support for multiple testing frameworks and assertion libraries across various programming languages and environments with special attention to edge cases and boundary conditions and performance optimization and integration testing and end-to-end testing and mutation testing and property-based testing and snapshot testing and visual regression testing...
```

### Keyword Matching Optimization

`recommend_skills` matches user prompts against descriptions. Including relevant keywords improves matching accuracy:

```yaml
# Matchable against "test", "tdd", "feature", "bugfix" keywords
description: Use when implementing any feature or bugfix, before writing implementation code

# Matchable against "deploy", "staging", "production", "validation"
description: Use before deploying to staging or production. Covers pre-deploy validation...
```

---

## Complete Examples

### Read-Only Analysis Skill

```yaml
---
name: code-explanation
description: Use when you need to understand unfamiliar code. Explains code structure, logic flow, and design decisions with context-appropriate detail.
context: fork
agent: Explore
allowed-tools: Read, Grep, Glob
argument-hint: [file-or-symbol]
---
```

### Skill with Side Effects (Checklist)

```yaml
---
name: deployment-checklist
description: Use before deploying to staging or production. Covers pre-deploy validation, environment verification, rollback planning, health checks, and post-deploy monitoring.
disable-model-invocation: true
---
```

### Complex Analysis Skill (v2.0)

```yaml
---
name: security-audit
description: Use when reviewing code for security vulnerabilities. Covers OWASP Top 10, authentication, authorization, input validation, and dependency risks.
context: fork
agent: general-purpose
allowed-tools: Read, Grep, Glob, Bash(git:*)
argument-hint: [scope-or-path]
model: opus
effort: max
---
```

### CLI Arguments + Side Effects Skill

```yaml
---
name: pr-all-in-one
description: Run local CI checks and ship changes - create branch, commit, push, and PR. Optionally link to a GitHub issue. Use when changes are ready to ship.
disable-model-invocation: true
argument-hint: [target-branch] [issue-id]
---
```

### Internal-Only Background Knowledge Skill

```yaml
---
name: context-management
description: Background knowledge for managing conversation context and memory across sessions. Not directly invocable by users.
user-invocable: false
---
```

### Event-Driven Auto-Execution Skill (v2.0)

```yaml
---
name: pre-commit-review
description: Use to automatically review code before committing. Checks for common issues, security vulnerabilities, and code quality.
allowed-tools: Read, Grep, Glob
hooks:
  PreToolUse:
    - matcher: "Bash"
      pattern: "git commit"
      action: "invoke"
---
```
