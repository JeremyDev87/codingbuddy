<p align="center">
  <a href="README.md">English</a> |
  <a href="README.ko.md">한국어</a> |
  <a href="README.zh-CN.md">中文</a> |
  <a href="README.ja.md">日本語</a> |
  <a href="README.es.md">Español</a>
</p>

# Codingbuddy

[![CI](https://github.com/JeremyDev87/codingbuddy/actions/workflows/dev.yml/badge.svg)](https://github.com/JeremyDev87/codingbuddy/actions/workflows/dev.yml)
[![npm version](https://img.shields.io/npm/v/codingbuddy.svg)](https://www.npmjs.com/package/codingbuddy)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Prove your AI coding is actually improving.**

Codingbuddy is a multi-AI MCP server that orchestrates 37 specialist agents across 9 AI tools — and measures the impact on your code quality with every session.

---

## Session Impact Report

At the end of every session, codingbuddy shows you what actually happened:

```
┌─────────────────────────────────────────────────┐
│            Session Impact Report                │
├─────────────────────────────────────────────────┤
│                                                 │
│  Issues prevented           12                  │
│    Security                  4  (2 critical)    │
│    Accessibility             3                  │
│    Performance               2                  │
│    Code Quality              3                  │
│                                                 │
│  Agents dispatched           8                  │
│  Checklists generated        5                  │
│  Mode transitions            PLAN → ACT → EVAL │
│  Context decisions          14                  │
│                                                 │
└─────────────────────────────────────────────────┘
```

Most AI rules tools tell you to "code better." Codingbuddy proves you did.

---

## Quick Start

```bash
# 1. Install
npm install -g codingbuddy

# 2. Initialize your project
npx codingbuddy init

# 3. Add to your AI tool's MCP config
```

```json
{
  "mcpServers": {
    "codingbuddy": {
      "command": "npx",
      "args": ["codingbuddy", "mcp"]
    }
  }
}
```

Start coding with `PLAN`, `ACT`, `EVAL`, or `AUTO` keywords.

> **Claude Code users**: Install as a plugin for the full experience:
>
> ```bash
> # 1. Add marketplace
> claude marketplace add JeremyDev87/codingbuddy
>
> # 2. Install plugin
> claude plugin install codingbuddy@jeremydev87
> ```
>
> The plugin adds session-aware hooks that power Impact Reports, buddy greetings, onboarding tours, achievement badges, and adaptive performance mode. Update to the latest version with `claude plugin install codingbuddy@jeremydev87`.
>
> See the [Plugin Guide](docs/plugin-guide.md) for details.

[Full Getting Started Guide →](docs/getting-started.md)

---

## Why Codingbuddy?

**Measurable results, not promises.** Session Impact Reports show issues prevented, agents dispatched, and quality improvements — backed by data from every tool call.

**37 specialists, not one generalist.** Security engineers, accessibility experts, performance specialists, architects — each with domain expertise that a single AI cannot match.

**One ruleset, 9 AI tools.** Same quality standards whether you use Cursor, Claude Code, GitHub Copilot, or any other supported tool. Switch tools without losing consistency.

**Quality gates that ship.** The PLAN → ACT → EVAL cycle iterates until Critical=0 and High=0. Production-ready code, not "good enough" code.

---

## What's New in v5.4.0

**Question-First Planning** — Codingbuddy now asks before it plans. Ambiguous prompts trigger a clarifying question, and clear prompts walk through Discover→Design→Plan stages with explicit user confirmation at each step.

**Council Scene** — PLAN, EVAL, and AUTO modes open with a visible council scene showing which specialist agents are assembled and ready to collaborate.

**Permission Forecast** — Before execution, codingbuddy surfaces what permission classes (repo-write, network, external) will be needed, so you can prepare approval bundles in advance.

**Execution Gate** — When the planning stage hasn't advanced past discovery, specialist dispatch is suppressed to avoid premature work.

**Council State Pipeline** — Real-time council badges show agent handoffs, stage transitions, and blockers as they happen during tool execution.

---

## Supported AI Tools

| Tool | Integration | Setup |
|------|-------------|-------|
| Claude Code | MCP Server + Plugin | [Guide](packages/rules/.ai-rules/adapters/claude-code.md) |
| Cursor | MCP Server | [Guide](packages/rules/.ai-rules/adapters/cursor.md) |
| GitHub Copilot / Codex | MCP Server | [Guide](packages/rules/.ai-rules/adapters/codex.md) |
| Antigravity (Gemini) | MCP Server | [Guide](packages/rules/.ai-rules/adapters/antigravity.md) |
| Amazon Q | MCP Server | [Guide](packages/rules/.ai-rules/adapters/q.md) |
| Kiro | MCP Server | [Guide](packages/rules/.ai-rules/adapters/kiro.md) |
| Windsurf | MCP Server | [Guide](packages/rules/.ai-rules/adapters/windsurf.md) |
| Aider | MCP Server | [Guide](packages/rules/.ai-rules/adapters/aider.md) |
| OpenCode | MCP Server | [Guide](packages/rules/.ai-rules/adapters/opencode.md) |

[All Setup Guides →](docs/supported-tools.md)

---

## How It Works

Codingbuddy enforces a quality-driven development cycle:

```
    PLAN                    ACT                     EVAL
 ┌──────────┐          ┌──────────┐          ┌──────────────┐
 │ Architect │          │Developer │          │  Code Review  │
 │  designs  │───────▶  │implements│───────▶  │  + Parallel   │
 │  approach │          │ with TDD │          │  Specialists  │
 └──────────┘          └──────────┘          └──────┬───────┘
                                                    │
                                          ┌─────────┴─────────┐
                                          │                   │
                                    Critical > 0?       Critical = 0
                                    High > 0?           High = 0
                                          │                   │
                                          ▼                   ▼
                                    Back to PLAN        Ship with
                                                       confidence
```

**AUTO mode** runs the full cycle autonomously:

```
AUTO: Implement JWT authentication with refresh tokens
→ Plans architecture with security requirements
→ Implements with TDD
→ Reviews: security, performance, accessibility, code quality
→ Iterates until production-ready
```

---

## Impact Telemetry

Codingbuddy tracks what its agents do during your session and generates a summary at the end.

### What It Tracks

| Event | Description |
|-------|-------------|
| Mode transitions | PLAN/ACT/EVAL workflow progression |
| Agents dispatched | Which specialists were activated and when |
| Issues prevented | Problems caught before reaching production |
| Checklists generated | Domain-specific quality gates applied |
| Context decisions | Architectural decisions persisted across sessions |
| Rules matched | Project-specific rules enforced during the session |

### How It Works

1. Every MCP tool call logs impact events to the session
2. Events are categorized by domain (security, accessibility, performance, quality) and severity
3. At session end, `get_session_impact` generates the summary report

No configuration needed. Impact telemetry is always on.

---

## Agents

37 specialist agents organized in a 3-tier system.

### Mode Agents (4)

Orchestrate the development workflow.

| Agent | Role |
|-------|------|
| Plan Mode | Design architecture and test strategy |
| Act Mode | Execute implementation with TDD |
| Eval Mode | Multi-specialist code review |
| Auto Mode | Autonomous PLAN → ACT → EVAL until quality met |

### Primary Agents (18)

Core implementation and review roles.

| Agent | Focus |
|-------|-------|
| Solution Architect | High-level system design |
| Technical Planner | Implementation planning with TDD tasks |
| Frontend Developer | React/Next.js, Server Components, accessibility |
| Backend Developer | Node.js, Python, Go, Java — Clean Architecture |
| Mobile Developer | React Native, Flutter, iOS, Android |
| Data Engineer | Schema design, migrations, query optimization |
| Data Scientist | EDA, statistical modeling, ML, Jupyter |
| Systems Developer | Rust, C/C++, FFI, embedded, low-level performance |
| Code Reviewer | Multi-dimensional quality assessment |
| Test Engineer | TDD cycle, coverage, all test types |
| Security Engineer | Auth, encryption, vulnerability remediation |
| Software Engineer | General-purpose, any language (fallback) |
| DevOps Engineer | Docker, monitoring, deployment |
| Platform Engineer | IaC, Kubernetes, multi-cloud, GitOps |
| Tooling Engineer | Build tools, project configuration |
| Agent Architect | AI agent design and validation |
| AI/ML Engineer | LLM integration, RAG, prompt engineering |
| UI/UX Designer | Visual hierarchy, interaction patterns, UX laws |

### Specialist Agents (13)

Domain experts dispatched in parallel during EVAL.

| Agent | Domain |
|-------|--------|
| Architecture | Layer boundaries, dependency direction, SOLID |
| Test Strategy | TDD vs test-after, coverage planning |
| Security | OWASP, auth/authz, XSS/CSRF |
| Accessibility | WCAG 2.1 AA, ARIA, keyboard navigation |
| Performance | Core Web Vitals, bundle size, rendering |
| Code Quality | Complexity analysis, DRY, design patterns |
| SEO | Metadata, JSON-LD, Open Graph |
| i18n | Translation keys, RTL, locale formatting |
| Integration | API patterns, OAuth, circuit breakers |
| Event Architecture | Event Sourcing, CQRS, Saga, message queues |
| Documentation | JSDoc, code comments, API docs |
| Observability | OpenTelemetry, tracing, SLI/SLO |
| Migration | Strangler Fig, zero-downtime migrations |

### Utility Agents (2)

| Agent | Purpose |
|-------|---------|
| Parallel Orchestrator | Multi-issue parallel execution with file-overlap validation |
| Plan Reviewer | Plan quality and feasibility checks |

[Full Agent Reference →](packages/rules/.ai-rules/agents/README.md)

---

## Built-in Skills

Reusable workflows that enforce consistent development practices.

| Skill | Description |
|-------|-------------|
| `ship` | Run CI checks, create branch, commit, push, and PR |
| `retrospective` | Analyze session archives for patterns and improvements |
| `test-driven-development` | Red → Green → Refactor cycle enforcement |
| `systematic-debugging` | Root cause analysis before proposing fixes |
| `security-audit` | OWASP Top 10 review, secrets scanning |
| `performance-optimization` | Profiling-first optimization workflow |
| `refactoring` | Tidy First principles with test safety |
| `brainstorming` | Explore intent and requirements before building |

[Full Skills Library →](packages/rules/.ai-rules/skills/README.md)

---

## Configuration

Create `codingbuddy.config.json` in your project root:

```json
{
  "language": "en",
  "verbosity": "compact",
  "ai": {
    "defaultModel": "claude-sonnet-4-20250514"
  }
}
```

| Setting | Options | Default |
|---------|---------|---------|
| `language` | `en`, `ko`, `ja`, `zh`, `es`, `pt-br`, `de`, `fr` | `en` |
| `verbosity` | `minimal`, `compact`, `standard`, `detailed` | `compact` |
| `ai.defaultModel` | Any Claude model ID | `claude-sonnet-4-*` |

[Configuration Reference →](docs/config-schema.md)

---

## Terminal Dashboard (TUI)

Real-time visualization of agent activity, task progress, and workflow state.

```bash
npx codingbuddy tui
```

Multi-session support, responsive layout, and zero overhead on MCP response times.

[TUI Guide →](docs/tui-guide.md)

---

## Documentation

| Document | Description |
|----------|-------------|
| [Getting Started](docs/getting-started.md) | Installation and setup |
| [Agent System](packages/rules/.ai-rules/agents/README.md) | Complete agent reference |
| [Skills Library](packages/rules/.ai-rules/skills/README.md) | Workflow skills |
| [Supported Tools](docs/supported-tools.md) | AI tool integration guides |
| [Configuration](docs/config-schema.md) | Config file options |
| [Plugin Guide](docs/plugin-guide.md) | Claude Code plugin setup |
| [TUI Guide](docs/tui-guide.md) | Terminal dashboard |
| [API Reference](docs/api.md) | MCP server capabilities |

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT © [Codingbuddy](https://github.com/JeremyDev87/codingbuddy)
