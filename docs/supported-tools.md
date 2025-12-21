# Supported AI Tools

Codingbuddy works with multiple AI coding assistants through a unified rules system.

## Overview

| Tool | Integration | Setup Guide |
|------|-------------|-------------|
| [Claude Code](#claude-code) | MCP Server | [Guide](../.ai-rules/adapters/claude-code.md) |
| [Cursor](#cursor) | Rules Directory | [Guide](../.ai-rules/adapters/cursor.md) |
| [GitHub Copilot / Codex](#github-copilot--codex) | Instructions File | [Guide](../.ai-rules/adapters/codex.md) |
| [Antigravity](#antigravity) | Config Directory | [Guide](../.ai-rules/adapters/antigravity.md) |
| [Amazon Q](#amazon-q) | Rules Directory | [Guide](../.ai-rules/adapters/q.md) |
| [Kiro](#kiro) | Spec Directory | [Guide](../.ai-rules/adapters/kiro.md) |

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
         "args": ["codingbuddy-mcp"]
       }
     }
   }
   ```

2. Restart Claude Desktop

### Features

- Full MCP resource access (config, rules, agents)
- Tool calls (search_rules, get_agent_details, parse_mode)
- Prompt templates (activate_agent)

[Full Guide](../.ai-rules/adapters/claude-code.md)

## Cursor

**Integration Type**: Rules Directory

Cursor uses `.cursor/rules/` for project-specific instructions.

### Quick Setup

1. Create `.cursor/rules/` directory
2. Reference common rules:

```markdown
<!-- .cursor/rules/codingbuddy.md -->

# Project Rules

Follow the common rules in `.ai-rules/`:

- Workflow: @.ai-rules/rules/core.md
- Quality: @.ai-rules/rules/augmented-coding.md
- Context: @.ai-rules/rules/project.md
```

### Features

- File reference with `@` syntax
- Project-specific customizations
- Agent context via file references

[Full Guide](../.ai-rules/adapters/cursor.md)

## GitHub Copilot / Codex

**Integration Type**: Instructions File

GitHub Copilot uses `.github/copilot-instructions.md` for custom instructions.

### Quick Setup

1. Create instructions file:

```markdown
<!-- .github/copilot-instructions.md -->

# Coding Standards

Follow the guidelines in `.ai-rules/rules/`:

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

[Full Guide](../.ai-rules/adapters/codex.md)

## Antigravity

**Integration Type**: Config Directory

Antigravity (Gemini-based) uses `.antigravity/` for configuration.

### Quick Setup

1. Create `.antigravity/rules/` directory
2. Add rule references:

```markdown
<!-- .antigravity/rules/project.md -->

# Project Guidelines

Reference: .ai-rules/rules/core.md
Reference: .ai-rules/rules/augmented-coding.md
```

### Features

- Gemini model integration
- Rule file references
- Project context awareness

[Full Guide](../.ai-rules/adapters/antigravity.md)

## Amazon Q

**Integration Type**: Rules Directory

Amazon Q Developer uses `.q/rules/` for custom rules.

### Quick Setup

1. Create `.q/rules/` directory
2. Add consolidated rules:

```markdown
<!-- .q/rules/codingbuddy.md -->

# Development Standards

Follow .ai-rules/ for consistent coding practices.

Key files:
- .ai-rules/rules/core.md (workflow)
- .ai-rules/rules/augmented-coding.md (TDD)
```

### Features

- AWS integration
- Enterprise features
- Custom rule support

[Full Guide](../.ai-rules/adapters/q.md)

## Kiro

**Integration Type**: Spec Directory

Kiro uses `.kiro/` for specifications and steering files.

### Quick Setup

1. Create `.kiro/steering/` directory
2. Add steering file:

```markdown
<!-- .kiro/steering/codingbuddy.md -->

# Project Steering

Apply rules from .ai-rules/:
- Workflow modes (PLAN/ACT/EVAL)
- TDD development
- Code quality standards
```

### Features

- Spec-driven development
- Steering file system
- Task management integration

[Full Guide](../.ai-rules/adapters/kiro.md)

## Adding New Tools

Codingbuddy is designed to support additional AI tools:

1. Create adapter guide in `.ai-rules/adapters/{tool}.md`
2. Create tool directory `.{tool}/`
3. Reference common rules from `.ai-rules/`

See [Contributing](../CONTRIBUTING.md) for details.

## Comparison

| Feature | Claude | Cursor | Copilot | Antigravity | Q | Kiro |
|---------|--------|--------|---------|-------------|---|------|
| MCP Support | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| File References | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| Agent Activation | ✅ | ⚠️ | ❌ | ⚠️ | ⚠️ | ⚠️ |
| Project Config | ✅ | ⚠️ | ❌ | ⚠️ | ⚠️ | ⚠️ |

✅ Full support | ⚠️ Partial (via file reference) | ❌ Not supported

## Next Steps

- [Getting Started](./getting-started.md) - Initial setup
- [Philosophy](./philosophy.md) - Design principles
- [API Reference](./api.md) - MCP capabilities
