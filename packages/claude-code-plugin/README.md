# CodingBuddy Claude Code Plugin

> Version 4.1.0

Multi-AI Rules for consistent coding practices - PLAN/ACT/EVAL workflow, specialist agents, and reusable skills for systematic development.

## Installation

```bash
# Via npm
npm install codingbuddy-claude-plugin

# Or via Claude Code
claude plugin add codingbuddy
```

## Features

### Workflow Modes
- **PLAN**: Design implementation approach with TDD
- **ACT**: Execute changes following quality standards
- **EVAL**: Evaluate code quality and suggest improvements
- **AUTO**: Autonomous PLAN → ACT → EVAL cycle

### Commands
- `/plan` - Enter PLAN mode
- `/act` - Enter ACT mode
- `/eval` - Enter EVAL mode
- `/auto` - Enter AUTO mode
- `/checklist` - Generate contextual checklists

### Specialist Agents
29 specialist agents for different domains:
- Security, Performance, Accessibility
- Architecture, Testing, Code Quality
- Frontend, Backend, DevOps
- And more...

### Skills
Reusable workflows for consistent development:
- Test-Driven Development
- Systematic Debugging
- API Design
- Refactoring
- And more...

## MCP Integration (Required)

This plugin requires the CodingBuddy MCP server for full functionality:

```bash
npm install -g codingbuddy
```

The MCP server provides:
- Agents, commands, and skills from `packages/rules/.ai-rules/` (single source of truth)
- Checklists and specialist agent recommendations
- Context management for PLAN/ACT/EVAL workflow

## Architecture

```
packages/rules/.ai-rules/     ← Single source of truth (agents, skills, rules)
        ↓ (MCP protocol)
packages/claude-code-plugin/  ← Thin plugin (manifest + MCP configuration)
```

This architecture ensures:
- **No duplication**: All definitions live in one place
- **DRY principle**: Changes only need to be made once
- **Single source of truth**: `packages/rules/.ai-rules/` is the canonical source

## Documentation

- [Core Rules](https://github.com/JeremyDev87/codingbuddy/tree/master/packages/rules/.ai-rules/rules)
- [Agents Guide](https://github.com/JeremyDev87/codingbuddy/tree/master/packages/rules/.ai-rules/agents)
- [Skills Guide](https://github.com/JeremyDev87/codingbuddy/tree/master/packages/rules/.ai-rules/skills)

## License

MIT
