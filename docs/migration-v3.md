# Migration Guide: v2.x to v3.0.0

This guide helps you migrate from Codingbuddy v2.x to v3.0.0.

## Overview

v3.0.0 introduces several major improvements:

- **Context Document System**: Persistent cross-mode context
- **Claude Code Plugin**: Native skill invocation
- **6 New Skills**: Performance optimization, database migration, etc.
- **4 New Specialists**: Migration, observability, event architecture, integration

## Breaking Changes

### 1. Context Document System

**What Changed:**

Previous session-based context is replaced with a fixed-file approach at `docs/codingbuddy/context.md`.

**Why:**

Long conversations can trigger "context compaction" where earlier conversation history is summarized. The Context Document System ensures PLAN decisions persist into ACT mode even after compaction.

**Migration Steps:**

1. The file `docs/codingbuddy/context.md` will be auto-created when you use `parse_mode` in PLAN mode
2. No action required - the system handles creation and updates automatically
3. **We recommend** adding `docs/codingbuddy/` to your `.gitignore`. Context documents may contain sensitive project information, code snippets, or decisions that should not be exposed in version control.

```bash
# Add to .gitignore (recommended)
echo "docs/codingbuddy/" >> .gitignore
```

### 2. New MCP Tools

**New tools added:**

| Tool | Purpose |
|------|---------|
| `read_context` | Read the current context document |
| `update_context` | Update context document (PLAN resets, ACT/EVAL appends) |
| `create_session` | Create a new session document |
| `get_session` | Get a session document by ID |
| `get_active_session` | Get the most recent active session |
| `update_session` | Update a session document |

**No migration required** - these are additive features.

## New Features

### Claude Code Plugin

For native skill invocation in Claude Code:

```bash
npm install codingbuddy-claude-plugin
```

This is optional - the MCP server continues to work without it.

### New Skills

| Skill | Description |
|-------|-------------|
| `performance-optimization` | Profiling-first performance optimization |
| `database-migration` | Zero-downtime schema changes |
| `dependency-management` | Systematic package updates, CVE response |
| `incident-response` | Organizational incident handling |
| `pr-review` | Evidence-based PR review |
| `refactoring` | Tidy First structured refactoring |

### New Specialist Agents

| Agent | Description |
|-------|-------------|
| `migration-specialist` | Legacy modernization, zero-downtime migrations |
| `observability-specialist` | OpenTelemetry, SLI/SLO frameworks |
| `event-architecture-specialist` | Message queues, Saga patterns |
| `integration-specialist` | External API integrations, retry strategies |

## Upgrade Steps

### 1. Update Dependencies

```bash
# Update codingbuddy
npm update codingbuddy

# Or reinstall
npm install codingbuddy@latest
```

### 2. Verify Configuration

Your existing `codingbuddy.config.json` remains compatible. No changes required.

### 3. Optional: Install Claude Code Plugin

```bash
npm install codingbuddy-claude-plugin
```

### 4. Test Your Setup

```bash
# Verify MCP server works
npx codingbuddy mcp
```

## Deprecations

### Removed in v3.0.0

None - v3.0.0 is additive.

### Deprecated (will be removed in v4.0.0)

| Feature | Replacement |
|---------|-------------|
| `set_project_root` tool | Configure in MCP settings or use `--project-root` CLI flag |

## Troubleshooting

### Context Document Not Created

If `docs/codingbuddy/context.md` is not created:

1. Ensure you're using PLAN mode: `PLAN: your task`
2. Check that `parse_mode` MCP tool is being called
3. Verify write permissions to project directory

### Plugin Not Found

If Claude Code can't find the plugin:

1. Ensure `codingbuddy-claude-plugin` is installed
2. Check that `codingbuddy` is installed globally or in project
3. Restart Claude Code after installation

## Getting Help

- [GitHub Issues](https://github.com/JeremyDev87/codingbuddy/issues)
- [Documentation](https://github.com/JeremyDev87/codingbuddy/tree/main/docs)
- [API Reference](./api.md)
