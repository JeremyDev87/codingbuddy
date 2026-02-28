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
      "prompt": "{file:packages/rules/.ai-rules/agents/plan-mode.json}\n\n[OpenCode Override]\nMode: PLAN only. Do NOT make any file changes. Focus on analysis and planning. Follow languageInstruction from parse_mode response.",
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
      "prompt": "{file:packages/rules/.ai-rules/agents/act-mode.json}\n\n[OpenCode Override]\nMode: ACT. Follow TDD workflow and code quality standards. Follow languageInstruction from parse_mode response.",
      "permission": {
        "edit": "allow",
        "bash": "allow"
      }
    },
    "eval-mode": {
      "description": "EVAL mode - Code quality evaluation", 
      "mode": "primary",
      "prompt": "{file:packages/rules/.ai-rules/agents/eval-mode.json}\n\n[OpenCode Override]\nMode: EVAL. Provide evidence-based evaluation. Follow languageInstruction from parse_mode response.",
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
      "prompt": "{file:packages/rules/.ai-rules/agents/backend-developer.json}\n\n[OpenCode Override]\nFollow TDD workflow and clean architecture. Follow languageInstruction from parse_mode response.",
      "permission": {
        "edit": "allow",
        "bash": "allow"
      }
    },
    "architect": {
      "description": "Architecture and design patterns specialist",
      "mode": "subagent",
      "prompt": "{file:packages/rules/.ai-rules/agents/architecture-specialist.json}\n\n[OpenCode Override]\nFocus on layer boundaries and dependency direction. Follow languageInstruction from parse_mode response.",
      "permission": {
        "edit": "deny",
        "bash": "ask"
      }
    },
    "tester": {
      "description": "Test strategy and TDD specialist",
      "mode": "subagent",
      "prompt": "{file:packages/rules/.ai-rules/agents/test-strategy-specialist.json}\n\n[OpenCode Override]\nEnforce 90%+ coverage and no-mocking principle. Follow languageInstruction from parse_mode response.",
      "permission": {
        "edit": "allow",
        "bash": "allow"
      }
    },
    "security": {
      "description": "Security audit - OAuth, JWT, XSS/CSRF protection",
      "mode": "subagent",
      "prompt": "{file:packages/rules/.ai-rules/agents/security-specialist.json}\n\n[OpenCode Override]\nFollow OWASP guidelines. Follow languageInstruction from parse_mode response.",
      "permission": {
        "edit": "deny",
        "bash": "ask"
      }
    },
    "a11y": {
      "description": "Accessibility - WCAG 2.1 AA compliance",
      "mode": "subagent",
      "prompt": "{file:packages/rules/.ai-rules/agents/accessibility-specialist.json}\n\n[OpenCode Override]\nVerify ARIA and keyboard navigation. Follow languageInstruction from parse_mode response.",
      "permission": {
        "edit": "deny",
        "bash": "ask"
      }
    },
    "performance": {
      "description": "Performance optimization specialist",
      "mode": "subagent",
      "prompt": "{file:packages/rules/.ai-rules/agents/performance-specialist.json}\n\n[OpenCode Override]\nFocus on bundle size and runtime optimization. Follow languageInstruction from parse_mode response.",
      "permission": {
        "edit": "deny",
        "bash": "ask"
      }
    }
  },

  "mcp": {
    "codingbuddy": {
      "type": "local",
      "command": ["npx", "codingbuddy@latest", "mcp"],
      "env": {
        "CODINGBUDDY_PROJECT_ROOT": "/absolute/path/to/your/project"
      }
    }
  }
}
```

> **Note:** `auto-mode` does not require a separate agent entry. AUTO mode is triggered by prefixing any message with the `AUTO` keyword while using the `plan-mode` agent (see [AUTO Mode](#auto-mode) section below).

### 2. Agent System Mapping

| Codingbuddy Agent | OpenCode Agent | Purpose |
|------------------|----------------|---------|
| **plan-mode.json** | `plan-mode` | PLAN mode workflow (delegates to frontend-developer) |
| **act-mode.json** | `act-mode` | ACT mode workflow (delegates to frontend-developer) |
| **eval-mode.json** | `eval-mode` | EVAL mode workflow (delegates to code-reviewer) |
| **auto-mode.json** | N/A (keyword-triggered) | AUTO mode workflow (autonomous PLAN→ACT→EVAL cycle) |
| **frontend-developer.json** | N/A (delegate) | Primary development implementation |
| **backend-developer.json** | `backend` | Backend development (Node.js, Python, Go, Java, Rust) |
| **code-reviewer.json** | N/A (delegate) | Code quality evaluation implementation |
| **architecture-specialist.json** | `architect` | Architecture and design patterns |
| **test-strategy-specialist.json** | `tester` | Test strategy and TDD |
| **security-specialist.json** | `security` | Security audit |
| **accessibility-specialist.json** | `a11y` | WCAG compliance |
| **performance-specialist.json** | `performance` | Performance optimization |

#### Mode Agent vs Specialist Agent

- **Mode Agents** (`plan-mode`, `act-mode`, `eval-mode`, `auto-mode`): Workflow orchestrators that delegate to appropriate implementation agents
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
      "env": {
        "CODINGBUDDY_PROJECT_ROOT": "/absolute/path/to/your/project"
      }
    }
  }
}
```

> **Important:** OpenCode/Crush의 `roots/list` MCP capability 지원 여부는 미확인입니다.
> `CODINGBUDDY_PROJECT_ROOT` 없이는 서버가 프로젝트의 `codingbuddy.config.json`을 찾지 못하여
> `language` 등 설정이 기본값으로 동작합니다. 항상 이 환경변수를 프로젝트의 절대 경로로 설정하세요.

#### Available MCP Tools

Once connected, you can use the following tools (17 tools total):

**Core Workflow:**
- `parse_mode`: Parse PLAN/ACT/EVAL/AUTO workflow mode (includes dynamic language instructions)
- `update_context`: Persist decisions and notes to `docs/codingbuddy/context.md` (**mandatory** at mode completion)
- `read_context`: Read current context document
- `cleanup_context`: Manually trigger context document cleanup (auto-triggered when size exceeds threshold)

**Analysis & Planning:**
- `search_rules`: Query AI rules and guidelines
- `analyze_task`: Pre-planning task analysis with risk assessment and specialist recommendations
- `generate_checklist`: Contextual checklists (security, accessibility, performance, testing)

**Agent Dispatch:**
- `get_agent_details`: Get specialist agent information
- `get_agent_system_prompt`: Get complete system prompt for a specialist agent
- `dispatch_agents`: Get Task tool-ready dispatch parameters for agents
- `prepare_parallel_agents`: Ready-to-use prompts for parallel specialist agents

**Skills:**
- `recommend_skills`: Get skill recommendations based on prompt
- `get_skill`: Load full skill content by name
- `list_skills`: List all available skills with optional filtering

**Configuration:**
- `get_project_config`: Get project configuration (tech stack, architecture, language)
- `get_code_conventions`: Get project code conventions
- `suggest_config_updates`: Analyze project and suggest config updates based on detected changes

#### Context Persistence Workflow

The `update_context` tool persists PLAN/ACT/EVAL decisions to `docs/codingbuddy/context.md`. This is **mandatory** — without it, context is lost between mode switches and context compaction.

**Workflow:**

```
PLAN mode:
  parse_mode → (automatically resets context document)
  ... do planning work ...
  update_context({ mode: "PLAN", task: "...", decisions: [...], notes: [...] })

ACT mode:
  parse_mode → (reads existing context, appends new section)
  ... review previous PLAN decisions from contextDocument ...
  ... implement changes ...
  update_context({ mode: "ACT", progress: [...], notes: [...] })

EVAL mode:
  parse_mode → (reads existing context, appends new section)
  ... review PLAN decisions + ACT progress from contextDocument ...
  ... evaluate quality ...
  update_context({ mode: "EVAL", findings: [...], recommendations: [...] })
```

**Key Rules:**
- `parse_mode` automatically manages the context file (reset in PLAN, append in ACT/EVAL)
- You **must** call `update_context` before completing each mode
- The context file survives context compaction — it is the only persistent memory across modes
- Use `read_context` to check current context state at any time

#### Dynamic Language Configuration

OpenCode agents get language instructions dynamically from the MCP server:

1. **Set language in codingbuddy.config.json:**
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
- `language`: Language code from codingbuddy.config.json
- `languageInstruction`: Formatted instruction text for AI assistants (🆕)
- `agent`: Mode Agent name (plan-mode, act-mode, eval-mode, auto-mode)
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

### Skills Integration

Crush supports skills through two mechanisms:

1. **Native Discovery**: Place skills in `~/.config/crush/skills/` or configure additional paths via `options.skills_paths`. Crush automatically injects available skills into the system prompt.

2. **MCP Tools (Recommended)**: Use codingbuddy MCP server's skill tools for cross-platform, programmatic skill access:
   - `recommend_skills` — prompt-based skill recommendations
   - `get_skill` — load full skill content by name
   - `list_skills` — list all available skills

**Configuration:**
```json
{
  "options": {
    "skills_paths": [
      "packages/rules/.ai-rules/skills"
    ]
  }
}
```

> **Note:** There is no `/skill` slash command. Skills are activated through natural language or via MCP tools. See [opencode-skills.md](opencode-skills.md) for detailed usage patterns.

## Benefits

### ✅ Advantages

- **Terminal-native**: Developer-friendly TUI interface
- **Multi-session Management**: Project-specific context isolation
- **Agent-based Workflow**: Clear separation of concerns
- **Consistent Standards**: Same rules across all AI tools
- **MCP Integration**: Access to specialized tools and knowledge
- **Dynamic Language Support**: Configurable language via codingbuddy.config.json (ko, en, ja, zh, es, etc.)

### ✅ Key Features

- **Dynamic Model Switching**: Change AI models during session
- **Advanced Permissions**: Fine-grained tool access control
- **Auto-initialization**: Project-specific context loading
- **File Reference System**: `{file:path}` syntax for instructions — *unverified in Crush*

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

**3. Agent Not Responding in Configured Language**
- Verify `codingbuddy.config.json` has the correct `language` setting
- Call `parse_mode` to receive dynamic `languageInstruction`
- Ensure agent prompts do NOT hardcode a language — use `languageInstruction` from `parse_mode`

**4. Project Config Not Detected**
```bash
# CODINGBUDDY_PROJECT_ROOT가 MCP env에 설정되어 있는지 확인
# 이 환경변수 없이는 codingbuddy.config.json을 찾지 못합니다
# .opencode.json 또는 crush.json의 mcp 섹션에 추가:
"env": {
  "CODINGBUDDY_PROJECT_ROOT": "/absolute/path/to/your/project"
}
```

### Migration from OpenCode to Crush

1. **Rename configuration file**: `.opencode.json` → `crush.json`
2. **Update schema reference**: Use Crush schema URL
3. **Install Crush**: `brew install charmbracelet/tap/crush`
4. **Migrate sessions**: Export/import session data

## Verification Status

| Feature | Status | Notes |
|---------|--------|-------|
| Agent configuration (plan/act/eval-mode) | ✅ Verified | Agent JSON files exist at expected paths |
| MCP server connection | ✅ Verified | `npx codingbuddy@latest mcp` works |
| `parse_mode` with dynamic language | ✅ Verified | Returns `languageInstruction` field |
| `update_context` persistence | ✅ Verified | Writes to `docs/codingbuddy/context.md` |
| `{file:path}` syntax in prompts | ⚠️ Unverified | Not tested in live OpenCode/Crush environment |
| Custom Commands (`~/.config/opencode/commands/`) | ⚠️ Unverified | Command syntax may differ in Crush |
| AUTO mode single-agent execution | ⚠️ Unverified | Requires manual agent switching for permissions |
| Crush `skills_paths` configuration | ⚠️ Unverified | Based on Crush documentation, not tested |
| LSP integration | ⚠️ Unverified | Configuration format based on Crush docs |
| Multi-model support | ⚠️ Unverified | Configuration format based on Crush docs |

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

### Specialist Agents Execution

OpenCode/Crush does not have a `Task` tool for spawning background subagents like Claude Code. When `parse_mode` returns `parallelAgentsRecommendation`, execute specialists **sequentially** using the `/agent <name>` command.

#### Auto-Detection

The MCP server automatically detects OpenCode/Crush as the client and returns a sequential execution hint in `parallelAgentsRecommendation.hint`. No manual configuration is needed.

#### Sequential Workflow

```
parse_mode returns parallelAgentsRecommendation
  ↓
For each recommended specialist (sequentially):
  /agent <specialist-name>
  Perform specialist analysis
  Record findings
  ↓
/agent <current-mode-agent>  (e.g., /agent eval-mode — return to mode agent)
Consolidate all findings
```

#### Example (EVAL mode)

```
parse_mode({ prompt: "EVAL review auth implementation" })
→ parallelAgentsRecommendation:
    specialists: ["security-specialist", "accessibility-specialist", "performance-specialist"]

Sequential analysis:
  1. /agent security     → security-specialist: 🔒 Analyze from security perspective, record findings
  2. /agent a11y         → accessibility-specialist: ♿ Analyze from accessibility perspective, record findings
  3. /agent performance  → performance-specialist: ⚡ Analyze from performance perspective, record findings
  4. /agent eval-mode    → Return to EVAL mode

Present: Consolidated findings from all 3 specialists
```

#### Consuming dispatchReady from parse_mode

When `parse_mode` returns `dispatchReady`, the specialist system prompts are pre-built. In OpenCode, use the `dispatchParams.prompt` field as analysis context (ignore `subagent_type` — it is Claude Code specific):

```
parse_mode returns dispatchReady
  ↓
dispatchReady.primaryAgent
  → Use as the main analysis context
  ↓
dispatchReady.parallelAgents[] (if present)
  → For each: the dispatchParams.prompt field contains the specialist's system prompt.
    Switch via /agent, apply the prompt as analysis context, record findings
  ↓
Consolidate all findings
```

#### Specialist Agent Mapping

| parallelAgentsRecommendation | OpenCode Agent | Icon |
|------------------------------|----------------|------|
| security-specialist | `security` | 🔒 |
| accessibility-specialist | `a11y` | ♿ |
| performance-specialist | `performance` | ⚡ |
| architecture-specialist | `architect` | 🏛️ |
| test-strategy-specialist | `tester` | 🧪 |
| code-quality-specialist | N/A (inline) | 📏 |
| event-architecture-specialist | N/A (inline) | 📨 |
| integration-specialist | N/A (inline) | 🔗 |
| observability-specialist | N/A (inline) | 📊 |
| migration-specialist | N/A (inline) | 🔄 |
| documentation-specialist | N/A (inline) | 📚 |
| seo-specialist | N/A (inline) | 🔍 |
| i18n-specialist | N/A (inline) | 🌐 |

> **Note:** Specialists without a dedicated OpenCode agent (e.g., `code-quality-specialist`) should be analyzed inline within the current agent context using the specialist's system prompt from `prepare_parallel_agents`.
>
> **Fallback:** If `dispatchReady` is not present in the `parse_mode` response, call `prepare_parallel_agents` MCP tool to retrieve specialist system prompts.

#### Visibility Pattern

When executing sequential specialists, display clear status messages:

**Start:**
```
🔄 Executing N specialist analyses sequentially...
   → 🔒 security
   → ♿ a11y
   → ⚡ performance
```

**During:**
```
🔍 Analyzing from 🔒 security perspective... (1/3)
```

**Completion:**
```
📊 Specialist Analysis Complete:

🔒 Security:
   [findings summary]

♿ Accessibility:
   [findings summary]

⚡ Performance:
   [findings summary]
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
| Spanish | `AUTOMÁTICO` |

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

AUTO mode describes an autonomous PLAN→ACT→EVAL cycle. However, agent switching behavior differs by platform:

**⚠️ Limitation:** OpenCode/Crush does not support automatic agent switching. The `/agent <name>` command requires manual user input. Therefore, AUTO mode in OpenCode works in one of two ways:

**1. Single-Agent AUTO (Recommended):** Stay in the `plan-mode` agent and prefix your message with `AUTO`. The AI handles all phases within a single agent context, using `parse_mode` for mode-specific rules at each phase.

```
/agent plan-mode
AUTO Build a new user authentication feature
→ AI internally cycles: PLAN → ACT → EVAL using parse_mode
→ Note: File edits require the user to approve permission prompts
```

**2. Manual Agent Switching:** The user manually switches agents between phases:

```
/agent plan-mode → AUTO Build auth feature (PLAN phase starts)
/agent act-mode  → Continue (ACT phase — full edit/bash permissions)
/agent eval-mode → Continue (EVAL phase — read-only evaluation)
→ Repeat if quality criteria not met
```

**Recommended approach:** Use Single-Agent AUTO for simplicity. For strict permission control, use Manual Agent Switching.

### Configuration

Configure in `codingbuddy.config.json`:

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
