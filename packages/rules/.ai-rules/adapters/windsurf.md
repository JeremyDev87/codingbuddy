# Windsurf Integration Guide

Guide for using codingbuddy with Windsurf (Codeium IDE).

## Overview

codingbuddy integrates with Windsurf in two ways:

1. **AGENTS.md** - Industry standard format compatible with all AI tools
2. **`.windsurf/rules/*.md`** - Windsurf-specific rules for Cascade AI

## Two Usage Contexts

### End Users (Your Project)

End users access rules **only through MCP tools**. No local rule files needed.

```json
// .windsurf/mcp.json (or Windsurf MCP settings)
{
  "mcpServers": {
    "codingbuddy": {
      "command": "npx",
      "args": ["-y", "codingbuddy"],
      "env": {
        "CODINGBUDDY_PROJECT_ROOT": "/absolute/path/to/your/project"
      }
    }
  }
}
```

> **Important:** Whether Windsurf supports the `roots/list` MCP capability has not been confirmed.
> Without `CODINGBUDDY_PROJECT_ROOT`, the server cannot locate your project's
> `codingbuddy.config.json`, causing `language` and other settings to use defaults.
> Always set this environment variable to your project's absolute path.

Optional: Create `.windsurf/rules/codingbuddy.md` for basic integration:

```markdown
# codingbuddy Integration

When PLAN, ACT, EVAL keywords detected -> call `parse_mode` MCP tool
```

### Monorepo Contributors

Contributors to the codingbuddy repository can use direct file references:

```
Project Root/
├── AGENTS.md                    # Cross-platform entry point
├── .windsurf/rules/
│   └── codingbuddy.md           # References .ai-rules
└── packages/rules/.ai-rules/    # Single Source of Truth
```

## DRY Principle

**Single Source of Truth**: `packages/rules/.ai-rules/`

- All Agent definitions, rules, skills managed only in `.ai-rules/`
- `.windsurf/rules/*.md` files act as **pointers only**
- No duplication, only references

## Windsurf Rules System

### Rules Hierarchy

Windsurf loads rules in this order (later rules take priority):

1. **Global Rules** (`~/.codeium/windsurf/memories/global_rules.md`) - Personal preferences across all projects
2. **Project Rules** (`.windsurf/rules/*.md` or `.windsurfrules`) - Project-specific conventions

### Current Format (`.windsurf/rules/*.md`)

Windsurf Wave 8+ uses markdown files in the `.windsurf/rules/` directory:

```
.windsurf/
└── rules/
    ├── codingbuddy.md       # codingbuddy integration rules
    └── project-specific.md  # Additional project rules
```

### Legacy Format (`.windsurfrules`)

Older versions use a single `.windsurfrules` file in the project root. This is still supported but the `.windsurf/rules/` directory is preferred.

### Character Limits

| Scope | Limit |
|-------|-------|
| Individual rule file | 6,000 characters |
| Total combined (global + local) | 12,000 characters |

> **Important:** Content beyond these limits is truncated. Global rules take priority if the combined limit is exceeded. Keep codingbuddy rules concise and use references to `.ai-rules/` files rather than duplicating content.

## Integration Method

### Option 1: MCP Server Only (Recommended for End Users)

Use the MCP server configuration shown above. All rules, agents, and skills are accessed through MCP tools.

### Option 2: Rules File + MCP (Recommended for Monorepo Contributors)

Create `.windsurf/rules/codingbuddy.md`:

```markdown
# codingbuddy Rules

## Workflow
Follow PLAN/ACT/EVAL workflow from `.ai-rules/rules/core.md`.
When PLAN, ACT, EVAL, or AUTO keywords are detected, call `parse_mode` MCP tool.

## Code Quality
- TDD cycle: Red -> Green -> Refactor
- TypeScript strict mode (no `any`)
- 90%+ test coverage goal
- See `.ai-rules/rules/augmented-coding.md` for details

## Agents
See `.ai-rules/agents/README.md` for available specialist agents.
```

### Option 3: Global Rules (Personal Preferences)

Access via Windsurf: **Settings > Manage Memories > Edit Global Rules**

Or edit directly: `~/.codeium/windsurf/memories/global_rules.md`

```markdown
# Global Coding Preferences

- Always use TypeScript strict mode
- Prefer functional programming patterns
- Follow TDD workflow
```

## Directory Structure

```
.windsurf/
└── rules/
    └── codingbuddy.md          # Project rules (references .ai-rules)

.windsurfrules                   # Legacy project rules (optional)

~/.codeium/windsurf/memories/
└── global_rules.md              # Global rules (personal preferences)

packages/rules/.ai-rules/        # Single Source of Truth
├── rules/
│   ├── core.md
│   ├── project.md
│   └── augmented-coding.md
├── agents/
│   └── *.json
└── adapters/
    └── windsurf.md              # This guide
```

## Usage

### Mode Keywords

```
PLAN Design user authentication feature
```

> `parse_mode` MCP tool is called, loading appropriate Agent and rules

### Specialist Usage

```
EVAL Review from security perspective
```

> security-specialist activated

## MCP Tools

Available codingbuddy MCP tools in Windsurf:

| Tool | Purpose |
|------|---------|
| `parse_mode` | **MANDATORY.** Parse PLAN/ACT/EVAL/AUTO keywords and return mode-specific rules, agent, and context |
| `search_rules` | Search rules and guidelines by query |
| `get_agent_details` | Get specific Agent profile and expertise |
| `get_project_config` | Get project configuration (language, tech stack) |
| `get_code_conventions` | Get project code conventions and style guide |
| `suggest_config_updates` | Analyze project and suggest config updates |
| `recommend_skills` | Recommend skills based on prompt -> then call `get_skill` |
| `get_skill` | Load full skill content by name |
| `list_skills` | List all available skills with optional filtering |
| `get_agent_system_prompt` | Get complete system prompt for a specialist agent |
| `prepare_parallel_agents` | Prepare specialist agents for sequential execution |
| `dispatch_agents` | Get dispatch params for agents (Claude Code optimized; use `prepare_parallel_agents` in Windsurf) |
| `generate_checklist` | Generate contextual checklists (security, a11y, performance) |
| `analyze_task` | Analyze task for risk assessment and specialist recommendations |
| `read_context` | Read context document (`docs/codingbuddy/context.md`) |
| `update_context` | **MANDATORY at mode end.** Update context document with decisions, notes, progress |
| `cleanup_context` | Manually trigger context document cleanup |

## Specialist Agents Execution

Windsurf does not have a `Task` tool for spawning background subagents. When `parse_mode` returns `parallelAgentsRecommendation`, execute specialists **sequentially**.

### Sequential Workflow

```
parse_mode returns parallelAgentsRecommendation
  |
Call prepare_parallel_agents with recommended specialists
  |
For each specialist (sequentially):
  - Announce: "Analyzing from [icon] [specialist-name] perspective..."
  - Apply the specialist's system prompt as analysis context
  - Analyze the target code/design from that specialist's viewpoint
  - Record findings
  |
Consolidate all specialist findings into unified summary
```

### Specialist Icons

| Icon | Specialist |
|------|------------|
| 🔒 | security-specialist |
| ♿ | accessibility-specialist |
| ⚡ | performance-specialist |
| 📏 | code-quality-specialist |
| 🧪 | test-strategy-specialist |
| 🏛️ | architecture-specialist |
| 📚 | documentation-specialist |
| 🔍 | seo-specialist |
| 📨 | event-architecture-specialist |
| 🔗 | integration-specialist |
| 📊 | observability-specialist |
| 🔄 | migration-specialist |
| 🌐 | i18n-specialist |

## Skills

Windsurf accesses codingbuddy skills through MCP tools:

1. **Auto-recommend** - AI calls `recommend_skills` based on intent detection
2. **Browse and select** - User calls `list_skills` to discover, then `get_skill` to load
3. **Slash-command** - User types `/<command>`, AI maps to `get_skill`

### Using Skills in Windsurf

**MCP Tool Chain (Recommended):**

1. `recommend_skills({ prompt: "user's message" })` - Get skill recommendations
2. `get_skill("skill-name")` - Load the recommended skill's full content
3. Follow the skill instructions in the response

> **Note:** `parse_mode` already embeds matched skill content in `included_skills` - no separate `get_skill` call needed when using mode keywords (PLAN/ACT/EVAL/AUTO).

### Slash-Command Mapping

When a user types `/<command>`, the AI should call `get_skill`:

| User Types | MCP Call |
|---|---|
| `/debug` or `/debugging` | `get_skill("systematic-debugging")` |
| `/tdd` | `get_skill("test-driven-development")` |
| `/brainstorm` | `get_skill("brainstorming")` |
| `/plan` or `/write-plan` | `get_skill("writing-plans")` |
| `/execute` or `/exec` | `get_skill("executing-plans")` |
| `/design` or `/frontend` | `get_skill("frontend-design")` |
| `/pr` | `get_skill("pr-all-in-one")` |

For unrecognized slash commands, call `recommend_skills` to find the closest match.

## AUTO Mode

AUTO mode enables autonomous PLAN -> ACT -> EVAL cycling until quality criteria are met.

### Triggering AUTO Mode

Use the `AUTO` keyword at the start of your message:

| Language | Keyword |
|----------|---------|
| English | `AUTO` |
| Korean | `AUTO` |
| Japanese | `自動` |
| Chinese | `自动` |
| Spanish | `AUTOMATICO` |

### Workflow

1. **PLAN Phase**: Creates implementation plan with quality criteria
2. **ACT Phase**: Executes implementation following TDD workflow
3. **EVAL Phase**: Evaluates quality against exit criteria
4. **Loop/Exit**: Continues cycling until:
   - Success: `Critical = 0 AND High = 0`
   - Failure: Max iterations reached (default: 3)

> **Severity and review-cycle canonical sources:** The `Critical`/`High` levels above are the **Code Review Severity** scale defined in [`../rules/severity-classification.md`](../rules/severity-classification.md#code-review-severity). The PR approval loop (CI gate → review → fix → re-review → approve) is specified in [`../rules/pr-review-cycle.md`](../rules/pr-review-cycle.md). Follow those canonical sources rather than re-deriving severity or approval criteria from this adapter.

### Configuration

Configure in `codingbuddy.config.json`:

```javascript
module.exports = {
  auto: {
    maxIterations: 3
  }
};
```

> **Windsurf limitation:** AUTO mode has no enforcement mechanism in Windsurf. See [Known Limitations](#known-limitations) for details.

## Context Document Management

codingbuddy uses a fixed-path context document (`docs/codingbuddy/context.md`) to persist decisions across mode transitions.

### How It Works

| Mode | Behavior |
|------|----------|
| PLAN / AUTO | Resets (clears) existing content and starts fresh |
| ACT / EVAL | Appends new section to existing content |

### Required Workflow

1. `parse_mode` automatically reads/creates the context document
2. Review `contextDocument` in the response for previous decisions
3. **Before completing each mode:** call `update_context` to persist current work

### Windsurf-Specific Note

Unlike Claude Code, Windsurf has no hooks to enforce `update_context` calls. You must **manually remember** to call `update_context` before concluding each mode to avoid losing context across sessions.

## Known Limitations

Windsurf environment does not support several features available in Claude Code:

| Feature | Status | Workaround |
|---------|--------|------------|
| **Task tool** (background subagents) | ❌ Not available | Use `prepare_parallel_agents` for sequential execution |
| **Native Skill tool** (`/skill-name`) | ❌ Not available | Use MCP tool chain: `recommend_skills` -> `get_skill` |
| **Session hooks** (PreToolUse, etc.) | ❌ Not available | Rely on `.windsurf/rules/*.md` for always-on instructions |
| **Autonomous loop mechanism** | ❌ Not available | AUTO mode depends on Cascade AI voluntarily looping |
| **Context compaction hooks** | ❌ Not available | Manually call `update_context` before ending each mode |
| **`dispatch_agents` full usage** | ⚠️ Partial | Returns Claude Code-specific `dispatchParams`; use `prepare_parallel_agents` instead |
| **`restart_tui`** | ❌ Not applicable | Claude Code TUI-only tool |
| **Rules character limit** | ⚠️ Constrained | 6,000 chars/file, 12,000 total — keep rules concise, reference `.ai-rules/` |

### AUTO Mode Reliability

AUTO mode documents autonomous PLAN -> ACT -> EVAL cycling. In Windsurf, this depends entirely on Cascade voluntarily continuing the loop — there is no enforcement mechanism. Results may vary:

- Cascade may stop after one iteration instead of looping
- Quality exit criteria (`Critical = 0 AND High = 0`) are advisory, not enforced
- For reliable multi-iteration workflows, prefer manual `PLAN` -> `ACT` -> `EVAL` cycling

## AGENTS.md

Industry standard format compatible with all AI tools (Windsurf, Cursor, Claude Code, Codex, etc.):

```markdown
# AGENTS.md

This project uses codingbuddy MCP server to manage AI Agents.

## Quick Start
...
```

See `AGENTS.md` in project root for details.

## Verification Status

> Documentation based on Windsurf public documentation and community resources. Runtime verification in a live Windsurf + MCP environment has not yet been performed.

| Pattern | Status | Notes |
|---------|--------|-------|
| MCP Tools Access | ⚠️ Unconfirmed | Windsurf MCP support depends on version; verify in your environment |
| `.windsurf/rules/*.md` loading | ✅ Documented | Wave 8+ format; automatically loaded by Cascade |
| `.windsurfrules` legacy support | ✅ Documented | Still supported; `.windsurf/rules/` preferred |
| Global rules (`global_rules.md`) | ✅ Documented | Accessible via Settings > Manage Memories |
| AUTO mode workflow | ⚠️ Unconfirmed | Depends on Cascade voluntarily looping |
| Context document management | ✅ Documented | Uses standard `update_context` MCP tool |
| Known Limitations | ✅ Documented | Task tool, hooks, character limits documented |

## Reference

- [Windsurf Documentation](https://docs.windsurf.com/)
- [Windsurf Rules Guide](https://docs.windsurf.com/windsurf/cascade/memories)
- [Windsurf Rules Directory](https://windsurf.com/editor/directory)
- [AGENTS.md Official Spec](https://agents.md)
- [codingbuddy MCP API](../../docs/api.md)
