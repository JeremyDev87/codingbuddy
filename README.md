<p align="center">
  <a href="README.md">English</a> |
  <a href="README.ko.md">한국어</a> |
  <a href="README.zh-CN.md">中文</a> |
  <a href="README.ja.md">日本語</a> |
  <a href="README.es.md">Español</a>
</p>

# Codingbuddy

[![CI](https://github.com/Codingbuddydev/codingbuddy/actions/workflows/dev.yml/badge.svg)](https://github.com/Codingbuddydev/codingbuddy/actions/workflows/dev.yml)
[![npm version](https://img.shields.io/npm/v/codingbuddy.svg)](https://www.npmjs.com/package/codingbuddy)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**One source of truth for AI coding rules across all AI assistants.**

Codingbuddy provides a unified rules system that works with Cursor, Claude Code, GitHub Copilot, and more—so your entire team follows the same coding standards, regardless of which AI tool they use.

## Why Codingbuddy?

- **Consistency**: All AI tools follow identical coding standards
- **Single Source of Truth**: Update rules once, all tools benefit
- **No Vendor Lock-in**: AI-agnostic rules work with any assistant
- **Structured Workflow**: PLAN → ACT → EVAL development cycle

## Quick Start

```bash
# Initialize your project (analyzes codebase and creates config)
npx codingbuddy init

# Add to your AI tool (example: Claude Desktop)
# See docs/supported-tools.md for other AI tools
```

Add to Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

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

[Full Getting Started Guide →](docs/getting-started.md)

## Supported AI Tools

| Tool | Status |
|------|--------|
| Claude Code | ✅ Full MCP support |
| Cursor | ✅ Supported |
| GitHub Copilot | ✅ Supported |
| Antigravity | ✅ Supported |
| Amazon Q | ✅ Supported |
| Kiro | ✅ Supported |

[Setup Guides →](docs/supported-tools.md)

## Documentation

| Document | Description |
|----------|-------------|
| [Getting Started](docs/getting-started.md) | Installation and quick setup |
| [Philosophy](docs/philosophy.md) | Vision and design principles |
| [Supported Tools](docs/supported-tools.md) | AI tool integration guides |
| [Configuration](docs/config-schema.md) | Config file options |
| [API Reference](docs/api.md) | MCP server capabilities |
| [Development](docs/development.md) | Contributing and local setup |

## How It Works

```
packages/rules/.ai-rules/  ← Shared rules (single source of truth)
├── rules/                 ← Core rules (workflow, quality)
├── agents/                ← Specialist expertise (security, performance, etc.)
└── adapters/              ← Tool-specific integration guides

.cursor/                   ← Cursor references packages/rules/.ai-rules/
.claude/                   ← Claude Code references packages/rules/.ai-rules/
.codex/                    ← GitHub Copilot references packages/rules/.ai-rules/
...
```

All AI tool configurations reference the same `packages/rules/.ai-rules/` directory. Change the rules once, and every tool follows the updated standards.

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT © [Codingbuddy](https://github.com/Codingbuddydev)
