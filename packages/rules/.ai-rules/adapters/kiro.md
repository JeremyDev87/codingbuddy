# Kiro Integration Guide

Guide for using codingbuddy with Kiro.

## Overview

codingbuddy integrates with Kiro in two ways:

1. **`.kiro/rules/guidelines.md`** - Kiro-specific rules and guidelines (always-on instructions)
2. **MCP Server** - codingbuddy MCP tools for workflow management

## Two Usage Contexts

### End Users (Your Project)

End users access rules **only through MCP tools**. No local rule files needed.

```jsonc
// .kiro/settings/mcp.json
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

> **Important:** Whether Kiro supports the `roots/list` MCP capability has not been confirmed.
> Without `CODINGBUDDY_PROJECT_ROOT`, the server cannot locate your project's `codingbuddy.config.json`,
> causing settings such as `language` to use default values. Always set this environment variable to your project's absolute path.

Optional: Create `.kiro/rules/guidelines.md` for basic integration:

```markdown
# codingbuddy Integration

When PLAN, ACT, EVAL keywords detected → call `parse_mode` MCP tool.
Follow the returned instructions and rules exactly.
```

### Monorepo Contributors

Contributors to the codingbuddy repository can use direct file references:

```
Project Root/
├── .kiro/
│   ├── rules/
│   │   └── guidelines.md           # References .ai-rules
│   └── settings/
│       └── mcp.json                # MCP server configuration
└── packages/rules/.ai-rules/       # Single Source of Truth
```

## DRY Principle

**Single Source of Truth**: `packages/rules/.ai-rules/`

- All Agent definitions, rules, skills managed only in `.ai-rules/`
- `.kiro/rules/guidelines.md` acts as a **pointer only**
- No duplication, only references

## Configuration Files

### .kiro/settings/mcp.json

MCP server configuration for codingbuddy tools:

```json
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

> **Note:** Kiro supports environment variable expansion using the `${VARIABLE}` syntax.
> If `${workspaceFolder}` is supported, you can use it instead of an absolute path.

**MCP configuration paths:**
- **Project-level**: `.kiro/settings/mcp.json`
- **Global**: `~/.kiro/settings/mcp.json`

**Project root resolution priority** (in `mcp.service.ts`):
1. `CODINGBUDDY_PROJECT_ROOT` environment variable (highest priority)
2. `roots/list` MCP capability (support unconfirmed in Kiro)
3. `findProjectRoot()` automatic detection (fallback)

### .kiro/rules/guidelines.md

Always-on instructions automatically applied to all Kiro conversations:

```markdown
# codingbuddy Guidelines

## Workflow
When PLAN, ACT, EVAL, or AUTO keywords detected → call `parse_mode` MCP tool.
Follow the returned instructions and rules exactly.

## References
- Core workflow: packages/rules/.ai-rules/rules/core.md
- Project context: packages/rules/.ai-rules/rules/project.md
- Coding principles: packages/rules/.ai-rules/rules/augmented-coding.md
- Agents: packages/rules/.ai-rules/agents/
```

### Directory Structure

```
.kiro/
├── rules/
│   └── guidelines.md       # Always-on instructions (references .ai-rules)
└── settings/
    └── mcp.json             # MCP server configuration

.ai-rules/
├── rules/
│   ├── core.md              # Workflow (PLAN/ACT/EVAL/AUTO)
│   ├── project.md           # Tech stack, architecture
│   └── augmented-coding.md  # TDD, code quality
├── agents/
│   └── *.json               # 35 agent definitions
├── skills/
│   └── */SKILL.md           # Skill definitions
└── adapters/
    └── kiro.md              # This guide
```

## Usage

### Mode Keywords

```
PLAN Design user authentication feature
```

-> `parse_mode` MCP tool is called, loading appropriate Agent and rules

### Specialist Usage

```
EVAL Review from security perspective
```

-> security-specialist activated

### Auto Mode

```
AUTO implement user dashboard
```

→ Autonomous PLAN → ACT → EVAL cycling

## MCP Tools

Available codingbuddy MCP tools in Kiro:

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
| `get_agent_system_prompt` | Get complete system prompt for a specialist agent |
| `prepare_parallel_agents` | Prepare specialist agents for sequential execution |
| `dispatch_agents` | Get Task tool-ready dispatch params (Claude Code optimized) |
| `generate_checklist` | Generate contextual checklists (security, a11y, performance) |
| `analyze_task` | Analyze task for risk assessment and specialist recommendations |
| `read_context` | Read context document (`docs/codingbuddy/context.md`) |
| `update_context` | Update context document with decisions, notes, progress |
| `cleanup_context` | Manually trigger context document cleanup |
| `set_project_root` | ~~Set project root directory~~ **(deprecated)** — use `CODINGBUDDY_PROJECT_ROOT` env var instead |

## Specialist Agents Execution

Kiro does not have a `Task` tool for spawning background subagents. When `parse_mode` returns `parallelAgentsRecommendation`, execute specialists **sequentially**.

### Auto-Detection

The MCP server automatically detects Kiro as the client and returns a sequential execution hint in `parallelAgentsRecommendation.hint`. No manual configuration is needed.

### Sequential Workflow

```
parse_mode returns parallelAgentsRecommendation
  ↓
Call prepare_parallel_agents with recommended specialists
  ↓
For each specialist (sequentially):
  - Announce: "Analyzing from [icon] [specialist-name] perspective..."
  - Apply the specialist's system prompt as analysis context
  - Analyze the target code/design from that specialist's viewpoint
  - Record findings
  ↓
Consolidate all specialist findings into unified summary
```

### Example (EVAL mode)

```
parse_mode({ prompt: "EVAL review auth implementation" })
-> parallelAgentsRecommendation:
    specialists: ["security-specialist", "accessibility-specialist", "performance-specialist"]

prepare_parallel_agents({
  mode: "EVAL",
  specialists: ["security-specialist", "accessibility-specialist", "performance-specialist"]
})
-> agents[]: each has systemPrompt

Sequential analysis:
  1. 🔒 Security: Apply security-specialist prompt, analyze, record findings
  2. ♿ Accessibility: Apply accessibility-specialist prompt, analyze, record findings
  3. ⚡ Performance: Apply performance-specialist prompt, analyze, record findings

Present: Consolidated findings from all 3 specialists
```

### Consuming dispatchReady from parse_mode

When `parse_mode` returns `dispatchReady`, the specialist system prompts are pre-built. In Kiro, use the `dispatchParams.prompt` field as analysis context (ignore `subagent_type` — it is Claude Code specific):

```
parse_mode returns dispatchReady
  ↓
dispatchReady.primaryAgent
  → Use as the main analysis context
  ↓
dispatchReady.parallelAgents[] (if present)
  → For each: the dispatchParams.prompt field contains the specialist's system prompt.
    Apply the prompt as analysis context, analyze sequentially, record findings
  ↓
Consolidate all findings
```

> **Fallback:** If `dispatchReady` is not present in the `parse_mode` response, call `prepare_parallel_agents` MCP tool to retrieve specialist system prompts.

### Visibility Pattern

When executing sequential specialists, display clear status messages:

**Start:**
```
🔄 Executing N specialist analyses sequentially...
   → 🔒 security-specialist
   → ♿ accessibility-specialist
   → ⚡ performance-specialist
```

**During:**
```
🔍 Analyzing from 🔒 security-specialist perspective... (1/3)
```

**Completion:**
```
📊 Specialist Analysis Complete:

🔒 Security:
   [findings summary]

♿ Accessibility:
   [findings summary]

⚡ Performance:
   [findings summary]
```

### Handling Failures

When `prepare_parallel_agents` returns `failedAgents`:

```
⚠️ Some agents failed to load:
   ✗ performance-specialist: Profile not found

Continuing with 2/3 agents...
```

**Strategy:**
- Continue with successfully loaded agents
- Report failures clearly to user
- Document which agents couldn't be loaded in final report

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
| 📨 | event-architecture-specialist |
| 🔗 | integration-specialist |
| 📊 | observability-specialist |
| 🔄 | migration-specialist |
| 🌐 | i18n-specialist |

### When to Use Specialist Execution

Specialist execution is recommended when `parse_mode` returns a `parallelAgentsRecommendation` field:

| Mode | Default Specialists | Use Case |
|------|---------------------|----------|
| **PLAN** | architecture-specialist, test-strategy-specialist | Validate architecture and test approach |
| **ACT** | code-quality-specialist, test-strategy-specialist | Verify implementation quality |
| **EVAL** | security-specialist, accessibility-specialist, performance-specialist, code-quality-specialist | Comprehensive multi-dimensional review |

### Specialist Activation Scope

Each workflow mode activates different specialist agents:

- **PLAN mode**: Architecture and test strategy specialists validate design
- **ACT mode**: Code quality and test strategy specialists verify implementation
- **EVAL mode**: Security, accessibility, performance, and code quality specialists provide comprehensive review

**Important:** Specialists from one mode do NOT carry over to the next mode. Each mode has its own recommended specialist set.

## Skills

Kiro accesses codingbuddy skills through three patterns:

1. **Auto-recommend** — AI calls `recommend_skills` based on intent detection
2. **Browse and select** — User calls `list_skills` to discover, then `get_skill` to load
3. **Slash-command** — User types `/<command>`, AI maps to `get_skill`

### Using Skills in Kiro

**Method 1: MCP Tool Chain (End Users — Recommended)**

The AI should follow this chain when a skill might apply:

1. `recommend_skills({ prompt: "user's message" })` — Get skill recommendations
2. `get_skill("skill-name")` — Load the recommended skill's full content
3. Follow the skill instructions in the response

Example flow:
```
User: "There is a bug in the authentication logic"
-> AI calls recommend_skills({ prompt: "There is a bug in the authentication logic" })
-> Response: { recommendations: [{ skillName: "systematic-debugging", ... }], nextAction: "Call get_skill..." }
-> AI calls get_skill("systematic-debugging")
-> AI follows the systematic-debugging skill instructions
```

**Method 2: File Reference (Monorepo Contributors Only)**

Reference skill files directly from `.ai-rules/skills/` directory in your prompts.

> **Note:** `parse_mode` already embeds matched skill content in `included_skills` — no separate `get_skill` call needed when using mode keywords (PLAN/ACT/EVAL/AUTO).

### Skill Discovery

Use `list_skills` to browse available skills before deciding which one to load:

```
list_skills()                                    # Browse all skills
list_skills({ minPriority: 1, maxPriority: 3 })  # Filter by priority
```

**Discovery flow:**

1. `list_skills()` — Browse available skills and descriptions
2. Identify the skill relevant to the current task
3. `get_skill("skill-name")` — Load the full skill content
4. Follow the skill instructions

> **Tip:** Use `recommend_skills` when you want AI to automatically pick the best skill. Use `list_skills` when you want to manually browse and select.

### Slash-Command Mapping

Kiro has no native slash-command skill invocation. When a user types `/<command>`, the AI must call `get_skill` to replicate the behavior of Claude Code's built-in Skill tool.

**Rule:** When user input matches `/<command>`, call `get_skill("<skill-name>")` and follow the returned instructions. This table is a curated subset — use `list_skills()` to discover all available skills.

| User Types | MCP Call |
|---|---|
| `/debug` or `/debugging` | `get_skill("systematic-debugging")` |
| `/tdd` | `get_skill("test-driven-development")` |
| `/brainstorm` | `get_skill("brainstorming")` |
| `/plan` or `/write-plan` | `get_skill("writing-plans")` |
| `/execute` or `/exec` | `get_skill("executing-plans")` |
| `/design` or `/frontend` | `get_skill("frontend-design")` |
| `/refactor` | `get_skill("refactoring")` |
| `/security` or `/audit` | `get_skill("security-audit")` |
| `/pr` | `get_skill("pr-all-in-one")` |
| `/review` or `/pr-review` | `get_skill("pr-review")` |
| `/parallel` or `/agents` | `get_skill("dispatching-parallel-agents")` |
| `/subagent` | `get_skill("subagent-driven-development")` |

For unrecognized slash commands, call `recommend_skills({ prompt: "<user's full message>" })` to find the closest match.

> **Disambiguation:** `/plan` (with slash prefix) triggers `get_skill("writing-plans")`. `PLAN` (without slash, at message start) triggers `parse_mode`. Similarly, `/execute` triggers `get_skill("executing-plans")` while `ACT` triggers `parse_mode`. The slash prefix is the distinguishing signal.

### Proactive Skill Activation

Kiro lacks session hooks that automatically enforce skill invocation (unlike Claude Code). The AI must detect intent patterns and call `recommend_skills` proactively — without waiting for the user to explicitly request a skill.

**Rule:** When the user's message suggests a skill would help, call `recommend_skills` at the start of the response — before any other action. The `recommend_skills` engine matches trigger patterns across multiple languages and is the authoritative source of truth.

Common trigger examples (not exhaustive):

| User Intent Signal | Likely Skill |
|---|---|
| Bug report, error, "not working", exception | `systematic-debugging` |
| "Brainstorm", "build", "create", "implement" | `brainstorming` |
| "Test first", TDD, write tests before code | `test-driven-development` |
| "Plan", "design", implementation approach | `writing-plans` |
| PR, commit, code review workflow | `pr-all-in-one` |

```
User: "I need to plan the implementation for user authentication"
-> AI calls recommend_skills({ prompt: "plan implementation for user authentication" })
-> Loads writing-plans via get_skill
-> Follows skill instructions to create structured plan
```

> **Note:** When the user message starts with a mode keyword (`PLAN`, `ACT`, `EVAL`, `AUTO`), `parse_mode` already handles skill matching automatically via `included_skills` — no separate `recommend_skills` call is needed.

### Available Skills

Highlighted skills (use `list_skills()` for the complete list):

- `brainstorming/SKILL.md` - Idea → Design
- `test-driven-development/SKILL.md` - TDD workflow
- `systematic-debugging/SKILL.md` - Systematic debugging
- `writing-plans/SKILL.md` - Implementation plan writing
- `executing-plans/SKILL.md` - Plan execution
- `subagent-driven-development/SKILL.md` - Subagent development
- `dispatching-parallel-agents/SKILL.md` - Parallel Agent dispatch
- `frontend-design/SKILL.md` - Frontend design

## AGENTS.md

Industry standard format compatible with all AI tools (Kiro, Cursor, Claude Code, Codex, etc.):

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

Create `.claude/pr-config.json` in your project root (this path is used by the skill regardless of IDE). Required settings:
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

Reference skill files in Kiro by accessing `.ai-rules/skills/pr-all-in-one/` directory.

## AUTO Mode

AUTO mode enables autonomous PLAN → ACT → EVAL cycling until quality criteria are met.

### Triggering AUTO Mode

Use the `AUTO` keyword (or localized versions) at the start of your message:

| Language | Keyword |
|----------|---------|
| English | `AUTO` |
| Korean | `AUTO` |
| Japanese | `自動` |
| Chinese | `自动` |
| Spanish | `AUTOMÁTICO` |

### Example Usage

```
AUTO implement user authentication feature
```

```
AUTO implement user authentication feature
```

When AUTO keyword is detected, Kiro calls `parse_mode` MCP tool which returns AUTO mode instructions.

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

> **Kiro limitation:** AUTO mode has no enforcement loop mechanism. See [Known Limitations](#known-limitations) for details.

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

### Kiro-Specific Note

Unlike Claude Code, Kiro has no hooks to enforce `update_context` calls. You must **manually remember** to call `update_context` before concluding each mode to avoid losing context across sessions.

## Known Limitations

Kiro environment does not support several features available in Claude Code:

| Feature | Status | Workaround |
|---------|--------|------------|
| **Task tool** (background subagents) | ❌ Not available | Use `prepare_parallel_agents` for sequential execution |
| **Native Skill tool** (`/skill-name`) | ❌ Not available | Use MCP tool chain: `recommend_skills` → `get_skill` |
| **Session hooks** (PreToolUse, etc.) | ❌ Not available | Rely on `.kiro/rules/guidelines.md` for always-on instructions |
| **Autonomous loop mechanism** | ❌ Not available | AUTO mode depends on Kiro AI voluntarily looping |
| **Context compaction hooks** | ❌ Not available | Manually call `update_context` before ending each mode |
| **`dispatch_agents` full usage** | ⚠️ Partial | Use `dispatchReady.dispatchParams.prompt` as analysis context; `prepare_parallel_agents` as fallback |
| **`restart_tui`** | ❌ Not applicable | Claude Code TUI-only tool |

### AUTO Mode Reliability

AUTO mode documents autonomous PLAN → ACT → EVAL cycling. In Kiro, this depends entirely on the AI model voluntarily continuing the loop — there is no enforcement mechanism like Claude Code's hooks. Results may vary:

- The AI may stop after one iteration instead of looping
- Quality exit criteria (`Critical = 0 AND High = 0`) are advisory, not enforced
- For reliable multi-iteration workflows, prefer manual `PLAN` → `ACT` → `EVAL` cycling

## Kiro-Specific Advantages

Kiro provides unique capabilities that complement codingbuddy's workflow:

### Powers

Self-contained MCP server packages with documentation. Powers extend Kiro's capabilities with pre-built integrations (e.g., AWS, database tools) that can work alongside codingbuddy's MCP tools.

### Hooks

Event-driven automation that triggers on specific events:
- `onFileChange` - React to file modifications
- `onSave` - Run actions when files are saved
- Custom event hooks for CI/CD integration

Hooks can automate quality checks that complement codingbuddy's EVAL mode.

### Steering

Structured development workflow with:
- **Specs** - Requirements specification documents
- **Design docs** - Architecture and design decisions
- **Task lists** - Structured task breakdown and tracking

Steering aligns well with codingbuddy's PLAN mode for structured implementation planning.

### Agent-Native

Kiro is built as an agent-native IDE with:
- Built-in AI agent with tool permissions
- Natural language task execution
- Integrated tool approval workflow

This agent-native architecture provides a natural fit for codingbuddy's agent-based workflow system.

## Verification Status

> Initial documentation based on code analysis and Kiro public documentation. Runtime verification pending.

| Pattern | Status | Notes |
|---------|--------|-------|
| MCP Configuration | ✅ Documented | `.kiro/settings/mcp.json` with `CODINGBUDDY_PROJECT_ROOT` |
| `CODINGBUDDY_PROJECT_ROOT` guidance | ✅ Documented | Priority and fallback behavior explained |
| MCP Tools Table | ✅ Documented | All 17 tools documented |
| Specialist Agents Execution | ✅ Documented | Sequential workflow, dispatchReady, visibility, failures, activation scope |
| Context Document Management | ✅ Documented | With Kiro-specific guidance |
| Known Limitations | ✅ Added | Task tool, hooks, AUTO mode limitations |
| Kiro Powers integration | ⚠️ Unverified | Documented but not tested in live environment |
| `roots/list` support | ⚠️ Unknown | Not confirmed in Kiro documentation |
| AUTO mode reliability | ⚠️ Documented with caveat | No enforcement mechanism in Kiro |

## Getting Started

1. Ensure `.ai-rules/` directory exists with all common rules
2. Configure MCP server in `.kiro/settings/mcp.json`:
   ```json
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
3. (Optional) Create `.kiro/rules/guidelines.md` for always-on instructions
4. Start a Kiro session — MCP tools are now available
5. Use PLAN/ACT/EVAL/AUTO workflow via `parse_mode` MCP tool

## Reference

- [Kiro MCP Configuration Documentation](https://kiro.dev/docs/mcp/configuration/)
- [codingbuddy MCP API](../../docs/api.md)
