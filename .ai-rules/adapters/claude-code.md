# Claude Code Integration Guide

This guide explains how to use the common AI rules (`.ai-rules/`) in Claude Code (Claude.ai Projects / Claude Desktop).

## Overview

Claude Code uses the `.claude/` directory for project-specific custom instructions, referencing the common rules from `.ai-rules/`.

## Integration Method

### 1. Create Claude Configuration

Create `.claude/rules/custom-instructions.md`:

```markdown
# Custom Instructions for Claude Code

## Project Rules

Follow the common rules defined in `.ai-rules/` for consistency across all AI coding assistants.

### Core Workflow
See `.ai-rules/rules/core.md` for:
- PLAN/ACT/EVAL workflow modes
- Agent activation rules
- Mode indicators and transitions

### Project Context
See `.ai-rules/rules/project.md` for:
- Tech stack (프로젝트의 package.json 참조)
- Project structure (app → widgets → features → entities → shared)
- Development rules and file naming conventions
- Domain knowledge

### Code Quality
See `.ai-rules/rules/augmented-coding.md` for:
- TDD cycle (Red → Green → Refactor)
- SOLID principles and code quality standards
- Testing best practices (90%+ coverage goal)
- Commit discipline

### Specialist Agents
See `.ai-rules/agents/README.md` for available specialist agents and their expertise areas.

## Claude Code Specific

- Always respond in Korean (한국어)
- Use structured markdown formatting
- Provide clear, actionable feedback
- Reference project context from `.ai-rules/rules/project.md`
```

### 2. Add to Claude Project

**In Claude.ai Projects**:
1. Create a new Project for this codebase
2. Add "Custom Instructions" with content from `.claude/rules/custom-instructions.md`
3. Attach relevant files from `.ai-rules/` as project knowledge

**In Claude Desktop**:
1. Set project-specific instructions
2. Reference `.claude/rules/` directory

## Directory Structure

```
.claude/
├── rules/
│   └── custom-instructions.md  # References .ai-rules
└── config.json                 # Claude project config (optional)

.ai-rules/
├── rules/
│   ├── core.md
│   ├── project.md
│   └── augmented-coding.md
├── agents/
│   └── *.json
└── adapters/
    └── claude-code.md  # This guide
```

## Usage

### In Claude Chat

```
User: 새로운 기능 만들어줘

Claude: # Mode: PLAN
        [Following .ai-rules/rules/core.md workflow]
        
User: ACT

Claude: # Mode: ACT
        [Execute with .ai-rules guidelines]
```

### Referencing Rules

Claude can directly read and reference:
- `.ai-rules/rules/*.md` files
- `.ai-rules/agents/*.json` files
- Project-specific patterns from `.ai-rules/rules/project.md`

## Benefits

- ✅ Consistent rules across all AI tools
- ✅ Claude's strong reasoning applied to your project standards  
- ✅ Easy updates: modify `.ai-rules/` once
- ✅ Project knowledge persists across sessions

## Maintenance

1. Update `.ai-rules/rules/*.md` for universal changes
2. Update `.claude/rules/custom-instructions.md` for Claude-specific features
3. Sync Claude Project instructions when rules change significantly
