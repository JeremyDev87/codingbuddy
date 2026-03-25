# Amazon Q Customizations

## Common AI Rules

This project follows shared coding rules from `packages/rules/.ai-rules/` for consistency across all AI assistants.

### Workflow Modes (PLAN/ACT/EVAL/AUTO)

Refer to `packages/rules/.ai-rules/rules/core.md`:
- **PLAN**: Create implementation plans
- **ACT**: Execute code changes
- **EVAL**: Quality assessment and improvements
- **AUTO**: Autonomous PLAN → ACT → EVAL cycle until quality achieved

### Project Setup

Refer to `packages/rules/.ai-rules/rules/project.md`:
- **Tech Stack**: 프로젝트의 package.json 참조
- **Architecture**: Layered structure (app → widgets → features → entities → shared)
- **Development Rules**: File naming, import/export conventions

### Coding Standards

Refer to `packages/rules/.ai-rules/rules/augmented-coding.md`:
- **TDD Workflow**: Red → Green → Refactor
- **Code Quality**: SOLID principles, DRY, 90%+ coverage
- **Testing**: No mocking, test real behavior

### Specialist Expertise

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

Example: `EVAL` → **즉시** EVAL 모드 규칙 적용 → Devil's Advocate Analysis 수행

---

## Amazon Q Specific Features

### AWS Integration
- Leverage Q's AWS knowledge for deployment
- Use Q's security scanning with our security rules
- Apply Q's cost optimization suggestions

### Language Support
- Respond in Korean (한국어) as per project standard
- Use technical Korean terminology

## Full Documentation

- Core Workflow: `packages/rules/.ai-rules/rules/core.md`
- Project Setup: `packages/rules/.ai-rules/rules/project.md`
- Coding Principles: `packages/rules/.ai-rules/rules/augmented-coding.md`
- Specialist Agents: `packages/rules/.ai-rules/agents/README.md`
- Integration Guide: `packages/rules/.ai-rules/adapters/q.md`
