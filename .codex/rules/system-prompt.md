# Codex System Prompt

This project uses shared AI coding rules from `packages/rules/.ai-rules/` directory for consistency across all AI assistants (Cursor, Claude Code, Antigravity, Codex, Q, Kiro).

## 📚 Core Workflow Rules

**Source**: [packages/rules/.ai-rules/rules/core.md](../../packages/rules/.ai-rules/rules/core.md)

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

### Agent System

**Auto-activated Agents**:
- **Frontend Developer** (`packages/rules/.ai-rules/agents/frontend-developer.json`): PLAN/ACT modes
- **Code Reviewer** (`packages/rules/.ai-rules/agents/code-reviewer.json`): EVAL mode

**Specialist Agents** (37 available):

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

For complete workflow details, see [packages/rules/.ai-rules/rules/core.md](../../packages/rules/.ai-rules/rules/core.md)

---

## 🏗️ Project Setup

**Source**: [packages/rules/.ai-rules/rules/project.md](../../packages/rules/.ai-rules/rules/project.md)

### Tech Stack

Refer to project's `package.json`.

### Project Structure
```
src/
├── app/          # Next.js App Router
├── entities/     # Domain entities (business logic)
├── features/     # Feature-specific UI components
├── widgets/      # Composite widgets
└── shared/       # Common modules
```

### Development Rules
- **Layer dependency**: app → widgets → features → entities → shared
- **Pure/impure separation**: Separate files for pure and impure functions
- **Server Components**: Default, Client Components only when necessary
- **Test coverage**: 90%+ goal

For complete project setup, see [packages/rules/.ai-rules/rules/project.md](../../packages/rules/.ai-rules/rules/project.md)

---

## 🎯 Augmented Coding Principles

**Source**: [packages/rules/.ai-rules/rules/augmented-coding.md](../../packages/rules/.ai-rules/rules/augmented-coding.md)

### TDD Cycle (Strict Adherence)

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
- TypeScript strict mode (no `any`)
- DRY (Don't Repeat Yourself)
- Keep methods small (10-20 lines max)
- Minimize state, prefer pure functions

For complete augmented coding guide, see [packages/rules/.ai-rules/rules/augmented-coding.md](../../packages/rules/.ai-rules/rules/augmented-coding.md)

---

## 🤖 Specialist Agents

**Source**: [packages/rules/.ai-rules/agents/](../../packages/rules/.ai-rules/agents/)

### Specialist Execution

When `parse_mode` returns `parallelAgentsRecommendation` or `dispatchReady`, execute specialists **sequentially**:

1. Announce specialists being analyzed
2. For each specialist: apply its system prompt as analysis context, analyze, record findings
3. Consolidate all findings into a unified summary

See [packages/rules/.ai-rules/adapters/codex.md](../../packages/rules/.ai-rules/adapters/codex.md#specialist-agents-execution) for the full workflow.

---

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

Example: `PLAN design auth feature` → **즉시** parse_mode 호출 → PLAN 모드로 작업

---

## 🔴 MANDATORY: Context Document Persistence

Before completing any mode (PLAN/ACT/EVAL), you **MUST** call `update_context` to persist:
- `decisions[]` — Key decisions made
- `notes[]` — Implementation notes
- `progress[]` — (ACT mode) Progress items
- `findings[]` / `recommendations[]` — (EVAL mode) Review results
- `status` — `in_progress`, `completed`, or `blocked`

Without this call, decisions and progress will be lost across sessions or context compaction.

---

## 🔧 MCP Server Configuration

codingbuddy MCP 서버 사용 시 `CODINGBUDDY_PROJECT_ROOT` 환경변수를 프로젝트의 절대 경로로 설정하세요.

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
| `parse_mode` | Parse PLAN/ACT/EVAL/AUTO keywords and return mode-specific rules | Message starts with mode keyword |
| `search_rules` | Search for rules and guidelines | Need project rules context |
| `get_agent_details` | Get detailed profile of a specific AI agent | Need agent expertise info |
| `get_agent_system_prompt` | Get complete system prompt for a specialist agent | Before specialist analysis |
| `prepare_parallel_agents` | Prepare specialist agents for sequential execution | EVAL mode specialist analysis |
| `dispatch_agents` | Get dispatch params (Claude Code optimized) | Not recommended for Codex |
| `analyze_task` | Task risk assessment, specialist recommendations | Start of PLAN mode |
| `generate_checklist` | Contextual checklists (security, accessibility, performance, testing, code-quality, SEO) | Before completing ACT/EVAL |
| `get_project_config` | Get project tech stack, architecture, conventions, and language settings | Need project context |
| `get_code_conventions` | Get project code conventions from tsconfig, eslint, prettier, editorconfig | Before implementing code changes |
| `recommend_skills` | Recommend skills based on user prompt | Detect skill-worthy intent |
| `get_skill` | Get full skill content by name | After recommend_skills or slash-command |
| `list_skills` | List all available skills | Browse skill catalog |
| `read_context` | Read context document | Check previous mode decisions |
| `update_context` | Persist decisions, notes, progress to context document | **MANDATORY** before completing each mode |

---

## Full Documentation

For comprehensive guides:
- **augmented-coding**: [packages/rules/.ai-rules/rules/augmented-coding.md](../../packages/rules/.ai-rules/rules/augmented-coding.md)
- **clarification-guide**: [packages/rules/.ai-rules/rules/clarification-guide.md](../../packages/rules/.ai-rules/rules/clarification-guide.md)
- **core**: [packages/rules/.ai-rules/rules/core.md](../../packages/rules/.ai-rules/rules/core.md)
- **parallel-execution**: [packages/rules/.ai-rules/rules/parallel-execution.md](../../packages/rules/.ai-rules/rules/parallel-execution.md)
- **project**: [packages/rules/.ai-rules/rules/project.md](../../packages/rules/.ai-rules/rules/project.md)
- **structured-reasoning-guide**: [packages/rules/.ai-rules/rules/structured-reasoning-guide.md](../../packages/rules/.ai-rules/rules/structured-reasoning-guide.md)
- **Agents System**: [packages/rules/.ai-rules/agents/README.md](../../packages/rules/.ai-rules/agents/README.md)
- **Integration Guide**: [packages/rules/.ai-rules/adapters/codex.md](../../packages/rules/.ai-rules/adapters/codex.md)

---

**Note**: This file references common AI rules from `packages/rules/.ai-rules/` directory. All AI assistants (Cursor, Claude Code, Antigravity, Codex, Q, Kiro) share the same rules for consistency.
