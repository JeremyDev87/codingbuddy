# Tool Priority: Claude Code Native > codingbuddy > OMC

## Core Principle

1. **Claude Code native FIRST** — Memory, Teams, Plan mode, /dream, /loop handle orchestration natively
2. **codingbuddy for unique value** — Rules, agents, checklists, quality reports are codingbuddy's core
3. **OMC for dev tools** — LSP, AST grep, REPL, git-master when needed

---

## Layer 1: Claude Code Native (highest priority)

These features are built into Claude Code and should be used instead of codingbuddy equivalents:

| Native Feature | Purpose | Replaces |
|----------------|---------|----------|
| **Claude Code Memory** | Cross-session context persistence | `update_context`, `create_briefing`, `resume_session` |
| **Claude native Teams** | Run specialist agents as teammates for real-time debate | `dispatch_agents` subagent strategy |
| **EnterPlanMode** | Structured planning with user approval | `parse_mode` planning stage routing |
| **/dream** | Autonomous task exploration and analysis | `analyze_task` |
| **/loop** | Recurring execution on interval | `parse_mode` AUTO mode repetition |
| **AskUserQuestion** | Clarification from user | `parse_mode` clarification gate |

---

## Layer 2: codingbuddy (unique value)

Use codingbuddy tools for capabilities Claude Code does not provide natively:

| Tool | Purpose |
|------|---------|
| `activate` | **One-shot entry point**: rules + primary agent + specialists + discussion format |
| `parse_mode` | Legacy mode entry (for non-Claude Code hosts: Cursor, Codex, etc.) |
| `search_rules` | Query project rules and guidelines |
| `get_agent_details` | Agent profile and expertise lookup |
| `generate_checklist` | Contextual checklists (security, a11y, performance, testing) |
| `get_project_config` | Tech stack, architecture, language settings |
| `pr_quality_report` | Run specialist agents on changed files for PR quality |
| `get_rule_impact_report` | Rule effectiveness analytics |

---

## Layer 3: OMC (dev tools)

Use OMC tools for capabilities neither Claude Code nor codingbuddy provide:

| Tool / Skill | Purpose |
|--------------|---------|
| LSP tools (`lsp_hover`, `lsp_goto_definition`, `lsp_find_references`, etc.) | Language server protocol — type info, definitions, references |
| AST grep (`ast_grep_search`, `ast_grep_replace`) | Structural code search and refactoring |
| Python REPL (`python_repl`) | Interactive data analysis and computation |
| `/git-master` | Atomic commits, rebasing, history management |
| `/build-fix` | Build and TypeScript error resolution |
| `/deepsearch` | Thorough multi-pass codebase search |

---

## Quick Decision Matrix

| Use Case | Use This | Not This |
|----------|----------|----------|
| Starting a workflow | `activate` | `parse_mode` (in Claude Code) |
| Running specialist council | Claude native Teams | subagent dispatch |
| Cross-session context | Claude Code Memory | `update_context` / `create_briefing` |
| Task analysis | `/dream` | `analyze_task` |
| Repeated execution | `/loop` | AUTO mode cycle |
| Clarification | AskUserQuestion | clarification gate |
| Rules & checklists | codingbuddy `search_rules`, `generate_checklist` | — |
| Code review quality | codingbuddy `pr_quality_report` | OMC `/code-review` |
| Type info & references | OMC LSP tools | — |

---

## Decision Rationale

- Claude Code native features handle orchestration (memory, teams, planning, loops) better than MCP tools
- codingbuddy's unique value is **rules, agents, and checklists** — domain knowledge, not orchestration
- OMC's unique value is **dev tooling** (LSP, AST, REPL) — code intelligence, not workflow
- `parse_mode` remains available for backward compatibility with non-Claude Code hosts
