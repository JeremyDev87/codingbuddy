# Codex Adapter Configuration Guide

This guide explains how to use the Codingbuddy MCP server in GitHub Copilot/Codex CLI environment.

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

### 2. MCP Server Connection (Recommended)

MCP server enables full codingbuddy features including workflow management and agent dispatch:

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

> **Important:** Codex(GitHub Copilot)의 `roots/list` MCP capability 지원 여부는 미확인입니다.
> `CODINGBUDDY_PROJECT_ROOT` 없이는 서버가 프로젝트의 `codingbuddy.config.json`을 찾지 못하여
> `language`, `primaryAgent` 등의 설정이 기본값으로 동작합니다. 항상 프로젝트의 절대 경로로 설정하세요.
> Codex가 `${workspaceFolder}` 변수 확장을 지원하는 경우, 절대 경로 대신 사용할 수 있습니다.

**Project root resolution priority:**
1. `CODINGBUDDY_PROJECT_ROOT` environment variable (highest priority)
2. `roots/list` MCP capability (support unconfirmed in Codex)
3. `findProjectRoot()` automatic detection (fallback)

## Available MCP Tools

Tools available when connected to MCP server:

| Tool | Description |
|------|-------------|
| `parse_mode` | Parse PLAN/ACT/EVAL/AUTO keywords and return mode-specific rules |
| `search_rules` | Search rules and guidelines |
| `get_agent_details` | Get detailed profile of a specific AI agent |
| `get_project_config` | Get project configuration (tech stack, language, etc.) |
| `suggest_config_updates` | Analyze project and suggest config updates based on detected changes |
| `recommend_skills` | Recommend skills based on user prompt with multi-language support |
| `list_skills` | List all available skills with optional filtering |
| `get_skill` | Get skill content by name |
| `get_agent_system_prompt` | Get complete system prompt for a specialist agent |
| `prepare_parallel_agents` | Prepare specialist agents for sequential execution (recommended for Codex) |
| `dispatch_agents` | Get dispatch parameters for agents (Claude Code Task tool optimized; in Codex, use `prepare_parallel_agents` instead) |
| `generate_checklist` | Generate contextual checklists (security, a11y, performance, testing, code-quality, SEO) |
| `analyze_task` | Analyze task for risk assessment, specialist recommendations, and workflow suggestions |
| `get_code_conventions` | Get project code conventions from config files (tsconfig, eslint, prettier) |
| `read_context` | Read context document (`docs/codingbuddy/context.md`) |
| `update_context` | Update context document with decisions, notes, progress |
| `cleanup_context` | Manually trigger context document cleanup |
| `restart_tui` | Restart TUI client **(Claude Code only — not applicable to Codex)** |
| `set_project_root` | ~~Set project root directory~~ **(deprecated — will be removed in v2.0.0)** — use `CODINGBUDDY_PROJECT_ROOT` env var instead |

## Keyword Invocation

When a prompt starts with specific keywords, it automatically works in that mode:

| Keyword | Mode | Description |
|---------|------|-------------|
| `PLAN` | Planning Mode | Task planning and design phase |
| `ACT` | Action Mode | Actual task execution phase |
| `EVAL` | Evaluation Mode | Result review and evaluation phase |
| `AUTO` | Autonomous Mode | Autonomous PLAN → ACT → EVAL cycle until quality achieved |

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

### Project Config Not Detected

If `get_project_config` returns default values instead of your project settings:

1. Verify `CODINGBUDDY_PROJECT_ROOT` is set in MCP server configuration
2. Ensure the path points to the directory containing `codingbuddy.config.json`
3. Check that `codingbuddy.config.json` exists and is valid JSON

### Keyword Not Recognized

- Keywords are case-insensitive (`PLAN`, `plan`, `Plan` all work)
- Keyword must be followed by a space and prompt content

## Verification

After configuration, call `get_project_config` MCP tool in Codex and confirm:
- `projectName` matches the project's `codingbuddy.config.json`
- `language` matches the project's configured value
- `docs/codingbuddy/context.md` is created in the correct project root

## Related Documentation

- [Core Rules](../packages/rules/.ai-rules/rules/core.md)
- [Project Setup](../packages/rules/.ai-rules/rules/project.md)
- [Augmented Coding](../packages/rules/.ai-rules/rules/augmented-coding.md)
- [Codex Integration Guide](../packages/rules/.ai-rules/adapters/codex.md)
- [Keyword Invocation](./keyword-invocation.md)
