/**
 * Generators — pure functions that produce tool-specific config file content
 * from SourceData extracted from .ai-rules.
 */

import type { GeneratedFile, SourceData, ToolName } from './types';

// ---------------------------------------------------------------------------
// Shared sections
// ---------------------------------------------------------------------------

function agentTable(data: SourceData): string {
  const lines = ['| Agent | Description | Expertise |', '|-------|-------------|-----------|'];
  for (const a of data.agents) {
    lines.push(`| ${a.displayName} | ${a.description} | ${a.expertise.join(', ')} |`);
  }
  return lines.join('\n');
}

function ruleRefs(data: SourceData, prefix: string): string {
  return data.rules
    .map(r => `- **${r.name}**: [${r.relativePath}](${prefix}${r.relativePath})`)
    .join('\n');
}

function mandatoryKeywordRule(): string {
  return `## 🔴 MANDATORY: Keyword Mode Detection

<CODINGBUDDY_CRITICAL_RULE>

**When user message starts with PLAN, ACT, EVAL, or AUTO keyword (or localized: Korean 계획/실행/평가/자동, Japanese 計画/実行/評価/自動, Chinese 计划/执行/评估/自动, Spanish PLANIFICAR/ACTUAR/EVALUAR/AUTOMÁTICO):**

1. **IMMEDIATELY** call \`parse_mode\` MCP tool with the user's prompt
2. Follow the returned \`instructions\` **EXACTLY**
3. Apply the returned \`rules\` as context
4. If \`warnings\` are present, inform the user

**This is MANDATORY, not optional.**

Failure to call \`parse_mode\` when these keywords are present will result in:
- Missed critical checklists (Devil's Advocate Analysis, Impact Radius Analysis)
- Incomplete evaluations
- Quality issues not caught before deployment

**Red Flags** (STOP if you think these):
| Thought | Reality |
|---------|---------|
| "I can handle EVAL myself" | NO. Call parse_mode FIRST. |
| "The rules are similar anyway" | NO. Each mode has specific checklists. |
| "I'll save a tool call" | NO. parse_mode MUST be called FIRST. |
| "I already know what to do" | NO. Rules may have been updated. |

</CODINGBUDDY_CRITICAL_RULE>`;
}

function workflowSection(): string {
  return `### Work Modes

You have four modes of operation:

1. **PLAN mode** - Define a plan without making changes
2. **ACT mode** - Execute the plan and make changes
3. **EVAL mode** - Analyze results and propose improvements
4. **AUTO mode** - Autonomous PLAN → ACT → EVAL cycle until quality achieved

**Mode Flow**:
- Start in PLAN mode by default
- Move to ACT when user types \`ACT\`
- Return to PLAN after ACT completes (automatic)
- Move to EVAL only when user explicitly types \`EVAL\`
- Move to AUTO when user types \`AUTO\` (autonomous cycle)

**Mode Indicators**:
- Print \`# Mode: PLAN\` in plan mode
- Print \`# Mode: ACT\` in act mode
- Print \`# Mode: EVAL\` in eval mode
- Print \`# Mode: AUTO\` in auto mode (with iteration number)`;
}

function tddSection(): string {
  return `### TDD Cycle (Strict Adherence)

Follow the **Red → Green → Refactor** cycle:

1. **Red**: Write a failing test that defines functionality
2. **Green**: Implement minimum code needed to pass
3. **Refactor**: Improve structure only after tests pass

### Core Principles
- **TDD for core logic** (entities, shared/utils, shared/hooks)
- **Test-after for UI** (features, widgets)
- **SOLID principles** and code quality standards
- **90%+ test coverage** goal
- **No mocking** - test real behavior with actual implementations

### Code Quality Standards
- TypeScript strict mode (no \`any\`)
- DRY (Don't Repeat Yourself)
- Keep methods small (10-20 lines max)
- Minimize state, prefer pure functions`;
}

function contextDocSection(): string {
  return `## 🔴 MANDATORY: Context Document Persistence

Before completing any mode (PLAN/ACT/EVAL), you **MUST** call \`update_context\` to persist:
- \`decisions[]\` — Key decisions made
- \`notes[]\` — Implementation notes
- \`progress[]\` — (ACT mode) Progress items
- \`findings[]\` / \`recommendations[]\` — (EVAL mode) Review results
- \`status\` — \`in_progress\`, \`completed\`, or \`blocked\`

Without this call, decisions and progress will be lost across sessions or context compaction.`;
}

// ---------------------------------------------------------------------------
// Per-tool generators
// ---------------------------------------------------------------------------

function generateCursor(data: SourceData): GeneratedFile[] {
  const autoAgent = `---
description: codingbuddy Agent auto-activation based on file patterns
globs:
  - "**/*.tsx"
  - "**/*.ts"
  - "**/*.go"
  - "**/*.py"
  - "**/*.java"
  - "**/*.rs"
  - "**/Dockerfile"
  - "**/*.yml"
  - "**/*.yaml"
alwaysApply: false
---

# codingbuddy Agent System

## Required: Mode Keyword Detection

When user message starts with \`PLAN\`, \`ACT\`, \`EVAL\`, \`AUTO\` (or localized variants: 자동, 自動, 自动, AUTOMÁTICO):

→ **Immediately** call \`parse_mode\` MCP tool

## File Context → Agent Mapping

| File Pattern | Recommended Agent | MCP Call |
|--------------|-------------------|----------|
| \`*.tsx\`, \`*.ts\` | frontend-developer | \`get_agent_details("frontend-developer")\` |
| \`*.go\`, \`*.py\`, \`*.java\`, \`*.rs\` | backend-developer | \`get_agent_details("backend-developer")\` |
| \`Dockerfile\`, \`*.yml\` | devops-engineer | \`get_agent_details("devops-engineer")\` |
| \`*.json\` (agents/) | agent-architect | \`get_agent_details("agent-architect")\` |

## Specialist Auto-Recommendation

| Detected Topic | Recommended Specialist |
|----------------|------------------------|
| Security, auth, XSS, CSRF | security-specialist |
| Accessibility, ARIA, a11y, WCAG | accessibility-specialist |
| Performance, bundle, optimization | performance-specialist |
| Testing, TDD, coverage | test-strategy-specialist |
| Architecture, layers, dependencies | architecture-specialist |

## Pre-Analysis

Before starting specialist analysis, optionally call \`analyze_task\` MCP tool for:
- Risk assessment of the current task
- Recommended specialists (may differ from file-pattern defaults)
- Contextual checklists

## Specialist Execution Pattern

When \`parse_mode\` returns \`parallelAgentsRecommendation\`:

1. Call \`prepare_parallel_agents\` MCP tool with the recommended specialists
2. Execute each specialist **sequentially** (one at a time):
   - Announce: "🔍 Analyzing from [icon] [specialist-name] perspective..."
   - Apply specialist system prompt to analyze target code
   - Record findings
3. Present consolidated findings summary

See \`packages/rules/.ai-rules/adapters/cursor.md\` for full details.

## Available Agents

${agentTable(data)}

## Reference

Agent definitions: \`packages/rules/.ai-rules/agents/README.md\`
`;

  const imports = `---
description: codingbuddy common rules - applied to all conversations
globs:
alwaysApply: true
---

# codingbuddy Rules

## Workflow

- **PLAN** → **ACT** → **PLAN** (default flow)
- **EVAL** only on explicit request
- **AUTO** for autonomous PLAN → ACT → EVAL cycle until quality achieved

## Required Actions

When \`PLAN\`, \`ACT\`, \`EVAL\`, \`AUTO\` keywords detected → **Immediately** call \`parse_mode\` MCP tool

## Context Persistence

After completing work in any mode → call \`update_context\` MCP tool to persist decisions and notes.

## Quality Tools

- \`analyze_task\` — Pre-planning task analysis with risk assessment
- \`generate_checklist\` — Contextual checklists for security, accessibility, performance
- \`search_rules\` — Search project rules and guidelines
- \`get_code_conventions\` — Get code conventions and style guide

## Core Principles

- TDD: Red → Green → Refactor
- Test coverage 90%+
- TypeScript strict (no \`any\`)
- Server Components first

## Project Config

Use \`get_project_config\` MCP tool to retrieve project-specific settings (language, tech stack, conventions).

## Skills

When a skill might apply to the user's task:
1. Call \`recommend_skills\` with the user's prompt
2. If recommendations returned, call \`get_skill\` with the top skillName
3. Follow the loaded skill instructions

Key skill triggers:
- Bug/error/debug → \`systematic-debugging\`
- New feature/build → \`brainstorming\` → \`writing-plans\`
- TDD/test → \`test-driven-development\`
- Plan execution → \`executing-plans\`

## Detailed Rules

All details in Single Source of Truth:

${data.rules.map(r => `- [\`${r.relativePath}\`](../../${r.relativePath})`).join('\n')}
- [\`packages/rules/.ai-rules/agents/README.md\`](../../packages/rules/.ai-rules/agents/README.md)
`;

  return [
    { relativePath: '.cursor/rules/auto-agent.mdc', content: autoAgent },
    { relativePath: '.cursor/rules/imports.mdc', content: imports },
  ];
}

function generateClaude(data: SourceData): GeneratedFile[] {
  const content = `# Custom Instructions for Claude Code

## Project Rules

Follow the common rules defined in \`packages/rules/.ai-rules/\` for consistency across all AI coding assistants.

### 📚 Core Workflow

**Source**: \`packages/rules/.ai-rules/rules/core.md\`

**Work Modes**:
- **PLAN mode**: Create implementation plans with TDD approach
- **ACT mode**: Execute changes following quality standards
- **EVAL mode**: Evaluate code quality and suggest improvements
- **AUTO mode**: Autonomous PLAN → ACT → EVAL cycle until quality achieved

**Mode Flow**: PLAN (default) → ACT (user types "ACT") → PLAN (automatic) → EVAL (user types "EVAL") | AUTO (autonomous cycle)

**Mode Indicators**: Display \`activation_message.formatted\` from the \`parse_mode\` response (e.g., \`🤖 agent-name [Primary Agent]\`), then print \`# Mode: PLAN|ACT|EVAL|AUTO\` and \`## Agent : [Agent Name]\` at the start of responses

### 🏗️ Project Context

**Source**: \`packages/rules/.ai-rules/rules/project.md\`

**Tech Stack**: See project's \`package.json\`

**Architecture**:
- Layered structure: app → widgets → features → entities → shared
- Pure/impure function separation required
- Server Components as default

### 🎯 Code Quality

**Source**: \`packages/rules/.ai-rules/rules/augmented-coding.md\`

**TDD Cycle**: Red (failing test) → Green (minimal code) → Refactor

**Principles**:
- TDD for core logic (entities, shared/utils, hooks)
- Test-after for UI (features, widgets)
- SOLID principles, DRY, 90%+ test coverage
- No mocking - test real behavior
- TypeScript strict mode (no \`any\`)

### 🤖 Specialist Agents

**Source**: \`packages/rules/.ai-rules/agents/\`

**Available Agents**:

${agentTable(data)}

See [packages/rules/.ai-rules/agents/README.md](../../packages/rules/.ai-rules/agents/README.md) for details.

## 🔴 MANDATORY: TDD Execution Continuity

<TDD_CONTINUITY_RULE>

**TDD RED phase test failures are expected results and are NOT a reason to halt implementation.**

### Test Failure Classification

| Type | Description | Action |
|------|-------------|--------|
| **Expected RED** | Intentional test failure in TDD RED phase | Proceed to GREEN phase immediately |
| **Unexpected Failure** | Test that should pass but doesn't | Stop and analyze root cause |

### RED-GREEN-REFACTOR is an Atomic Operation

1. **RED**: Write failing test -> Run to confirm failure -> **DO NOT STOP**
2. **GREEN**: Write minimal implementation -> Run to confirm pass
3. **REFACTOR**: Refactor -> Confirm tests still pass

**Do not wait for user input until all three phases are complete.**

### TDD Step Handling During Plan Execution

Even if plan separates TDD into individual steps (e.g., Step 1: Write test, Step 2: Verify fails, Step 3: Implement):
- When a step containing **"Expected: FAIL" or "verify it fails"** results in test failure -> Proceed to next step immediately
- This **takes precedence** over the executing-plans skill's "STOP on test fail" rule

</TDD_CONTINUITY_RULE>

${mandatoryKeywordRule()}

Examples:
- \`PLAN design auth feature\` → **immediately** call parse_mode → work in PLAN mode
- \`AUTO implement user dashboard\` → **immediately** call parse_mode → autonomous PLAN→ACT→EVAL cycle

## 🔴 MANDATORY: Parallel Specialist Agent Execution

<PARALLEL_EXECUTION_MANDATORY_RULE>

**When \`parse_mode\` returns \`dispatchReady\`, use it directly with the Task tool — no extra calls needed.**

**Strategy Selection (before dispatch):**
- [ ] Check \`availableStrategies\` in \`parse_mode\` response
- [ ] If \`["subagent", "taskmaestro"]\` → AskUserQuestion to choose
- [ ] If \`taskmaestroInstallHint\` present and user wants taskmaestro → guide installation
- [ ] Pass chosen strategy to \`dispatch_agents(executionStrategy: ...)\`

**Quick Checklist (Auto-Dispatch - Preferred):**
- [ ] Check \`dispatchReady\` in \`parse_mode\` response
- [ ] Use \`dispatchReady.primaryAgent.dispatchParams\` with Task tool
- [ ] Use \`dispatchReady.parallelAgents[].dispatchParams\` with Task tool (\`run_in_background: true\`)
- [ ] Collect results with \`TaskOutput\`
- [ ] Summarize all findings

**Fallback (if \`dispatchReady\` is not present):**
- [ ] Call \`dispatch_agents\` or \`prepare_parallel_agents\` with recommended specialists
- [ ] Execute each agent via Task tool (\`subagent_type: "general-purpose"\`, \`run_in_background: true\`)
- [ ] Display activation status
- [ ] Collect results with \`TaskOutput\`
- [ ] Summarize all findings

**Mode-specific Specialists:**

| Mode | Specialists |
|------|-------------|
| **PLAN** | 🏛️ architecture, 🧪 test-strategy, 📨 event-architecture, 🔗 integration, 📊 observability, 🔄 migration |
| **ACT** | 📏 code-quality, 🧪 test-strategy, 📨 event-architecture, 🔗 integration |
| **EVAL** | 🔒 security, ♿ accessibility, ⚡ performance, 📏 code-quality, 📨 event-architecture, 🔗 integration, 📊 observability, 🔄 migration |
| **AUTO** | 🏛️ architecture, 🧪 test-strategy, 🔒 security, 📏 code-quality, 📨 event-architecture, 🔗 integration, 📊 observability, 🔄 migration |

> **Note:** All modes support both SubAgent and TaskMaestro execution strategies.
> The strategy is selected per-invocation via user choice.

**📖 Full Guide:** [Parallel Specialist Agents Execution](../../packages/rules/.ai-rules/adapters/claude-code.md#parallel-specialist-agents-execution)

</PARALLEL_EXECUTION_MANDATORY_RULE>

## 🔴 MANDATORY: Auto-Dispatch Enforcement

<AUTO_DISPATCH_ENFORCEMENT_RULE>

**When \`parse_mode\` returns \`dispatch="auto"\`, you MUST dispatch all recommended specialists. No exceptions.**

### Core Rule

If the \`parse_mode\` response contains \`dispatch="auto"\` or \`dispatchReady\` with specialist agents:
1. **MUST** dispatch every listed specialist — skipping any is a protocol violation
2. **Teams preferred** over Agent tool for specialist dispatch (use \`TeamCreate\` + \`SendMessage\`)
3. **Report results** via \`SendMessage\` back to team lead, not just text output

### Red Flags (STOP if you think these)

| Thought | Reality |
|---------|---------|
| "I can handle this analysis myself" | NO. Specialists have domain expertise you lack. Dispatch them. |
| "It's just a small change, no need for specialists" | NO. dispatch="auto" means the system determined specialists are needed. |
| "I'll save time by skipping dispatch" | NO. Skipping specialists causes missed issues that cost more time later. |
| "The specialists will just repeat what I already know" | NO. Specialists catch domain-specific issues you would miss. |
| "I'll dispatch them later after I look at the code" | NO. Dispatch IMMEDIATELY when dispatch="auto" is returned. |

</AUTO_DISPATCH_ENFORCEMENT_RULE>

## 🔴 MANDATORY: Context Document Management

<CONTEXT_DOCUMENT_RULE>

**Fixed file \`docs/codingbuddy/context.md\` persists PLAN → ACT → EVAL context across context compaction.**

### How It Works

\`parse_mode\` **automatically** manages the context document:

- **PLAN/AUTO mode**: Resets (deletes and recreates) the context document
- **ACT/EVAL mode**: Appends a new section to the existing document

### Required Workflow

**In ALL modes:**
1. \`parse_mode\` automatically reads/creates context
2. Review \`contextDocument\` for previous decisions and notes
3. Before completing: \`update_context\` to persist current work

</CONTEXT_DOCUMENT_RULE>

## Claude Code Specific

- Follow project's configured language setting
- Use structured markdown formatting
- Provide clear, actionable feedback
- Reference project context from \`packages/rules/.ai-rules/rules/project.md\`
- Follow PLAN → ACT → EVAL workflow when appropriate
- Use AUTO mode for autonomous quality-driven development cycles

## Full Documentation

For comprehensive guides:
${data.rules.map(r => `- **${r.name}**: [${r.relativePath}](../../${r.relativePath})`).join('\n')}
- **Agents System**: [packages/rules/.ai-rules/agents/README.md](../../packages/rules/.ai-rules/agents/README.md)
- **Claude Integration**: [packages/rules/.ai-rules/adapters/claude-code.md](../../packages/rules/.ai-rules/adapters/claude-code.md)

---

**Note**: These instructions reference common AI rules from \`packages/rules/.ai-rules/\` directory shared across all AI assistants (Cursor, Claude Code, Antigravity, Codex, Q, Kiro) for consistency.
`;

  return [{ relativePath: '.claude/rules/custom-instructions.md', content }];
}

function generateAntigravity(data: SourceData): GeneratedFile[] {
  const content = `# Antigravity Instructions

## Common AI Rules Reference

This project follows shared AI coding rules from \`packages/rules/.ai-rules/\` for consistency across all AI assistants (Cursor, Claude Code, Antigravity, Codex, Q, Kiro).

### 📚 Core Workflow (PLAN/ACT/EVAL)

**Source**: \`packages/rules/.ai-rules/rules/core.md\`

${workflowSection()}

See full workflow details in [packages/rules/.ai-rules/rules/core.md](../../packages/rules/.ai-rules/rules/core.md)

### 🏗️ Project Context

**Source**: \`packages/rules/.ai-rules/rules/project.md\`

#### Tech Stack

Refer to the project's \`package.json\`.

#### Project Structure
\`\`\`
src/
├── app/          # Next.js App Router
├── entities/     # Domain entities (business logic)
├── features/     # Feature-specific UI components
├── widgets/      # Composite widgets
└── shared/       # Common modules
\`\`\`

See full project setup in [packages/rules/.ai-rules/rules/project.md](../../packages/rules/.ai-rules/rules/project.md)

### 🎯 Augmented Coding Principles

**Source**: \`packages/rules/.ai-rules/rules/augmented-coding.md\`

#### TDD Cycle
1. **Red**: Write a failing test
2. **Green**: Implement minimum code to pass
3. **Refactor**: Improve structure after tests pass

#### Core Principles
- **TDD for core logic** (entities, shared/utils, hooks)
- **Test-after for UI** (features, widgets)
- **SOLID principles** and code quality standards
- **90%+ test coverage** goal
- **No mocking** - test real behavior

See full augmented coding guide in [packages/rules/.ai-rules/rules/augmented-coding.md](../../packages/rules/.ai-rules/rules/augmented-coding.md)

### 🤖 Specialist Agents

**Source**: \`packages/rules/.ai-rules/agents/\`

${agentTable(data)}

See agent details in [packages/rules/.ai-rules/agents/README.md](../../packages/rules/.ai-rules/agents/README.md)

${mandatoryKeywordRule()}

Example: \`EVAL\` → **immediately** apply EVAL mode rules → perform Devil's Advocate Analysis

---

## MCP Server Integration

If the codingbuddy MCP server is configured, use these tools:

### Key Tools

| Tool | Purpose |
|------|---------|
| \`parse_mode\` | Parse PLAN/ACT/EVAL/AUTO mode keywords + load Agent/rules |
| \`search_rules\` | Search rules and guidelines |
| \`get_agent_details\` | Get specialist Agent profile and expertise |
| \`recommend_skills\` | Recommend skills based on prompt → then call \`get_skill\` |
| \`get_skill\` | Load full skill content |
| \`update_context\` | Update context document (decisions, notes, progress) |

### Configuration

Add MCP server configuration to \`.antigravity/config.json\`:

\`\`\`json
{
  "mcpServers": {
    "codingbuddy": {
      "command": "npx",
      "args": ["-y", "codingbuddy"],
      "env": {
        "CODINGBUDDY_PROJECT_ROOT": "/absolute/path/to/your/project"
      }
    }
  }
}
\`\`\`

Full configuration guide: [packages/rules/.ai-rules/adapters/antigravity.md](../../packages/rules/.ai-rules/adapters/antigravity.md)

---

## Skills

codingbuddy skills are accessed through the MCP tool chain:

1. **Auto-recommend**: \`recommend_skills({ prompt: "user message" })\` → AI recommends matching skills
2. **Browse and select**: \`list_skills()\` → \`get_skill("skill-name")\` → load skill content
3. **Slash-command**: When user types \`/<command>\` → call \`get_skill\`

> **Note:** \`parse_mode\` automatically embeds matched skills in \`included_skills\`.
> No separate \`recommend_skills\` call is needed when using mode keywords (PLAN/ACT/EVAL/AUTO).

---

## Context Document

Persists decisions across mode transitions in \`docs/codingbuddy/context.md\`:

- \`parse_mode\` automatically reads/creates the context document
- **Before completing each mode**: call \`update_context\` (mandatory)
- PLAN/AUTO mode: resets existing content and starts fresh
- ACT/EVAL mode: appends new section to existing content

---

## Antigravity-Specific Features

### Task Boundaries & Completion Ordering

**When completing each mode**, execute two calls in strict order:
1. **\`update_context\`** — Persist decisions, notes, findings to \`docs/codingbuddy/context.md\` (first)
2. **\`task_boundary\`** — Signal mode boundary to Antigravity (second)

### Communication

- **Follow project's configured language setting** — use \`get_project_config\` MCP tool to retrieve current language setting
- Use structured markdown formatting
- Provide clear, actionable feedback

---

For full integration guide, see [packages/rules/.ai-rules/adapters/antigravity.md](../../packages/rules/.ai-rules/adapters/antigravity.md)
`;

  return [{ relativePath: '.antigravity/rules/instructions.md', content }];
}

function generateCodex(data: SourceData): GeneratedFile[] {
  const content = `# Codex System Prompt

This project uses shared AI coding rules from \`packages/rules/.ai-rules/\` directory for consistency across all AI assistants (Cursor, Claude Code, Antigravity, Codex, Q, Kiro).

## 📚 Core Workflow Rules

**Source**: [packages/rules/.ai-rules/rules/core.md](../../packages/rules/.ai-rules/rules/core.md)

${workflowSection()}

### Agent System

**Auto-activated Agents**:
- **Frontend Developer** (\`packages/rules/.ai-rules/agents/frontend-developer.json\`): PLAN/ACT modes
- **Code Reviewer** (\`packages/rules/.ai-rules/agents/code-reviewer.json\`): EVAL mode

**Specialist Agents** (${data.agents.length} available):

${agentTable(data)}

For complete workflow details, see [packages/rules/.ai-rules/rules/core.md](../../packages/rules/.ai-rules/rules/core.md)

---

## 🏗️ Project Setup

**Source**: [packages/rules/.ai-rules/rules/project.md](../../packages/rules/.ai-rules/rules/project.md)

### Tech Stack

Refer to project's \`package.json\`.

### Project Structure
\`\`\`
src/
├── app/          # Next.js App Router
├── entities/     # Domain entities (business logic)
├── features/     # Feature-specific UI components
├── widgets/      # Composite widgets
└── shared/       # Common modules
\`\`\`

### Development Rules
- **Layer dependency**: app → widgets → features → entities → shared
- **Pure/impure separation**: Separate files for pure and impure functions
- **Server Components**: Default, Client Components only when necessary
- **Test coverage**: 90%+ goal

For complete project setup, see [packages/rules/.ai-rules/rules/project.md](../../packages/rules/.ai-rules/rules/project.md)

---

## 🎯 Augmented Coding Principles

**Source**: [packages/rules/.ai-rules/rules/augmented-coding.md](../../packages/rules/.ai-rules/rules/augmented-coding.md)

${tddSection()}

For complete augmented coding guide, see [packages/rules/.ai-rules/rules/augmented-coding.md](../../packages/rules/.ai-rules/rules/augmented-coding.md)

---

## 🤖 Specialist Agents

**Source**: [packages/rules/.ai-rules/agents/](../../packages/rules/.ai-rules/agents/)

### Specialist Execution

When \`parse_mode\` returns \`parallelAgentsRecommendation\` or \`dispatchReady\`, execute specialists **sequentially**:

1. Announce specialists being analyzed
2. For each specialist: apply its system prompt as analysis context, analyze, record findings
3. Consolidate all findings into a unified summary

See [packages/rules/.ai-rules/adapters/codex.md](../../packages/rules/.ai-rules/adapters/codex.md#specialist-agents-execution) for the full workflow.

---

${mandatoryKeywordRule()}

Example: \`PLAN design auth feature\` → **즉시** parse_mode 호출 → PLAN 모드로 작업

---

${contextDocSection()}

---

## 🔧 MCP Server Configuration

codingbuddy MCP 서버 사용 시 \`CODINGBUDDY_PROJECT_ROOT\` 환경변수를 프로젝트의 절대 경로로 설정하세요.

\`\`\`json
{
  "mcpServers": {
    "codingbuddy": {
      "command": "npx",
      "args": ["-y", "codingbuddy"],
      "env": {
        "CODINGBUDDY_PROJECT_ROOT": "/absolute/path/to/your/project"
      }
    }
  }
}
\`\`\`

자세한 설정 방법: [packages/rules/.ai-rules/adapters/codex.md](../../packages/rules/.ai-rules/adapters/codex.md)

---

## 💬 Communication

- **Always respond in Korean**
- User frequently modifies code directly, so **always read code and refresh information** instead of relying on memory
- **Start by understanding current code state** for every question

---

## 🔧 Available MCP Tools

| Tool | Description | When to Use |
|------|-------------|-------------|
| \`parse_mode\` | Parse PLAN/ACT/EVAL/AUTO keywords and return mode-specific rules | Message starts with mode keyword |
| \`search_rules\` | Search for rules and guidelines | Need project rules context |
| \`get_agent_details\` | Get detailed profile of a specific AI agent | Need agent expertise info |
| \`get_agent_system_prompt\` | Get complete system prompt for a specialist agent | Before specialist analysis |
| \`prepare_parallel_agents\` | Prepare specialist agents for sequential execution | EVAL mode specialist analysis |
| \`dispatch_agents\` | Get dispatch params (Claude Code optimized) | Not recommended for Codex |
| \`analyze_task\` | Task risk assessment, specialist recommendations | Start of PLAN mode |
| \`generate_checklist\` | Contextual checklists (security, accessibility, performance, testing, code-quality, SEO) | Before completing ACT/EVAL |
| \`get_project_config\` | Get project tech stack, architecture, conventions, and language settings | Need project context |
| \`get_code_conventions\` | Get project code conventions from tsconfig, eslint, prettier, editorconfig | Before implementing code changes |
| \`recommend_skills\` | Recommend skills based on user prompt | Detect skill-worthy intent |
| \`get_skill\` | Get full skill content by name | After recommend_skills or slash-command |
| \`list_skills\` | List all available skills | Browse skill catalog |
| \`read_context\` | Read context document | Check previous mode decisions |
| \`update_context\` | Persist decisions, notes, progress to context document | **MANDATORY** before completing each mode |

---

## Full Documentation

For comprehensive guides:
${data.rules.map(r => `- **${r.name}**: [${r.relativePath}](../../${r.relativePath})`).join('\n')}
- **Agents System**: [packages/rules/.ai-rules/agents/README.md](../../packages/rules/.ai-rules/agents/README.md)
- **Integration Guide**: [packages/rules/.ai-rules/adapters/codex.md](../../packages/rules/.ai-rules/adapters/codex.md)

---

**Note**: This file references common AI rules from \`packages/rules/.ai-rules/\` directory. All AI assistants (Cursor, Claude Code, Antigravity, Codex, Q, Kiro) share the same rules for consistency.
`;

  return [{ relativePath: '.codex/rules/system-prompt.md', content }];
}

function generateQ(data: SourceData): GeneratedFile[] {
  const content = `# Amazon Q Customizations

## Common AI Rules

This project follows shared coding rules from \`packages/rules/.ai-rules/\` for consistency across all AI assistants.

### Workflow Modes (PLAN/ACT/EVAL/AUTO)

Refer to \`packages/rules/.ai-rules/rules/core.md\`:
- **PLAN**: Create implementation plans
- **ACT**: Execute code changes
- **EVAL**: Quality assessment and improvements
- **AUTO**: Autonomous PLAN → ACT → EVAL cycle until quality achieved

### Project Setup

Refer to \`packages/rules/.ai-rules/rules/project.md\`:
- **Tech Stack**: 프로젝트의 package.json 참조
- **Architecture**: Layered structure (app → widgets → features → entities → shared)
- **Development Rules**: File naming, import/export conventions

### Coding Standards

Refer to \`packages/rules/.ai-rules/rules/augmented-coding.md\`:
- **TDD Workflow**: Red → Green → Refactor
- **Code Quality**: SOLID principles, DRY, 90%+ coverage
- **Testing**: No mocking, test real behavior

### Specialist Expertise

${agentTable(data)}

${mandatoryKeywordRule()}

Example: \`EVAL\` → **즉시** EVAL 모드 규칙 적용 → Devil's Advocate Analysis 수행

---

## Amazon Q Specific Features

### AWS Integration
- Leverage Q's AWS knowledge for deployment
- Use Q's security scanning with our security rules
- Apply Q's cost optimization suggestions

### Language Support
- Respond in Korean (한국어) as per project standard
- Use technical Korean terminology

## Full Documentation

- Core Workflow: \`packages/rules/.ai-rules/rules/core.md\`
- Project Setup: \`packages/rules/.ai-rules/rules/project.md\`
- Coding Principles: \`packages/rules/.ai-rules/rules/augmented-coding.md\`
- Specialist Agents: \`packages/rules/.ai-rules/agents/README.md\`
- Integration Guide: \`packages/rules/.ai-rules/adapters/q.md\`
`;

  return [{ relativePath: '.q/rules/customizations.md', content }];
}

function generateKiro(data: SourceData): GeneratedFile[] {
  const content = `# Kiro Guidelines

## Common AI Rules

This project uses shared coding rules from \`packages/rules/.ai-rules/\` for consistency across all AI coding assistants.

### Workflow Reference

See \`packages/rules/.ai-rules/rules/core.md\`:
- **PLAN mode**: Create implementation plans with TDD approach
- **ACT mode**: Execute changes following quality standards
- **EVAL mode**: Evaluate code quality and suggest improvements
- **AUTO mode**: Autonomous PLAN → ACT → EVAL cycle until quality achieved

### Project Context

See \`packages/rules/.ai-rules/rules/project.md\`:
- **Tech Stack**: 프로젝트의 package.json 참조
- **Architecture**: Layered structure (app → widgets → features → entities → shared)
- **Conventions**: File naming, import/export rules, pure/impure function separation

### Coding Principles

See \`packages/rules/.ai-rules/rules/augmented-coding.md\`:
- **TDD Cycle**: Red (failing test) → Green (minimal code) → Refactor
- **Quality Standards**: SOLID principles, DRY, code complexity management
- **Testing**: 90%+ coverage goal, no mocking, real behavior testing
- **Commit Discipline**: Separate structural and behavioral changes

### Specialist Knowledge

See \`packages/rules/.ai-rules/agents/\`:

${agentTable(data)}

### MCP Server Integration

When the codingbuddy MCP server is configured (\`.kiro/settings/mcp.json\`), use MCP tools for enhanced workflow:

**Core Workflow Tools:**
- \`parse_mode\` — Parse PLAN/ACT/EVAL/AUTO keywords and load appropriate Agent/rules
- \`update_context\` — Persist decisions and notes to \`docs/codingbuddy/context.md\` (mandatory at mode completion)
- \`read_context\` — Read current context document

**Analysis Tools:**
- \`search_rules\` — Search rules and guidelines by query
- \`analyze_task\` — Pre-planning task analysis with risk assessment
- \`generate_checklist\` — Contextual checklists (security, a11y, performance)

**Agent & Skills Tools:**
- \`get_agent_details\` — Get specialist agent profile
- \`recommend_skills\` → \`get_skill\` — Discover and load relevant skills
- \`prepare_parallel_agents\` — Get specialist prompts for sequential execution

**Configuration Tools:**
- \`get_project_config\` — Get project configuration (language, tech stack)
- \`get_code_conventions\` — Get project code conventions

> **Note:** MCP 서버가 설정되어 있지 않은 경우, \`.ai-rules/\` 디렉토리의 파일을 직접 참조하여 동일한 규칙을 적용할 수 있습니다.

${mandatoryKeywordRule()}

Example: \`EVAL\` → **즉시** EVAL 모드 규칙 적용 → Devil's Advocate Analysis 수행

---

## Kiro-Specific Features

### Communication
- Follow the \`languageInstruction\` from \`parse_mode\` response (or the project's \`codingbuddy.config.json\` language setting)
- Use clear, structured markdown formatting
- Provide actionable, specific feedback

### Workflow
Apply PLAN → ACT → EVAL (or AUTO for autonomous cycle) workflow as defined in \`packages/rules/.ai-rules/rules/core.md\`

## Full Documentation

For comprehensive guides:
- **Core Rules**: \`packages/rules/.ai-rules/rules/core.md\`
- **Project Setup**: \`packages/rules/.ai-rules/rules/project.md\`
- **Augmented Coding**: \`packages/rules/.ai-rules/rules/augmented-coding.md\`
- **Agents System**: \`packages/rules/.ai-rules/agents/README.md\`
- **Integration Guide**: \`packages/rules/.ai-rules/adapters/kiro.md\`

---

**Note**: These guidelines reference common AI rules from \`packages/rules/.ai-rules/\` directory shared across all AI assistants for consistency.
`;

  return [{ relativePath: '.kiro/rules/guidelines.md', content }];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const GENERATORS: Record<ToolName, (data: SourceData) => GeneratedFile[]> = {
  cursor: generateCursor,
  claude: generateClaude,
  antigravity: generateAntigravity,
  codex: generateCodex,
  q: generateQ,
  kiro: generateKiro,
};

/**
 * Generate config files for a single tool.
 */
export function generateForTool(tool: ToolName, data: SourceData): GeneratedFile[] {
  return GENERATORS[tool](data);
}

/**
 * Generate config files for ALL tools. Idempotent — same input always produces same output.
 */
export function generateAll(data: SourceData): GeneratedFile[] {
  const tools: ToolName[] = ['cursor', 'claude', 'antigravity', 'codex', 'q', 'kiro'];
  return tools.flatMap(t => GENERATORS[t](data));
}
