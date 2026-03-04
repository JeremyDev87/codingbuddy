# GitHub Copilot / Codex Integration Guide

This guide explains how to use the common AI rules (`.ai-rules/`) with GitHub Copilot and Codex.

## Overview

codingbuddy integrates with GitHub Copilot / Codex in two ways:

1. **`.codex/rules/system-prompt.md`** - Codex system prompt (always-on instructions)
2. **MCP Server** - codingbuddy MCP tools for workflow management

## Two Usage Contexts

### End Users (Your Project)

End users access rules **only through MCP tools**. No local rule files needed.

```jsonc
// Codex MCP configuration
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

> **Important:** Codex(GitHub Copilot)의 `roots/list` MCP capability 지원 여부는 미확인입니다.
> `CODINGBUDDY_PROJECT_ROOT` 없이는 서버가 프로젝트의 `codingbuddy.config.json`을 찾지 못하여
> `language` 등 설정이 기본값으로 동작합니다. 항상 이 환경변수를 프로젝트의 절대 경로로 설정하세요.
> Codex가 `${workspaceFolder}` 변수 확장을 지원하는 경우, 절대 경로 대신 사용할 수 있습니다.

### Monorepo Contributors

Contributors to the codingbuddy repository can use direct file references:

```
Project Root/
├── .codex/
│   └── rules/
│       └── system-prompt.md        # References .ai-rules
└── packages/rules/.ai-rules/      # Single Source of Truth
```

## DRY Principle

**Single Source of Truth**: `packages/rules/.ai-rules/`

- All Agent definitions, rules, skills managed only in `.ai-rules/`
- `.codex/rules/system-prompt.md` acts as a **pointer only**
- No duplication, only references

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

## Configuration Files

### MCP Server Configuration

See the MCP configuration in the [End Users](#end-users-your-project) section above.

**Project root resolution priority** (in `mcp.service.ts`):
1. `CODINGBUDDY_PROJECT_ROOT` environment variable (highest priority)
2. `roots/list` MCP capability (support unconfirmed in Codex)
3. `findProjectRoot()` automatic detection (fallback)

### .codex/rules/system-prompt.md

System prompt providing context for Codex:

- Common AI rules reference from `.ai-rules/`
- PLAN/ACT/EVAL workflow modes
- Keyword Invocation support
- TDD and code quality guidelines
- Specialist agents reference

**File location**: `.codex/rules/system-prompt.md`

### Detailed Guides

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

### Available MCP Tools

For the full list of available tools, see [docs/codex-adapter-configuration.md](../../docs/codex-adapter-configuration.md#available-mcp-tools).

Key tools:

| Tool | Description |
|------|-------------|
| `parse_mode` | **MANDATORY.** Parse PLAN/ACT/EVAL/AUTO keywords and return mode-specific rules, agent, and context |
| `search_rules` | Search for rules and guidelines |
| `get_project_config` | Get project configuration including tech stack, architecture, conventions, and language settings |
| `set_project_root` | ~~Set project root directory~~ **(deprecated — will be removed in v2.0.0)** — use `CODINGBUDDY_PROJECT_ROOT` env var or `--project-root` CLI flag instead |
| `recommend_skills` | Recommend skills based on user prompt with multi-language support |
| `get_skill` | Get skill content by name (returns full skill definition including instructions) |
| `list_skills` | List all available skills with optional filtering by priority |
| `get_agent_details` | Get detailed profile of a specific AI agent |
| `get_agent_system_prompt` | Get complete system prompt for a specialist agent |
| `prepare_parallel_agents` | Prepare multiple specialist agents with system prompts for execution (**recommended for Codex** — use for sequential specialist analysis) |
| `dispatch_agents` | Get Task-tool-ready dispatch parameters for agents (optimized for Claude Code Task tool; in Codex, prefer `prepare_parallel_agents`) |
| `generate_checklist` | Generate contextual checklists based on file patterns and domains (security, a11y, performance, testing, code-quality, SEO) |
| `analyze_task` | Analyze a task for risk assessment, relevant checklists, specialist recommendations, and workflow suggestions |
| `get_code_conventions` | Get project code conventions from config files (tsconfig, eslint, prettier) |
| `suggest_config_updates` | Analyze the project and suggest config updates based on detected changes (new frameworks, dependencies, patterns) |
| `read_context` | Read current context document (`docs/codingbuddy/context.md`) with verbosity control |
| `update_context` | **MANDATORY at mode end.** Update context document with decisions, notes, progress, findings |
| `cleanup_context` | Manually trigger context document cleanup (summarizes older sections to reduce size) |

## Specialist Agents Execution

Codex does not have a `Task` tool for spawning background subagents. When `parse_mode` returns `parallelAgentsRecommendation`, execute specialists **sequentially**.

### Auto-Detection

The MCP server automatically detects Codex as the client and returns a sequential execution hint in `parallelAgentsRecommendation.hint`. No manual configuration is needed.

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

### Using dispatchReady (Auto-Dispatch)

When `parse_mode` returns a `dispatchReady` field, use it directly without calling `prepare_parallel_agents`:

```
parse_mode returns dispatchReady
  ↓
Use dispatchReady.primaryAgent.dispatchParams.prompt as primary analysis context
  ↓
For each dispatchReady.parallelAgents[] (sequentially):
  - Apply dispatchParams.prompt as specialist analysis context
  - Analyze from that specialist's viewpoint
  - Record findings
  ↓
Consolidate all findings
```

**Key fields:**
- `dispatchReady.primaryAgent.dispatchParams.prompt` — Primary agent system prompt. Use as the main analysis context.
- `dispatchReady.parallelAgents[].dispatchParams.prompt` — Each specialist's system prompt. Apply as analysis context for sequential execution.
- `subagent_type` — Claude Code Task tool parameter. **Ignore in Codex.**

> **Known limitation:** Codex cannot execute specialists in parallel. The `parallelAgents[]` array is consumed sequentially. True parallel execution requires Claude Code's Task tool.
>
> **Fallback:** If `dispatchReady` is not present in the `parse_mode` response, call `prepare_parallel_agents` MCP tool to retrieve specialist system prompts.

### Visibility Pattern

**Start Message:**
```
🚀 Running N specialist analyses sequentially...
   → [icon] [specialist-name]
   → [icon] [specialist-name]
   → [icon] [specialist-name]
```

**Per-Specialist:**
```
🔍 Analyzing from [icon] [specialist-name] perspective...

[Analysis content]
```

**Completion Message:**
```
📊 Specialist Analysis Complete:

[icon] [Specialist Name]:
   [findings summary]

[icon] [Specialist Name]:
   [findings summary]
```

### Handling Failures

When `prepare_parallel_agents` returns `failedAgents`:

```
⚠️ Some agents failed to load:
   ✗ performance-specialist: Profile not found

Continuing with 3/4 agents...
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

## AGENTS.md

Industry standard format compatible with all AI tools (Codex, Cursor, Claude Code, Kiro, etc.):

```markdown
# AGENTS.md

This project uses codingbuddy MCP server to manage AI Agents.

## Quick Start
...
```

See `AGENTS.md` in project root for details.

## Skills

Codex accesses codingbuddy skills through three patterns:

1. **Auto-recommend** — AI calls `recommend_skills` based on intent detection
2. **Browse and select** — User calls `list_skills` to discover, then `get_skill` to load
3. **Slash-command** — User types `/<command>`, AI maps to `get_skill`

### Using Skills in Codex

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

```bash
cat .ai-rules/skills/<skill-name>/SKILL.md
```

> ⚠️ This method only works when `.ai-rules/` directory exists locally (monorepo development).
> It will fail silently when codingbuddy is installed via npm (`npx codingbuddy`).
>
> **Note:** `parse_mode` already embeds matched skill content in `included_skills` — no separate `get_skill` call needed when using mode keywords (PLAN/ACT/EVAL/AUTO).

### Skill Discovery

Use `list_skills` to browse available skills before deciding which one to load:

```
AI calls list_skills()
→ Returns all skills with names, descriptions, and priority scores

# With filtering:
AI calls list_skills({ minPriority: 1, maxPriority: 3 })
→ Returns only skills within priority range

→ AI selects the most relevant skill
→ AI calls get_skill("selected-skill-name")
```

> **Tip:** Use `recommend_skills` when you want AI to automatically pick the best skill. Use `list_skills` when you want to manually browse and select.

### Slash-Command Mapping

Codex has no native slash-command skill invocation. When a user types `/<command>`, the AI must call `get_skill` — this is Codex's equivalent of Claude Code's built-in Skill tool.

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

Codex lacks session hooks that automatically enforce skill invocation (unlike Claude Code). The AI must detect intent patterns and call `recommend_skills` proactively — without waiting for the user to explicitly request a skill.

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
→ AI calls recommend_skills({ prompt: "plan implementation for user authentication" })
→ Loads writing-plans via get_skill
→ Follows skill instructions to create structured plan
```

> **Note:** When the user message starts with a mode keyword (`PLAN`, `ACT`, `EVAL`, `AUTO`), `parse_mode` already handles skill matching automatically via `included_skills` — no separate `recommend_skills` call is needed.

### Available Skills

Highlighted skills (use `list_skills()` for the complete list):

- `brainstorming` - Explore requirements before implementation
- `test-driven-development` - TDD workflow
- `systematic-debugging` - Debug methodically
- `writing-plans` - Create implementation plans
- `executing-plans` - Execute plans with checkpoints
- `subagent-driven-development` - In-session plan execution
- `dispatching-parallel-agents` - Handle parallel tasks
- `frontend-design` - Build production-grade UI
- `pr-all-in-one` - Unified commit and PR workflow

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

Create `.claude/pr-config.json` in your project root (this is the canonical path used by the pr-all-in-one skill across all AI tools). Required settings:
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

Use `get_skill('pr-all-in-one')` MCP tool to access the full skill documentation. This works in all environments (end users and monorepo contributors alike), unlike direct file access which only works when `.ai-rules/` exists locally.

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

### Codex-Specific Note

Unlike Claude Code, Codex has no hooks or enforcement mechanisms to ensure `update_context` is called. The AI must **voluntarily remember** to call `update_context` before concluding each mode. Without this call, decisions and progress from the current mode will be lost across sessions or context compaction.

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
AUTO implement user authentication with JWT
```

### Workflow

1. **PLAN Phase**: Creates implementation plan with quality criteria
2. **ACT Phase**: Executes implementation following TDD workflow
3. **EVAL Phase**: Evaluates quality against exit criteria
4. **Loop/Exit**: Continues cycling until:
   - Success: `Critical = 0 AND High = 0`
   - Failure: Max iterations reached (default: 3)

### Copilot Integration

When using GitHub Copilot Chat with AUTO mode:
- Copilot references `.ai-rules/rules/core.md` for workflow
- Applies `.ai-rules/rules/augmented-coding.md` TDD principles
- Uses project structure from `.ai-rules/rules/project.md`

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

> **Codex limitation:** AUTO mode has no enforcement mechanism in Codex. See [Known Limitations](#known-limitations) for details.

## Known Limitations

Codex environment does not support several features available in Claude Code:

| Feature | Status | Workaround |
|---------|--------|------------|
| **Task tool** (background subagents) | ❌ Not available | Use `prepare_parallel_agents` for sequential execution |
| **Native Skill tool** (`/skill-name`) | ❌ Not available | Use MCP tool chain: `recommend_skills` → `get_skill` |
| **Background subagent execution** | ❌ Not available | All specialist analyses run sequentially in the main thread |
| **Session hooks** (PreToolUse, etc.) | ❌ Not available | Rely on `.codex/rules/system-prompt.md` for always-on instructions |
| **Autonomous loop mechanism** | ❌ Not available | AUTO mode depends on Codex AI voluntarily looping |
| **Context compaction hooks** | ❌ Not available | Manually call `update_context` before ending each mode |
| **`dispatch_agents` full usage** | ⚠️ Partial | Returns Claude Code-specific `dispatchParams`; use `prepare_parallel_agents` instead |
| **`roots/list` MCP capability** | ⚠️ Unconfirmed | Set `CODINGBUDDY_PROJECT_ROOT` env var explicitly |
| **`restart_tui`** | ❌ Not applicable | Claude Code TUI-only tool; not functional in Codex |
| **Proactive skill detection** | ❌ No hooks | AI must call `recommend_skills` voluntarily based on intent |
| **Slash command native support** | ❌ Not available | Map `/<command>` to `get_skill` calls (see [Skills](#skills) section) |
| **`analyze_task` auto-invocation** | ❌ No hooks | AI must call at PLAN start voluntarily |

### AUTO Mode Reliability

AUTO mode documents autonomous PLAN → ACT → EVAL cycling. In Codex, this depends entirely on the AI model voluntarily continuing the loop — there is no enforcement mechanism like Claude Code's hooks. Results may vary:

- The AI may stop after one iteration instead of looping
- Quality exit criteria (`Critical = 0 AND High = 0`) are advisory, not enforced
- For reliable multi-iteration workflows, prefer manual `PLAN` → `ACT` → `EVAL` cycling

## Getting Started

1. Ensure `.ai-rules/` directory exists with all common rules
2. Configure MCP server with `CODINGBUDDY_PROJECT_ROOT`:
   ```jsonc
   // Codex MCP configuration
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
3. Verify `.codex/rules/system-prompt.md` references `.ai-rules/` correctly
4. Start a Codex session — MCP tools are now available
5. Use PLAN/ACT/EVAL/AUTO workflow via `parse_mode` MCP tool

## Verification Status

> Documentation based on MCP server source code analysis and Codex/GitHub Copilot public documentation. Runtime verification in a live Copilot + MCP environment has not yet been performed.

### Verification Levels

| Level | Meaning |
|-------|---------|
| ✅ Code-verified | Server-side code confirms the feature exists and returns expected data |
| ✅ Documented | Workflow documented based on design; runtime behavior not yet tested |
| ⚠️ Unconfirmed | Depends on Codex/Copilot capabilities not documented in public docs |
| ❌ Not supported | Feature confirmed unavailable in Codex environment |

### Feature Verification

| Pattern | Status | Notes |
|---------|--------|-------|
| MCP Tool Access | ✅ Code-verified | 19 tools registered in handlers; 18 applicable to Codex (`restart_tui` is Claude Code-only) |
| PLAN/ACT/EVAL Modes | ✅ Code-verified | `parse_mode` returns mode-specific rules, agent, context, and dispatchReady |
| Keyword Invocation | ⚠️ Unconfirmed | Depends on Copilot reliably calling `parse_mode` when mode keywords are detected |
| Skills (MCP Tools) | ✅ Code-verified | `recommend_skills` → `get_skill` tool chain returns correct data |
| Specialist Agents Execution | ✅ Documented | Sequential workflow with `prepare_parallel_agents`; not runtime-tested in Copilot |
| AUTO Mode | ⚠️ Unconfirmed | Depends on Copilot voluntarily continuing PLAN → ACT → EVAL loop |
| Context Document Management | ✅ Code-verified | `read_context`, `update_context`, `cleanup_context` tools exist and function |
| `roots/list` MCP Capability | ⚠️ Unconfirmed | Not confirmed in Codex/GitHub Copilot public documentation |
| Known Limitations | ✅ Documented | Task tool, hooks, AUTO mode, background subagent, dispatch_agents limitations |
| Task Tool / Background Subagent | ❌ Not supported | Sequential execution only; no parallel subagent spawning |

### Runtime Verification Checklist

To fully verify these patterns, test in VS Code with GitHub Copilot + codingbuddy MCP:

- [ ] Type `PLAN design auth` → Copilot calls `parse_mode` (check MCP logs with `MCP_DEBUG=1`)
- [ ] Type `EVAL review code` → Copilot calls `parse_mode` with EVAL mode
- [ ] Type `/debug` → Copilot calls `get_skill("systematic-debugging")`
- [ ] Type `AUTO implement feature` → Copilot attempts PLAN→ACT→EVAL loop
- [ ] Verify `prepare_parallel_agents` returns specialist prompts correctly
- [ ] Verify `update_context` persists across mode transitions
- [ ] Test `CODINGBUDDY_PROJECT_ROOT` env var resolution

## Reference

- [GitHub Copilot Documentation](https://docs.github.com/copilot)
- [codingbuddy Documentation](../../docs/)
- [Common AI Rules](../../packages/rules/.ai-rules/)
- [Agent Definitions](../../packages/rules/.ai-rules/agents/)
