# OpenCode Integration Guide

This guide explains how to use the common AI rules (`.ai-rules/`) in OpenCode and its successor Crush.

## Overview

OpenCode (now evolved as "Crush" by Charm Bracelet) uses JSON configuration files to define agents, context paths, and tool permissions. This guide helps integrate the `.ai-rules/` system with OpenCode's agent-based workflow.

## Project Status

⚠️ **Important**: The original OpenCode project has been archived (September 2025) and continued as **"Crush"** by Charm Bracelet with 16.7k+ stars. This guide supports both versions.

- **OpenCode**: Uses `.opencode.json` configuration
- **Crush**: Uses `crush.json` or `~/.config/crush/crush.json` configuration

## Integration Method

### 1. Configure OpenCode/Crush Settings

Update your configuration file (`.opencode.json` or `crush.json`):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "model": "anthropic/claude-sonnet-4-20250514",
  "default_agent": "plan-mode",

  "instructions": [
    "packages/rules/.ai-rules/rules/core.md",
    "packages/rules/.ai-rules/rules/augmented-coding.md", 
    "packages/rules/.ai-rules/rules/project.md",
    "packages/rules/.ai-rules/adapters/opencode.md",
    "CLAUDE.md"
  ],

  "agent": {
    "plan-mode": {
      "description": "PLAN mode - Analysis and planning without changes",
      "mode": "primary",
      "prompt": "{file:packages/rules/.ai-rules/agents/plan-mode.json}\n\n[OpenCode Override]\nMode: PLAN only. Always respond in Korean. Do NOT make any file changes. Focus on analysis and planning.",
      "permission": {
        "edit": "deny",
        "bash": {
          "git status": "allow",
          "git diff*": "allow", 
          "git log*": "allow",
          "*": "ask"
        }
      }
    },
    "act-mode": {
      "description": "ACT mode - Full development with all tools",
      "mode": "primary",
      "prompt": "{file:packages/rules/.ai-rules/agents/act-mode.json}\n\n[OpenCode Override]\nMode: ACT. Always respond in Korean. Follow TDD workflow and code quality standards.",
      "permission": {
        "edit": "allow",
        "bash": "allow"
      }
    },
    "eval-mode": {
      "description": "EVAL mode - Code quality evaluation", 
      "mode": "primary",
      "prompt": "{file:packages/rules/.ai-rules/agents/eval-mode.json}\n\n[OpenCode Override]\nMode: EVAL. Always respond in Korean. Provide evidence-based evaluation.",
      "permission": {
        "edit": "deny",
        "bash": {
          "git status": "allow",
          "git diff*": "allow",
          "git log*": "allow",
          "*": "ask"
        }
      }
    },
    "backend": {
      "description": "Backend development - Node.js, Python, Go, Java, Rust",
      "mode": "subagent",
      "prompt": "{file:packages/rules/.ai-rules/agents/backend-developer.json}\n\n[OpenCode Override]\nAlways respond in Korean. Follow TDD workflow and clean architecture.",
      "permission": {
        "edit": "allow",
        "bash": "allow"
      }
    },
    "architect": {
      "description": "Architecture and design patterns specialist",
      "mode": "subagent",
      "prompt": "{file:packages/rules/.ai-rules/agents/architecture-specialist.json}\n\n[OpenCode Override]\nAlways respond in Korean. Focus on layer boundaries and dependency direction.",
      "permission": {
        "edit": "deny",
        "bash": "ask"
      }
    },
    "tester": {
      "description": "Test strategy and TDD specialist",
      "mode": "subagent",
      "prompt": "{file:packages/rules/.ai-rules/agents/test-strategy-specialist.json}\n\n[OpenCode Override]\nAlways respond in Korean. Enforce 90%+ coverage and no-mocking principle.",
      "permission": {
        "edit": "allow",
        "bash": "allow"
      }
    },
    "security": {
      "description": "Security audit - OAuth, JWT, XSS/CSRF protection",
      "mode": "subagent",
      "prompt": "{file:packages/rules/.ai-rules/agents/security-specialist.json}\n\n[OpenCode Override]\nAlways respond in Korean. Follow OWASP guidelines.",
      "permission": {
        "edit": "deny",
        "bash": "ask"
      }
    },
    "a11y": {
      "description": "Accessibility - WCAG 2.1 AA compliance",
      "mode": "subagent",
      "prompt": "{file:packages/rules/.ai-rules/agents/accessibility-specialist.json}\n\n[OpenCode Override]\nAlways respond in Korean. Verify ARIA and keyboard navigation.",
      "permission": {
        "edit": "deny",
        "bash": "ask"
      }
    },
    "performance": {
      "description": "Performance optimization specialist",
      "mode": "subagent",
      "prompt": "{file:packages/rules/.ai-rules/agents/performance-specialist.json}\n\n[OpenCode Override]\nAlways respond in Korean. Focus on bundle size and runtime optimization.",
      "permission": {
        "edit": "deny",
        "bash": "ask"
      }
    }
  },

  "mcp": {
    "codingbuddy": {
      "type": "local",
      "command": ["npx", "codingbuddy@latest", "mcp"]
    }
  }
}
```

### 2. Agent System Mapping

| Codingbuddy Agent | OpenCode Agent | Purpose |
|------------------|----------------|---------|
| **plan-mode.json** | `plan-mode` | PLAN mode workflow (delegates to frontend-developer) |
| **act-mode.json** | `act-mode` | ACT mode workflow (delegates to frontend-developer) |
| **eval-mode.json** | `eval-mode` | EVAL mode workflow (delegates to code-reviewer) |
| **frontend-developer.json** | N/A (delegate) | Primary development implementation |
| **backend-developer.json** | `backend` | Backend development (Node.js, Python, Go, Java, Rust) |
| **code-reviewer.json** | N/A (delegate) | Code quality evaluation implementation |
| **architecture-specialist.json** | `architect` | Architecture and design patterns |
| **test-strategy-specialist.json** | `tester` | Test strategy and TDD |
| **security-specialist.json** | `security` | Security audit |
| **accessibility-specialist.json** | `a11y` | WCAG compliance |
| **performance-specialist.json** | `performance` | Performance optimization |

#### Mode Agent vs Specialist Agent

- **Mode Agents** (`plan-mode`, `act-mode`, `eval-mode`): Workflow orchestrators that delegate to appropriate implementation agents
- **Specialist Agents** (`architect`, `security`, etc.): Domain-specific expertise for specialized tasks
- **Delegate Agents** (`frontend-developer`, `code-reviewer`): Implementation agents that Mode Agents delegate to

### 3. MCP Server Integration

#### Codingbuddy MCP Server

Add to your MCP configuration:

```json
{
  "mcp": {
    "codingbuddy": {
      "type": "local",
      "command": ["npx", "codingbuddy@latest", "mcp"],
      "env": ["NODE_ENV=production"]
    }
  }
}
```

#### Available MCP Tools

Once connected, you can use:
- `search_rules`: Query AI rules and guidelines
- `get_agent_details`: Get specialist agent information
- `recommend_skills`: Get skill recommendations based on prompt
- `parse_mode`: Parse PLAN/ACT/EVAL workflow mode (includes dynamic language instructions)

#### Dynamic Language Configuration

OpenCode agents get language instructions dynamically from the MCP server:

1. **Set language in codingbuddy.config.js:**
   ```javascript
   module.exports = {
     language: 'ko',  // or 'en', 'ja', 'zh', 'es', etc.
     // ... other config
   };
   ```

2. **Call parse_mode to get dynamic language instruction:**
   ```bash
   # AI should call parse_mode when user starts with PLAN/ACT/EVAL
   # Returns languageInstruction field automatically
   ```

3. **Remove hardcoded language from agent prompts:**
   ```json
   {
     "agent": {
       "plan-mode": {
         "prompt": "{file:...plan-mode.json}\n\n[OpenCode Override]\nMode: PLAN only. Use languageInstruction from parse_mode response.",
       }
     }
   }
   ```

#### Enhanced parse_mode Response

The `parse_mode` tool now returns additional Mode Agent information and dynamic language instructions:

```json
{
  "mode": "PLAN",
  "originalPrompt": "Build a new user registration feature",
  "instructions": "Design-first approach. From TDD perspective...",
  "rules": [...],
  "language": "en",
  "languageInstruction": "Always respond in English.",
  "agent": "plan-mode",
  "delegates_to": "frontend-developer",
  "delegate_agent_info": {
    "name": "Frontend Developer",
    "description": "React/Next.js expert, TDD and design system experience",
    "expertise": ["React", "Next.js", "TDD", "TypeScript"]
  }
}
```

**New Fields:**
- `language`: Language code from codingbuddy.config.js
- `languageInstruction`: Formatted instruction text for AI assistants (🆕)
- `agent`: Mode Agent name (plan-mode, act-mode, eval-mode)
- `delegates_to`: Which specialist agent the Mode Agent delegates to
- `delegate_agent_info`: Detailed information about the delegate agent (optional)

**Backward Compatibility:** All new fields are optional. Existing clients continue to work unchanged.

## Usage Workflows

### PLAN → ACT → EVAL Workflow

#### 1. Start with PLAN Mode

```bash
# In OpenCode CLI
/agent plan-mode

# Then in chat
Build a new user registration feature
```

**Plan-mode agent will:**
- Analyze requirements
- Create structured implementation plan
- Generate todo list using todo_write tool
- Reference .ai-rules for consistent standards

#### 2. Execute with ACT Mode

```bash
# Switch to act agent
/agent act-mode

# Continue implementation
ACT
```

**Act-mode agent will:**
- Execute TDD workflow (Red → Green → Refactor)
- Implement code following .ai-rules standards
- Maintain 90%+ test coverage
- Use TypeScript strict mode (no `any`)

#### 3. Evaluate with EVAL Mode

```bash
# Switch to eval agent
/agent eval-mode

# Request evaluation
EVAL
```

**Eval-mode agent will:**
- Provide evidence-based code review
- Check SOLID principles compliance
- Verify security and accessibility standards
- Reference specialist frameworks

### Direct Agent Usage

```bash
# Use specific specialist agents
/agent architect    # Architecture review
/agent security    # Security audit  
/agent a11y        # Accessibility check
/agent performance # Performance optimization
```

## Custom Commands

Create workflow commands in `~/.config/opencode/commands/` or `~/.config/crush/commands/`:

### PLAN Command (`plan-feature.md`)
```markdown
READ {file:packages/rules/.ai-rules/rules/core.md}
READ {file:packages/rules/.ai-rules/rules/project.md}
ANALYZE $FEATURE_REQUIREMENTS
CREATE implementation plan following TDD principles
GENERATE todo list with priorities
```

### ACT Command (`implement-tdd.md`)
```markdown
READ {file:packages/rules/.ai-rules/rules/augmented-coding.md}
FOLLOW Red → Green → Refactor cycle
MAINTAIN 90%+ test coverage
USE TypeScript strict mode
COMMIT after each green phase
```

### EVAL Command (`code-review.md`)
```markdown
READ {file:packages/rules/.ai-rules/agents/code-reviewer.json}
ANALYZE code quality with evidence
CHECK SOLID principles
VERIFY security and accessibility
PROVIDE improvement recommendations
```

## Directory Structure

```
project/
├── .opencode.json           # OpenCode configuration
├── crush.json               # Crush configuration (alternative)
├── packages/rules/.ai-rules/
│   ├── adapters/
│   │   └── opencode.md      # This guide
│   ├── agents/
│   │   ├── frontend-developer.json
│   │   ├── code-reviewer.json
│   │   └── *.json
│   ├── rules/
│   │   ├── core.md
│   │   ├── project.md
│   │   └── augmented-coding.md
│   └── skills/
│       └── */SKILL.md
└── ~/.config/opencode/      # User-specific settings
    └── commands/            # Custom workflow commands
```

## Crush-Specific Features

For Crush users, additional features available:

### Multi-Model Support
```json
{
  "agents": {
    "coder": { "model": "claude-3.7-sonnet", "maxTokens": 5000 },
    "task": { "model": "gpt-4o", "maxTokens": 3000 },
    "title": { "model": "claude-3.7-sonnet", "maxTokens": 80 }
  }
}
```

### LSP Integration
```json
{
  "lsp": {
    "typescript": { 
      "command": "typescript-language-server",
      "args": ["--stdio"] 
    },
    "go": { "command": "gopls" }
  }
}
```

### Skills System
```json
{
  "options": {
    "skills_paths": [
      "packages/rules/.ai-rules/skills",
      "~/.config/crush/skills"
    ]
  }
}
```

## Benefits

### ✅ Advantages

- **Terminal-native**: Developer-friendly TUI interface
- **Multi-session Management**: Project-specific context isolation
- **Agent-based Workflow**: Clear separation of concerns
- **Consistent Standards**: Same rules across all AI tools
- **MCP Integration**: Access to specialized tools and knowledge
- **Korean Language Support**: Full Korean responses configured

### ✅ Key Features

- **Dynamic Model Switching**: Change AI models during session
- **Advanced Permissions**: Fine-grained tool access control
- **Auto-initialization**: Project-specific context loading
- **File Reference System**: `{file:path}` syntax for instructions

## Troubleshooting

### Common Issues

**1. Permission Denied**
```bash
# Check current agent permissions
/agent info

# Switch to appropriate agent
/agent act-mode  # For file editing
/agent plan-mode # For read-only analysis
```

**2. MCP Connection Failed**
```bash
# Verify codingbuddy installation
npx codingbuddy@latest --version

# Test MCP connection
npx codingbuddy@latest mcp
```

**3. Agent Not Responding in Korean**
- Verify `[OpenCode Override]` includes Korean language setting
- Check agent prompt includes language instruction

### Migration from OpenCode to Crush

1. **Rename configuration file**: `.opencode.json` → `crush.json`
2. **Update schema reference**: Use Crush schema URL
3. **Install Crush**: `brew install charmbracelet/tap/crush`
4. **Migrate sessions**: Export/import session data

## Maintenance

### Updating Rules

**For universal changes:**
1. Edit files in `packages/rules/.ai-rules/`
2. Changes automatically apply to all agents

**For OpenCode-specific changes:**
1. Update agent prompts in configuration file
2. Modify custom commands in commands directory

### Version Compatibility

- **OpenCode 0.x**: Use `.opencode.json`
- **Crush 1.x+**: Use `crush.json` or global config
- **Both**: Maintain separate config files

## Advanced Usage

### Parallel Agent Workflows

```bash
# Terminal 1: Planning
opencode --agent plan-mode
Create a plan for me

# Terminal 2: Implementation  
opencode --agent act-mode
ACT

# Terminal 3: Review
opencode --agent eval-mode
EVAL
```

### Custom Agent Creation

```json
{
  "agent": {
    "custom": {
      "description": "Custom specialist agent",
      "mode": "subagent", 
      "prompt": "{file:packages/rules/.ai-rules/agents/custom-specialist.json}",
      "tools": {
        "write": true,
        "edit": true,
        "bash": false
      }
    }
  }
}
```

## Examples

### Frontend Development Session

```bash
# 1. Start planning
/agent plan-mode
Build a React component library

# 2. Implement
/agent act-mode
ACT

# 3. Review
/agent eval-mode
EVAL

# 4. Optimize
/agent performance
Suggest performance optimizations
```

### Full-Stack Development

```bash
# Frontend work
/agent plan-mode
Plan user dashboard UI

# Backend work
/agent backend
Implement API endpoint

# Security review
/agent security
Check security vulnerabilities
```

## AUTO Mode

AUTO mode enables autonomous PLAN -> ACT -> EVAL cycling until quality criteria are met.

### Triggering AUTO Mode

Use the `AUTO` keyword (or localized versions) at the start of your message:

| Language | Keyword |
|----------|---------|
| English | `AUTO` |
| Korean | `자동` |
| Japanese | `自動` |
| Chinese | `自动` |
| Spanish | `AUTOMATICO` |

### Example Usage

```bash
# Start AUTO mode
/agent plan-mode
AUTO Build a new user authentication feature
```

### Workflow

1. **PLAN Phase**: Creates implementation plan with quality criteria (read-only)
2. **ACT Phase**: Executes implementation following TDD workflow (full permissions)
3. **EVAL Phase**: Evaluates quality against exit criteria (read-only)
4. **Loop/Exit**: Continues cycling until:
   - Success: `Critical = 0 AND High = 0`
   - Failure: Max iterations reached (default: 3)

### OpenCode Agent Integration

AUTO mode automatically switches between agents:

```
AUTO detected
    ↓
plan-mode agent (PLAN phase)
    ↓
act-mode agent (ACT phase)
    ↓
eval-mode agent (EVAL phase)
    ↓
[Check quality criteria]
    ↓
Loop or Exit
```

### Configuration

Configure in `codingbuddy.config.js`:

```javascript
module.exports = {
  auto: {
    maxIterations: 3
  }
};
```

### AUTO Mode Output Format

```
# Mode: AUTO (Iteration 1/3)

## Phase: PLAN
[Planning with plan-mode agent...]

## Phase: ACT
[Implementation with act-mode agent...]

## Phase: EVAL
[Evaluation with eval-mode agent...]

### Quality Status
- Critical: 0
- High: 0

✅ AUTO mode completed successfully!
```

### When to Use

- Large feature implementations requiring multiple refinement cycles
- Complex refactoring with quality verification
- Bug fixes needing comprehensive testing
- Code quality improvements with measurable criteria

---

This guide ensures consistent, high-quality AI-assisted development using OpenCode/Crush with the `.ai-rules` system. All agents follow the same standards while leveraging OpenCode's powerful terminal-based interface.
