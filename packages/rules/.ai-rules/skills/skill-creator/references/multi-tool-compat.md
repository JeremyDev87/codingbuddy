# Multi-Tool Compatibility Matrix

Skill compatibility matrix across 6 AI tools, loading method comparison, and MCP server integration guide.

## Table of Contents

- [Compatibility Matrix](#compatibility-matrix)
  - [Skill Loading Feature Support](#skill-loading-feature-support)
  - [Frontmatter Field Support](#frontmatter-field-support)
- [Skill Loading Methods](#skill-loading-methods)
  - [Loading Flow by Tool](#loading-flow-by-tool)
  - [Slash Command Mapping](#slash-command-mapping)
  - [Auto-Recommendation](#auto-recommendation)
- [codingbuddy MCP Server Integration](#codingbuddy-mcp-server-integration)
  - [MCP Configuration by Tool](#mcp-configuration-by-tool)
  - [Core MCP Tools](#core-mcp-tools)
  - [Specialist Agent Execution](#specialist-agent-execution)
  - [Context Document Management](#context-document-management)
- [Per-Tool Guide](#per-tool-guide)
- [Tool-Specific Limitations](#tool-specific-limitations)
- [Cross-Tool Skill Writing Guide](#cross-tool-skill-writing-guide)

---

## Compatibility Matrix

### Skill Loading Feature Support

Feature support status for skill loading across each tool:

| Feature | Claude Code | Cursor | Codex | Amazon Q | Kiro | Antigravity |
|---------|:-----------:|:------:|:-----:|:--------:|:----:|:-----------:|
| SKILL.md auto-discovery | ✅ `.claude/skills/` | ❌ | ❌ | ❌ | ❌ | ❌ |
| Frontmatter parsing | ✅ Full | ⚠️ name/description | ❌ | ❌ | ⚠️ | ❌ |
| `disable-model-invocation` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `context: fork` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `allowed-tools` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Reference file access | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| MCP-based loading (`get_skill`) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

**Legend:** ✅ Supported | ⚠️ Partial support | ❌ Not supported

**Key differences:**
- Only **Claude Code** supports native SKILL.md parsing (including frontmatter and reference files)
- The **other 5 tools** load skills through the codingbuddy MCP server's `get_skill` tool
- MCP-based loading works identically across all tools

### Frontmatter Field Support

Auto-application status of each frontmatter field by tool:

| Field | Claude Code | Cursor | Codex | Amazon Q | Kiro | Antigravity |
|-------|:-----------:|:------:|:-----:|:--------:|:----:|:-----------:|
| `name` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `description` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `argument-hint` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `allowed-tools` | ✅ | ⚠️ | ⚠️ | ❌ | ⚠️ | ⚠️ |
| `model` | ✅ | ⚠️ | ⚠️ | ❌ | ❌ | ❌ |
| `effort` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `context` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `agent` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `disable-model-invocation` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `user-invocable` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `hooks` | ✅ | ⚠️ | ❌ | ❌ | ✅ | ❌ |

**⚠️ Partial support details:**
- **Cursor `allowed-tools`**: Recognizes tool names but does not support Bash filters (`Bash(git:*)`)
- **Cursor `model`**: Can switch models but not auto-applied from frontmatter
- **Cursor `hooks`**: Similar functionality achievable via `.mdc` rule glob patterns
- **Codex `allowed-tools`/`model`**: Can reference from system prompt but auto-application not supported
- **Kiro `allowed-tools`**: Recognizes tool restrictions but does not support Bash filters
- **Kiro `hooks`**: Supports event-based hooks (`onFileChange`, `onSave`)
- **Antigravity `allowed-tools`**: Recognizes tool names but auto-application not supported

---

## Skill Loading Methods

### Loading Flow by Tool

#### Claude Code

```
User: /skill-name [args]
  │
  ├─ (1) Native Skill tool direct invocation (priority)
  │     └─ Load SKILL.md → Parse frontmatter → Access reference files → Execute
  │
  └─ (2) MCP chain (fallback path)
        └─ recommend_skills → get_skill → Return content
```

**Characteristics:**
- Native Skill tool takes highest priority
- Automatically creates sub-agent when `context: fork`
- `allowed-tools` auto-applied
- `model`/`effort` auto-switched
- Direct access to reference files (`references/` directory)

#### Cursor

```
User: /skill-name [args]
  │
  └─ MCP chain
        └─ recommend_skills({ prompt }) → get_skill(name) → Display content
```

**Characteristics:**
- MCP call guide included in `.mdc` rules
- Glob-based auto-activation (`.cursor/rules/auto-agent.mdc`)
- No parallel execution → Sequential execution only

#### Codex

```
User: /skill-name [args]
  │
  └─ MCP chain
        └─ recommend_skills({ prompt }) → get_skill(name) → Include in system prompt
```

**Characteristics:**
- Keyword rules included in system prompt (`.codex/rules/system-prompt.md`)
- Sequential execution only
- Korean/English dual language support

#### Amazon Q

```
User: skill request
  │
  ├─ MCP chain (when configured)
  │     └─ recommend_skills → get_skill → Reference content
  │
  └─ Direct reference (fallback)
        └─ Read .ai-rules/ directory directly
```

**Characteristics:**
- MCP configuration is optional
- Can reference directly from `.q/rules/customizations.md`
- AWS service-specific features

#### Kiro

```
User: /skill-name [args]
  │
  └─ MCP chain
        └─ recommend_skills → get_skill → Return content
```

**Characteristics:**
- MCP server configured in `.kiro/settings/mcp.json`
- Event-based hooks (`onFileChange`, `onSave`) supported
- Steering (specs, design docs) integration

#### Antigravity

```
User: /skill-name [args]
  │
  └─ MCP chain
        └─ recommend_skills → get_skill → Return content
```

**Characteristics:**
- Progress tracking via `task_boundary` tool
- Artifact management capabilities
- Sequential execution (no parallel support)

### Slash Command Mapping

Skills can be invoked using the `/skill-name` format across all tools:

| Tool | Native slash command | MCP-routed slash command |
|------|---------------------|------------------------|
| Claude Code | ✅ (Skill tool) | ✅ (fallback) |
| Cursor | ❌ | ✅ (MCP chain) |
| Codex | ❌ | ✅ (MCP chain) |
| Amazon Q | ❌ | ✅ (MCP chain) |
| Kiro | ❌ | ✅ (MCP chain) |
| Antigravity | ❌ | ✅ (MCP chain) |

### Auto-Recommendation

Auto-recommendation via `included_skills` in the `parse_mode` response:

```
User: "PLAN implement auth feature"
  │
  └─ parse_mode({ prompt: "PLAN implement auth feature" })
        └─ Response includes included_skills[]
              ├─ security-audit (confidence: high)
              ├─ test-driven-development (confidence: medium)
              └─ api-design (confidence: medium)
```

This feature works identically across all 6 tools.

---

## codingbuddy MCP Server Integration

### MCP Configuration by Tool

#### Claude Code

```json
// .claude/config.json (IDE-level configuration)
{
  "mcpServers": {
    "codingbuddy": {
      "command": "npx",
      "args": ["-y", "codingbuddy-rules"],
      "env": {
        "CODINGBUDDY_PROJECT_ROOT": "/path/to/project"
      }
    }
  }
}
```

#### Cursor

```json
// .cursor/mcp.json
{
  "mcpServers": {
    "codingbuddy": {
      "command": "npx",
      "args": ["-y", "codingbuddy-rules"],
      "env": {
        "CODINGBUDDY_PROJECT_ROOT": "${workspaceFolder}"
      }
    }
  }
}
```

#### Codex

```json
// GitHub Copilot MCP configuration
{
  "mcpServers": {
    "codingbuddy": {
      "command": "npx",
      "args": ["-y", "codingbuddy-rules"],
      "env": {
        "CODINGBUDDY_PROJECT_ROOT": "/path/to/project"
      }
    }
  }
}
```

#### Amazon Q

```json
// AWS Q MCP configuration
{
  "mcpServers": {
    "codingbuddy": {
      "command": "npx",
      "args": ["-y", "codingbuddy-rules"],
      "env": {
        "CODINGBUDDY_PROJECT_ROOT": "/path/to/project"
      }
    }
  }
}
```

#### Kiro

```json
// .kiro/settings/mcp.json
{
  "mcpServers": {
    "codingbuddy": {
      "command": "npx",
      "args": ["-y", "codingbuddy-rules"],
      "env": {
        "CODINGBUDDY_PROJECT_ROOT": "${workspaceFolder}"
      }
    }
  }
}
```

#### Antigravity

```json
// .antigravity/config.json
{
  "mcpServers": {
    "codingbuddy": {
      "command": "npx",
      "args": ["-y", "codingbuddy-rules"],
      "env": {
        "CODINGBUDDY_PROJECT_ROOT": "/path/to/project"
      }
    }
  }
}
```

**Project root resolution priority:**
1. `CODINGBUDDY_PROJECT_ROOT` environment variable (highest priority)
2. `roots/list` MCP capability (supported by some tools)
3. `findProjectRoot()` auto-detection (fallback)

### Core MCP Tools

codingbuddy MCP tools available across all tools:

| Tool | Purpose | When to use |
|------|---------|-------------|
| `parse_mode` | Workflow mode parsing (PLAN/ACT/EVAL/AUTO) | Immediately upon keyword detection |
| `recommend_skills` | Prompt-based skill recommendation | When searching for skills |
| `get_skill` | Load full skill content | After reviewing recommendation results |
| `list_skills` | Query full skill list | When exploring skills |
| `search_rules` | Search rules | When checking relevant rules |
| `get_agent_details` | Query agent profile | When agent information is needed |
| `get_project_config` | Query project configuration | When checking tech stack/language |
| `update_context` | Update context document | When completing each mode |
| `dispatch_agents` | Agent dispatch parameters | For parallel/sequential execution |
| `prepare_parallel_agents` | Prepare parallel agent prompts | For sequential execution |
| `generate_checklist` | Generate domain-specific checklists | For quality verification |
| `analyze_task` | Pre-analysis and risk assessment | When starting PLAN |

### Specialist Agent Execution

Specialist agent execution patterns by tool:

| Tool | Execution method | Dispatch source |
|------|-----------------|-----------------|
| Claude Code | **Parallel** (Task tool + `run_in_background`) | `dispatchReady.dispatchParams` |
| Cursor | **Sequential** (one at a time) | `prepare_parallel_agents` prompts |
| Codex | **Sequential** (one at a time) | `dispatchReady.dispatchParams.prompt` |
| Amazon Q | **Sequential** (one at a time) | `prepare_parallel_agents` prompts |
| Kiro | **Sequential** (one at a time) | `dispatchReady.dispatchParams.prompt` |
| Antigravity | **Sequential** (one at a time) | `dispatchReady.dispatchParams.prompt` |

**Claude Code (parallel):**
```
parse_mode → dispatchReady
  ├─ primaryAgent.dispatchParams → Task tool
  ├─ parallelAgents[0].dispatchParams → Task tool (background)
  ├─ parallelAgents[1].dispatchParams → Task tool (background)
  └─ Collect results with TaskOutput
```

**Other tools (sequential):**
```
parse_mode → dispatchReady
  ├─ primaryAgent.dispatchParams.prompt → Direct execution
  ├─ parallelAgents[0].dispatchParams.prompt → Sequential execution
  └─ parallelAgents[1].dispatchParams.prompt → Sequential execution
```

### Context Document Management

Cross-mode context management via `docs/codingbuddy/context.md`:

| Tool | Auto context management | Enforcement | update_context call |
|------|------------------------|-------------|---------------------|
| Claude Code | ✅ (`parse_mode` auto) | ✅ (enforced via hooks) | Required |
| Cursor | ✅ (`parse_mode` auto) | ❌ (voluntary) | Recommended |
| Codex | ✅ (`parse_mode` auto) | ❌ (voluntary) | Recommended |
| Amazon Q | ✅ (`parse_mode` auto) | ❌ (voluntary) | Recommended |
| Kiro | ✅ (`parse_mode` auto) | ❌ (voluntary) | Recommended |
| Antigravity | ✅ (`parse_mode` auto) | ❌ (voluntary) | Required (before `task_boundary`) |

---

## Per-Tool Guide

How to use skill-creator with each tool:

### Claude Code

```bash
# Direct invocation (native)
/skill-creator create my-skill

# MCP-routed
# recommend_skills → get_skill auto chain
```

- All frontmatter fields auto-applied
- Direct access to reference files (`references/` directory)
- Isolated execution possible with `context: fork`

### Cursor, Codex, Amazon Q, Kiro, Antigravity

```
# Load skill via MCP chain
1. recommend_skills({ prompt: "create a new skill" })
2. get_skill("skill-creator") → Returns SKILL.md body
3. Follow the returned instructions to write the skill
```

- Only SKILL.md body is returned (reference files require separate `get_skill` requests)
- Frontmatter is referenced as a guide (not auto-applied)
- Sequential execution only

---

## Tool-Specific Limitations

### Claude Code
- **Strengths**: Only tool with native SKILL.md parsing, parallel agents, hook enforcement, full frontmatter support
- **Limitations**: None (all features supported)

### Cursor
- **Strengths**: Glob-based rule auto-activation, `.mdc` rule system
- **Limitations**: No parallel execution, `context`/`agent`/`effort` not supported, Bash filters not supported

### Codex
- **Strengths**: Deep integration via system prompt, Korean/English dual language support
- **Limitations**: No parallel execution, session hooks not supported, frontmatter auto-application not available

### Amazon Q
- **Strengths**: Native AWS service integration
- **Limitations**: MCP configuration is optional, frontmatter auto-application not supported

### Kiro
- **Strengths**: Event-based hooks, steering integration, `${workspaceFolder}` variable support
- **Limitations**: No parallel execution, `context`/`agent`/`effort` not supported

### Antigravity
- **Strengths**: `task_boundary` progress tracking, artifact management
- **Limitations**: No parallel execution, hooks not supported, frontmatter auto-application not supported

---

## Cross-Tool Skill Writing Guide

Guidelines for writing skills compatible across all 6 tools.

### Required Rules

1. **Always include `name` and `description`** — Required by all tools
2. **Use standard markdown syntax** — Do not use tool-specific extended syntax
3. **Do not reference tool-specific APIs** — Do not use Claude Code-specific terms like `Task tool`, `Agent tool` in skill body

### Recommended Rules

1. **Use only basic tool names for `allowed-tools`** — Bash filters (`Bash(git:*)`) are Claude Code-specific
2. **Treat `context`/`agent` as Claude Code bonuses** — Design to work without them
3. **Treat `hooks` as optional enhancements** — Ignored in unsupported tools
4. **Treat `model`/`effort` as hints** — Not auto-applied in most tools

### Compatibility Checklist

```
- [ ] Is the skill's purpose clear from name and description alone?
- [ ] Can the skill content be understood without MCP tools?
- [ ] Does it avoid depending on tool-specific features?
- [ ] Does it work in sequential execution? (no parallel assumptions)
- [ ] Is security maintained without Bash filters?
- [ ] Is the description written in third-person narration?
```

### Frontmatter Compatibility Tiers

| Tier | Fields | Number of tools with auto-application |
|------|--------|--------------------------------------|
| **Universal** | `name`, `description`, `disable-model-invocation`, `user-invocable` | 6/6 |
| **Broad** | `argument-hint` | 6/6 (UI display only) |
| **Moderate** | `allowed-tools` (basic), `model`, `hooks` | 1-3/6 |
| **Claude Code Only** | `context`, `agent`, `effort`, `allowed-tools` (Bash filters) | 1/6 |

**Recommended strategy when writing skills:**
- **Ensure core behavior with Universal tier fields**
- **Add higher-tier fields as optional enhancements**
- **Use Claude Code Only fields for UX optimization in that tool**
