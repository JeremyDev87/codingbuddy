# Codingbuddy MCP API Reference

This document describes the Model Context Protocol (MCP) API exposed by the Codingbuddy server.

## Table of Contents

- [Overview](#overview)
- [Resources](#resources)
- [Tools](#tools)
- [Prompts](#prompts)
- [Error Handling](#error-handling)

## Overview

Codingbuddy implements the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) to provide AI coding assistants with project-specific context and rules.

### Transport Modes

| Mode | Use Case | Endpoint |
|------|----------|----------|
| **Stdio** | CLI integration (Claude Code, etc.) | stdin/stdout |
| **SSE** | HTTP-based integration | `GET /sse`, `POST /messages` |

### Server Info

```json
{
  "name": "codingbuddy-rules-server",
  "version": "1.0.0",
  "capabilities": {
    "resources": {},
    "tools": {},
    "prompts": {}
  }
}
```

---

## Resources

Resources provide read-only access to project configuration and rules.

### URI Schemes

| Scheme | Description |
|--------|-------------|
| `config://` | Project configuration |
| `rules://` | Rule files and agent definitions |

---

### config://project

Project configuration including tech stack, architecture, and conventions.

**URI**: `config://project`

**MIME Type**: `application/json`

**Response Example**:

```json
{
  "language": "ko",
  "projectName": "my-app",
  "description": "My awesome application",
  "techStack": {
    "languages": ["TypeScript"],
    "frontend": ["React", "Next.js"],
    "backend": ["Node.js"],
    "database": ["PostgreSQL"]
  },
  "architecture": {
    "pattern": "feature-sliced-design",
    "structure": ["app", "widgets", "features", "entities", "shared"]
  },
  "conventions": {
    "style": "airbnb",
    "naming": {
      "files": "kebab-case",
      "components": "PascalCase"
    }
  },
  "testStrategy": {
    "approach": "tdd",
    "frameworks": ["Vitest"],
    "coverage": 80
  }
}
```

---

### rules://rules/{filename}

Core rule files in Markdown format.

**Available Rules**:

| URI | Description |
|-----|-------------|
| `rules://rules/core.md` | Core workflow rules (PLAN/ACT/EVAL) |
| `rules://rules/project.md` | Project setup guidelines |
| `rules://rules/augmented-coding.md` | TDD and coding practices |

**MIME Type**: `text/markdown`

**Response Example**:

```json
{
  "contents": [
    {
      "uri": "rules://rules/core.md",
      "mimeType": "text/markdown",
      "text": "# Core Workflow Rules\n\n## PLAN Mode\n..."
    }
  ]
}
```

---

### rules://agents/{name}.json

Specialist agent definitions.

**Available Agents**:

| URI | Agent |
|-----|-------|
| `rules://agents/frontend-developer.json` | Frontend Developer |
| `rules://agents/backend-developer.json` | Backend Developer |
| `rules://agents/code-reviewer.json` | Code Reviewer |
| `rules://agents/architecture-specialist.json` | Architecture Specialist |
| `rules://agents/test-strategy-specialist.json` | Test Strategy Specialist |
| `rules://agents/performance-specialist.json` | Performance Specialist |
| `rules://agents/security-specialist.json` | Security Specialist |
| `rules://agents/accessibility-specialist.json` | Accessibility Specialist |
| `rules://agents/seo-specialist.json` | SEO Specialist |
| `rules://agents/ui-ux-designer.json` | UI/UX Designer |
| `rules://agents/documentation-specialist.json` | Documentation Specialist |
| `rules://agents/code-quality-specialist.json` | Code Quality Specialist |
| `rules://agents/devops-engineer.json` | DevOps Engineer |

**MIME Type**: `application/json`

**Response Example**:

```json
{
  "contents": [
    {
      "uri": "rules://agents/frontend-developer.json",
      "mimeType": "application/json",
      "text": "{\"name\": \"Frontend Developer\", ...}"
    }
  ]
}
```

---

## Tools

Tools provide interactive functionality for searching and retrieving project context.

---

### search_rules

Search for rules and guidelines across all rule files.

**Input Schema**:

```json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "Search query"
    }
  },
  "required": ["query"]
}
```

**Request Example**:

```json
{
  "name": "search_rules",
  "arguments": {
    "query": "TDD"
  }
}
```

**Response Example**:

```json
{
  "content": [
    {
      "type": "text",
      "text": "[{\"file\": \"rules/augmented-coding.md\", \"matches\": [...]}]"
    }
  ]
}
```

---

### get_agent_details

Get detailed profile of a specific AI agent.

**Input Schema**:

```json
{
  "type": "object",
  "properties": {
    "agentName": {
      "type": "string",
      "description": "Name of the agent (e.g., 'frontend-developer', 'code-reviewer')"
    }
  },
  "required": ["agentName"]
}
```

**Request Example**:

```json
{
  "name": "get_agent_details",
  "arguments": {
    "agentName": "frontend-developer"
  }
}
```

**Response Example**:

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"name\": \"Frontend Developer\", \"role\": {...}, \"workflow\": [...]}"
    }
  ]
}
```

**Error Response** (agent not found):

```json
{
  "isError": true,
  "content": [
    {
      "type": "text",
      "text": "Agent 'unknown-agent' not found."
    }
  ]
}
```

---

### parse_mode

Parse workflow mode keyword from prompt and return mode-specific rules with project language setting.

**Input Schema**:

```json
{
  "type": "object",
  "properties": {
    "prompt": {
      "type": "string",
      "description": "User prompt that may start with PLAN/ACT/EVAL keyword"
    }
  },
  "required": ["prompt"]
}
```

**Request Example**:

```json
{
  "name": "parse_mode",
  "arguments": {
    "prompt": "PLAN: Design a user authentication feature"
  }
}
```

**Response Example**:

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"mode\": \"PLAN\", \"prompt\": \"Design a user authentication feature\", \"instructions\": \"...\", \"rules\": \"...\", \"language\": \"ko\"}"
    }
  ]
}
```

**Mode Values**:

| Mode | Trigger Keywords | Description |
|------|------------------|-------------|
| `PLAN` | `PLAN`, `PLAN:` | Planning mode - design implementation approach |
| `ACT` | `ACT`, `ACT:` | Action mode - execute implementation |
| `EVAL` | `EVAL`, `EVALUATE` | Evaluation mode - review and improve |

---

### get_project_config

Get project configuration including tech stack, architecture, conventions, and language settings.

**Input Schema**:

```json
{
  "type": "object",
  "properties": {},
  "required": []
}
```

**Request Example**:

```json
{
  "name": "get_project_config",
  "arguments": {}
}
```

**Response Example**:

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"language\": \"ko\", \"projectName\": \"my-app\", \"techStack\": {...}}"
    }
  ]
}
```

---

## Prompts

Prompts provide pre-defined message templates for common workflows.

---

### activate_agent

Activate a specific specialist agent with project context.

**Arguments**:

| Name | Required | Description |
|------|----------|-------------|
| `role` | Yes | Role name (e.g., `frontend-developer`, `code-reviewer`) |

**Request Example**:

```json
{
  "name": "activate_agent",
  "arguments": {
    "role": "frontend-developer"
  }
}
```

**Response Example**:

```json
{
  "messages": [
    {
      "role": "user",
      "content": {
        "type": "text",
        "text": "Activate Agent: Frontend Developer\n\nRole: Senior Frontend Developer\n\nGoals:\n- Develop components following TDD cycle\n...\n\nProject Context:\n- Project: my-app\n- Response Language: ko\n..."
      }
    }
  ]
}
```

---

## Error Handling

### Error Response Format

```json
{
  "isError": true,
  "content": [
    {
      "type": "text",
      "text": "Error message describing what went wrong"
    }
  ]
}
```

### MCP Error Codes

| Code | Name | Description |
|------|------|-------------|
| `-32600` | `InvalidRequest` | Invalid URI scheme or malformed request |
| `-32601` | `MethodNotFound` | Tool or prompt not found |
| `-32603` | `InternalError` | Server-side error (config loading failure, etc.) |

### Common Errors

| Error | Cause | Resolution |
|-------|-------|------------|
| `Invalid URI scheme` | URI doesn't start with `rules://` or `config://` | Use correct URI scheme |
| `Resource not found: {uri}` | Requested rule file doesn't exist | Check file path in `packages/rules/.ai-rules/` |
| `Agent '{name}' not found` | Invalid agent name | Use valid agent name from list |
| `Tool not found: {name}` | Invalid tool name | Use one of: `search_rules`, `get_agent_details`, `parse_mode`, `get_project_config` |
| `Failed to load project configuration` | Missing or invalid `codingbuddy.config.js` | Run `npx codingbuddy init` |

---

## See Also

- [Development Guide](./development.md)
- [Customization Guide](./customization.md)
- [Error Reference](./errors.md)
