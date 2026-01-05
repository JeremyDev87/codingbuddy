<p align="center">
  <a href="supported-tools.md">English</a> |
  <a href="ko/supported-tools.md">한국어</a> |
  <a href="zh-CN/supported-tools.md">中文</a> |
  <a href="ja/supported-tools.md">日本語</a> |
  <a href="es/supported-tools.md">Español</a>
</p>

# Supported AI Tools

Codingbuddy works with multiple AI coding assistants through a unified rules system.

## Overview

| Tool | Integration | Setup Guide |
|------|-------------|-------------|
| [Claude Code](#claude-code) | MCP Server | [Guide](../packages/rules/.ai-rules/adapters/claude-code.md) |
| [Cursor](#cursor) | Rules Directory | [Guide](../packages/rules/.ai-rules/adapters/cursor.md) |
| [GitHub Copilot / Codex](#github-copilot--codex) | Instructions File | [Guide](../packages/rules/.ai-rules/adapters/codex.md) |
| [Antigravity](#antigravity) | Config Directory | [Guide](../packages/rules/.ai-rules/adapters/antigravity.md) |
| [Amazon Q](#amazon-q) | Rules Directory | [Guide](../packages/rules/.ai-rules/adapters/q.md) |
| [Kiro](#kiro) | Spec Directory | [Guide](../packages/rules/.ai-rules/adapters/kiro.md) |
| [OpenCode](#opencode) | Rules Directory | [Guide](../packages/rules/.ai-rules/adapters/opencode.md) |

## Claude Code

**Integration Type**: MCP (Model Context Protocol) Server

Claude Code connects via MCP, providing full access to project configuration, rules, and specialist agents.

### Quick Setup

1. Add to Claude Desktop config:

   **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

   **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

   ```json
   {
     "mcpServers": {
       "codingbuddy": {
         "command": "npx",
         "args": ["codingbuddy", "mcp"]
       }
     }
   }
   ```

2. Restart Claude Desktop

### Features

- Full MCP resource access (config, rules, agents)
- Tool calls (search_rules, get_agent_details, parse_mode, recommend_skills)
- Prompt templates (activate_agent)

[Full Guide](../packages/rules/.ai-rules/adapters/claude-code.md)

## Cursor

**Integration Type**: Rules Directory

Cursor uses `.cursor/rules/` for project-specific instructions.

### Quick Setup

1. Create `.cursor/rules/` directory
2. Reference common rules:

```markdown
<!-- .cursor/rules/codingbuddy.md -->

# Project Rules

Follow the common rules in `packages/rules/.ai-rules/`:

- Workflow: @packages/rules/.ai-rules/rules/core.md
- Quality: @packages/rules/.ai-rules/rules/augmented-coding.md
- Context: @packages/rules/.ai-rules/rules/project.md
```

### Features

- File reference with `@` syntax
- Project-specific customizations
- Agent context via file references

[Full Guide](../packages/rules/.ai-rules/adapters/cursor.md)

## GitHub Copilot / Codex

**Integration Type**: Instructions File

GitHub Copilot uses `.github/copilot-instructions.md` for custom instructions.

### Quick Setup

1. Create instructions file:

```markdown
<!-- .github/copilot-instructions.md -->

# Coding Standards

Follow the guidelines in `packages/rules/.ai-rules/rules/`:

## Workflow
Use PLAN → ACT → EVAL workflow as defined in core.md

## Code Quality
- TDD approach (Red → Green → Refactor)
- TypeScript strict mode
- 80%+ test coverage
```

### Features

- Markdown-based instructions
- Repository-wide settings
- Team-shared configuration

[Full Guide](../packages/rules/.ai-rules/adapters/codex.md)

## Antigravity

**Integration Type**: Config Directory

Antigravity (Gemini-based) uses `.antigravity/` for configuration.

### Quick Setup

1. Create `.antigravity/rules/` directory
2. Add rule references:

```markdown
<!-- .antigravity/rules/project.md -->

# Project Guidelines

Reference: packages/rules/.ai-rules/rules/core.md
Reference: packages/rules/.ai-rules/rules/augmented-coding.md
```

### Features

- Gemini model integration
- Rule file references
- Project context awareness

[Full Guide](../packages/rules/.ai-rules/adapters/antigravity.md)

## Amazon Q

**Integration Type**: Rules Directory

Amazon Q Developer uses `.q/rules/` for custom rules.

### Quick Setup

1. Create `.q/rules/` directory
2. Add consolidated rules:

```markdown
<!-- .q/rules/codingbuddy.md -->

# Development Standards

Follow packages/rules/.ai-rules/ for consistent coding practices.

Key files:
- packages/rules/.ai-rules/rules/core.md (workflow)
- packages/rules/.ai-rules/rules/augmented-coding.md (TDD)
```

### Features

- AWS integration
- Enterprise features
- Custom rule support

[Full Guide](../packages/rules/.ai-rules/adapters/q.md)

## Kiro

**Integration Type**: Spec Directory

Kiro uses `.kiro/` for specifications and steering files.

### Quick Setup

1. Create `.kiro/steering/` directory
2. Add steering file:

```markdown
<!-- .kiro/steering/codingbuddy.md -->

# Project Steering

Apply rules from packages/rules/.ai-rules/:
- Workflow modes (PLAN/ACT/EVAL)
- TDD development
- Code quality standards
```

### Features

- Spec-driven development
- Steering file system
- Task management integration

[Full Guide](../packages/rules/.ai-rules/adapters/kiro.md)

## OpenCode

**Integration Type**: JSON Configuration

OpenCode (and its successor Crush by Charm Bracelet) uses JSON configuration files with agent-based workflows.

### Quick Setup

1. Create `.opencode.json` (or `crush.json`):

```json
{
  "instructions": [
    "packages/rules/.ai-rules/rules/core.md",
    "packages/rules/.ai-rules/rules/augmented-coding.md"
  ],
  "agent": {
    "plan-mode": {
      "prompt": "{file:packages/rules/.ai-rules/agents/plan-mode.json}",
      "permission": { "edit": "deny" }
    },
    "act-mode": {
      "prompt": "{file:packages/rules/.ai-rules/agents/act-mode.json}",
      "permission": { "edit": "allow" }
    }
  },
  "mcp": {
    "codingbuddy": {
      "command": ["npx", "codingbuddy", "mcp"]
    }
  }
}
```

### Features

- Terminal-native TUI interface
- Agent-based PLAN/ACT/EVAL workflow
- MCP server integration
- Fine-grained permission control

[Full Guide](../packages/rules/.ai-rules/adapters/opencode.md)

## Adding New Tools

Codingbuddy is designed to support additional AI tools:

1. Create adapter guide in `packages/rules/.ai-rules/adapters/{tool}.md`
2. Create tool directory `.{tool}/`
3. Reference common rules from `packages/rules/.ai-rules/`

See [Contributing](../CONTRIBUTING.md) for details.

## Comparison

| Feature | Claude | Cursor | Copilot | Antigravity | Q | Kiro | OpenCode |
|---------|--------|--------|---------|-------------|---|------|----------|
| MCP Support | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| File References | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Agent Activation | ✅ | ⚠️ | ❌ | ⚠️ | ⚠️ | ⚠️ | ✅ |
| Project Config | ✅ | ⚠️ | ❌ | ⚠️ | ⚠️ | ⚠️ | ✅ |

✅ Full support | ⚠️ Partial (via file reference) | ❌ Not supported

## Next Steps

- [Getting Started](./getting-started.md) - Initial setup
- [Philosophy](./philosophy.md) - Design principles
- [API Reference](./api.md) - MCP capabilities
