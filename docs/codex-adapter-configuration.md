# Codex Adapter Configuration Guide

This guide explains how to use the Codebuddy MCP server in GitHub Copilot/Codex CLI environment.

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

### 2. MCP Server Connection (Optional)

Using MCP server enables additional features:

```json
{
  "mcpServers": {
    "codebuddy": {
      "command": "npx",
      "args": ["codebuddy-mcp-server"]
    }
  }
}
```

## Available MCP Tools

Tools available when connected to MCP server:

| Tool | Description |
|------|-------------|
| `search_rules` | Search rules and guidelines |
| `get_agent_details` | Get specific AI agent information |
| `parse_mode` | Parse PLAN/ACT/EVAL keywords and return mode-specific rules |

## Keyword Invocation

When a prompt starts with specific keywords, it automatically works in that mode:

| Keyword | Mode | Description |
|---------|------|-------------|
| `PLAN` | Planning Mode | Task planning and design phase |
| `ACT` | Action Mode | Actual task execution phase |
| `EVAL` | Evaluation Mode | Result review and evaluation phase |

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

### Keyword Not Recognized

- Keywords are case-insensitive (`PLAN`, `plan`, `Plan` all work)
- Keyword must be followed by a space and prompt content

## Related Documentation

- [Core Rules](../packages/rules/.ai-rules/rules/core.md)
- [Project Setup](../packages/rules/.ai-rules/rules/project.md)
- [Augmented Coding](../packages/rules/.ai-rules/rules/augmented-coding.md)
- [Codex Integration Guide](../packages/rules/.ai-rules/adapters/codex.md)
- [Keyword Invocation](./keyword-invocation.md)
