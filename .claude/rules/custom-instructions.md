# Custom Instructions for Claude Code

## Project Rules

Follow the common rules defined in `packages/rules/.ai-rules/` for consistency across all AI coding assistants.

### 📚 Core Workflow

**Source**: `packages/rules/.ai-rules/rules/core.md`

**Work Modes**:
- **PLAN mode**: Create implementation plans with TDD approach
- **ACT mode**: Execute changes following quality standards
- **EVAL mode**: Evaluate code quality and suggest improvements
- **AUTO mode**: Autonomous PLAN → ACT → EVAL cycle until quality achieved

**Mode Flow**: PLAN (default) → ACT (user types "ACT") → PLAN (automatic) → EVAL (user types "EVAL") | AUTO (autonomous cycle)

**Mode Indicators**: Always print `# Mode: PLAN|ACT|EVAL|AUTO` at the start of responses

### 🏗️ Project Context

**Source**: `packages/rules/.ai-rules/rules/project.md`

**Tech Stack**: See project's `package.json`

**Architecture**:
- Layered structure: app → widgets → features → entities → shared
- Pure/impure function separation required
- Server Components as default

### 🎯 Code Quality

**Source**: `packages/rules/.ai-rules/rules/augmented-coding.md`

**TDD Cycle**: Red (failing test) → Green (minimal code) → Refactor

**Principles**:
- TDD for core logic (entities, shared/utils, hooks)
- Test-after for UI (features, widgets)
- SOLID principles, DRY, 90%+ test coverage
- No mocking - test real behavior
- TypeScript strict mode (no `any`)

### 🤖 Specialist Agents

**Source**: `packages/rules/.ai-rules/agents/`

**Available Specialists** (12 agents):
- Frontend Developer, Code Reviewer
- Architecture, Test Strategy, Performance, Security
- Accessibility, SEO, Design System, Documentation
- Code Quality, DevOps Engineer

See [packages/rules/.ai-rules/agents/README.md](../../packages/rules/.ai-rules/agents/README.md) for details.

## 🔴 MANDATORY: Keyword Mode Detection

<CODINGBUDDY_CRITICAL_RULE>

**When user message starts with PLAN, ACT, EVAL, or AUTO keyword (or localized: Korean 계획/실행/평가/자동, Japanese 計画/実行/評価/自動, Chinese 计划/执行/评估/自动, Spanish PLANIFICAR/ACTUAR/EVALUAR/AUTOMÁTICO):**

1. **IMMEDIATELY** call `mcp__codingbuddy__parse_mode` with the user's prompt
2. Follow the returned `instructions` **EXACTLY**
3. Apply the returned `rules` as context
4. If `warnings` are present, inform the user

**This is MANDATORY, not optional.**

Failure to call `parse_mode` when these keywords are present will result in:
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

</CODINGBUDDY_CRITICAL_RULE>

Examples:
- `PLAN design auth feature` → **immediately** call parse_mode → work in PLAN mode
- `AUTO implement user dashboard` → **immediately** call parse_mode → autonomous PLAN→ACT→EVAL cycle

## 🔴 MANDATORY: Parallel Specialist Agent Execution

<PARALLEL_EXECUTION_MANDATORY_RULE>

**When `parse_mode` returns `parallelAgentsRecommendation`, you MUST execute parallel specialists.**

**Quick Checklist:**
- [ ] Call `prepare_parallel_agents` with recommended specialists
- [ ] Execute each agent via Task tool (`subagent_type: "general-purpose"`, `run_in_background: true`)
- [ ] Display activation status (🚀 Dispatching...)
- [ ] Collect results with `TaskOutput`
- [ ] Summarize all findings (📊 Specialist Analysis Complete)

**Mode-specific Specialists:**

| Mode | Specialists |
|------|-------------|
| **PLAN** | 🏛️ architecture, 🧪 test-strategy |
| **ACT** | 📏 code-quality, 🧪 test-strategy |
| **EVAL** | 🔒 security, ♿ accessibility, ⚡ performance, 📏 code-quality |
| **AUTO** | 🏛️ architecture, 🧪 test-strategy, 🔒 security, 📏 code-quality |

**📖 Full Guide:** [Parallel Specialist Agents Execution](../../packages/rules/.ai-rules/adapters/claude-code.md#parallel-specialist-agents-execution)

</PARALLEL_EXECUTION_MANDATORY_RULE>

## 🔴 MANDATORY: Session Document Management

<SESSION_DOCUMENT_RULE>

**Session documents persist PLAN → ACT context across context compaction.**

### When to Create Sessions

**PLAN mode entry** requires session creation for:
- Complex multi-step tasks
- Features requiring ACT agent recommendations
- Tasks spanning multiple conversation turns

### Required Workflow

**In PLAN mode:**
1. `create_session` - Create session document with task title
2. `update_session` - Record PLAN details, recommendedActAgent, decisions

**In ACT mode:**
1. `get_active_session` - Retrieve PLAN context and recommended agent
2. `update_session` - Record ACT progress and notes

**In EVAL mode:**
1. `get_active_session` - Retrieve full context
2. `update_session` - Record evaluation findings

### Why This Matters

Without session documents:
- Agent recommendations from PLAN are **lost** after context compaction
- ACT mode cannot retrieve which agent was recommended
- Cross-mode context sharing **fails**

### Red Flags (STOP if you think these):

| Thought | Reality |
|---------|---------|
| "I'll remember the agent" | NO. Context compaction erases memory. |
| "This task is simple" | Simple tasks grow. Create session anyway. |
| "I'll create it later" | NO. Create at PLAN start, not after. |

</SESSION_DOCUMENT_RULE>

## Claude Code Specific

- Follow project's configured language setting
- Use structured markdown formatting
- Provide clear, actionable feedback
- Reference project context from `packages/rules/.ai-rules/rules/project.md`
- Follow PLAN → ACT → EVAL workflow when appropriate
- Use AUTO mode for autonomous quality-driven development cycles

## Full Documentation

For comprehensive guides:
- **Core Rules**: [packages/rules/.ai-rules/rules/core.md](../../packages/rules/.ai-rules/rules/core.md)
- **Project Setup**: [packages/rules/.ai-rules/rules/project.md](../../packages/rules/.ai-rules/rules/project.md)
- **Augmented Coding**: [packages/rules/.ai-rules/rules/augmented-coding.md](../../packages/rules/.ai-rules/rules/augmented-coding.md)
- **Agents System**: [packages/rules/.ai-rules/agents/README.md](../../packages/rules/.ai-rules/agents/README.md)
- **Claude Integration**: [packages/rules/.ai-rules/adapters/claude-code.md](../../packages/rules/.ai-rules/adapters/claude-code.md)

---

**Note**: These instructions reference common AI rules from `packages/rules/.ai-rules/` directory shared across all AI assistants (Cursor, Claude Code, Antigravity, Codex, Q, Kiro) for consistency.
