# Tool Priority: codingbuddy vs oh-my-claudecode (OMC)

## Core Principle

**codingbuddy FIRST** — Use codingbuddy tools for all workflow management, agent dispatch, and quality control.
**OMC for unique features only** — Use OMC tools when they provide capabilities codingbuddy does not.

---

## codingbuddy FIRST

Always reach for these codingbuddy tools before any OMC equivalent:

| Tool | Purpose |
|------|---------|
| `parse_mode` | Mode management (PLAN/ACT/EVAL/AUTO), agent activation, context init |
| `dispatch_agents` | Agent dispatch with Task tool-ready params |
| `analyze_task` | Pre-planning task analysis, risk assessment, specialist recommendations |
| `update_context` | Context persistence across PLAN → ACT → EVAL modes |
| `generate_checklist` | Contextual checklists (security, a11y, performance, testing) |
| `search_rules` | Query project rules and guidelines |
| `get_agent_details` | Agent profile and expertise lookup |
| `get_project_config` | Tech stack, architecture, language settings |
| `prepare_parallel_agents` | Ready-to-use prompts for parallel specialist agents |

---

## OMC Only

Use these OMC tools when the capability is not available in codingbuddy:

| Tool / Skill | Purpose |
|--------------|---------|
| LSP tools (`lsp_hover`, `lsp_goto_definition`, `lsp_find_references`, etc.) | Language server protocol — type info, definitions, references |
| AST grep (`ast_grep_search`, `ast_grep_replace`) | Structural code search and refactoring |
| Python REPL (`python_repl`) | Interactive data analysis and computation |
| State tools (`state_read`, `state_write`, `state_clear`) | Mode state persistence for autopilot/ralph/ultrawork |
| Notepad tools (`notepad_read`, `notepad_write_*`) | Session notes and compaction-resilient memory |
| Project memory (`project_memory_*`) | Long-term project knowledge persistence |
| `/git-master` | Atomic commits, rebasing, history management |
| `/build-fix` | Build and TypeScript error resolution |
| `/deepsearch` | Thorough multi-pass codebase search |
| `/team`, `/swarm` | Multi-agent coordination with shared task lists |
| `/ultrawork`, `/autopilot`, `/ralph` | Autonomous execution loops |
| `/pipeline` | Sequential/branching agent workflows |

---

## Overlap Matrix

When both tools could apply, codingbuddy wins:

| Use Case | Use This | Not This |
|----------|----------|----------|
| Starting PLAN/ACT/EVAL mode | `parse_mode` | OMC mode state tools |
| Dispatching specialist agents | `dispatch_agents` | OMC `/team` or `/swarm` |
| Code/security review | codingbuddy `search_rules` + specialists | OMC `/code-review`, `/security-review` |
| Context across sessions | `update_context` | OMC notepad/project memory |
| Task analysis before planning | `analyze_task` | Ad-hoc OMC tools |
| Checklists (security, a11y) | `generate_checklist` | Manual OMC review |

---

## Decision Rationale

- codingbuddy tools are project-aware and integrate with the PLAN/ACT/EVAL workflow
- OMC tools are general-purpose developer tools without project context
- Using codingbuddy first ensures consistent quality gates and audit trail via `docs/codingbuddy/context.md`
- OMC's unique capabilities (LSP, AST, REPL) complement codingbuddy; they do not replace it
