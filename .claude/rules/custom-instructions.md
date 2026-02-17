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

**Mode Indicators**: Display `activation_message.formatted` from the `parse_mode` response (e.g., `🤖 agent-name [Primary Agent]`), then print `# Mode: PLAN|ACT|EVAL|AUTO` and `## Agent : [Agent Name]` at the start of responses

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

**Available Agents** (26 agents + 4 mode agents):
- **Primary**: Solution Architect, Technical Planner, Frontend Developer, Backend Developer, Mobile Developer, Data Engineer, Agent Architect, Platform Engineer, Tooling Engineer, AI/ML Engineer, DevOps Engineer
- **Domain**: Architecture, Test Strategy, Performance, Security, Accessibility, SEO, UI/UX Design, Documentation, Integration, Event Architecture, Observability, Migration, i18n
- **Core/Utility**: Code Reviewer, Code Quality

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

**When `parse_mode` returns `dispatchReady`, use it directly with the Task tool — no extra calls needed.**

**Quick Checklist (Auto-Dispatch - Preferred):**
- [ ] Check `dispatchReady` in `parse_mode` response
- [ ] Use `dispatchReady.primaryAgent.dispatchParams` with Task tool
- [ ] Use `dispatchReady.parallelAgents[].dispatchParams` with Task tool (`run_in_background: true`)
- [ ] Collect results with `TaskOutput`
- [ ] Summarize all findings

**Fallback (if `dispatchReady` is not present):**
- [ ] Call `dispatch_agents` or `prepare_parallel_agents` with recommended specialists
- [ ] Execute each agent via Task tool (`subagent_type: "general-purpose"`, `run_in_background: true`)
- [ ] Display activation status
- [ ] Collect results with `TaskOutput`
- [ ] Summarize all findings

**Mode-specific Specialists:**

| Mode | Specialists |
|------|-------------|
| **PLAN** | 🏛️ architecture, 🧪 test-strategy, 📨 event-architecture, 🔗 integration, 📊 observability, 🔄 migration |
| **ACT** | 📏 code-quality, 🧪 test-strategy, 📨 event-architecture, 🔗 integration |
| **EVAL** | 🔒 security, ♿ accessibility, ⚡ performance, 📏 code-quality, 📨 event-architecture, 🔗 integration, 📊 observability, 🔄 migration |
| **AUTO** | 🏛️ architecture, 🧪 test-strategy, 🔒 security, 📏 code-quality, 📨 event-architecture, 🔗 integration, 📊 observability, 🔄 migration |

**📖 Full Guide:** [Parallel Specialist Agents Execution](../../packages/rules/.ai-rules/adapters/claude-code.md#parallel-specialist-agents-execution)

</PARALLEL_EXECUTION_MANDATORY_RULE>

## 🔴 MANDATORY: Context Document Management

<CONTEXT_DOCUMENT_RULE>

**Fixed file `docs/codingbuddy/context.md` persists PLAN → ACT → EVAL context across context compaction.**

### How It Works

`parse_mode` **automatically** manages the context document:

- **PLAN/AUTO mode**: Resets (deletes and recreates) the context document
- **ACT/EVAL mode**: Appends a new section to the existing document

### Key Fields in parse_mode Response

| Field | Description |
|-------|-------------|
| `contextFilePath` | Always `docs/codingbuddy/context.md` |
| `contextExists` | Whether document was found/created |
| `contextDocument` | Full parsed document with all sections |
| `mandatoryAction` | Required action before completing the mode |

### Required Workflow

**In ALL modes:**
1. `parse_mode` automatically reads/creates context
2. Review `contextDocument` for previous decisions and notes
3. Before completing: `update_context` to persist current work

**update_context parameters:**
- `decisions[]` - Key decisions made
- `notes[]` - Implementation notes
- `progress[]` - (ACT) Progress items
- `findings[]` - (EVAL) Review findings
- `recommendations[]` - (EVAL) Improvement recommendations
- `status` - `in_progress` | `completed` | `blocked`

### Why This Matters

- **Single fixed path** - No dynamic filenames, always `docs/codingbuddy/context.md`
- **Automatic integration** - `parse_mode` handles reset/append logic
- **Survives compaction** - Context persists even when conversation is summarized
- **Cross-mode continuity** - ACT mode sees PLAN decisions, EVAL sees ACT progress

### Red Flags (STOP if you think these):

| Thought | Reality |
|---------|---------|
| "I'll remember the context" | NO. Context compaction erases memory. |
| "parse_mode handles everything" | NO. You must call `update_context` before completing. |
| "The file doesn't exist" | `parse_mode` creates it automatically in PLAN mode. |

</CONTEXT_DOCUMENT_RULE>

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
