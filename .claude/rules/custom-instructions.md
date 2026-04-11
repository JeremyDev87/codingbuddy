# Custom Instructions for Claude Code

Follow the common rules in `packages/rules/.ai-rules/` for consistency across AI assistants.

## 📚 Core Workflow — Modes

- **PLAN**: Create implementation plans with TDD approach
- **ACT**: Execute changes following quality standards
- **EVAL**: Evaluate code quality and suggest improvements
- **AUTO**: Autonomous PLAN → ACT → EVAL cycle

**Mode indicators**: Display `activation_message.formatted` from `parse_mode`, then `# Mode: PLAN|ACT|EVAL|AUTO` at start of response.

## 🎯 Code Quality

- **TDD cycle**: Red → Green → Refactor (atomic operation)
- TDD for core logic; test-after for UI
- SOLID, DRY, 90%+ coverage
- TypeScript strict (no `any`)
- No mocking — test real behavior

## 🤖 Specialist Agents

Agent list is **not duplicated here** — fetch on demand:
- `mcp__codingbuddy__get_agent_details(agentName)` — profile, expertise, system prompt
- `mcp__codingbuddy__list_agent_stacks` — all available agents
- Full list: [packages/rules/.ai-rules/agents/README.md](../../packages/rules/.ai-rules/agents/README.md)

## 🔴 MANDATORY: TDD Execution Continuity

<TDD_CONTINUITY_RULE>

TDD RED phase test failures are **expected results** and are NOT a reason to halt implementation.

| Type | Action |
|------|--------|
| **Expected RED** (intentional failure) | Proceed to GREEN immediately |
| **Unexpected failure** | Stop and analyze root cause |

**RED → GREEN → REFACTOR is atomic** — do not wait for user input until all three phases are complete.

When a plan step contains "Expected: FAIL" or "verify it fails", a test failure means **proceed to next step**. This takes precedence over executing-plans "STOP on test fail" rule.

</TDD_CONTINUITY_RULE>

## 🔴 MANDATORY: Keyword Mode Detection

<CODINGBUDDY_CRITICAL_RULE>

When user message starts with PLAN, ACT, EVAL, or AUTO (or localized equivalents):

1. Call `activate` MCP tool (preferred in Claude Code)
2. Fallback: `parse_mode` if `activate` unavailable
3. Follow returned `rules` as context
4. Use returned `specialists` for council via Claude native Teams

</CODINGBUDDY_CRITICAL_RULE>

## 🔴 MANDATORY: Specialist Council

<SPECIALIST_COUNCIL_RULE>

When `activate` returns specialists, run as council via Claude native Teams:

1. `activate({ prompt })` → rules, primaryAgent, specialists
2. Create Claude native Team with specialists as teammates
3. Each specialist independently analyzes
4. Cross-review findings
5. Collect consensus: approve | concern | reject
6. Summarize to user

**Fallback** (non-Teams): dispatch specialists as parallel subagents via Agent tool with `run_in_background: true`.

</SPECIALIST_COUNCIL_RULE>

## Claude Code Native Feature Mapping

Prefer native features over codingbuddy equivalents:

| Need | Native | Instead of |
|------|--------|------------|
| Cross-session context | **Claude Code Memory** | `update_context` / `create_briefing` / `resume_session` |
| Specialist debate | **Claude native Teams** | `dispatch_agents` |
| Task exploration | **/dream** | `analyze_task` |
| Planning with approval | **EnterPlanMode** | `parse_mode` planning stage |
| Repeated execution | **/loop** | AUTO mode repetition |
| Clarification | **AskUserQuestion** | clarification gate |

## Full Documentation

Rules: [packages/rules/.ai-rules/rules/](../../packages/rules/.ai-rules/rules/)
Agents: [packages/rules/.ai-rules/agents/README.md](../../packages/rules/.ai-rules/agents/README.md)
Claude adapter: [packages/rules/.ai-rules/adapters/claude-code.md](../../packages/rules/.ai-rules/adapters/claude-code.md)
