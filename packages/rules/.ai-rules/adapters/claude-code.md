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
- Tech stack (see project package.json)
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

- Follow project's configured language setting
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
User: Build a new feature

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

## Skills

CodingBuddy skills are accessible via MCP tools:

### List Available Skills

Use `list_skills` MCP tool to see all available skills.

### Use a Skill

Use `get_skill` MCP tool with skill name:

- `get_skill("brainstorming")` - Explore requirements before implementation
- `get_skill("test-driven-development")` - TDD workflow
- `get_skill("systematic-debugging")` - Debug methodically
- `get_skill("writing-plans")` - Create implementation plans
- `get_skill("executing-plans")` - Execute plans with checkpoints
- `get_skill("subagent-driven-development")` - In-session plan execution
- `get_skill("dispatching-parallel-agents")` - Handle parallel tasks
- `get_skill("frontend-design")` - Build production-grade UI

### When to Use Skills

- **brainstorming**: Before any creative work or new features
- **test-driven-development**: Before implementing features or bugfixes
- **systematic-debugging**: When encountering bugs or test failures
- **writing-plans**: For multi-step tasks with specs
- **executing-plans**: Following written implementation plans
- **frontend-design**: Building web components or pages

### Auto-Recommend Skills

Use `recommend_skills` MCP tool to get skill recommendations based on user prompt:

```typescript
// AI can call this to get skill recommendations
recommend_skills({ prompt: "There is a bug in the login" })
// => recommends: systematic-debugging

recommend_skills({ prompt: "로그인에 버그가 있어" })
// => recommends: systematic-debugging (Korean support)

recommend_skills({ prompt: "Build a dashboard component" })
// => recommends: frontend-design
```

**Supported Languages:** English, Korean, Japanese, Chinese, Spanish

The tool returns skill recommendations with confidence levels (high/medium) and matched patterns for transparency.

## Agent Hierarchy

CodingBuddy uses a layered agent hierarchy for different types of tasks:

### Tier 1: Primary Agents (Mode-specific)

| Mode | Agents | Description |
|------|--------|-------------|
| **PLAN** | solution-architect, technical-planner | Design and planning tasks |
| **ACT** | tooling-engineer, frontend-developer, backend-developer, devops-engineer, agent-architect | Implementation tasks |
| **EVAL** | code-reviewer | Code review and evaluation |

> **Note**: `tooling-engineer` has highest priority for config/build tool tasks (tsconfig, eslint, vite.config, package.json, etc.)

### Tier 2: Specialist Agents

Specialist agents can be invoked by any Primary Agent as needed:

- security-specialist
- accessibility-specialist
- performance-specialist
- test-strategy-specialist
- documentation-specialist
- architecture-specialist
- code-quality-specialist
- seo-specialist
- design-system-specialist

### Agent Resolution

1. **PLAN mode**: Always uses `solution-architect` or `technical-planner` based on prompt analysis
2. **ACT mode**: Resolution priority:
   1. Explicit agent request in prompt (e.g., "work with backend-developer")
   2. `recommended_agent` parameter (from PLAN mode recommendation)
   3. Tooling pattern matching (config files, build tools → `tooling-engineer`)
   4. Project configuration (`primaryAgent` setting)
   5. Context inference (file extension/path)
   6. Default: `frontend-developer`
3. **EVAL mode**: Always uses `code-reviewer`

### Using recommended_agent Parameter

When transitioning from PLAN to ACT mode, pass the recommended agent:

```typescript
// After PLAN mode returns recommended_act_agent
const planResult = await parse_mode({ prompt: "PLAN design auth API" });
// planResult.recommended_act_agent = { agentName: "backend-developer", ... }

// Pass to ACT mode for context preservation
const actResult = await parse_mode({
  prompt: "ACT implement the API",
  recommended_agent: planResult.recommended_act_agent.agentName
});
// actResult.delegates_to = "backend-developer" (uses the recommendation)
```

This enables seamless agent context passing across PLAN → ACT workflow transitions.

## Activation Messages

When agents or skills are activated, CodingBuddy displays activation messages for transparency:

### Output Format

```
🤖 solution-architect [Primary Agent]
👤 security-specialist [Specialist] (by solution-architect)
⚡ brainstorming [Specialist] (by technical-planner)
```

### Icons

| Icon | Meaning |
|------|---------|
| 🤖 | Primary Agent |
| 👤 | Specialist Agent |
| ⚡ | Skill |

### ParseMode Response Fields

The `parse_mode` MCP tool returns these agent-related fields:

```json
{
  "mode": "PLAN",
  "delegates_to": "solution-architect",
  "primary_agent_source": "intent",
  "activation_message": {
    "formatted": "🤖 solution-architect [Primary Agent]",
    "activations": [
      {
        "type": "agent",
        "name": "solution-architect",
        "tier": "primary",
        "timestamp": "2024-01-06T12:00:00Z"
      }
    ]
  },
  "recommended_act_agent": {
    "agentName": "backend-developer",
    "reason": "API implementation task detected",
    "confidence": 0.9
  }
}
```

### Displaying Activation Messages

AI assistants should display the `activation_message.formatted` field at the start of their response:

```
🤖 solution-architect [Primary Agent]

# Mode: PLAN

...
```

## Parallel Specialist Agents Execution

CodingBuddy supports parallel execution of multiple specialist agents for comprehensive analysis.

### When to Use Parallel Execution

Parallel execution is recommended when `parse_mode` returns a `parallelAgentsRecommendation` field:

| Mode | Default Specialists | Use Case |
|------|---------------------|----------|
| **PLAN** | architecture-specialist, test-strategy-specialist | Validate architecture and test approach |
| **ACT** | code-quality-specialist, test-strategy-specialist | Verify implementation quality |
| **EVAL** | security-specialist, accessibility-specialist, performance-specialist, code-quality-specialist | Comprehensive multi-dimensional review |

### parallelAgentsRecommendation Response Field

The `parse_mode` MCP tool returns this field to recommend parallel specialist execution:

```json
{
  "mode": "EVAL",
  "parallelAgentsRecommendation": {
    "specialists": [
      "security-specialist",
      "accessibility-specialist",
      "performance-specialist",
      "code-quality-specialist"
    ],
    "hint": "Use Task tool with subagent_type=\"general-purpose\" and run_in_background=true for each specialist. Call prepare_parallel_agents MCP tool to get ready-to-use prompts."
  }
}
```

### Parallel Execution Workflow

```
Call parse_mode
     ↓
Check parallelAgentsRecommendation
     ↓ (if exists)
Display start message to user
     ↓
Call prepare_parallel_agents MCP
     ↓
Call each agent.taskPrompt via Task tool in parallel:
  - subagent_type: "general-purpose"
  - run_in_background: true
  - prompt: agent.taskPrompt
     ↓
Collect results with TaskOutput
     ↓
Display consolidated results to user
```

### Code Example

```typescript
// Step 1: Parse mode returns parallelAgentsRecommendation
const parseModeResult = await parse_mode({ prompt: "EVAL review auth implementation" });

if (parseModeResult.parallelAgentsRecommendation) {
  // Step 2: Display start message to user
  console.log("🚀 Dispatching 4 specialist agents in parallel...");
  console.log("   → 🔒 security-specialist");
  console.log("   → ♿ accessibility-specialist");
  console.log("   → ⚡ performance-specialist");
  console.log("   → 📏 code-quality-specialist");

  // Step 3: Prepare parallel agents
  const preparedAgents = await prepare_parallel_agents({
    mode: "EVAL",
    specialists: parseModeResult.parallelAgentsRecommendation.specialists,
    sharedContext: "Review authentication implementation",
    targetFiles: ["src/auth/login.tsx"]
  });

  // Step 4: Execute in parallel using Task tool
  const agentTasks = preparedAgents.agents.map(agent =>
    Task({
      subagent_type: "general-purpose",
      prompt: agent.taskPrompt,
      description: agent.description,
      run_in_background: true,
      model: "haiku" // Use haiku for efficiency
    })
  );

  // Step 5: Collect results
  const results = await Promise.all(agentTasks.map(task => TaskOutput(task.id)));

  // Step 6: Display summary
  console.log("📊 Specialist Analysis Complete:");
  results.forEach(result => console.log(result.summary));
}
```

### Visibility Pattern

When executing parallel specialists, display clear status messages:

**Start Message:**
```
🚀 Dispatching N specialist agents in parallel...
   → 🔒 security-specialist
   → ♿ accessibility-specialist
   → ⚡ performance-specialist
   → 📏 code-quality-specialist
```

**Completion Message:**
```
📊 Specialist Analysis Complete:

🔒 Security Specialist:
   [findings summary]

♿ Accessibility Specialist:
   [findings summary]

⚡ Performance Specialist:
   [findings summary]

📏 Code Quality Specialist:
   [findings summary]
```

### Specialist Icons

| Icon | Specialist |
|------|------------|
| 🔒 | security-specialist |
| ♿ | accessibility-specialist |
| ⚡ | performance-specialist |
| 📏 | code-quality-specialist |
| 🧪 | test-strategy-specialist |
| 🏛️ | architecture-specialist |
| 📚 | documentation-specialist |
| 🔍 | seo-specialist |
| 🎨 | design-system-specialist |

### Handling Failures

When `prepare_parallel_agents` returns `failedAgents`:

```
⚠️ Some agents failed to load:
   ✗ performance-specialist: Profile not found

Continuing with 3/4 agents...
```

**Strategy:**
- Continue with successfully loaded agents
- Report failures clearly to user
- Document which agents couldn't be loaded in final report

### Specialist Activation Scope

Each workflow mode activates different specialist agents:

- **PLAN mode**: Architecture and test strategy specialists validate design
- **ACT mode**: Code quality and test strategy specialists verify implementation
- **EVAL mode**: Security, accessibility, performance, and code quality specialists provide comprehensive review

**Important:** Specialists from one mode do NOT carry over to the next mode. Each mode has its own recommended specialist set.

## AUTO Mode

AUTO mode enables autonomous iteration through PLAN -> ACT -> EVAL cycles until quality criteria are met.

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

```
AUTO implement user authentication with JWT tokens
```

```
자동 사용자 인증 기능을 JWT로 구현해줘
```

### Expected Behavior

1. **Initial PLAN**: Creates implementation plan with quality criteria
2. **ACT Iteration**: Executes implementation following TDD workflow
3. **EVAL Check**: Evaluates quality against exit criteria
4. **Loop or Exit**:
   - If quality met (Critical=0, High=0): Exits with success summary
   - If max iterations reached: Exits with failure summary and remaining issues
   - Otherwise: Returns to PLAN with improvement focus

### Exit Criteria

- **Success**: `Critical = 0 AND High = 0` severity issues
- **Failure**: Max iterations reached (default: 3, configurable via `auto.maxIterations`)

### Configuration

Configure AUTO mode in `codingbuddy.config.js`:

```javascript
module.exports = {
  auto: {
    maxIterations: 3  // Default: 3
  }
};
```

### AUTO Mode Output Format

```
# Mode: AUTO (Iteration 1/3)

## Phase: PLAN
[Planning content...]

## Phase: ACT
[Implementation content...]

## Phase: EVAL
[Evaluation content...]

### Quality Status
- Critical: 0
- High: 0

✅ AUTO mode completed successfully!
```

### When to Use AUTO Mode

- **Large feature implementations** that require multiple refinement cycles
- **Complex refactoring** where quality verification is critical
- **Bug fixes** that need comprehensive testing and validation
- **Code quality improvements** with measurable success criteria

### Differences from Manual Mode Flow

| Aspect | Manual Mode | AUTO Mode |
|--------|-------------|-----------|
| Transition | User triggers each mode | Automatic cycling |
| Iterations | Single pass per mode | Multiple cycles until quality met |
| Exit | User decides completion | Quality criteria or max iterations |
| Intervention | Required for each step | Only when requested or on failure |
