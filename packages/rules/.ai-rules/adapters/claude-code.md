# Claude Code Integration Guide

This guide explains how to use the common AI rules (`.ai-rules/`) in Claude Code (Claude.ai Projects / Claude Desktop).

## Overview

Claude Code uses the `.claude/` directory for project-specific custom instructions, referencing the common rules from `.ai-rules/`.

## 🆕 Code Conventions Support

CodingBuddy now automatically enforces project code conventions from config files:

### Available MCP Tool

**`get_code_conventions`**: Parses and exposes project conventions from:
- `tsconfig.json` - TypeScript strict mode, compiler options
- `eslint.config.js` / `.eslintrc.json` - Linting rules
- `.prettierrc` - Formatting rules (quotes, semicolons, indentation)
- `.editorconfig` - Editor settings (indent style/size, line endings, charset)
- `.markdownlint.json` - Markdown linting rules

### When to Use

**ACT Mode**: Call `get_code_conventions` before implementing to verify code follows project conventions.

**EVAL Mode**: The `conventions` checklist domain is automatically included in code reviews.

### Example Usage

```typescript
// In ACT mode
const conventions = await get_code_conventions();

// Verify TypeScript strict mode
if (conventions.typescript.strict) {
  // Ensure no implicit any types
}

// Check Prettier formatting
if (conventions.prettier.singleQuote) {
  // Use single quotes
}
```

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

recommend_skills({ prompt: "There is a bug in the login" })
// => recommends: systematic-debugging (multi-language support)

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

### Auto-Dispatch Workflow (Recommended)

When `parse_mode` returns `dispatchReady`, use it directly with the Task tool — no extra tool calls needed:

```
Call parse_mode
     ↓
Check dispatchReady
     ↓ (if exists)
Use dispatchReady.primaryAgent.dispatchParams with Task tool
     ↓
Use dispatchReady.parallelAgents[].dispatchParams with Task tool (run_in_background: true)
     ↓
Collect results with TaskOutput
     ↓
Display consolidated results to user
```

### Code Example (Auto-Dispatch)

```typescript
// Step 1: parse_mode returns dispatchReady with Task-tool-ready params
const parseModeResult = await parse_mode({ prompt: "EVAL review auth implementation" });

if (parseModeResult.dispatchReady) {
  const { primaryAgent, parallelAgents } = parseModeResult.dispatchReady;

  // Step 2: Dispatch primary agent (if present)
  if (primaryAgent) {
    Task({
      subagent_type: primaryAgent.dispatchParams.subagent_type,
      prompt: primaryAgent.dispatchParams.prompt,
      description: primaryAgent.dispatchParams.description,
    });
  }

  // Step 3: Dispatch parallel agents (if present)
  const tasks = [];
  if (parallelAgents) {
    for (const agent of parallelAgents) {
      tasks.push(Task({
        subagent_type: agent.dispatchParams.subagent_type,
        prompt: agent.dispatchParams.prompt,
        description: agent.dispatchParams.description,
        run_in_background: true,
      }));
    }
  }

  // Step 4: Collect results
  const results = await Promise.all(tasks.map(task => TaskOutput(task.id)));

  // Step 5: Display summary
  console.log("Specialist Analysis Complete:");
  results.forEach(result => console.log(result.summary));
}
```

### Standalone Dispatch Tool

For cases outside the `parse_mode` flow, use the `dispatch_agents` tool directly:

```typescript
const result = await dispatch_agents({
  mode: "EVAL",
  primaryAgent: "security-specialist",
  specialists: ["accessibility-specialist", "performance-specialist"],
  includeParallel: true,
  taskDescription: "Review auth implementation",
  targetFiles: ["src/auth/login.tsx"]
});

// result.primaryAgent.dispatchParams → ready for Task tool
// result.parallelAgents[].dispatchParams → ready for Task tool with run_in_background
```

### Legacy Workflow (prepare_parallel_agents)

The `prepare_parallel_agents` tool is still available for backward compatibility:

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

### Auto-Dispatch Enforcement

When `parse_mode` returns `dispatch="auto"` or `dispatchReady` with specialist agents, dispatching is **mandatory** — not optional.

**Rule:** Every listed specialist MUST be dispatched. Skipping any specialist is a protocol violation.

#### Red Flags

| Thought | Reality |
|---------|---------|
| "I can handle this analysis myself" | Specialists have domain expertise. Dispatch them. |
| "It's just a small change" | dispatch="auto" means the system determined specialists are needed. |
| "I'll save time by skipping" | Skipping causes missed issues that cost more later. |
| "I'll dispatch later" | Dispatch IMMEDIATELY when dispatch="auto" is returned. |

### Execution Model: Outer Transport vs Inner Coordination

CodingBuddy uses a **nested execution model** with two distinct layers:

| Layer | Role | Tool | Scope |
|-------|------|------|-------|
| **Outer transport** | Parallel task execution across isolated environments | **TaskMaestro** (tmux + git worktree) or **SubAgent** (background agents) | One pane/agent per issue or task |
| **Inner coordination** | Specialist collaboration within a single session | **Teams** (experimental) | Multiple specialists within one pane/session |

> **Key distinction:** TaskMaestro and SubAgent are alternatives for the *outer* layer. Teams is an *inner* layer that can optionally run inside either outer strategy.

#### Nested Execution Examples

**Example 1: TaskMaestro (outer) + Teams (inner)**

```
TaskMaestro session (outer)
├── Pane 1: Issue #101 (auth feature)
│   └── Teams session (inner, optional)
│       ├── security-specialist → reviews auth impl
│       └── test-strategy-specialist → validates test coverage
├── Pane 2: Issue #102 (dashboard UI)
│   └── Single agent (no inner Teams needed)
└── Pane 3: Issue #103 (API refactor)
    └── Teams session (inner, optional)
        ├── architecture-specialist → validates API design
        └── performance-specialist → checks query efficiency
```

**Example 2: SubAgent (outer) without inner Teams**

```
SubAgent dispatch (outer)
├── Agent 1: security-specialist (run_in_background)
├── Agent 2: accessibility-specialist (run_in_background)
└── Agent 3: performance-specialist (run_in_background)
→ Collect results via TaskOutput
```

**Example 3: TaskMaestro (outer) + SubAgent (inner, within worker)**

```
TaskMaestro session (outer, conductor)
├── Pane 1: Worker for Issue #101 (auth feature)
│   ├── Explore subAgent → researches existing auth patterns
│   ├── Plan subAgent → drafts TDD test plan
│   ├── [Worker writes code directly in its own worktree]
│   └── [Worker commits, pushes, creates PR, writes RESULT.json]
├── Pane 2: Worker for Issue #102 (dashboard UI)
│   └── Worker uses sub-agents for component research
│       (no cross-pane interference because each worker owns its worktree)
└── Pane 3: Review Agent (from review cycle protocol)
    └── EVAL mode reviewer for completed PRs
```

This is the **recommended pattern for complex worker tasks** where parallel research or context protection would benefit the worker. The conductor still uses TaskMaestro for the outer dispatch — only the worker's internal orchestration uses sub-agents.

**Key invariant:** Sub-agents dispatched by a worker operate inside that worker's git worktree. Cross-pane file conflicts are impossible because each pane's worker owns its own isolated worktree.

See [`../rules/parallel-execution.md`](../rules/parallel-execution.md) "Conductor vs Worker Context" section for the authoritative rule.

### Execution Strategy Selection (MANDATORY)

When `parse_mode` returns `availableStrategies`, select the **outer transport** strategy:

1. **Check `availableStrategies`** in the response
2. **If both strategies available** (`["subagent", "taskmaestro"]`), ask user with AskUserQuestion:
   - Option A: "SubAgent (background agents, fast)" (Recommended)
   - Option B: "TaskMaestro (tmux parallel panes, visual monitoring)"
3. **If only `["subagent"]`** and `taskmaestroInstallHint` present:
   - Ask: "TaskMaestro is not installed. Would you like to install it for tmux-based parallel execution?"
   - Yes → invoke `/taskmaestro` skill to guide installation, then re-check
   - No → proceed with subagent
4. **Call `dispatch_agents`** with chosen `executionStrategy` parameter:
   - `dispatch_agents({ mode, specialists, executionStrategy: "subagent" })` — Agent tool flow
   - `dispatch_agents({ mode, specialists, executionStrategy: "taskmaestro" })` — tmux pane assignments
5. **Execute** based on strategy:
   - **subagent**: Use `dispatchParams` with Agent tool (`run_in_background: true`)
   - **taskmaestro**: Follow `executionHint` — start panes, assign prompts, monitor, collect results

### TaskMaestro Execution Flow

When `executionStrategy: "taskmaestro"` is chosen, `dispatch_agents` returns:

```json
{
  "taskmaestro": {
    "sessionName": "eval-specialists",
    "paneCount": 5,
    "assignments": [
      { "name": "security-specialist", "displayName": "Security Specialist", "prompt": "..." },
      { "name": "performance-specialist", "displayName": "Performance Specialist", "prompt": "..." }
    ]
  },
  "executionHint": "1. /taskmaestro start --panes 5\n2. ..."
}
```

Execute by following the `executionHint` commands sequentially.

### Teams as Inner Coordination Layer (Experimental)

> **Capability gate:** Teams-based coordination is experimental and depends on Claude Code native Teams support being available at runtime. If Teams APIs (`TeamCreate`, `SendMessage`, etc.) are not available, fall back to the SubAgent dispatch pattern.

Teams provide structured specialist coordination **within** a single session or TaskMaestro pane. Use Teams when a task benefits from multiple specialists collaborating and reporting back to a coordinator, rather than running independently.

#### When to Use Inner Teams

- A single task (or pane) needs input from 2+ specialists who should coordinate
- Specialist findings need to be collected and consolidated by a team lead
- The task requires structured message-based reporting between specialists

#### When NOT to Use Inner Teams

- Each specialist can run independently with no cross-specialist dependencies
- You are dispatching specialists across separate issues/tasks (use outer transport instead)
- Teams APIs are not available at runtime

#### Teams Workflow (within a session)

```
1. TeamCreate({ team_name: "<task>-specialists" })
2. Spawn specialists as teammates:
   Agent({ team_name, name: "security-specialist", subagent_type: "general-purpose", prompt: ... })
   Agent({ team_name, name: "code-quality-specialist", subagent_type: "general-purpose", prompt: ... })
3. Create and assign tasks:
   TaskCreate({ subject: "Security review of auth module" })
   TaskUpdate({ taskId, owner: "security-specialist" })
4. Specialists work autonomously, report via SendMessage:
   SendMessage({ to: "team-lead", message: "## Security Findings\n- ...", summary: "Security review done" })
5. Team lead collects all findings
6. Shutdown: SendMessage({ to: "security-specialist", message: { type: "shutdown_request" } })
```

#### SendMessage-Based Reporting

Specialists report findings through `SendMessage` to the team lead. This enables:
- Structured collection of all specialist outputs
- Consolidated summary for the user
- Clear audit trail of what each specialist found

**Report format:**
```markdown
## [Specialist Name] Findings

### Critical
- [finding]

### High
- [finding]

### Medium
- [finding]

### Recommendations
- [recommendation]
```

#### Fallback: SubAgent Dispatch

If Teams APIs are unavailable or Teams-based dispatch fails:
- Use SubAgent with `run_in_background: true` for each specialist
- Collect results via `TaskOutput`
- Document the fallback reason in your response

## PR All-in-One Skill

Unified commit and PR workflow that:
- Auto-commits uncommitted changes (grouped logically)
- Creates or updates PRs with smart issue linking
- Supports multiple languages (en/ko/bilingual)

### Usage

```
/pr-all-in-one [target-branch] [issue-id]
```

**Examples:**
- `/pr-all-in-one` - PR to default branch, issue from branch name
- `/pr-all-in-one develop` - PR to develop branch
- `/pr-all-in-one PROJ-123` - PR with specific issue ID
- `/pr-all-in-one main PROJ-123` - PR to main with issue ID

### Configuration

Create `.claude/pr-config.json` in your project root. Required settings:
- `defaultTargetBranch`: Target branch for PRs
- `issueTracker`: `jira`, `github`, `linear`, `gitlab`, or `custom`
- `issuePattern`: Regex pattern for issue ID extraction
- `prLanguage`: `en`, `ko`, or `bilingual`

See `packages/rules/.ai-rules/skills/pr-all-in-one/configuration-guide.md` for all options.

### First-time Setup

If no config file exists, the skill guides you through interactive setup:
1. Select PR target branch
2. Choose issue tracker
3. Set PR description language
4. (Optional) Configure issue URL template

### Skill Files

- `SKILL.md` - Main workflow documentation
- `configuration-guide.md` - Detailed config options
- `issue-patterns.md` - Supported issue tracker patterns
- `pr-templates.md` - PR description templates

### Platform-Specific Note

Use MCP tool `get_skill("pr-all-in-one")` to access skill documentation.

## AUTO Mode

AUTO mode enables autonomous iteration through PLAN -> ACT -> EVAL cycles until quality criteria are met.

### Triggering AUTO Mode

Use the `AUTO` keyword (or localized versions) at the start of your message:

| Language | Keyword |
|----------|---------|
| English | `AUTO` |
| Korean | `AUTO` |
| Japanese | `自動` |
| Chinese | `自动` |
| Spanish | `AUTOMATICO` |

### Example Usage

```
AUTO implement user authentication with JWT tokens
```

```
AUTO implement user authentication with JWT
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

> **Severity and review-cycle canonical sources:** The `Critical`/`High` levels above are the **Code Review Severity** scale defined in [`../rules/severity-classification.md`](../rules/severity-classification.md#code-review-severity). The approval loop Claude Code runs over a PR (CI gate → review → fix → re-review → approve) is specified in [`../rules/pr-review-cycle.md`](../rules/pr-review-cycle.md). Follow those canonical sources rather than re-deriving severity or approval criteria from this adapter.

### Configuration

Configure AUTO mode in `codingbuddy.config.json`:

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
