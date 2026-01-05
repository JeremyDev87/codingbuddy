# OpenCode Integration for Codingbuddy

This directory contains OpenCode-specific configuration and templates for integrating with the `.ai-rules` system.

## Quick Start

1. **Use existing configuration**: The main `opencode.json` is already configured
2. **For Crush users**: Use `crush.json` instead
3. **Custom commands**: Available in `commands/` directory

## Available Files

### Configuration
- `../opencode.json` - Main OpenCode configuration with .ai-rules integration
- `../crush.json` - Crush-compatible configuration  

### Custom Commands
- `commands/plan-feature.md` - PLAN mode workflow command
- `commands/implement-tdd.md` - ACT mode TDD implementation
- `commands/code-review.md` - EVAL mode code review

## Usage Examples

### Basic Workflow
```bash
# 1. Planning
/agent plan
새로운 기능을 계획해줘

# 2. Implementation  
/agent build
ACT

# 3. Review
/agent reviewer
EVAL
```

### Using Skills
```bash
/skill brainstorming "대시보드 UI"
/skill test-driven-development "API 구현"
/skill systematic-debugging "성능 이슈"
```

### Custom Commands
```bash
/plan-feature "사용자 인증"
/implement-tdd
/code-review
```

## Agent Overview

| Agent | Mode | Purpose |
|-------|------|---------|
| `plan` | PLAN | Analysis and planning (read-only) |
| `build` | ACT | Full development with file editing |
| `reviewer` | EVAL | Code quality evaluation |
| `architect` | Specialist | Architecture guidance |
| `security` | Specialist | Security assessment |
| `performance` | Specialist | Performance optimization |
| `a11y` | Specialist | Accessibility compliance |

All agents respond in Korean (한국어) and follow .ai-rules standards.

## MCP Integration

The configuration includes these MCP servers:
- `codingbuddy` - Rules search and agent details
- `context7` - Documentation lookup
- `github` - GitHub integration
- `filesystem` - File system operations

## Troubleshooting

### Common Issues

**Agent not responding in Korean:**
- Verify OpenCode Override includes Korean setting
- Check agent prompt configuration

**Permission denied:**
- Use `/agent build` for file editing
- Use `/agent plan` for read-only analysis

**MCP connection issues:**
- Ensure `npx codingbuddy@latest` works
- Check MCP server logs

### Getting Help

1. Read the full guide: `packages/rules/.ai-rules/adapters/opencode.md`
2. Check skills documentation: `packages/rules/.ai-rules/adapters/opencode-skills.md`
3. Review .ai-rules core: `packages/rules/.ai-rules/rules/core.md`

## Migration Notes

### From OpenCode to Crush
- Copy settings from `opencode.json` to `crush.json`
- Update schema reference
- Install Crush: `brew install charmbracelet/tap/crush`

### Adding New Agents
- Define in `agent` section of configuration
- Include Korean language override
- Set appropriate permissions
- Reference .ai-rules agent JSON files