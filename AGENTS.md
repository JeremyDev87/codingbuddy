# AGENTS.md

This project uses [codingbuddy](https://www.npmjs.com/package/codingbuddy) MCP server to manage AI Agents.

## Quick Start

### For End Users (Your Project)

1. **Install MCP Server**

   ```json
   // Claude Code: .claude/settings.json
   {
     "mcpServers": {
       "codingbuddy": {
         "command": "npx",
         "args": ["-y", "codingbuddy"]
       }
     }
   }
   ```

   ```json
   // Cursor: .cursor/mcp.json
   {
     "mcpServers": {
       "codingbuddy": {
         "command": "npx",
         "args": ["-y", "codingbuddy"]
       }
     }
   }
   ```

2. **Use Mode Keywords**

   ```
   PLAN Design a login feature
   ```

   → `parse_mode` tool is automatically called, loading appropriate Agent and rules.

### For Monorepo Contributors

Direct file references work within this repository:

- Workflow: `packages/rules/.ai-rules/rules/core.md`
- Coding principles: `packages/rules/.ai-rules/rules/augmented-coding.md`
- Agent list: `packages/rules/.ai-rules/agents/README.md`

## Workflow Modes

| Keyword | Mode | Description |
|---------|------|-------------|
| `PLAN` | Plan | Design and planning before implementation |
| `ACT` | Act | Implement code following the plan |
| `EVAL` | Eval | Code quality review and improvement |

Multi-language keywords supported:
- 한국어: `계획`, `실행`, `평가`
- 日本語: `計画`, `実行`, `評価`
- 中文: `计划`, `执行`, `评估`
- Español: `PLANIFICAR`, `ACTUAR`, `EVALUAR`

## MCP Tools

| Tool | Purpose |
|------|---------|
| `parse_mode` | Parse mode keywords, load Agent and rules |
| `get_agent_details` | Get specific Agent details |
| `get_project_config` | Get project configuration |
| `recommend_skills` | Recommend skills based on prompt |
| `search_rules` | Search across all rules |

## Reference

- **Rules**: [`packages/rules/.ai-rules/rules/`](packages/rules/.ai-rules/rules/)
- **Agents**: [`packages/rules/.ai-rules/agents/`](packages/rules/.ai-rules/agents/)
- **Skills**: [`packages/rules/.ai-rules/skills/`](packages/rules/.ai-rules/skills/)
- **MCP API**: [`docs/api.md`](docs/api.md)
