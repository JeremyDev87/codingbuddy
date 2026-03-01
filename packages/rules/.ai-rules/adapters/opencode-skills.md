# OpenCode Skills Integration Guide

This guide explains how skills work in OpenCode/Crush and how to access them through codingbuddy.

> **Note:** The original OpenCode project has been archived and continued as **"Crush"** by Charm Bracelet. This guide supports both versions. See [opencode.md](opencode.md) for full context.

## Overview

Skills are structured AI instructions following the [Agent Skills specification](https://agentskills.io/specification). They help AI agents perform better at specialized tasks like brainstorming, TDD, debugging, and planning.

In OpenCode/Crush, there are **two mechanisms** for accessing skills:

| Priority | Mechanism | How It Works |
|----------|-----------|-------------|
| **Primary** | codingbuddy MCP Tools | `recommend_skills` → `get_skill` — cross-platform, programmatic |
| **Supplementary** | Crush Native Discovery | Disk-based auto-discovery → `<available_skills>` system prompt injection |

## Skills Access: Precedence

### 1. codingbuddy MCP Tools (Primary)

The codingbuddy MCP server provides skill recommendation and loading tools that work identically across all AI assistants (Claude Code, Cursor, OpenCode/Crush, etc.).

**Available tools:**

| Tool | Description |
|------|-------------|
| `recommend_skills` | Analyze user prompt and recommend matching skills with confidence scores |
| `get_skill` | Load full skill content by name |
| `list_skills` | List all available skills with optional priority filtering |

**Usage pattern:**

```
User prompt → recommend_skills(prompt) → get_skill(recommended skillName) → follow instructions
```

**Why primary?**
- Works across all AI assistants — not limited to Crush
- Programmatic keyword matching for reliable recommendations
- Returns structured data (confidence scores, matched patterns)
- Consistent behavior regardless of platform

### 2. Crush Native Skill Discovery (Supplementary)

Crush automatically discovers skills from the filesystem and injects them into the AI's system prompt.

**How it works:**
1. Crush scans configured skill directories for `SKILL.md` files
2. Extracts `name` and `description` from each skill's frontmatter
3. Injects an `<available_skills>` block into the system prompt
4. The AI decides when to activate a skill based on natural language context

**Default skill directory:**
- Unix: `~/.config/crush/skills/`
- Windows: `%LOCALAPPDATA%\crush\skills\`

**Important:** There is no `/skill` slash command. Skills are activated through natural language — ask the AI to use a specific skill or describe a task that matches a skill's description.

**Reference:** [charmbracelet/crush#1972](https://github.com/charmbracelet/crush/issues/1972)

## Configuration

### Crush Configuration (crush.json)

```json
{
  "options": {
    "skills_paths": [
      "packages/rules/.ai-rules/skills",
      "~/.config/crush/skills"
    ]
  }
}
```

| Field | Location | Description |
|-------|----------|-------------|
| `skills_paths` | `options.skills_paths` | Array of additional directories to scan for skills |

**Environment variable:**

| Variable | Description |
|----------|-------------|
| `CRUSH_SKILLS_DIR` | Override default skills directory path |

### MCP Server Configuration

Add codingbuddy MCP server for programmatic skill access:

```json
{
  "mcp": {
    "codingbuddy": {
      "type": "local",
      "command": ["npx", "codingbuddy@latest", "mcp"],
      "env": {
        "CODINGBUDDY_PROJECT_ROOT": "/absolute/path/to/your/project"
      }
    }
  }
}
```

## SKILL.md Format

Skills follow the [Agent Skills specification](https://agentskills.io/specification).

### Required Structure

```
skill-name/
├── SKILL.md          # Required
├── scripts/          # Optional — executable code
├── references/       # Optional — additional documentation
└── assets/           # Optional — static resources
```

### Frontmatter Schema

```yaml
---
name: skill-name           # Required. Lowercase + hyphens, max 64 chars, must match directory name
description: ...           # Required. Max 1024 chars. What it does + when to use it
license: Apache-2.0        # Optional. License name or reference
compatibility: ...         # Optional. Max 500 chars. Environment requirements
metadata:                  # Optional. Arbitrary key-value map
  author: example-org
  version: "1.0"
allowed-tools: Bash Read   # Optional. Space-delimited pre-approved tools (experimental)
---
```

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Lowercase alphanumeric + hyphens, max 64 chars |
| `description` | Yes | What the skill does and when to use it, max 1024 chars |
| `license` | No | License name or file reference |
| `compatibility` | No | Environment requirements, max 500 chars |
| `metadata` | No | Arbitrary key-value pairs |
| `allowed-tools` | No | Pre-approved tools list (experimental) |

## Available Skills

The table below shows representative skills by mode. Use `list_skills` MCP tool for the complete list.

### PLAN Mode Skills

| Skill | Description |
|-------|-------------|
| `brainstorming` | Ideation and requirements exploration |
| `writing-plans` | Structured implementation planning |
| `dispatching-parallel-agents` | Multi-component parallel work |
| `subagent-driven-development` | Subagent-per-task execution |
| `context-management` | Context window optimization |

### ACT Mode Skills

| Skill | Description |
|-------|-------------|
| `test-driven-development` | Red-Green-Refactor TDD cycle |
| `executing-plans` | Systematic plan execution |
| `frontend-design` | UI component development |
| `systematic-debugging` | Root cause analysis and bug fixing |
| `api-design` | API design and documentation |
| `refactoring` | Code restructuring |
| `mcp-builder` | MCP server development |
| `database-migration` | Database schema migration |
| `dependency-management` | Package dependency management |
| `widget-slot-architecture` | Widget/slot pattern implementation |

### EVAL Mode Skills

| Skill | Description |
|-------|-------------|
| `security-audit` | Security vulnerability analysis |
| `performance-optimization` | Performance profiling and improvement |
| `pr-review` | Pull request review |
| `pr-all-in-one` | Comprehensive PR workflow |
| `tech-debt` | Technical debt identification |

### General Skills

| Skill | Description |
|-------|-------------|
| `code-explanation` | Code walkthrough and documentation |
| `documentation-generation` | Auto-generate project documentation |
| `error-analysis` | Error pattern analysis |
| `incident-response` | Production incident handling |
| `prompt-engineering` | AI prompt optimization |
| `rule-authoring` | Custom AI rules creation |
| `agent-design` | Custom agent design |
| `legacy-modernization` | Legacy code modernization |
| `deployment-checklist` | Deployment readiness verification |

## Workflow Integration

### PLAN Mode — Planning Skills

When working with the `plan-mode` agent, use MCP tools to load planning skills:

```
User: "I want to build a new feature"
AI calls: recommend_skills("build a new feature")
AI receives: brainstorming (high), writing-plans (medium)
AI calls: get_skill("brainstorming")
AI follows: brainstorming skill instructions
```

### ACT Mode — Implementation Skills

When working with the `act-mode` agent:

```
User: "ACT — implement the login API"
AI calls: recommend_skills("implement the login API")
AI receives: test-driven-development (high)
AI calls: get_skill("test-driven-development")
AI follows: TDD Red-Green-Refactor cycle
```

### EVAL Mode — Review Skills

When working with the `eval-mode` agent:

```
User: "EVAL — review the implementation"
AI calls: recommend_skills("review the implementation")
AI receives: pr-review (high), security-audit (medium)
AI calls: get_skill("pr-review")
AI follows: PR review checklist
```

## Maintenance

### Adding New Skills

1. Create skill directory: `packages/rules/.ai-rules/skills/new-skill/`
2. Add `SKILL.md` with required frontmatter (`name`, `description`)
3. Skills are automatically available via MCP tools (`recommend_skills`, `get_skill`)
4. For Crush native discovery, ensure skills are in a configured `skills_paths` directory

### Updating Existing Skills

1. Modify `SKILL.md` content in `packages/rules/.ai-rules/skills/*/`
2. Changes are automatically reflected — no configuration updates needed

### Validation

Use the [skills-ref](https://github.com/agentskills/agentskills/tree/main/skills-ref) library to validate skills:

```bash
skills-ref validate ./my-skill
```
