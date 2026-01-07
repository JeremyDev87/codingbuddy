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
| **Mode Agents** | |
| `rules://agents/plan-mode.json` | Plan Mode (workflow orchestrator) |
| `rules://agents/act-mode.json` | Act Mode (workflow orchestrator) |
| `rules://agents/eval-mode.json` | Eval Mode (workflow orchestrator) |
| **Primary Agents** | |
| `rules://agents/solution-architect.json` | Solution Architect (PLAN mode) |
| `rules://agents/technical-planner.json` | Technical Planner (PLAN mode) |
| `rules://agents/frontend-developer.json` | Frontend Developer (ACT mode) |
| `rules://agents/backend-developer.json` | Backend Developer (ACT mode) |
| `rules://agents/data-engineer.json` | Data Engineer (ACT mode) |
| `rules://agents/mobile-developer.json` | Mobile Developer (ACT mode) |
| `rules://agents/tooling-engineer.json` | Tooling Engineer (ACT mode) |
| `rules://agents/agent-architect.json` | Agent Architect (ACT mode) |
| `rules://agents/devops-engineer.json` | DevOps Engineer (ACT mode) |
| `rules://agents/code-reviewer.json` | Code Reviewer (EVAL mode) |
| **Domain Specialists** | |
| `rules://agents/architecture-specialist.json` | Architecture Specialist |
| `rules://agents/test-strategy-specialist.json` | Test Strategy Specialist |
| `rules://agents/performance-specialist.json` | Performance Specialist |
| `rules://agents/security-specialist.json` | Security Specialist |
| `rules://agents/accessibility-specialist.json` | Accessibility Specialist |
| `rules://agents/seo-specialist.json` | SEO Specialist |
| `rules://agents/i18n-specialist.json` | i18n Specialist |
| `rules://agents/ui-ux-designer.json` | UI/UX Designer |
| `rules://agents/documentation-specialist.json` | Documentation Specialist |
| `rules://agents/code-quality-specialist.json` | Code Quality Specialist |

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
      "text": "{\"mode\": \"PLAN\", \"originalPrompt\": \"Design a user authentication feature\", \"instructions\": \"...\", \"rules\": [...], \"agent\": \"plan-mode\", \"delegates_to\": \"technical-planner\", \"primary_agent_source\": \"intent\", \"delegate_agent_info\": {...}, \"parallelAgentsRecommendation\": {...}, \"languageInstruction\": \"Always respond in Korean.\", \"resolvedModel\": {\"model\": \"claude-sonnet-4-20250514\", \"source\": \"mode\"}}"
    }
  ]
}
```

**Response Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `mode` | string | Detected mode: `PLAN`, `ACT`, or `EVAL` |
| `originalPrompt` | string | User prompt with keyword removed |
| `instructions` | string | Mode-specific instructions |
| `rules` | array | Applicable rule files with content |
| `warnings` | array | Parsing warnings (optional) |
| `agent` | string | Mode Agent name (e.g., `plan-mode`) |
| `delegates_to` | string | Primary Agent name |
| `primary_agent_source` | string | How Primary Agent was selected: `explicit`, `config`, `intent`, `context`, `default` |
| `delegate_agent_info` | object | Primary Agent details (name, description, expertise) |
| `parallelAgentsRecommendation` | object | Recommended specialist agents for parallel execution |
| `recommended_act_agent` | object | Recommended ACT mode agent (for PLAN mode) |
| `activation_message` | object | Agent activation transparency info |
| `languageInstruction` | string | Dynamic language instruction based on config |
| `resolvedModel` | object | Resolved AI model info (`model`, `source`) |

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

### suggest_config_updates

Analyze the project and suggest config updates based on detected changes (new frameworks, dependencies, patterns).

**Input Schema**:

```json
{
  "type": "object",
  "properties": {
    "projectRoot": {
      "type": "string",
      "description": "Project root directory (defaults to current working directory)"
    }
  },
  "required": []
}
```

**Request Example**:

```json
{
  "name": "suggest_config_updates",
  "arguments": {
    "projectRoot": "/path/to/project"
  }
}
```

**Response Example**:

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"isUpToDate\": false, \"suggestions\": [{\"field\": \"techStack.frontend\", \"reason\": \"Detected new frontend framework(s)\", \"currentValue\": [\"React\"], \"suggestedValue\": [\"React\", \"Next.js\"], \"priority\": \"high\"}]}"
    }
  ]
}
```

**Suggestion Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `field` | string | Config path (e.g., `techStack.frontend`) |
| `reason` | string | Why the update is suggested |
| `currentValue` | any | Current value in config |
| `suggestedValue` | any | Recommended new value |
| `priority` | string | `high`, `medium`, or `low` |

**Priority Levels**:

| Priority | Description |
|----------|-------------|
| `high` | New frameworks detected (frontend, backend) |
| `medium` | Database tools, languages, project name changes |
| `low` | Optional enhancements |

---

### recommend_skills

Recommend skills based on user prompt with multi-language support.

**Input Schema**:

```json
{
  "type": "object",
  "properties": {
    "prompt": {
      "type": "string",
      "description": "User prompt to analyze for skill recommendations"
    }
  },
  "required": ["prompt"]
}
```

**Request Example**:

```json
{
  "name": "recommend_skills",
  "arguments": {
    "prompt": "There is a bug in the login"
  }
}
```

**Response Example**:

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"recommendations\": [{\"skillName\": \"systematic-debugging\", \"confidence\": \"high\", \"matchedPatterns\": [\"bug\"], \"description\": \"Systematic approach to debugging\"}], \"originalPrompt\": \"There is a bug in the login\"}"
    }
  ]
}
```

**Response Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `recommendations` | array | List of recommended skills |
| `recommendations[].skillName` | string | Name of the recommended skill |
| `recommendations[].confidence` | string | Confidence level (`high`, `medium`, `low`) |
| `recommendations[].matchedPatterns` | array | Patterns that triggered the recommendation |
| `recommendations[].description` | string | Brief description of the skill |
| `originalPrompt` | string | The original prompt that was analyzed |

**Supported Languages**:

| Language | Code | Example Patterns |
|----------|------|------------------|
| English | EN | "bug", "error", "build", "component" |
| Korean | KO | "버그", "에러", "빌드", "컴포넌트" |
| Japanese | JA | "バグ", "エラー", "ビルド", "コンポーネント" |
| Chinese | ZH | "错误", "bug", "构建", "组件" |
| Spanish | ES | "error", "bug", "construir", "componente" |

**Example Usage**:

```typescript
// English
recommend_skills({ prompt: "There is a bug in the login" })
// => recommends: systematic-debugging

// Korean
recommend_skills({ prompt: "로그인에 버그가 있어" })
// => recommends: systematic-debugging

// Building UI
recommend_skills({ prompt: "Build a dashboard component" })
// => recommends: frontend-design
```

---

### list_skills

List all available skills with optional priority filtering.

**Input Schema**:

```json
{
  "type": "object",
  "properties": {
    "minPriority": {
      "type": "number",
      "description": "Minimum priority threshold (inclusive)"
    },
    "maxPriority": {
      "type": "number",
      "description": "Maximum priority threshold (inclusive)"
    }
  },
  "required": []
}
```

**Request Example**:

```json
{
  "name": "list_skills",
  "arguments": {}
}
```

**Response Example**:

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"skills\": [{\"name\": \"systematic-debugging\", \"priority\": 1, \"description\": \"Systematic approach to debugging\"}, {\"name\": \"test-driven-development\", \"priority\": 2, \"description\": \"TDD workflow\"}], \"total\": 10}"
    }
  ]
}
```

**Response Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `skills` | array | List of available skills |
| `skills[].name` | string | Skill identifier |
| `skills[].priority` | number | Skill priority (lower = higher priority) |
| `skills[].description` | string | Brief description of the skill |
| `total` | number | Total number of skills returned |

**Filter Example**:

```json
{
  "name": "list_skills",
  "arguments": {
    "minPriority": 1,
    "maxPriority": 3
  }
}
```

---

### get_agent_system_prompt

Get complete system prompt for a specialist agent to be executed as a Claude Code subagent.

**Input Schema**:

```json
{
  "type": "object",
  "properties": {
    "agentName": {
      "type": "string",
      "description": "Name of the specialist agent (e.g., 'security-specialist', 'accessibility-specialist')"
    },
    "context": {
      "type": "object",
      "description": "Context for the agent",
      "properties": {
        "mode": {
          "type": "string",
          "enum": ["PLAN", "ACT", "EVAL"],
          "description": "Current workflow mode"
        },
        "targetFiles": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Files to analyze or review"
        },
        "taskDescription": {
          "type": "string",
          "description": "Description of the task"
        }
      },
      "required": ["mode"]
    }
  },
  "required": ["agentName", "context"]
}
```

**Request Example**:

```json
{
  "name": "get_agent_system_prompt",
  "arguments": {
    "agentName": "security-specialist",
    "context": {
      "mode": "EVAL",
      "targetFiles": ["src/auth/login.ts"],
      "taskDescription": "Review authentication security"
    }
  }
}
```

**Response Example**:

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"agentName\": \"security-specialist\", \"systemPrompt\": \"You are a Security Specialist agent...\", \"taskPrompt\": \"Analyze security of src/auth/login.ts...\"}"
    }
  ]
}
```

---

### prepare_parallel_agents

Prepare multiple specialist agents for parallel execution via Claude Code Task tool.

**Input Schema**:

```json
{
  "type": "object",
  "properties": {
    "mode": {
      "type": "string",
      "enum": ["PLAN", "ACT", "EVAL"],
      "description": "Current workflow mode"
    },
    "specialists": {
      "type": "array",
      "items": { "type": "string" },
      "description": "List of specialist agent names"
    },
    "targetFiles": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Files to analyze or review"
    },
    "sharedContext": {
      "type": "string",
      "description": "Shared context or task description for all agents"
    }
  },
  "required": ["mode", "specialists"]
}
```

**Request Example**:

```json
{
  "name": "prepare_parallel_agents",
  "arguments": {
    "mode": "EVAL",
    "specialists": ["security-specialist", "accessibility-specialist", "performance-specialist"],
    "targetFiles": ["src/components/UserForm.tsx"],
    "sharedContext": "Review the user registration form"
  }
}
```

**Response Example**:

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"prepared\": [{\"agentName\": \"security-specialist\", \"systemPrompt\": \"...\", \"taskPrompt\": \"...\"}, ...], \"executionHint\": \"Use Task tool with subagent_type='general-purpose' and run_in_background=true\"}"
    }
  ]
}
```

**Usage with Claude Code Task Tool**:

```typescript
// Launch multiple agents in parallel
await Promise.all([
  Task({ subagent_type: 'general-purpose', prompt: securityPrompt, run_in_background: true }),
  Task({ subagent_type: 'general-purpose', prompt: accessibilityPrompt, run_in_background: true }),
  Task({ subagent_type: 'general-purpose', prompt: performancePrompt, run_in_background: true })
]);
```

---

### generate_checklist

Generate contextual checklists based on file patterns and domains.

**Input Schema**:

```json
{
  "type": "object",
  "properties": {
    "files": {
      "type": "array",
      "items": { "type": "string" },
      "description": "File paths to analyze for checklist generation"
    },
    "domains": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": ["security", "accessibility", "performance", "testing", "code-quality", "seo"]
      },
      "description": "Specific domains to generate checklists for. If not provided, domains are auto-detected."
    }
  },
  "required": []
}
```

**Request Example**:

```json
{
  "name": "generate_checklist",
  "arguments": {
    "files": ["src/auth/login.ts", "src/api/users.ts"],
    "domains": ["security", "testing"]
  }
}
```

**Response Example**:

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"checklists\": [{\"domain\": \"security\", \"items\": [{\"id\": \"sec-1\", \"description\": \"Validate input data\", \"priority\": \"high\"}]}], \"detectedPatterns\": [\"auth\", \"api\"]}"
    }
  ]
}
```

**Response Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `checklists` | array | Generated checklists grouped by domain |
| `checklists[].domain` | string | Domain name (security, accessibility, etc.) |
| `checklists[].items` | array | Checklist items for this domain |
| `detectedPatterns` | array | File patterns detected from input files |

---

### analyze_task

Analyze a task to provide contextual recommendations including risk assessment, relevant checklists, specialist recommendations, and workflow suggestions.

**Input Schema**:

```json
{
  "type": "object",
  "properties": {
    "prompt": {
      "type": "string",
      "description": "User's task description"
    },
    "files": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Optional file paths related to the task"
    },
    "mode": {
      "type": "string",
      "enum": ["PLAN", "ACT", "EVAL"],
      "description": "Current workflow mode"
    }
  },
  "required": ["prompt"]
}
```

**Request Example**:

```json
{
  "name": "analyze_task",
  "arguments": {
    "prompt": "Add user authentication with OAuth",
    "files": ["src/auth/"],
    "mode": "PLAN"
  }
}
```

**Response Example**:

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"riskAssessment\": {\"level\": \"high\", \"factors\": [\"security-sensitive\", \"authentication\"]}, \"recommendedChecklists\": [\"security\", \"testing\"], \"recommendedSpecialists\": [\"security-specialist\"], \"workflowSuggestions\": [\"Use TDD approach\", \"Review OWASP guidelines\"]}"
    }
  ]
}
```

**Response Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `riskAssessment` | object | Risk level and contributing factors |
| `riskAssessment.level` | string | Risk level: `low`, `medium`, `high`, `critical` |
| `riskAssessment.factors` | array | Factors contributing to the risk level |
| `recommendedChecklists` | array | Suggested checklist domains for this task |
| `recommendedSpecialists` | array | Specialist agents recommended for this task |
| `workflowSuggestions` | array | Workflow recommendations |

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
| `Tool not found: {name}` | Invalid tool name | Use one of: `search_rules`, `get_agent_details`, `parse_mode`, `get_project_config`, `suggest_config_updates`, `recommend_skills`, `list_skills`, `get_agent_system_prompt`, `prepare_parallel_agents`, `generate_checklist`, `analyze_task` |
| `Failed to load project configuration` | Missing or invalid `codingbuddy.config.js` | Run `npx codingbuddy init` |

---

## See Also

- [Development Guide](./development.md)
- [Customization Guide](./customization.md)
- [Error Reference](./errors.md)
