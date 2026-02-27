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
      "args": ["-y", "codingbuddy"],
      "env": {
        "CODINGBUDDY_PROJECT_ROOT": "/absolute/path/to/your/project"
      }
    }
  }
}
```

> **Important:** Cursor may not support the `roots/list` MCP capability.
> Without `CODINGBUDDY_PROJECT_ROOT`, the server cannot locate your project's
> `codingbuddy.config.json`, causing `language` and other settings to use defaults.
> Always set this environment variable to your project's absolute path.

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
| `parse_mode` | Parse mode keywords (PLAN/ACT/EVAL/AUTO) + load Agent/rules |
| `search_rules` | Search rules and guidelines by query |
| `get_agent_details` | Get specific Agent profile and expertise |
| `get_project_config` | Get project configuration (language, tech stack) |
| `get_code_conventions` | Get project code conventions and style guide |
| `suggest_config_updates` | Analyze project and suggest config updates |
| `recommend_skills` | Recommend skills based on prompt → then call `get_skill` |
| `get_skill` | Load full skill content by name (e.g., `get_skill("systematic-debugging")`) |
| `list_skills` | List all available skills with optional filtering |
| `get_agent_system_prompt` | Get full system prompt for a specialist agent |
| `prepare_parallel_agents` | Prepare specialist agents for sequential execution |
| `dispatch_agents` | Get Task tool-ready dispatch params (Claude Code optimized) |
| `generate_checklist` | Generate contextual checklists (security, a11y, performance) |
| `analyze_task` | Analyze task for risk assessment and specialist recommendations |
| `read_context` | Read context document (`docs/codingbuddy/context.md`) |
| `update_context` | Update context document with decisions, notes, progress |
| `cleanup_context` | Manually trigger context document cleanup |
| `set_project_root` | ~~Set project root directory~~ **(deprecated)** — use `CODINGBUDDY_PROJECT_ROOT` env var instead |

## Specialist Agents Execution

Cursor does not have a `Task` tool for spawning background subagents. When `parse_mode` returns `parallelAgentsRecommendation`, execute specialists **sequentially**.

### Auto-Detection

The MCP server automatically detects Cursor as the client and returns a sequential execution hint in `parallelAgentsRecommendation.hint`. No manual configuration is needed.

### Sequential Workflow

```
parse_mode returns parallelAgentsRecommendation
  ↓
Call prepare_parallel_agents with recommended specialists
  ↓
For each specialist (sequentially):
  - Announce: "🔍 Analyzing from [icon] [specialist-name] perspective..."
  - Apply the specialist's system prompt as analysis context
  - Analyze the target code/design from that specialist's viewpoint
  - Record findings
  ↓
Consolidate all specialist findings into unified summary
```

### Example (EVAL mode)

```
parse_mode({ prompt: "EVAL review auth implementation" })
→ parallelAgentsRecommendation:
    specialists: ["security-specialist", "accessibility-specialist", "performance-specialist"]

prepare_parallel_agents({
  mode: "EVAL",
  specialists: ["security-specialist", "accessibility-specialist", "performance-specialist"]
})
→ agents[]: each has systemPrompt

Sequential analysis:
  1. 🔒 Security: Apply security-specialist prompt, analyze, record findings
  2. ♿ Accessibility: Apply accessibility-specialist prompt, analyze, record findings
  3. ⚡ Performance: Apply performance-specialist prompt, analyze, record findings

Present: Consolidated findings from all 3 specialists
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
| 🎨 | design-system-specialist |

## Skills

### Using Skills in Cursor

**Method 1: MCP Tool Chain (End Users — Recommended)**

The AI should follow this chain when a skill might apply:

1. `recommend_skills({ prompt: "user's message" })` — Get skill recommendations
2. `get_skill("skill-name")` — Load the recommended skill's full content
3. Follow the skill instructions in the response

Example flow:
```
User: "There is a bug in the authentication logic"
→ AI calls recommend_skills({ prompt: "There is a bug in the authentication logic" })
→ Response: { recommendations: [{ skillName: "systematic-debugging", ... }], nextAction: "Call get_skill..." }
→ AI calls get_skill("systematic-debugging")
→ AI follows the systematic-debugging skill instructions
```

**Method 2: File Reference (Monorepo Contributors Only)**

```
@packages/rules/.ai-rules/skills/test-driven-development/SKILL.md
```

> **Note:** `parse_mode` already embeds matched skill content in `included_skills` — no separate `get_skill` call needed when using mode keywords (PLAN/ACT/EVAL/AUTO).

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

## PR All-in-One Skill

Unified commit and PR workflow that:
- Auto-commits uncommitted changes (grouped logically)
- Creates or updates PRs with smart issue linking
- Supports multiple languages (en/ko/bilingual)

### Usage

```
/pr-all-in-one [target-branch] [issue-id]
```

**Examples:**
- `/pr-all-in-one` - PR to default branch, issue from branch name
- `/pr-all-in-one develop` - PR to develop branch
- `/pr-all-in-one PROJ-123` - PR with specific issue ID
- `/pr-all-in-one main PROJ-123` - PR to main with issue ID

### Configuration

Create `.claude/pr-config.json` in your project root. Required settings:
- `defaultTargetBranch`: Target branch for PRs
- `issueTracker`: `jira`, `github`, `linear`, `gitlab`, or `custom`
- `issuePattern`: Regex pattern for issue ID extraction
- `prLanguage`: `en`, `ko`, or `bilingual`

See `packages/rules/.ai-rules/skills/pr-all-in-one/configuration-guide.md` for all options.

### First-time Setup

If no config file exists, the skill guides you through interactive setup:
1. Select PR target branch
2. Choose issue tracker
3. Set PR description language
4. (Optional) Configure issue URL template

### Skill Files

- `SKILL.md` - Main workflow documentation
- `configuration-guide.md` - Detailed config options
- `issue-patterns.md` - Supported issue tracker patterns
- `pr-templates.md` - PR description templates

### Platform-Specific Note

Use @file reference: `@packages/rules/.ai-rules/skills/pr-all-in-one/SKILL.md` to access skill documentation.

## AUTO Mode

AUTO mode enables autonomous PLAN -> ACT -> EVAL cycling until quality criteria are met.

### Triggering AUTO Mode

Use the `AUTO` keyword (or localized versions) at the start of your message:

| Language | Keyword |
|----------|---------|
| English | `AUTO` |
| Korean | `자동` |
| Japanese | `自動` |
| Chinese | `自动` |
| Spanish | `AUTOMATICO` |

### Example Usage

```
AUTO implement user authentication feature
```

```
자동 사용자 인증 기능 구현해줘
```

When AUTO keyword is detected, Cursor calls `parse_mode` MCP tool which returns AUTO mode instructions.

### Workflow

1. **PLAN Phase**: Creates implementation plan with quality criteria
2. **ACT Phase**: Executes implementation following TDD workflow
3. **EVAL Phase**: Evaluates quality against exit criteria
4. **Loop/Exit**: Continues cycling until:
   - Success: `Critical = 0 AND High = 0`
   - Failure: Max iterations reached (default: 3)

### Configuration

Configure in `codingbuddy.config.json`:

```javascript
module.exports = {
  auto: {
    maxIterations: 3
  }
};
```

### When to Use

- Large feature implementations requiring multiple refinement cycles
- Complex refactoring with quality verification
- Bug fixes needing comprehensive testing
- Code quality improvements with measurable criteria

> **Cursor limitation:** AUTO mode has no enforcement mechanism in Cursor. See [Known Limitations](#known-limitations) for details.

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

### Available Tools

| Tool | Purpose |
|------|---------|
| `read_context` | Read current context document |
| `update_context` | Persist decisions, notes, progress, findings |
| `cleanup_context` | Summarize older sections to reduce document size |

### Cursor-Specific Note

Unlike Claude Code, Cursor has no hooks to enforce `update_context` calls. You must **manually remember** to call `update_context` before concluding each mode to avoid losing context across sessions.

## Known Limitations

Cursor environment does not support several features available in Claude Code:

| Feature | Status | Workaround |
|---------|--------|------------|
| **Task tool** (background subagents) | ❌ Not available | Use `prepare_parallel_agents` for sequential execution |
| **Native Skill tool** (`/skill-name`) | ❌ Not available | Use MCP tool chain: `recommend_skills` → `get_skill` |
| **Session hooks** (PreToolUse, etc.) | ❌ Not available | Rely on `.cursor/rules/*.mdc` for always-on instructions |
| **Autonomous loop mechanism** | ❌ Not available | AUTO mode depends on Cursor AI voluntarily looping |
| **Context compaction hooks** | ❌ Not available | Manually call `update_context` before ending each mode |
| **`dispatch_agents` full usage** | ⚠️ Partial | Returns Claude Code-specific `dispatchParams`; use `prepare_parallel_agents` instead |
| **`restart_tui`** | ❌ Not applicable | Claude Code TUI-only tool |

### AUTO Mode Reliability

AUTO mode documents autonomous PLAN → ACT → EVAL cycling. In Cursor, this depends entirely on the AI model voluntarily continuing the loop — there is no enforcement mechanism like Claude Code's hooks. Results may vary:

- The AI may stop after one iteration instead of looping
- Quality exit criteria (`Critical = 0 AND High = 0`) are advisory, not enforced
- For reliable multi-iteration workflows, prefer manual `PLAN` → `ACT` → `EVAL` cycling

## Verification Status

> Audit per [#609](https://github.com/JeremyDev87/codingbuddy/issues/609). Code-level analysis complete, Cursor runtime verification pending.

| Pattern | Status | Notes |
|---------|--------|-------|
| MCP Tools Table | ✅ Updated | All 18 tools documented (including 1 deprecated) |
| Mode keyword detection (imports.mdc) | ⚠️ Code-verified | `parse_mode` handler exists; Cursor AI invocation depends on model behavior |
| File pattern → Agent mapping (auto-agent.mdc) | ⚠️ Code-verified | Mappings reference valid agents; Cursor auto-apply depends on glob matching |
| AUTO mode workflow | ⚠️ Documented with caveat | No enforcement mechanism in Cursor; see Known Limitations |
| Context document management | ✅ Documented | New section added with Cursor-specific guidance |
| Known Limitations | ✅ Added | Task tool, hooks, autonomous loop, TUI limitations documented |

## Reference

- [AGENTS.md Official Spec](https://agents.md)
- [Cursor Rules Documentation](https://cursor.com/docs/context/rules)
- [codingbuddy MCP API](../../docs/api.md)
