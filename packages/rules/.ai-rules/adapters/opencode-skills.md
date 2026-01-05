# OpenCode Skills Integration Guide

This guide explains how to integrate `.ai-rules/skills/` with OpenCode/Crush's Agent Skills system.

## Overview

OpenCode/Crush supports Agent Skills standard for structured AI capabilities. This guide maps existing `.ai-rules/skills/` to OpenCode-compatible format and provides usage patterns.

## Skills Mapping

| .ai-rules Skill | OpenCode Usage | Agent Integration |
|----------------|----------------|-------------------|
| `brainstorming` | `/skill brainstorming` | plan agent |
| `test-driven-development` | `/skill tdd` | build agent |
| `systematic-debugging` | `/skill debug` | build agent |
| `writing-plans` | `/skill planning` | plan agent |
| `executing-plans` | `/skill execute` | build agent |
| `frontend-design` | `/skill frontend` | build agent |
| `dispatching-parallel-agents` | `/skill parallel` | plan agent |
| `subagent-driven-development` | `/skill subagent` | plan agent |

## Skills Configuration

### For OpenCode (.opencode.json)
```json
{
  "skills": {
    "paths": [
      "packages/rules/.ai-rules/skills"
    ],
    "auto_load": true
  }
}
```

### For Crush (crush.json)
```json
{
  "options": {
    "skills_paths": [
      "packages/rules/.ai-rules/skills"
    ],
    "auto_suggest_skills": true
  }
}
```

## Usage Patterns

### 1. Direct Skill Invocation
```bash
# In OpenCode CLI
/skill brainstorming "새로운 기능 아이디어"
/skill tdd "사용자 인증 구현"
/skill debug "로그인 버그 해결"
```

### 2. Agent + Skill Combination
```bash
# Planning with brainstorming skill
/agent plan
/skill brainstorming "대시보드 UI 개선"

# Implementation with TDD skill  
/agent build
/skill tdd "API 연동 구현"

# Review with debugging skill
/agent reviewer
/skill debug "성능 이슈 분석"
```

### 3. Automatic Skill Recommendation

OpenCode can automatically recommend skills based on prompts using the `recommend_skills` MCP tool:

```typescript
// Auto-triggered when user enters certain keywords
"버그가 있어" → recommends: systematic-debugging
"계획을 세워줘" → recommends: writing-plans  
"UI를 만들어줘" → recommends: frontend-design
```

## Skill Conversion Process

### 1. SKILL.md Format Compatibility

Existing `.ai-rules/skills/*/SKILL.md` files are already compatible with Agent Skills standard:

```markdown
# Skill Name

## Description
Brief description of the skill's purpose

## Usage
When and how to use this skill

## Steps
1. Step 1
2. Step 2
3. Step 3

## Examples
Example scenarios and outputs
```

### 2. No Conversion Required

The existing skills can be used directly in OpenCode without modification:

- **brainstorming/SKILL.md** ✅ Ready
- **test-driven-development/SKILL.md** ✅ Ready
- **systematic-debugging/SKILL.md** ✅ Ready
- **writing-plans/SKILL.md** ✅ Ready
- **executing-plans/SKILL.md** ✅ Ready
- **frontend-design/SKILL.md** ✅ Ready
- **dispatching-parallel-agents/SKILL.md** ✅ Ready
- **subagent-driven-development/SKILL.md** ✅ Ready

## Integration with MCP

### Codingbuddy MCP Skills

The `codingbuddy` MCP server provides skill recommendation:

```json
{
  "mcp": {
    "codingbuddy": {
      "type": "stdio",
      "command": ["npx", "codingbuddy@latest", "mcp"]
    }
  }
}
```

**Available MCP tools:**
- `recommend_skills`: Get skill recommendations based on user prompt
- `get_skill`: Load specific skill content
- `list_skills`: List all available skills

### Automatic Skill Loading

OpenCode agents can automatically load relevant skills:

```json
{
  "agent": {
    "plan": {
      "auto_skills": ["brainstorming", "writing-plans"],
      "systemPrompt": "You have access to brainstorming and planning skills..."
    },
    "build": {
      "auto_skills": ["test-driven-development", "executing-plans", "frontend-design"],
      "systemPrompt": "You have access to TDD, execution, and frontend skills..."
    }
  }
}
```

## Workflow Integration

### PLAN Mode Skills
When using `plan` agent, automatically suggest:
- **brainstorming**: For ideation and requirements exploration
- **writing-plans**: For structured implementation planning
- **dispatching-parallel-agents**: For complex multi-component features

### ACT Mode Skills  
When using `build` agent, automatically suggest:
- **test-driven-development**: For core logic implementation
- **executing-plans**: For systematic plan execution
- **frontend-design**: For UI component development
- **systematic-debugging**: When encountering issues

### EVAL Mode Skills
When using `reviewer` agent, automatically suggest:
- **systematic-debugging**: For error analysis
- **subagent-driven-development**: For improvement strategies

## Korean Language Support

All skills support Korean language through MCP integration:

```bash
# Korean skill invocation
/skill 브레인스토밍 "새로운 기능"
/skill TDD개발 "사용자 관리"
/skill 디버깅 "성능 문제"
```

The MCP server handles Korean→English skill name mapping automatically.

## Examples

### Planning a New Feature

```bash
# Start planning session
/agent plan

# Use brainstorming skill
/skill brainstorming "사용자 대시보드 개선"

# Generate implementation plan
계획을 세워줘
```

### Implementing with TDD

```bash  
# Switch to build agent
/agent build

# Load TDD skill
/skill test-driven-development "로그인 API 구현"

# Start TDD cycle
ACT
```

### Debugging Issues

```bash
# Use systematic debugging
/skill systematic-debugging "로그인 후 화면이 안 나와"

# Apply debugging methodology
디버깅해줘
```

## Benefits

### ✅ Advantages
- **No Migration Required**: Existing skills work as-is
- **Automatic Recommendations**: MCP-powered skill suggestions
- **Korean Support**: Full Korean language integration
- **Agent Integration**: Skills work seamlessly with agent modes
- **Workflow Enhancement**: Skills enhance PLAN/ACT/EVAL workflow

### ✅ Enhanced Capabilities
- **Context-Aware**: Skills adapt to current agent mode
- **Progressive Enhancement**: Skills complement agent capabilities
- **Structured Approach**: Consistent methodology across skills
- **Quality Focus**: Skills reinforce .ai-rules standards

## Maintenance

### Adding New Skills

1. Create new skill directory: `packages/rules/.ai-rules/skills/new-skill/`
2. Add `SKILL.md` file following Agent Skills format
3. Skills automatically available in OpenCode
4. Update skill mappings in this guide

### Updating Existing Skills

1. Modify skill content in `packages/rules/.ai-rules/skills/*/SKILL.md`
2. Changes automatically reflected in OpenCode
3. No configuration updates required

This integration provides seamless skills access within OpenCode while maintaining consistency with the broader `.ai-rules` ecosystem.
