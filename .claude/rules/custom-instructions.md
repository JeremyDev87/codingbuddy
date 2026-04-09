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

**Available Agents**:

| Agent | Description | Expertise |
|-------|-------------|-----------|
| Accessibility Specialist | Accessibility expert for Planning, Implementation, and Evaluation modes - unified specialist for WCAG 2.1 AA compliance, ARIA attributes, and keyboard navigation |  |
| Act Mode Agent | ACT mode agent - specialized for actual implementation execution |  |
| Agent Architect | Primary Agent for creating, validating, and managing AI agent configurations |  |
| AI/ML Engineer | AI/ML expert for Planning, Implementation, and Evaluation modes - unified specialist for LLM integration, prompt engineering, RAG architecture, AI safety, and testing non-deterministic systems |  |
| Architecture Specialist | Architecture expert for Planning, Implementation, and Evaluation modes - unified specialist for layer placement, dependency direction, and type safety |  |
| Auto Mode Agent | AUTO mode agent - autonomous PLAN → ACT → EVAL cycle until quality targets met |  |
| Backend Developer | Language-agnostic backend specialist with Clean Architecture, TDD, and security focus. Supports Node.js, Python, Go, Java, and other backend stacks. |  |
| Code Quality Specialist | Code quality expert for Planning, Implementation, and Evaluation modes - unified specialist for SOLID principles, DRY, complexity analysis, and design patterns |  |
| Code Reviewer | Senior software engineer specializing in comprehensive code quality evaluation and improvement recommendations |  |
| Data Engineer | Data specialist focused on database design, schema optimization, migrations, and analytics query optimization. Handles data modeling, ETL patterns, and reporting data structures. |  |
| Data Scientist | Data science specialist for exploratory data analysis, statistical modeling, ML model development, and data visualization. Handles EDA, feature engineering, model training, and Jupyter notebook development. |  |
| DevOps Engineer | Docker, Datadog monitoring, and Next.js deployment specialist |  |
| Documentation Specialist | Documentation expert for Planning, Implementation, and Evaluation modes - unified specialist for documentation planning, code comments, type definitions, and documentation quality assessment |  |
| Eval Mode Agent | EVAL mode agent - specialized for code quality evaluation and improvement suggestions |  |
| Event Architecture Specialist | Event-driven architecture specialist for Planning, Implementation, and Evaluation modes - unified specialist for message queues, event sourcing, CQRS, real-time communication, distributed transactions, and event schema management |  |
| Frontend Developer | Modern React/Next.js specialist with Server Components/Actions, TDD, and accessibility focus |  |
| i18n Specialist | Internationalization expert for Planning, Implementation, and Evaluation modes - unified specialist for i18n library setup, translation key structure, formatting, and RTL support |  |
| Integration Specialist | External service integration specialist for Planning, Implementation, and Evaluation modes - unified specialist for API integrations, webhooks, OAuth flows, and failure isolation patterns |  |
| Migration Specialist | Cross-cutting migration coordinator for legacy system modernization, framework upgrades, database migrations, and API versioning - unified specialist for Strangler Fig, Branch by Abstraction, and zero-downtime migration patterns |  |
| Mobile Developer | Cross-platform and native mobile specialist supporting React Native, Flutter, iOS (Swift/SwiftUI), and Android (Kotlin/Compose). Focuses on mobile-specific patterns, performance, and platform guidelines. |  |
| Observability Specialist | Observability expert for Planning, Implementation, and Evaluation modes - unified specialist for vendor-neutral monitoring, distributed tracing, structured logging, SLI/SLO frameworks, and alerting patterns |  |
| Parallel Orchestrator | Orchestrates parallel execution of multiple GitHub issues using taskMaestro with file-overlap validation, Wave grouping, and AUTO mode workers |  |
| Performance Specialist | Performance expert for Planning, Implementation, and Evaluation modes - unified specialist for bundle size optimization, rendering optimization, and Core Web Vitals |  |
| Plan Mode Agent | PLAN mode agent - specialized for work planning and design |  |
| Plan Reviewer | Reviews implementation plans for quality, completeness, and feasibility before execution |  |
| Platform Engineer | Cloud-native infrastructure expert for Planning, Implementation, and Evaluation modes - unified specialist for Infrastructure as Code, Kubernetes orchestration, multi-cloud strategy, GitOps workflows, cost optimization, and disaster recovery |  |
| Security Engineer | Primary Agent for implementing security features, fixing vulnerabilities, and applying security best practices in code |  |
| Security Specialist | Security expert for Planning, Implementation, and Evaluation modes - unified specialist for authentication, authorization, and security vulnerability prevention |  |
| SEO Specialist | SEO expert for Planning, Implementation, and Evaluation modes - unified specialist for metadata, structured data, and search engine optimization |  |
| Software Engineer | General-purpose implementation engineer — any language, any domain, TDD-first |  |
| Solution Architect | High-level system design and architecture planning specialist |  |
| Systems Developer | Primary Agent for systems programming, low-level optimization, native code development, and performance-critical implementations |  |
| Technical Planner | Low-level implementation planning with TDD and bite-sized tasks |  |
| Test Engineer | Primary Agent for TDD cycle execution, test writing, and coverage improvement across all test types |  |
| Test Strategy Specialist | Test strategy expert for Planning, Implementation, and Evaluation modes - unified specialist for TDD vs Test-After decisions, test coverage planning, and test quality assessment |  |
| Tooling Engineer | Project configuration, build tools, and development environment specialist |  |
| UI/UX Designer | UI/UX design specialist based on universal design principles and UX best practices - focuses on aesthetics, usability, and user experience rather than specific design system implementations |  |

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

## 🔴 MANDATORY: Keyword Mode Detection

<CODINGBUDDY_CRITICAL_RULE>

**When user message starts with PLAN, ACT, EVAL, or AUTO keyword (or localized equivalents):**

1. Call `activate` MCP tool with the user's prompt (preferred in Claude Code)
2. **Fallback**: Call `parse_mode` if `activate` is unavailable
3. Follow the returned `rules` as context
4. Use returned `specialists` to run a council via Claude native Teams

</CODINGBUDDY_CRITICAL_RULE>

## 🔴 MANDATORY: Specialist Council Execution

<SPECIALIST_COUNCIL_RULE>

**When `activate` returns specialists, run them as a council via Claude native Teams.**

### Workflow

1. Call `activate({ prompt })` → get rules, primaryAgent, specialists
2. Create a Claude native Team with the returned specialists as teammates
3. Each specialist independently analyzes the task
4. Specialists cross-review each other's findings
5. Collect consensus: approve | concern | reject
6. Summarize all findings to user

### Fallback (non-Teams environments)

If Teams is not available, dispatch specialists as parallel subagents:
- Use `Agent` tool with `run_in_background: true` for each specialist
- Collect results and synthesize

</SPECIALIST_COUNCIL_RULE>

## Claude Code Native Feature Mapping

Use Claude Code native features instead of codingbuddy equivalents:

| Need | Native Feature | Instead of |
|------|----------------|------------|
| Cross-session context | **Claude Code Memory** | `update_context` / `create_briefing` / `resume_session` |
| Specialist debate | **Claude native Teams** | `dispatch_agents` subagent strategy |
| Task exploration | **/dream** | `analyze_task` |
| Planning with approval | **EnterPlanMode** | `parse_mode` planning stage |
| Repeated execution | **/loop** | AUTO mode repetition |
| Clarification | **AskUserQuestion** | clarification gate |

## Claude Code Specific

- Follow project's configured language setting
- Use structured markdown formatting
- Provide clear, actionable feedback
- Reference project context from `packages/rules/.ai-rules/rules/project.md`
- Follow PLAN → ACT → EVAL workflow when appropriate

## Full Documentation

For comprehensive guides:
- **augmented-coding**: [packages/rules/.ai-rules/rules/augmented-coding.md](../../packages/rules/.ai-rules/rules/augmented-coding.md)
- **clarification-guide**: [packages/rules/.ai-rules/rules/clarification-guide.md](../../packages/rules/.ai-rules/rules/clarification-guide.md)
- **core**: [packages/rules/.ai-rules/rules/core.md](../../packages/rules/.ai-rules/rules/core.md)
- **parallel-execution**: [packages/rules/.ai-rules/rules/parallel-execution.md](../../packages/rules/.ai-rules/rules/parallel-execution.md)
- **project**: [packages/rules/.ai-rules/rules/project.md](../../packages/rules/.ai-rules/rules/project.md)
- **structured-reasoning-guide**: [packages/rules/.ai-rules/rules/structured-reasoning-guide.md](../../packages/rules/.ai-rules/rules/structured-reasoning-guide.md)
- **Agents System**: [packages/rules/.ai-rules/agents/README.md](../../packages/rules/.ai-rules/agents/README.md)
- **Claude Integration**: [packages/rules/.ai-rules/adapters/claude-code.md](../../packages/rules/.ai-rules/adapters/claude-code.md)

---

**Note**: These instructions reference common AI rules from `packages/rules/.ai-rules/` directory shared across all AI assistants (Cursor, Claude Code, Antigravity, Codex, Q, Kiro) for consistency.
