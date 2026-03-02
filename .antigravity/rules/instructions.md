# Antigravity Instructions

## Common AI Rules Reference

This project follows shared AI coding rules from `packages/rules/.ai-rules/` for consistency across all AI assistants (Cursor, Claude Code, Antigravity, Codex, Q, Kiro).

### 📚 Core Workflow (PLAN/ACT/EVAL)

**Source**: `packages/rules/.ai-rules/rules/core.md`

#### Work Modes

You have four modes of operation:

1. **PLAN mode** - Define a plan without making changes
2. **ACT mode** - Execute the plan and make changes
3. **EVAL mode** - Analyze results and propose improvements
4. **AUTO mode** - Autonomous PLAN → ACT → EVAL cycle until quality achieved

**Mode Flow**:
- Start in PLAN mode by default
- Move to ACT when user types `ACT`
- Return to PLAN after ACT completes (automatic)
- Move to EVAL only when user explicitly types `EVAL`
- Move to AUTO when user types `AUTO` (autonomous cycle)

**Mode Indicators**:
- Print `# Mode: PLAN` in plan mode
- Print `# Mode: ACT` in act mode
- Print `# Mode: EVAL` in eval mode
- Print `# Mode: AUTO` in auto mode (with iteration number)

See full workflow details in [packages/rules/.ai-rules/rules/core.md](../../packages/rules/.ai-rules/rules/core.md)

### 🏗️ Project Context

**Source**: `packages/rules/.ai-rules/rules/project.md`

#### Tech Stack

Refer to the project's `package.json`.

#### Project Structure
```
src/
├── app/          # Next.js App Router
├── entities/     # Domain entities (business logic)
├── features/     # Feature-specific UI components
├── widgets/      # Composite widgets
└── shared/       # Common modules
```

See full project setup in [packages/rules/.ai-rules/rules/project.md](../../packages/rules/.ai-rules/rules/project.md)

### 🎯 Augmented Coding Principles

**Source**: `packages/rules/.ai-rules/rules/augmented-coding.md`

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

**Source**: `packages/rules/.ai-rules/agents/`

Available specialist agents:
- **Frontend Developer** - React/Next.js, TDD, design system
- **Code Reviewer** - Quality evaluation, architecture analysis
- **Architecture Specialist** - Layer boundaries, dependency direction
- **Test Strategy Specialist** - Test coverage, TDD workflow
- **Performance Specialist** - Bundle size, rendering optimization
- **Security Specialist** - OAuth 2.0, JWT, XSS/CSRF protection
- **Accessibility Specialist** - WCAG 2.1 AA compliance
- **SEO Specialist** - Metadata API, structured data
- **Design System Specialist** - Design system usage
- **Documentation Specialist** - Documentation quality
- **Code Quality Specialist** - SOLID, DRY, complexity
- **DevOps Engineer** - Docker, Datadog, deployment

See agent details in [packages/rules/.ai-rules/agents/README.md](../../packages/rules/.ai-rules/agents/README.md)

## 🔴 MANDATORY: Keyword Mode Detection

<CODINGBUDDY_CRITICAL_RULE>

**When user message starts with PLAN, ACT, EVAL, or AUTO keyword (or localized: Korean 계획/실행/평가/자동, Japanese 計画/実行/評価/自動, Chinese 计划/执行/评估/自动, Spanish PLANIFICAR/ACTUAR/EVALUAR/AUTOMÁTICO):**

1. **IMMEDIATELY** call `parse_mode` MCP tool with the user's prompt
2. Follow the returned `instructions` **EXACTLY**
3. Apply the returned `rules` as context
4. If `warnings` are present, inform the user
5. **Fallback** (MCP unavailable): Follow mode-specific rules from `packages/rules/.ai-rules/rules/core.md`

**This is MANDATORY, not optional.**

Failure to follow mode rules when these keywords are present will result in:
- Missed critical checklists (Devil's Advocate Analysis, Impact Radius Analysis)
- Incomplete evaluations
- Quality issues not caught before deployment

**Red Flags** (STOP if you think these):

| Thought | Reality |
|---------|---------|
| "I can handle EVAL myself" | NO. Follow mode rules FIRST. |
| "The rules are similar anyway" | NO. Each mode has specific checklists. |
| "I already know what to do" | NO. Rules may have been updated. |

</CODINGBUDDY_CRITICAL_RULE>

Example: `EVAL` → **immediately** apply EVAL mode rules → perform Devil's Advocate Analysis

---

## MCP Server Integration

If the codingbuddy MCP server is configured, use these tools:

### Key Tools

| Tool | Purpose |
|------|---------|
| `parse_mode` | Parse PLAN/ACT/EVAL/AUTO mode keywords + load Agent/rules |
| `search_rules` | Search rules and guidelines |
| `get_agent_details` | Get specialist Agent profile and expertise |
| `recommend_skills` | Recommend skills based on prompt → then call `get_skill` |
| `get_skill` | Load full skill content |
| `update_context` | Update context document (decisions, notes, progress) |

> For the full list of tools (18 total, including 1 deprecated), see [antigravity.md](../../packages/rules/.ai-rules/adapters/antigravity.md#mcp-tools).

### Configuration

Add MCP server configuration to `.antigravity/config.json`:

```json
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
```

Full configuration guide: [packages/rules/.ai-rules/adapters/antigravity.md](../../packages/rules/.ai-rules/adapters/antigravity.md)

---

## Skills

codingbuddy skills are accessed through the MCP tool chain:

1. **Auto-recommend**: `recommend_skills({ prompt: "user message" })` → AI recommends matching skills
2. **Browse and select**: `list_skills()` → `get_skill("skill-name")` → load skill content
3. **Slash-command**: When user types `/<command>` → call `get_skill`

> **Note:** `parse_mode` automatically embeds matched skills in `included_skills`.
> No separate `recommend_skills` call is needed when using mode keywords (PLAN/ACT/EVAL/AUTO).

---

## Context Document

Persists decisions across mode transitions in `docs/codingbuddy/context.md`:

- `parse_mode` automatically reads/creates the context document
- **Before completing each mode**: call `update_context` (mandatory)
- PLAN/AUTO mode: resets existing content and starts fresh
- ACT/EVAL mode: appends new section to existing content

---

## Antigravity-Specific Features

### Task Boundaries & Completion Ordering

**When completing each mode**, execute two calls in strict order:
1. **`update_context`** — Persist decisions, notes, findings to `docs/codingbuddy/context.md` (first)
2. **`task_boundary`** — Signal mode boundary to Antigravity (second)

> `update_context` must be called first to preserve cross-mode context even if the session is interrupted.

`task_boundary` parameters:
- Mode: `PLANNING`, `EXECUTION`, `VERIFICATION`, or `AUTO_ITERATION`
- TaskName: Current work area
- TaskStatus: Next steps
- TaskSummary: Summary of completed work

### Communication

- **Follow project's configured language setting** — use `get_project_config` MCP tool to retrieve current language setting
- Use structured markdown formatting
- Provide clear, actionable feedback

---

For full integration guide, see [packages/rules/.ai-rules/adapters/antigravity.md](../../packages/rules/.ai-rules/adapters/antigravity.md)
