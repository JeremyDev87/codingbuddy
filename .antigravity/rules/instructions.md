# Antigravity Instructions

## Common AI Rules Reference

This project follows shared AI coding rules from `packages/rules/.ai-rules/` for consistency across all AI assistants (Cursor, Claude Code, Antigravity, Codex, Q, Kiro).

### 📚 Core Workflow (PLAN/ACT/EVAL)

**Source**: `packages/rules/.ai-rules/rules/core.md`

### Work Modes

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

See agent details in [packages/rules/.ai-rules/agents/README.md](../../packages/rules/.ai-rules/agents/README.md)

## 🔴 MANDATORY: Keyword Mode Detection

<CODINGBUDDY_CRITICAL_RULE>

**When user message starts with PLAN, ACT, EVAL, or AUTO keyword (or localized: Korean 계획/실행/평가/자동, Japanese 計画/実行/評価/自動, Chinese 计划/执行/评估/自动, Spanish PLANIFICAR/ACTUAR/EVALUAR/AUTOMÁTICO):**

1. **IMMEDIATELY** call `parse_mode` MCP tool with the user's prompt
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

### Communication

- **Follow project's configured language setting** — use `get_project_config` MCP tool to retrieve current language setting
- Use structured markdown formatting
- Provide clear, actionable feedback

---

For full integration guide, see [packages/rules/.ai-rules/adapters/antigravity.md](../../packages/rules/.ai-rules/adapters/antigravity.md)
