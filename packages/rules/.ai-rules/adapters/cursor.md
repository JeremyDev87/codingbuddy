# Cursor Integration Guide

Guide for using codingbuddy with Cursor.

## Overview

codingbuddy integrates with Cursor in two ways:

1. **AGENTS.md** - Industry standard format compatible with all AI tools
2. **.cursor/rules/*.mdc** - Cursor-specific optimization (glob-based auto-activation)

## Two Usage Contexts

### End Users (Your Project)

End users access rules **only through MCP tools**. No local rule files needed.

```json
// .cursor/mcp.json
{
  "mcpServers": {
    "codingbuddy": {
      "command": "npx",
      "args": ["-y", "codingbuddy"]
    }
  }
}
```

Optional: Create `.cursor/rules/codingbuddy.mdc` for basic integration:

```yaml
---
description: codingbuddy integration
globs:
alwaysApply: true
---

When PLAN, ACT, EVAL keywords detected → call `parse_mode` MCP tool
```

### Monorepo Contributors

Contributors to the codingbuddy repository can use direct file references:

```
Project Root/
├── AGENTS.md                    # Cross-platform entry point
├── .cursor/rules/
│   ├── imports.mdc              # Common rules (alwaysApply: true)
│   ├── auto-agent.mdc           # File pattern-based Agent auto-activation
│   └── custom.mdc               # Personal settings (Git ignored)
└── packages/rules/.ai-rules/    # Single Source of Truth
```

## DRY Principle

**Single Source of Truth**: `packages/rules/.ai-rules/`

- All Agent definitions, rules, skills managed only in `.ai-rules/`
- AGENTS.md and .mdc files act as **pointers only**
- No duplication, only references

## Configuration Files

### imports.mdc (alwaysApply)

Core rules automatically applied to all conversations:

```yaml
---
description: codingbuddy common rules
globs:
alwaysApply: true
---

# Core principles only (details in .ai-rules/)
```

### auto-agent.mdc (glob-based)

Automatically provides appropriate Agent context based on file patterns:

```yaml
---
description: Agent auto-activation
globs:
  - "**/*.tsx"
  - "**/*.ts"
  - "**/*.go"
alwaysApply: false
---

# File pattern → Agent mapping table
```

## Usage

### Mode Keywords

```
PLAN Design user authentication feature
```

→ `parse_mode` MCP tool is called, loading appropriate Agent and rules

### Auto-Activation on File Edit

Open `.tsx` file → `auto-agent.mdc` auto-applies → frontend-developer Agent recommended

### Specialist Usage

```
EVAL Review from security perspective
```

→ security-specialist activated

## MCP Tools

Available codingbuddy MCP tools in Cursor:

| Tool | Purpose |
|------|---------|
| `parse_mode` | Parse mode keywords + load Agent/rules |
| `get_agent_details` | Get specific Agent details |
| `get_project_config` | Get project configuration |
| `recommend_skills` | Recommend skills based on prompt |
| `prepare_parallel_agents` | Prepare parallel Agent execution |

## Skills

### Using Skills in Cursor

Load skills via file reference (monorepo only):

```
@packages/rules/.ai-rules/skills/test-driven-development/SKILL.md
```

For end users, use `recommend_skills` MCP tool instead.

### Available Skills

- `brainstorming/SKILL.md` - Idea → Design
- `test-driven-development/SKILL.md` - TDD workflow
- `systematic-debugging/SKILL.md` - Systematic debugging
- `writing-plans/SKILL.md` - Implementation plan writing
- `executing-plans/SKILL.md` - Plan execution
- `subagent-driven-development/SKILL.md` - Subagent development
- `dispatching-parallel-agents/SKILL.md` - Parallel Agent dispatch
- `frontend-design/SKILL.md` - Frontend design

## AGENTS.md

Industry standard format compatible with all AI tools (Cursor, Claude Code, Codex, etc.):

```markdown
# AGENTS.md

This project uses codingbuddy MCP server to manage AI Agents.

## Quick Start
...
```

See `AGENTS.md` in project root for details.

## Reference

- [AGENTS.md Official Spec](https://agents.md)
- [Cursor Rules Documentation](https://cursor.com/docs/context/rules)
- [codingbuddy MCP API](../../docs/api.md)
