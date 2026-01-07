# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Codingbuddy** - Multi-AI Rules MCP Server for consistent coding practices across AI assistants (Cursor, Claude Code, Codex, Antigravity, Q, Kiro).

## Repository Structure

```
codingbuddy/
├── apps/
│   └── mcp-server/      # NestJS-based MCP server
│       └── src/
│           ├── main.ts  # Entry point (stdio/SSE transport)
│           ├── mcp/     # MCP protocol handlers
│           └── rules/   # Rules service (file reading, search)
├── packages/
│   └── rules/           # AI coding rules package (codingbuddy-rules)
│       └── .ai-rules/   # Shared AI coding rules (single source of truth)
│           ├── rules/   # Core rules (workflow, project, augmented-coding)
│           ├── agents/  # 12 specialist agent definitions (JSON)
│           └── adapters/# Tool-specific integration guides
├── .cursor/             # Cursor AI config
├── .claude/             # Claude Code config
├── .antigravity/        # Antigravity (Gemini) config
├── .codex/              # GitHub Copilot config
├── .q/                  # Amazon Q config
└── .kiro/               # Kiro config
```

## Commands

### MCP Server (apps/mcp-server/)

```bash
# From root directory
yarn workspace codingbuddy start:dev   # Run with ts-node
yarn workspace codingbuddy build       # Compile TypeScript
yarn workspace codingbuddy test        # Run tests

# Or from apps/mcp-server/
cd apps/mcp-server
yarn start:dev          # Run with ts-node
yarn build              # Compile TypeScript
yarn start              # Run compiled version
```

### Environment Variables

- `MCP_TRANSPORT`: `stdio` (default) or `sse`
- `PORT`: HTTP port when using SSE mode (default: 3000)

## Architecture

### MCP Server Design

The server implements the Model Context Protocol with three capabilities:

1. **Resources**: Exposes rule files and agent definitions via `rules://` URI scheme
2. **Tools**: `search_rules` (query rules) and `get_agent_details` (agent info)
3. **Prompts**: `activate_agent` (generate activation prompt for specialist)

### Transport Modes

- **Stdio Mode**: Runs as standalone CLI app, communicates via stdin/stdout
- **SSE Mode**: Runs as HTTP server with Server-Sent Events

### NestJS Modules

- `AppModule`: Root module with config
- `McpModule`: MCP server and handlers
- `RulesModule`: File system operations for .ai-rules

## Workflow Modes (from .ai-rules)

When working in this codebase, use these modes:

- **PLAN**: Design implementation approach (default start mode)
- **ACT**: Execute changes following TDD
- **EVAL**: Review and improve (when explicitly requested)

## Code Quality Standards

- TypeScript strict mode (no `any`)
- TDD cycle: Red -> Green -> Refactor
- Pure/impure function separation (different files)
- 90%+ test coverage goal

## Communication

Follow the `language` setting in `codingbuddy.config.js` - use `get_project_config` MCP tool to retrieve current language setting.
