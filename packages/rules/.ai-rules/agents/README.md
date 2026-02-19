# Agents Directory

AI Agent definitions for specialized development roles.

---

## Table of Contents

- [Quick Reference: Which Agent?](#quick-reference-which-agent)
- [Available Agents](#available-agents)
  - [Core Agents](#core-agents-auto-activated-via-delegation)
  - [Domain Specialists](#domain-specialists)
  - [Utility Agents](#utility-agents)
- [Agent Details](#agent-details)
- [Usage](#usage)
- [Workflow Modes](#workflow-modes)
- [Agent Structure](#agent-structure)
- [Adding New Agents](#adding-new-agents)
  - [Specialist Integration Checklist (4-Point)](#specialist-integration-checklist-4-point)
  - [Updating Existing Specialist Integration](#updating-existing-specialist-integration)
  - [Deprecating a Specialist](#deprecating-a-specialist)
- [Best Practices](#best-practices)

---

## Quick Reference: Which Agent?

| Task Type | Recommended Agent | File |
|-----------|-------------------|------|
| **High-level Architecture Design** | Solution Architect | `solution-architect.json` |
| **Implementation Planning** | Technical Planner | `technical-planner.json` |
| **React/Next.js Development** | Frontend Developer | `frontend-developer.json` |
| **Backend API Development** | Backend Developer | `backend-developer.json` |
| **Database/Schema Design** | Data Engineer | `data-engineer.json` |
| **Mobile App Development** | Mobile Developer | `mobile-developer.json` |
| **Code Review (EVAL)** | Code Reviewer | `code-reviewer.json` |
| **Architecture Design** | Architecture Specialist | `architecture-specialist.json` |
| **Test Strategy** | Test Strategy Specialist | `test-strategy-specialist.json` |
| **Performance Optimization** | Performance Specialist | `performance-specialist.json` |
| **Security Review** | Security Specialist | `security-specialist.json` |
| **Accessibility Review** | Accessibility Specialist | `accessibility-specialist.json` |
| **SEO Optimization** | SEO Specialist | `seo-specialist.json` |
| **UI/UX Design** | UI/UX Designer | `ui-ux-designer.json` |
| **Internationalization** | i18n Specialist | `i18n-specialist.json` |
| **External Service Integration** | Integration Specialist | `integration-specialist.json` |
| **Event-Driven Architecture** | Event Architecture Specialist | `event-architecture-specialist.json` |
| **Documentation** | Documentation Specialist | `documentation-specialist.json` |
| **Code Quality** | Code Quality Specialist | `code-quality-specialist.json` |
| **Docker/Monitoring** | DevOps Engineer | `devops-engineer.json` |
| **Observability/Tracing/SLO** | Observability Specialist | `observability-specialist.json` |
| **Migration/Legacy Modernization** | Migration Specialist | `migration-specialist.json` |
| **IaC/K8s/Multi-Cloud** | Platform Engineer | `platform-engineer.json` |
| **Config/Build Tools** | Tooling Engineer | `tooling-engineer.json` |
| **Agent Management** | Agent Architect | `agent-architect.json` |
| **AI/ML Development** | AI/ML Engineer | `ai-ml-engineer.json` |
| **TDD/Test Engineering** | Test Engineer | `test-engineer.json` |

### Agent Summary

| Agent | Description |
|-------|-------------|
| Solution Architect | High-level system design and architecture planning |
| Technical Planner | Low-level implementation planning with TDD and bite-sized tasks |
| Frontend Developer | TDD-based frontend development with React/Next.js |
| Backend Developer | Multi-stack backend API development (Node, Python, Go, Java, Rust) |
| Data Engineer | Database schema design, migrations, query optimization, analytics |
| Mobile Developer | Cross-platform (React Native, Flutter) and native (iOS, Android) development |
| Code Reviewer | Auto-activated in EVAL mode, multi-dimensional code quality assessment |
| Architecture Specialist | Layer boundaries, dependency direction, Clean Architecture |
| Test Engineer | TDD cycle execution, unit/integration/e2e testing, coverage improvement |
| Test Strategy Specialist | TDD strategy, test coverage, test quality |
| Performance Specialist | Core Web Vitals, bundle optimization, rendering performance |
| Security Specialist | OWASP, authentication/authorization, XSS/CSRF defense |
| Accessibility Specialist | WCAG 2.1 AA, semantic HTML, screen reader support |
| SEO Specialist | Metadata, JSON-LD, Open Graph |
| UI/UX Designer | Visual hierarchy, UX laws, interaction patterns |
| i18n Specialist | Internationalization, translation key structure, RTL support |
| Integration Specialist | API integration patterns, webhooks, OAuth, circuit breakers, failure isolation |
| Event Architecture Specialist | Message queues, Event Sourcing/CQRS, Saga patterns, real-time communication |
| Documentation Specialist | Code comments, JSDoc, documentation quality assessment |
| Code Quality Specialist | SOLID, DRY, complexity analysis |
| DevOps Engineer | Docker, monitoring, deployment optimization |
| Observability Specialist | OpenTelemetry, distributed tracing, SLI/SLO, structured logging |
| Migration Specialist | Strangler Fig, Branch by Abstraction, legacy modernization, zero-downtime migration |
| Platform Engineer | IaC, Kubernetes, multi-cloud, GitOps, cost optimization, DR |
| Tooling Engineer | Project configuration, build tools, dev environment setup |
| Agent Architect | AI agent design, validation, checklist auditing |
| AI/ML Engineer | LLM integration, RAG architecture, prompt engineering, AI safety |

### DevOps Engineer vs Platform Engineer Decision Matrix

Use this matrix to determine which agent to use for infrastructure-related tasks:

| Scenario | Use DevOps Engineer | Use Platform Engineer |
|----------|--------------------|-----------------------|
| **Docker optimization** | ✅ Multi-stage builds, image size | Container orchestration at scale |
| **Monitoring setup** | ✅ Datadog, APM, RUM, logs | Cloud-native observability (Prometheus, Grafana) |
| **Next.js deployment** | ✅ Standalone builds, memory tuning | Kubernetes deployment strategies |
| **Terraform/Pulumi** | Basic Dockerfile | ✅ Module design, state management |
| **Kubernetes** | Docker image for K8s | ✅ Helm, RBAC, network policies, GitOps |
| **Multi-cloud** | Single cloud Docker | ✅ AWS/GCP/Azure strategies |
| **Cost optimization** | Build performance | ✅ FinOps, right-sizing, spot instances |
| **Disaster recovery** | Container health checks | ✅ RTO/RPO, backups, failover |
| **GitOps (Argo CD/Flux)** | CI/CD pipelines | ✅ GitOps workflows, sync strategies |
| **Service mesh** | Container networking | ✅ Istio, Linkerd configuration |

**Rule of Thumb:**
- **DevOps Engineer**: Docker containers, application monitoring, build optimization
- **Platform Engineer**: Infrastructure as Code, Kubernetes at scale, multi-cloud, FinOps

**Hybrid Scenarios:**
- Docker + Kubernetes: Start with Platform Engineer (broader scope), reference DevOps for Docker-specific optimization
- Monitoring + Multi-cloud: Platform Engineer for infrastructure, DevOps for application-level monitoring

### DevOps Engineer vs Observability Specialist Decision Matrix

Use this matrix to determine which agent to use for monitoring and observability tasks:

| Scenario | Use DevOps Engineer | Use Observability Specialist |
|----------|--------------------|-----------------------------|
| **Datadog setup** | ✅ APM, RUM, logs configuration | OTLP export to Datadog |
| **OpenTelemetry** | Basic trace export | ✅ SDK setup, sampling, exporters |
| **Distributed tracing** | Datadog APM only | ✅ Jaeger, Zipkin, Tempo patterns |
| **SLI/SLO definition** | — | ✅ Framework design, error budgets |
| **Logging strategy** | Datadog log injection | ✅ Structured JSON, PII masking |
| **Alert design** | Basic Datadog alerts | ✅ Fatigue prevention, runbooks |
| **Dashboard design** | Datadog dashboards | ✅ Vendor-neutral patterns |
| **Docker/Build** | ✅ Multi-stage, optimization | — |
| **Prometheus/Grafana** | — | ✅ Metric collection, visualization |

**Rule of Thumb:**
- **DevOps Engineer**: Datadog-specific setup, Docker, build optimization
- **Observability Specialist**: Vendor-neutral observability, OpenTelemetry, SLI/SLO

**Hybrid Scenarios:**
- Datadog + OpenTelemetry: Start with Observability Specialist for architecture, reference DevOps for Datadog-specific config
- New monitoring stack: Observability Specialist for Prometheus/Grafana/ELK design

---

## Primary Agent System

**Primary Agents** are core agents that receive delegation from Mode Agents (PLAN/ACT/EVAL) to perform actual work.

### Dynamic Primary Agent Resolution

Primary Agent is dynamically determined based on the following priority:

| Priority | Source | Description |
|----------|--------|-------------|
| 1 | **explicit** | Explicit request in prompt (e.g., "use backend-developer agent") |
| 2 | **config** | Project configuration's `primaryAgent` setting |
| 3 | **context** | Inference based on file path (e.g., `.go` → backend-developer) |
| 4 | **default** | Default value (frontend-developer) |

### Primary Agent Request Patterns

**Korean:**
```
backend-developer로 작업해      # "Work with backend-developer" (~로 작업해 = "work with ~")
agent-architect으로 해줘        # "Do it with agent-architect" (~으로 해줘 = "do with ~")
devops-engineer로 개발해        # "Develop with devops-engineer" (~로 개발해 = "develop with ~")
```

**English:**
```
use backend-developer agent
using frontend-developer create this
as agent-architect, design new agent
```

### Available Primary Agents

**PLAN Mode Primary Agents:**

| Agent | role.type | Activation Condition |
|-------|-----------|---------------------|
| Solution Architect | `primary` | Architecture design, system design, technology selection |
| Technical Planner | `primary` | Implementation planning, task breakdown, TDD planning |

**ACT Mode Primary Agents:**

| Agent | role.type | Activation Condition |
|-------|-----------|---------------------|
| Tooling Engineer | `primary` | Config files, build tools, package management (highest priority) |
| Frontend Developer | `primary` | Default for ACT mode, React/Next.js projects |
| Backend Developer | `primary` | Backend file context (.go, .py, .java, .rs) |
| Agent Architect | `primary` | Agent-related work requests |
| DevOps Engineer | `primary` | Dockerfile, docker-compose context |
| Platform Engineer | `primary` | Terraform, Kubernetes, cloud infrastructure |
| AI/ML Engineer | `primary` | LLM integration, RAG, prompt engineering, AI safety |
| Test Engineer | `primary` | TDD, unit/integration/e2e testing, coverage improvement |

### EVAL Mode

EVAL mode always uses `code-reviewer` (regardless of Primary Agent settings).

### Intent-Based Resolution (PLAN Mode)

PLAN mode uses intent-based resolution to automatically select between Solution Architect and Technical Planner:

| Intent Pattern | Selected Agent |
|----------------|----------------|
| Architecture, system design, technology selection | Solution Architect |
| Implementation plan, task breakdown, TDD | Technical Planner |

---

## Mode Agents

**New Agent Hierarchy**: Mode Agents → Delegate Agents → Specialist Agents

Mode Agents are workflow orchestrators that provide seamless integration with OpenCode and other agent-based AI tools. They automatically delegate to appropriate specialist agents based on the workflow mode.

### Mode Agent Hierarchy

```
Mode Agents (Workflow Orchestrators)
├── plan-mode      → delegates to → [Dynamic Primary Agent]
├── act-mode       → delegates to → [Dynamic Primary Agent]
└── eval-mode      → delegates to → code-reviewer (always)

Primary Agents (Implementation Experts) - role.type: "primary"
├── tooling-engineer       # Config/build tools specialist (highest priority)
├── frontend-developer     # React/Next.js expertise (default)
├── backend-developer      # Multi-language backend expertise
├── agent-architect        # AI agent framework expertise
├── devops-engineer        # Docker/monitoring expertise
├── platform-engineer      # IaC/Kubernetes/multi-cloud expertise
├── ai-ml-engineer         # LLM/RAG/AI safety expertise
└── test-engineer          # TDD, unit/integration/e2e test specialist

Specialist Agents (Domain Experts)
├── architecture-specialist
├── security-specialist
├── accessibility-specialist
└── ... (other specialists)
```

**Dynamic Resolution**: Primary Agent is dynamically determined based on prompt content, project configuration, and file context.

### Mode Agent Details

| Mode Agent | Workflow | Delegates To | Purpose |
|------------|----------|--------------|---------|
| **plan-mode** | PLAN | Dynamic Primary Agent | Analysis and planning without changes |
| **act-mode** | ACT | Dynamic Primary Agent | Full development with all tools |
| **eval-mode** | EVAL | code-reviewer (fixed) | Code quality evaluation |

**Key Features:**
- **Seamless Integration**: Works with OpenCode agent system
- **Automatic Delegation**: Mode Agents handle workflow, Delegates handle implementation
- **Flexible Configuration**: Delegate target configurable per project
- **Backward Compatible**: Existing usage patterns continue to work

### Usage with Mode Agents

#### OpenCode/Agent-Based Tools

```bash
# OpenCode CLI example
/agent plan-mode
Create a new feature

/agent act-mode
ACT

/agent eval-mode
EVAL
```

#### MCP Integration

When using the `parse_mode` MCP tool, you receive enhanced response with Mode Agent information:

```json
{
  "mode": "PLAN",
  "originalPrompt": "Create a new feature",
  "instructions": "Design-first approach...",
  "rules": [{"name": "rules/core.md", "content": "..."}],
  "warnings": ["No keyword found, defaulting to PLAN"],
  "agent": "plan-mode",
  "delegates_to": "frontend-developer",
  "primary_agent_source": "default",
  "delegate_agent_info": {
    "name": "Frontend Developer",
    "description": "React/Next.js expert with TDD and design system experience",
    "expertise": ["React", "Next.js", "TDD", "TypeScript"]
  }
}
```

**Response Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `mode` | string | Yes | Detected mode: "PLAN", "ACT", or "EVAL" |
| `originalPrompt` | string | Yes | User prompt with keyword removed |
| `instructions` | string | Yes | Mode-specific instructions |
| `rules` | array | Yes | Applicable rule files with content |
| `warnings` | array | No | Parsing warnings (e.g., missing keyword) |
| `agent` | string | No | Mode Agent name (e.g., "plan-mode") |
| `delegates_to` | string | No | Delegate agent name (e.g., "frontend-developer") |
| `primary_agent_source` | string | No | How Primary Agent was selected: "explicit", "config", "context", "default" |
| `delegate_agent_info` | object | No | Delegate agent details (name, description, expertise) |

### Agent Priority System

Agents are listed in priority order:
1. **Mode Agents** (plan-mode, act-mode, eval-mode)
2. **Delegate Agents** (alphabetical)
3. **Specialist Agents** (alphabetical)

This ensures Mode Agents appear first in agent selection interfaces.

---

## Available Agents

### Mode Agents (Workflow Orchestrators)

Mode Agents handle workflow orchestration and delegate to implementation experts:

- **Plan Mode** (`plan-mode.json`): Analysis and planning (delegates to primary developer)
- **Act Mode** (`act-mode.json`): Implementation execution (delegates to primary developer)  
- **Eval Mode** (`eval-mode.json`): Quality evaluation (delegates to code reviewer)

### Core Agents (Auto-activated via delegation)

These agents are automatically activated via Mode Agent delegation:

- **Primary Developer Agent**: Activated by plan-mode/act-mode
  - Example: `frontend-developer.json` (React/Next.js projects)
  - Customize per project: `backend-developer.json`, `mobile-developer.json`, etc.
- **Code Reviewer** (`code-reviewer.json`): Activated by eval-mode

### Domain Specialists

Unified specialist agents organized by domain:

- **Accessibility** (`accessibility-specialist.json`)
- **Architecture** (`architecture-specialist.json`)
- **UI/UX Design** (`ui-ux-designer.json`)
- **Documentation** (`documentation-specialist.json`)
- **Integration** (`integration-specialist.json`)
- **Event Architecture** (`event-architecture-specialist.json`)
- **Observability** (`observability-specialist.json`)
- **Migration** (`migration-specialist.json`)
- **Performance** (`performance-specialist.json`)
- **Security** (`security-specialist.json`)
- **SEO** (`seo-specialist.json`)
- **Test Strategy** (`test-strategy-specialist.json`)

### Utility Agents

- **Code Quality** (`code-quality-specialist.json`): Code quality assessment
- **DevOps Engineer** (`devops-engineer.json`): Infrastructure and monitoring

---

## Agent Details

### Solution Architect (`solution-architect.json`)

> **Note**: This is a **Primary Agent** for PLAN mode, specializing in high-level system design.

**Expertise:**

- System Architecture Design
- Technology Selection
- Integration Patterns
- Scalability Planning
- Trade-off Analysis

**Development Philosophy:**

- **Brainstorm-First**: Always start with `superpowers:brainstorming` skill
- **Multiple Options**: Present 2-3 design approaches with trade-offs
- **Incremental Validation**: Present design in sections (200-300 words) and validate with user
- **Document-Driven**: Save validated designs to `docs/plans/YYYY-MM-DD-<topic>-design.md`

**Responsibilities:**

- Analyze requirements and constraints
- Design high-level system architecture
- Evaluate technology options
- Define component boundaries
- Delegate to domain specialists (Frontend/Backend/DevOps)

**Workflow:**

1. Invoke `superpowers:brainstorming` skill
2. Understand project context (files, docs, commits)
3. Ask clarifying questions one at a time
4. Propose 2-3 approaches with trade-offs
5. Present design in sections with user validation
6. Document to `docs/plans/`
7. Offer handoff to Technical Planner

---

### Technical Planner (`technical-planner.json`)

> **Note**: This is a **Primary Agent** for PLAN mode, specializing in detailed implementation planning.

**Expertise:**

- Implementation Planning
- TDD Strategy
- Task Decomposition
- Code Structure Design
- Test Design

**Development Philosophy:**

- **Bite-Sized Tasks**: Each task is 2-5 minutes of work
- **TDD-First**: Red-Green-Refactor-Commit structure per task
- **Complete Code**: Plans include full code, no placeholders
- **Exact Paths**: Specify exact file paths for all changes

**Responsibilities:**

- Break down designs into bite-sized tasks (2-5 minutes each)
- Define exact file paths and code changes
- Design test cases with TDD approach
- Create executable implementation plans
- Ensure plans are context-complete for engineers

**Workflow:**

1. Invoke `superpowers:writing-plans` skill
2. Read design document or requirements
3. Identify all components and dependencies
4. Break into bite-sized tasks (2-5 minutes each)
5. For each task: exact files, complete code, test commands
6. Save to `docs/plans/YYYY-MM-DD-<feature>.md`
7. Offer execution choice (subagent vs parallel session)

**Execution Options:**

- **Subagent-Driven**: Execute in current session with `superpowers:subagent-driven-development`
- **Parallel Session**: Execute in separate session with `superpowers:executing-plans`

---

### Primary Developer Agent Example: Frontend Developer (`frontend-developer.json`)

> **Note**: This is an example Primary Developer Agent for React/Next.js projects. Create your own agent (e.g., `backend-developer.json`, `mobile-developer.json`) following this pattern for other tech stacks.

**Expertise:**

- React + Next.js (refer to project's package.json for versions)
- TypeScript strict mode
- TDD (Test-Driven Development)
- Augmented Coding practices
- Server Components & Server Actions
- Accessibility & SEO optimization
- Project design system

**Development Philosophy:**

- **Modern Approach**: Actively researches latest React/Next.js patterns
- **Server-First**: Defaults to Server Components, uses Client Components only when needed
- **Server Actions**: Prefers Server Actions over API routes for mutations
- **HTML/CSS First**: Solves with HTML/CSS before JavaScript
- **Design Principles**: Visual hierarchy, CRAP principles, UX laws
- **User Experience**: User flow optimization, interaction patterns
- **Accessibility**: WCAG AA compliance with semantic HTML
- **SEO**: Comprehensive metadata and structured data

**Responsibilities:**

- Develop components following TDD cycle
- Maintain 90%+ test coverage
- Follow SOLID principles
- Ensure type safety
- Optimize for Core Web Vitals
- Implement responsive design (mobile-first)

**Workflow:**

- **Core Logic**: Test-First TDD (entities, utils, hooks)
- **UI Components**: Implement-then-test (features, widgets)
- **Default**: Server Components → Client Components only when necessary

---

### Backend Developer (`backend-developer.json`)

> **Note**: This is a **language-agnostic** Primary Developer Agent for backend projects. Supports Node.js, Python, Go, Java, Rust, and other backend stacks. See `project.md` for your project's specific tech stack.

**Supported Stacks:**

- Node.js (NestJS, Express, Fastify)
- Python (FastAPI, Django, Flask)
- Go (Gin, Echo, Fiber)
- Java (Spring Boot, Quarkus)
- Rust (Actix, Axum)

**Expertise:**

- Backend API Development (REST, GraphQL, gRPC)
- Clean Architecture & Domain-Driven Design
- Database Design & ORM
- Authentication & Authorization
- TDD (Test-Driven Development)
- Augmented Coding practices

**Development Philosophy:**

- **API-First**: Define OpenAPI spec before implementation
- **Clean Architecture**: Controller → Service → Repository layers
- **Database-First**: Schema definition with proper migrations
- **Security-First**: Input validation, SQL injection prevention, OWASP compliance
- **TDD**: Test-First for Services/Repositories, Test-After for Controllers

**Responsibilities:**

- Develop REST APIs and GraphQL endpoints following TDD cycle
- Maintain 90%+ test coverage
- Follow SOLID principles and Clean Architecture
- Ensure type safety (TypeScript, type hints, generics as applicable)
- Implement secure authentication and authorization
- Design efficient database schemas with proper indexing

**Workflow:**

- **Core Logic**: Test-First TDD (services, repositories, utils)
- **API Endpoints**: Implement-then-test (controllers, middleware)
- **Default**: Clean Architecture with layered structure

---

### DevOps Engineer (`devops-engineer.json`)

**Expertise:**

- Docker containerization & optimization
- Monitoring & observability (APM, RUM, Logs)
- Next.js standalone deployment
- Build performance optimization
- Production debugging & troubleshooting

**Development Philosophy:**

- **Optimization First**: Minimize Docker image size and build time
- **Observability First**: Comprehensive monitoring with APM/RUM
- **Security Conscious**: No hardcoded secrets, official images only
- **Reliability Focus**: Health checks, graceful shutdown, error recovery
- **Debug Ready**: Source maps enabled, detailed error tracking

**Responsibilities:**

- Optimize Docker multi-stage builds
- Configure monitoring (APM, RUM, logs, metrics)
- Manage production builds
- Optimize build performance and memory usage
- Debug production issues with source maps
- Monitor and improve application performance

---

### Platform Engineer (`platform-engineer.json`)

> **Note**: This is a **Primary Agent** for cloud-native infrastructure, covering IaC, Kubernetes, multi-cloud, GitOps, cost optimization, and disaster recovery. Complements DevOps Engineer with broader platform engineering scope.

**Supported Cloud Providers:**

- AWS (EKS, ECS, Lambda, CloudFormation)
- Google Cloud (GKE, Cloud Run, Deployment Manager)
- Azure (AKS, Container Apps, ARM/Bicep)
- Kubernetes (any distribution)

**IaC Tools:**

- Terraform, Pulumi, AWS CDK, Crossplane, OpenTofu

**GitOps Tools:**

- Argo CD, Flux, Jenkins X, Tekton

**Expertise:**

- Infrastructure as Code (Terraform, Pulumi, AWS CDK)
- Kubernetes & Container Orchestration
- Multi-Cloud Strategy (AWS, GCP, Azure)
- GitOps Workflows (Argo CD, Flux)
- Cost Optimization & FinOps
- Disaster Recovery & Business Continuity
- Service Mesh & Networking
- Security & Compliance (RBAC, Network Policies)

**Development Philosophy:**

- **IaC-First**: Infrastructure defined as code with proper state management
- **Security-First**: RBAC, network policies, secrets management
- **Cost-Conscious**: FinOps practices, right-sizing, spot instances
- **GitOps-Native**: Declarative configs, automated sync, drift detection
- **DR-Ready**: RTO/RPO planning, backup automation, failover testing

**Responsibilities:**

- Design and implement Infrastructure as Code modules
- Architect Kubernetes deployments with security best practices
- Plan multi-cloud and hybrid cloud strategies
- Establish GitOps workflows for continuous delivery
- Optimize cloud costs through FinOps practices
- Design disaster recovery and business continuity plans

**Workflow:**

- **Planning**: IaC architecture, Kubernetes design, cost planning, DR planning
- **Implementation**: Terraform/Pulumi apply, Helm deployments, GitOps sync
- **Evaluation**: Security audit, cost review, DR readiness assessment

**Activation Patterns:**

- Files: `*.tf`, `*.tfvars`, `Chart.yaml`, `kustomization.yaml`, `Pulumi.yaml`, `argocd/`, `flux-system/`
- Korean: "인프라 코드", "쿠버네티스", "테라폼", "비용 최적화", "재해 복구"
- English: "terraform", "kubernetes", "k8s", "helm", "pulumi", "gitops", "argocd", "infrastructure as code"

**Auto-Activation:** Supported via MCP server. Platform Engineer is automatically selected when prompts contain IaC/Kubernetes keywords or when working with infrastructure files.

---

### Tooling Engineer (`tooling-engineer.json`)

> **Note**: This is a **Primary Agent** for ACT mode, specializing in project configuration and build tools. Has highest priority for config/tooling related tasks.

**Expertise:**

- Project Configuration (codingbuddy.config.json, .env)
- TypeScript Configuration (tsconfig.json, paths)
- Linting & Formatting (ESLint, Prettier, Stylelint)
- Build Tools (Vite, Webpack, Next.js config, Rollup)
- Package Management (package.json, yarn workspaces, dependencies)
- MCP Tools & IDE Integration
- Development Environment Setup

**Development Philosophy:**

- **Schema-First**: Configuration changes must maintain valid schema structure
- **Backward-Compatible**: Changes must not break existing configurations or builds
- **Documented**: Non-obvious configuration options must have inline comments
- **Validated**: All changes validated through lint, typecheck, and build

**Responsibilities:**

- Configure and optimize project settings
- Set up and maintain build tool configurations
- Manage linter and formatter rules
- Handle package dependencies and workspace configuration
- Configure TypeScript compiler options
- Set up development environment and IDE settings
- Integrate MCP tools with development workflow

**Workflow:**

- **Config Modification**: Incremental change with validation
- **Tool Setup**: Best practices implementation with project pattern alignment
- **Dependency Management**: Safe updates with compatibility checking

**Activation Patterns:**

- Config files: `codingbuddy.config`, `tsconfig`, `eslint`, `prettier`, `vite.config`, `next.config`
- Korean: "설정 파일", "빌드 설정", "패키지 관리", "린터 설정"
- English: "config file", "build config", "package management"

---

### Agent Architect (`agent-architect.json`)

> **Note**: This is a **Primary Agent** for managing AI agent configurations, schemas, and validation.

**Expertise:**

- Agent Schema Design (JSON/YAML)
- Workflow Orchestration
- Quality Assurance Automation
- TDD for Configuration
- Meta-Agent Patterns

**Responsibilities:**

- Generate new agent definitions from requirements
- Validate agent configurations against AgentProfile schema
- Audit code against agent mandatory_checklist
- Optimize agent workflows and delegation chains
- Maintain agent registry consistency
- Design specialized agents for specific domains

**Workflow:**

- **Agent Creation**: TDD approach - Define schema → Create minimal JSON → Validate → Enhance → Test → Document
- **Agent Validation**: Multi-layer validation (Schema, Checklist, Reference integrity, Documentation)
- **Checklist Audit**: Systematic verification against mandatory_checklist items

**Activation Patterns:**

- Korean: "create agent", "validate agent", "audit checklist"
- English: "create agent", "validate agent", "audit checklist"

---

### AI/ML Engineer (`ai-ml-engineer.json`)

> **Note**: This is a **Primary Agent** for AI/ML development tasks, specializing in LLM integration, RAG architecture, prompt engineering, and AI safety.

**Supported Providers:**

- Cloud: OpenAI, Anthropic, Google (Gemini), AWS Bedrock, Azure OpenAI
- Local: Ollama, llama.cpp, vLLM, HuggingFace Transformers
- Vector DBs: Pinecone, Weaviate, ChromaDB, pgvector, Milvus, Qdrant

**Expertise:**

- LLM Integration Patterns (provider abstraction, streaming, fallbacks)
- Prompt Engineering & Optimization
- RAG (Retrieval-Augmented Generation) Architecture
- AI Safety & Responsible AI Practices
- Testing Strategies for Non-deterministic AI Outputs
- Embedding Models & Vector Databases
- Token Management & Cost Optimization

**Development Philosophy:**

- **Safety-First**: Prompt injection prevention, output validation, PII handling
- **Provider-Agnostic**: Abstraction layer for multiple LLM providers
- **Test-Adapted**: Non-deterministic testing with semantic similarity and golden datasets
- **Cost-Conscious**: Token counting, caching, model selection optimization

**Responsibilities:**

- Plan and implement LLM integration architecture
- Design and optimize prompt templates with safety considerations
- Architect RAG pipelines with proper retrieval strategies
- Ensure AI safety (prompt injection prevention, output validation)
- Design testing strategies for non-deterministic AI outputs
- Optimize LLM API costs and latency

**Workflow:**

- **Planning**: LLM architecture design, RAG planning, safety review
- **Implementation**: Provider integration, prompt templates, retrieval pipelines
- **Evaluation**: AI output quality assessment, safety audit, performance metrics

**Activation Patterns:**

- Korean: "LLM 통합", "RAG 구현", "프롬프트 엔지니어링", "AI 안전"
- English: "LLM integration", "RAG implementation", "prompt engineering", "AI safety"

---

### Integration Specialist (`integration-specialist.json`)

> **Note**: This is a **Domain Specialist** for external service integrations, covering API patterns, webhooks, OAuth, failure isolation, and integration testing strategies.

**Supported Integration Types:**

- Payment Gateways (Stripe, PayPal, Braintree)
- Authentication Providers (Auth0, Okta, Firebase Auth)
- Email Services (SendGrid, SES, Mailgun)
- Analytics (Segment, Mixpanel, Amplitude)
- Cloud Services (AWS, GCP, Azure APIs)
- Any REST/GraphQL/gRPC external service

**Expertise:**

- API Integration Patterns (retries, timeouts, circuit breakers)
- Webhook Security (HMAC, JWT signature verification)
- OAuth 2.0 / OIDC implementation variations across providers
- Failure Isolation and Graceful Degradation
- Idempotency and Event Ordering
- External Service Monitoring and SLA Tracking
- SDK Wrapper Design and Abstraction
- Integration Testing Strategies

**Development Philosophy:**

- **Resilience-First**: Every external call must have retry, timeout, and circuit breaker
- **Security-First**: All webhooks verified, all secrets managed properly
- **Fail-Safe**: External service failures should degrade gracefully, not crash
- **Observable**: Every external service call tracked with metrics and logs
- **Testable**: Mock/stub strategies for local development and CI

**Responsibilities:**

- Plan and review external API integration implementations
- Design webhook security and idempotency patterns
- Plan and verify OAuth flow implementations across providers
- Design failure isolation and circuit breaker patterns
- Plan external service monitoring and alerting strategies
- Review SDK wrapper designs for external services
- Plan integration testing and mock service strategies

**Workflow:**

- **Planning**: API client architecture, resilience patterns, security design
- **Implementation**: SDK wrapper verification, timeout/retry validation, security checks
- **Evaluation**: Integration quality assessment, failure isolation audit, monitoring review

**Activation Patterns:**

- Files: API clients, webhook handlers, OAuth implementations, external service integrations
- Korean: "외부 서비스 연동", "웹훅", "API 통합", "서킷 브레이커"
- English: "external API", "webhook", "integration", "circuit breaker", "third-party service"

**Auto-Activation:** Supported via MCP server. Integration Specialist is automatically selected when prompts contain external service integration keywords or when working with API client/webhook files.

---

### Event Architecture Specialist (`event-architecture-specialist.json`)

> **Note**: This is a **Domain Specialist** for event-driven architecture, covering message queues, event sourcing, CQRS, distributed transactions, real-time communication, and event schema management.

**Supported Technologies:**

- Message Queues: Apache Kafka, RabbitMQ, AWS SQS/SNS, Azure Service Bus, Google Pub/Sub
- Event Stores: EventStoreDB, PostgreSQL, MongoDB, DynamoDB
- Real-Time: WebSocket, Server-Sent Events (SSE), Long Polling
- Schema: Avro, Protobuf, JSON Schema, Confluent Schema Registry

**Expertise:**

- Message Queue Selection and Configuration (ordering, durability, throughput tradeoffs)
- Event Sourcing and Event Store Design (projections, snapshots, replay)
- CQRS Pattern Implementation (command/query separation, read models)
- Distributed Transaction Patterns (Saga Choreography/Orchestration, Outbox pattern)
- Real-Time Communication (WebSocket lifecycle, SSE, reconnection strategies)
- Event Schema Management (versioning, backward/forward compatibility)
- Event Tracing and Debugging (correlation IDs, distributed tracing, DLQ handling)
- Idempotency and Exactly-Once Processing Strategies

**Development Philosophy:**

- **Reliability-First**: Every event flow must have defined delivery guarantees and error handling
- **Consistency-Aware**: Document and handle eventual consistency explicitly
- **Observable**: Correlation IDs and distributed tracing for debugging event chains
- **Scalable**: Design for horizontal scaling with proper partitioning and consumer groups
- **Evolvable**: Schema versioning and compatibility testing for safe evolution

**Responsibilities:**

- Plan and review event-driven architecture implementations
- Design message broker selection criteria and configuration
- Plan and verify event sourcing and CQRS implementations
- Design saga patterns for distributed transactions
- Plan event schema evolution and compatibility strategies
- Design event tracing and debugging approaches
- Review real-time communication implementations

**Workflow:**

- **Planning**: Broker selection, schema design, delivery guarantees, saga pattern design
- **Implementation**: Producer/consumer verification, idempotency, retry/DLQ configuration
- **Evaluation**: Reliability audit, consistency audit, scalability audit, observability audit

**Activation Patterns:**

- Files: `**/events/**`, `**/kafka/**`, `**/rabbitmq/**`, `**/sqs/**`, `**/eventgrid/**`, `**/pubsub/**`, `**/eventbridge/**`, `**/*producer*.ts`, `**/*consumer*.ts`, `**/*saga*.ts`, `**/*event-store*.ts`, `**/websocket/**`
- Korean: "이벤트 아키텍처", "메시지 큐", "카프카", "사가 패턴", "이벤트 소싱"
- English: "event-driven", "message queue", "kafka", "rabbitmq", "saga pattern", "event sourcing", "CQRS", "websocket"

**Auto-Activation:** Supported via MCP server. Event Architecture Specialist is automatically selected when prompts contain event-driven architecture keywords or when working with message queue/event sourcing files.

---

### Observability Specialist (`observability-specialist.json`)

> **Note**: This is a **Domain Specialist** for vendor-neutral observability, covering OpenTelemetry instrumentation, distributed tracing, structured logging, SLI/SLO frameworks, and alerting patterns. Complements DevOps Engineer (Datadog-specific) with vendor-neutral approach.

**Supported Technologies:**

- Tracing: OpenTelemetry, Jaeger, Zipkin, Tempo, AWS X-Ray
- Metrics: Prometheus, Grafana, InfluxDB, Victoria Metrics
- Logs: ELK Stack, Loki, Splunk, Fluentd, CloudWatch Logs
- Standards: W3C Trace Context, OTLP, RED/USE methods

**Expertise:**

- OpenTelemetry instrumentation (traces, metrics, logs)
- Distributed tracing (Jaeger, Zipkin, Tempo, Grafana Tempo)
- Structured logging (JSON format, context propagation)
- Metrics systems (Prometheus, Grafana, InfluxDB)
- SLI/SLO definition and error budget management
- Alert fatigue prevention and escalation patterns
- Correlation ID and W3C Trace Context propagation
- Dashboard design and visualization best practices

**Development Philosophy:**

- **Three Pillars**: Unified approach to traces, metrics, and logs
- **Vendor-Neutral**: OpenTelemetry-first instrumentation
- **SLO-Driven**: Define service level objectives before implementation
- **Observable by Default**: Every service instrumented from day one
- **Actionable Alerts**: Alert on symptoms, not causes; require runbooks

**Responsibilities:**

- Plan and review observability architecture implementations
- Design distributed tracing strategies with proper context propagation
- Plan structured logging standards with PII masking
- Define SLI/SLO frameworks and error budget policies
- Design dashboard templates and alerting strategies
- Plan log retention and archiving policies
- Assess observability maturity and recommend improvements

**Workflow:**

- **Planning**: Three pillars architecture, SLI/SLO definition, tracing strategy
- **Implementation**: OpenTelemetry SDK setup, log format verification, metric naming
- **Evaluation**: Trace coverage audit, alert quality review, maturity assessment

**Observability Maturity Model:**

| Level | Description | Characteristics |
|-------|-------------|-----------------|
| 1 | Reactive | Basic logging only, manual debugging |
| 2 | Proactive | Structured logs + basic metrics |
| 3 | Predictive | Distributed tracing + SLIs |
| 4 | Optimized | Full observability with SLOs and error budgets |
| 5 | Innovative | Predictive observability with anomaly detection |

**Activation Patterns:**

- Keywords: "observability", "distributed tracing", "OpenTelemetry", "SLI", "SLO", "error budget", "structured logging", "Prometheus", "Grafana", "Jaeger"
- Korean: "관측 가능성", "분산 추적", "SLI/SLO", "에러 버짓"
- English: "observability", "distributed tracing", "SLI/SLO", "error budget", "OpenTelemetry"

**Auto-Activation:** Supported via MCP server. Observability Specialist is automatically selected when prompts contain observability-related keywords or when working with tracing/monitoring files.

---

### Migration Specialist (`migration-specialist.json`)

> **Note**: This is a **Cross-Cutting Specialist** for legacy system modernization, framework upgrades, database migrations, and API versioning. Coordinates with Data Engineer (database), Platform Engineer (infrastructure), Architecture Specialist (layers), and Integration Specialist (APIs) for domain-specific implementation.

**Supported Patterns:**

- Strangler Fig: Gradual legacy replacement with traffic routing
- Branch by Abstraction: Refactoring with abstraction layer and feature toggles
- Blue-Green: Zero-downtime deployment with instant rollback
- Canary: Risk mitigation through gradual traffic routing
- Dual-Write: Database migration with zero data loss

**Expertise:**

- Legacy system modernization (Strangler Fig pattern)
- Framework upgrade strategies with compatibility handling
- Database migration with zero-downtime patterns
- Rollback planning and execution
- API versioning and deprecation management
- Feature flag-based cutover strategies
- Dual-write pattern implementation
- Migration risk assessment and mitigation

**Development Philosophy:**

- **Verification-Driven Migration (VDM)**: Pre-migration validation → Execution → Post-migration validation → Rollback verification
- **Phase-Based**: Every migration broken into independently reversible phases
- **Rollback-First**: Rollback procedure defined and tested before any production migration
- **SLI-Triggered Rollback**: Automatic rollback on defined threshold breaches
- **Data Integrity**: Continuous verification at every checkpoint

**Responsibilities:**

- Orchestrate multi-phase migration strategies
- Design and verify rollback procedures
- Plan pre/post-migration validation checkpoints
- Coordinate migration SLIs for automatic rollback triggers
- Manage API version coexistence and deprecation
- Guide incremental migration with feature flags
- Ensure data integrity during migrations
- Coordinate with specialist agents for domain-specific implementation

**Workflow:**

- **Planning**: Pattern selection, phase breakdown, rollback design, SLI definition
- **Implementation**: Pre-migration validation, execution with monitoring, checkpoint verification
- **Evaluation**: Completeness verification, performance comparison, cleanup audit

**Migration SLI Thresholds:**

| SLI | Baseline | Rollback Trigger |
|-----|----------|------------------|
| Error Rate | Pre-migration rate | >1% increase |
| Latency (p95) | Pre-migration latency | >20% degradation |
| Data Consistency | Zero difference | Any inconsistency |
| Throughput | Pre-migration capacity | <80% of baseline |

**Delegation Rules:**

| Delegate To | When |
|-------------|------|
| Data Engineer | Database schema migrations, data transformation logic |
| Platform Engineer | Infrastructure blue-green deployment, Kubernetes rollouts |
| Architecture Specialist | Layer boundary changes, module restructuring |
| Integration Specialist | External API migrations, API contract changes |
| Observability Specialist | Migration dashboards, SLI/SLO framework |

**Activation Patterns:**

- Keywords: "migration", "migrate", "legacy", "upgrade", "strangler fig", "rollback", "cutover", "deprecation", "backward compatibility"
- Korean: "마이그레이션", "이전", "레거시", "업그레이드", "롤백", "호환성", "전환"
- English: "migration", "legacy modernization", "framework upgrade", "zero-downtime", "api versioning"

**Auto-Activation:** Supported via MCP server. Migration Specialist is automatically selected when prompts contain migration-related keywords or when working with migration/upgrade files.

---

### Code Reviewer (`code-reviewer.json`)

**Expertise:**

- Multi-dimensional code quality evaluation
- Architecture and design pattern analysis
- Performance and security assessment
- Test strategy evaluation
- Risk identification and mitigation
- Latest best practices research and validation

**Evaluation Philosophy:**

- **Multi-Dimensional**: Evaluate code from various perspectives (code quality, architecture, performance, security, accessibility)
- **Evidence-Based**: Validate recommendations through web search for evidence-based approach
- **Honest**: Admit uncertainty, explicitly state parts that need verification
- **Broad Perspective**: Consider conversation context but evaluate comprehensively from a wide perspective
- **Practical**: Balance idealism with real-world constraints

**Responsibilities:**

- Comprehensive code quality evaluation from multiple perspectives
- Identify risks across various dimensions with clear prioritization
- Present evidence-based recommendations through web search validation
- Provide actionable improvement plans with clear priorities
- Assess production readiness and deployment blockers

**Activation:**

- **STRICT**: When user types `EVAL`, `EVALUATE`, or equivalent, this Agent **MUST** be activated automatically
- EVAL Mode request automatically applies this Agent's evaluation framework

**Evaluation Framework:**

**Mandatory Evaluation Perspectives:**

- Code Quality: SOLID principles, DRY, complexity (Reference: `augmented-coding.md`)
- Architecture: Layer boundaries, dependency direction (Reference: `project.md`)
- Type Safety: TypeScript usage, any type prohibition (Reference: `project.md`)
- Test Coverage: 90%+ goal achievement (Reference: `augmented-coding.md`)
- Performance: Bundle size, rendering optimization (Reference: `project.md`)
- Security: XSS/CSRF, authentication/authorization (Reference: `project.md`)
- Accessibility: WCAG 2.1 AA compliance (Reference: `project.md`)
- SEO: Metadata, structured data (Reference: `project.md`)
- UI/UX Design: Visual hierarchy, UX laws, interaction patterns (Reference: `ui-ux-designer.json`)

**Risk Assessment:**

- **Critical**: Immediate production issues, security vulnerabilities, potential data loss
- **High**: Significant technical debt, scalability problems, user experience degradation
- **Medium**: Maintainability concerns, minor performance issues
- **Low**: Code style, optimization opportunities

**Production Blockers:**

- Security vulnerabilities found
- Critical performance issues
- Accessibility WCAG AA non-compliance
- Test coverage < 90% (core logic)
- TypeScript any usage
- SOLID principles violation (architecture issues)

---

## Usage

### In AI Assistants

Reference your project's Primary Developer Agent in prompts:

```
# Frontend project example
@.ai-rules/agents/frontend-developer.json
Create a new user registration feature

# Backend project example
@.ai-rules/agents/backend-developer.json
Create a new REST API endpoint for user management

# Mobile project example
@.ai-rules/agents/mobile-developer.json
Create a new user profile screen
```

### In Chat

```
# Frontend example
Using the Frontend Developer agent,
implement user authentication flow with Server Actions

# Backend example
Using the Backend Developer agent,
implement JWT authentication middleware

# Mobile example
Using the Mobile Developer agent,
implement biometric authentication
```

### Example Output (React/Next.js)

> The following is an example from the Frontend Developer agent. Your Primary Developer Agent will generate code following your project's tech stack and conventions.

**Server Component (Default) with Design System:**

```tsx
// app/{feature}/page.tsx
import { twJoin } from 'tailwind-merge';
import { submitForm } from './actions';

export default function FeaturePage() {
  return (
    <main
      className={twJoin(
        'flex min-h-screen flex-col items-center',
        'p-4 sm:p-6 md:p-8 lg:p-12',
      )}
    >
      <Typography variant="heading2" className="mb-6">
        Feature Title
      </Typography>

      <form action={submitForm} className="w-full max-w-md">
        <Input
          type="email"
          name="email"
          placeholder="Enter your email"
          required
          className="mb-4"
        />
        <Button type="submit" variant="primary" size="large" fullWidth>
          Submit
        </Button>
      </form>
    </main>
  );
}
```

**Server Action:**

```tsx
// app/{feature}/actions.ts
'use server';

export async function submitForm(formData: FormData) {
  const email = formData.get('email') as string;

  // Server-side validation
  if (!email || !isValidEmail(email)) {
    return { error: 'Invalid email' };
  }

  // Database operation
  await db.{entity}.create({ email });

  return { success: true };
}
```

**Key Features:**

- Uses project design system components (Button, Input, Typography)
- Uses twJoin for static classes, twMerge for prop className
- Uses design tokens (not arbitrary colors)
- Server Component by default
- Server Action for form handling
- Responsive with breakpoints
- Semantic structure and accessibility built-in

---

## Real Project Examples

### Primary Developer Agent Example: Feature Implementation (React/Next.js)

> This example shows the Frontend Developer agent pattern. Adapt the structure to your project's tech stack.

**Example project structure (core logic with TDD):**

```
entities/{domain}/
├── {feature}.api.ts           # API call function
├── {feature}.api.unit.spec.ts # API tests
├── {feature}.model.ts         # React Query hook
├── {feature}.model.unit.spec.tsx # Model tests
├── {feature}.types.ts         # Type definitions
├── {feature}.constants.ts     # Error messages
└── index.ts                   # Public exports
```

**TDD workflow applied:**

1. **Write tests first** (`{feature}.model.unit.spec.tsx`)

   ```tsx
   describe('use{Feature}Mutation', () => {
     it('successfully performs action with valid input', async () => {
       // Test defines expected behavior
     });
   });
   ```

2. **Define types** (`{feature}.types.ts`)

   ```tsx
   export interface {Feature}ApiResponse {
     ok: boolean;
     data: { ... }
   }
   ```

3. **Implement API** (`{feature}.api.ts`)
   - Pure function for API call

4. **Implement model** (`{feature}.model.ts`)

   ```tsx
   export const use{Feature}Mutation = () => {
     return useMutation<...>({ ... });
   };
   ```

5. **All tests pass** → Refactor if needed

**Result:** Type-safe, tested, production-ready feature following augmented coding principles.

---

## Workflow Modes

### Default Workflow (PLAN → ACT → PLAN)

**Standard behavior - EVAL is NOT automatic:**

```
User: [Request]
AI: # Mode: PLAN
    [Propose plan]

User: ACT
AI: # Mode: ACT
    [Execute changes]
    # Mode: PLAN (automatic return - default behavior)

(Work complete - EVAL is not triggered unless requested)
```

**When to use:**

- Simple, straightforward tasks
- Already satisfied with implementation
- Time-sensitive work

---

### Optional Evaluation Workflow (PLAN → ACT → EVAL → PLAN)

**Only when user explicitly requests EVAL (automatically activates Code Reviewer Agent):**

```
User: [Request]
AI: # Mode: PLAN
    [Initial plan]

User: ACT
AI: # Mode: ACT
    [Implement v1]
    # Mode: PLAN (auto-return)

User: EVAL
AI: # Mode: EVAL
    (Code Reviewer Agent automatically activated)

    ## Implementation Analysis
    - Implemented: Feature X with Y approach
    - Files modified: [list]

    ## Strengths
    - Type-safe implementation
    - Test coverage: 85% (goal: 90%+)
    - Server Action used appropriately

    ## Improvement Opportunities

    **Critical:**
    1. **Test Coverage**: 85% → 90%+ required
       - Missing edge cases: [specific cases]
       - Impact: Potential bugs in production

    ## Improved PLAN
    1. Add tests for missing edge cases (Critical)
    2. Add ErrorBoundary wrapper (High)
    3. Optimize re-renders (Medium)

User: ACT
AI: # Mode: ACT
    [Implement improvements]
```

---

### When to Use EVAL Mode

**Request EVAL for:**

- Complex features with multiple approaches
- Production-critical implementations
- First-time patterns you're learning
- When quality is more important than speed
- Large refactoring that needs review
- Features with security or accessibility concerns

**Skip EVAL for:**

- Simple bug fixes
- Straightforward implementations
- Already meeting all quality standards
- Time-sensitive quick changes
- Minor documentation updates
- Configuration changes

---

## Agent Structure

### Flat Structure

All agent files are located directly in `.ai-rules/agents/` directory without subdirectories. This simplifies file access and maintains consistency.

**Rationale:**

- Each domain has only one unified specialist file
- File names already include domain information (e.g., `architecture-specialist.json`)
- Simpler path structure: `.ai-rules/agents/{domain}-specialist.json`
- Consistent with core agents (frontend-developer.json, code-reviewer.json)

**File Organization:**

```
.ai-rules/agents/
├── solution-architect.json          # Primary Agent for PLAN mode (architecture)
├── technical-planner.json           # Primary Agent for PLAN mode (implementation)
├── tooling-engineer.json            # Primary Agent for ACT mode (config/build tools)
├── frontend-developer.json          # Primary Agent for ACT mode (default)
├── backend-developer.json           # Primary Agent for ACT mode (backend)
├── agent-architect.json             # Primary Agent for agent management
├── devops-engineer.json             # Primary Agent for Docker/monitoring
├── platform-engineer.json           # Primary Agent for IaC/K8s/multi-cloud
├── ai-ml-engineer.json              # Primary Agent for AI/ML development
├── code-reviewer.json               # Core agent (EVAL mode, fixed)
├── code-quality-specialist.json     # Utility agent
├── accessibility-specialist.json    # Domain specialist
├── architecture-specialist.json     # Domain specialist
├── ui-ux-designer.json              # Domain specialist
├── documentation-specialist.json    # Domain specialist
├── integration-specialist.json      # Domain specialist
├── event-architecture-specialist.json # Domain specialist
├── observability-specialist.json    # Domain specialist
├── migration-specialist.json        # Cross-cutting specialist
├── performance-specialist.json      # Domain specialist
├── security-specialist.json         # Domain specialist
├── seo-specialist.json              # Domain specialist
└── test-strategy-specialist.json    # Domain specialist
```

### Unified Specialist Pattern

Each domain has a **unified specialist** agent that supports multiple modes:

- **modes.planning**: Planning framework for PLAN mode
- **modes.implementation**: Implementation verification for ACT mode
- **modes.evaluation**: Quality assessment for EVAL mode

**Example:**

- `architecture-specialist.json` contains:
  - `modes.planning` - Architecture planning framework
  - `modes.implementation` - Architecture implementation verification
  - `modes.evaluation` - Architecture quality assessment

**Usage:**

- Reference: `.ai-rules/agents/{domain}-specialist.json modes.{planning|implementation|evaluation}`
- Example: `.ai-rules/agents/architecture-specialist.json modes.planning`

### Delegation Rules Pattern

Some specialist agents define **delegation rules** to clarify when work should be handed off to another specialist. This ensures proper separation of concerns and expertise matching.

**Structure:**

```json
{
  "role": {
    "title": "Specialist Title",
    "expertise": [...],
    "responsibilities": [...],
    "delegation_rules": {
      "to_{specialist}": [
        "When condition X requires specialist expertise",
        "When condition Y is beyond current agent scope"
      ],
      "from_{specialist}": [
        "When specialist identifies work for this agent",
        "When specialist review triggers this agent's domain"
      ]
    }
  }
}
```

**Placement Standard:**
- `delegation_rules` MUST be placed inside the `role` object, after `responsibilities`
- This ensures consistent structure across all agent files
- All 8 agents with delegation rules follow this pattern

**Example (Integration Specialist ↔ Security Specialist):**

| Direction | Trigger Conditions |
|-----------|-------------------|
| Integration → Security | OAuth vulnerability assessment, auth architecture audit, secrets management review |
| Security → Integration | External API concerns, OAuth flow verification, webhook signature implementation |

**When to Use:**

- When two specialists have overlapping concerns
- When one specialist's work commonly triggers another's review
- To clarify handoff boundaries and prevent scope confusion

**Currently Implemented:**

- `integration-specialist.json` ↔ `security-specialist.json` (bidirectional delegation rules)
- `integration-specialist.json` ↔ `event-architecture-specialist.json` (webhook ↔ event queue patterns)
- `backend-developer.json` ↔ `event-architecture-specialist.json` (API ↔ message queue patterns)
- `architecture-specialist.json` ↔ `event-architecture-specialist.json` (layer boundaries ↔ event-driven design)
- `frontend-developer.json` ↔ `event-architecture-specialist.json` (UI ↔ real-time event patterns)
- `performance-specialist.json` ↔ `event-architecture-specialist.json` (optimization ↔ event throughput)
- `test-strategy-specialist.json` ↔ `event-architecture-specialist.json` (testing ↔ saga/contract tests)

**Potential Future Delegation Patterns:**

| Specialists | Use Case |
|-------------|----------|
| Accessibility ↔ UI/UX | ARIA implementation, color contrast, interaction design |
| Security ↔ DevOps | Secrets management, CI/CD security, infrastructure hardening |
| Performance ↔ Frontend | Bundle optimization, lazy loading, rendering performance |

> **Note**: Add delegation_rules when specialists have clear handoff scenarios. Avoid unnecessary rules for specialists with minimal overlap.

### Agent File Structure

Each agent JSON contains:

- **name**: Agent identifier
- **role**: Title and expertise areas
- **context_files**: Rules to reference
- **modes**: Planning, implementation, and evaluation frameworks (for unified specialists)
- **workflow**: Development approach by code type
- **code_quality_checklist**: Standards to maintain
- **tdd_cycle**: Red → Green → Refactor process
- **ai_monitoring**: Warning signs to watch for
- **commit_rules**: Structural vs behavioral changes
- **design_system**: UI component guidelines
- **communication**: Response language and style

---

## Adding New Agents

### File Naming Convention

- **Primary Developer Agent**: `{stack}-developer.json` (e.g., `frontend-developer.json`, `backend-developer.json`, `mobile-developer.json`)
- **Core Agents**: `{purpose}-{type}.json` (e.g., `code-reviewer.json`)
- **Domain Specialists**: `{domain}-specialist.json` (e.g., `architecture-specialist.json`, `security-specialist.json`)
- **Utility Agents**: `{purpose}-{type}.json` (e.g., `code-quality-specialist.json`, `devops-engineer.json`)

**Naming Rules:**

- Use kebab-case (lowercase with hyphens)
- Domain names with hyphens are preserved (e.g., `test-strategy-specialist.json`)
- Be descriptive and consistent with existing patterns

### Agent File Structure

Create a new JSON file following this structure:

```json
{
  "name": "Agent Name",
  "description": "Brief description",
  "role": {
    "title": "Role Title",
    "expertise": [],
    "responsibilities": []
  },
  "context_files": ["core.md"],
  "workflow": {},
  "reference": {}
}
```

### Creating a Custom Primary Developer Agent

To create a Primary Developer Agent for your tech stack:

1. **Copy the template**: Use `frontend-developer.json` as a starting point
2. **Rename**: `{your-stack}-developer.json` (e.g., `backend-developer.json`)
3. **Customize expertise**: Update to match your tech stack

**Example customizations:**

| Tech Stack | Agent File | Key Expertise |
|------------|------------|---------------|
| React/Next.js | `frontend-developer.json` | Server Components, React Query, Tailwind |
| Node.js/Express | `backend-developer.json` | REST API, Middleware, Database |
| React Native | `mobile-developer.json` | Native modules, Navigation, Platform-specific |
| Python/FastAPI | `python-developer.json` | Async, Pydantic, SQLAlchemy |
| Go | `go-developer.json` | Concurrency, Interfaces, Testing |

**Common fields to customize:**
- `role.expertise`: Tech stack specific skills
- `workflow`: Framework-specific patterns (e.g., Server Actions vs API routes)
- `design_system`: UI component library for your project
- `communication.language`: Team's preferred language

### Specialist Integration Checklist (4-Point)

When creating a new **Domain Specialist** agent (e.g., `{domain}-specialist.json`), you must complete ALL 4 integration points to ensure the agent is properly discovered and recommended by the MCP server:

#### ✅ Integration Checklist

| # | File | Location | Action |
|---|------|----------|--------|
| 1 | `keyword.service.ts` | `CONTEXT_SPECIALIST_PATTERNS` | Add keyword regex pattern for prompt-based detection |
| 2 | `agent.types.ts` | `FILE_PATTERN_SPECIALISTS` | Add file name patterns for file-based detection |
| 3 | `keyword.service.ts` | `defaultSpecialists` | Add to relevant mode configs (PLAN/ACT/EVAL/AUTO) |
| 4 | `custom-instructions.md` | Mode-specific Specialists table | Update documentation table |

#### 1. CONTEXT_SPECIALIST_PATTERNS (keyword.service.ts)

Add a regex pattern to detect specialist-relevant keywords in user prompts:

```typescript
// apps/mcp-server/src/keyword/keyword.service.ts
{
  pattern:
    /keyword1|keyword2|한국어키워드|english\s*pattern/i,
  specialist: '{domain}-specialist',
},
```

**Best Practices:**
- Include both English and localized keywords (Korean, Japanese, Chinese, Spanish, etc.)
- Use `\s*` for optional spaces
- Use `[- ]?` for optional hyphens/spaces
- Test regex patterns cover common variations
- **Check for conflicts**: Review existing patterns to avoid overlap (e.g., "log" might match both observability and other specialists)

#### 2. FILE_PATTERN_SPECIALISTS (agent.types.ts)

Add file name patterns that trigger specialist recommendations:

```typescript
// apps/mcp-server/src/agent/agent.types.ts
export const FILE_PATTERN_SPECIALISTS: Record<string, string[]> = {
  // ... existing patterns
  keyword1: ['{domain}-specialist'],
  keyword2: ['{domain}-specialist', 'other-specialist'],
};
```

**Best Practices:**
- Use lowercase file name keywords
- Multiple specialists can share a pattern
- Consider related file patterns (e.g., `metrics` → `['observability-specialist', 'performance-specialist']`)

#### 3. defaultSpecialists (keyword.service.ts)

Add the specialist to appropriate mode default lists:

```typescript
// apps/mcp-server/src/keyword/keyword.service.ts
// In MODE_CONFIGS
EVAL: {
  defaultSpecialists: [
    // ... existing specialists
    '{domain}-specialist',
  ],
},
```

**Mode Selection Guide:**

| Mode | Include When |
|------|--------------|
| PLAN | Specialist provides planning/architecture guidance |
| ACT | Specialist provides implementation verification |
| EVAL | Specialist provides quality assessment (most common) |
| AUTO | Specialist is essential for autonomous quality cycles |

#### 4. Documentation (custom-instructions.md)

Update the Mode-specific Specialists table:

```markdown
| Mode | Specialists |
|------|-------------|
| **EVAL** | ..., 📊 {domain} |
```

**Icon Selection:**
- Use relevant emoji that represents the domain
- Examples: 🔒 security, ♿ accessibility, ⚡ performance, 📊 observability

#### Testing Requirements

After completing all 4 integration points, add tests:

```typescript
// apps/mcp-server/src/keyword/keyword.service.spec.ts
describe('{domain}-specialist pattern', () => {
  it.each([
    'English keyword 1',
    'English keyword 2',
    // ... more English patterns
  ])('detects {domain}-specialist for English: %s', async prompt => {
    const result = await service.parseMode(`PLAN ${prompt}`);
    expect(result.parallelAgentsRecommendation?.specialists).toContain(
      '{domain}-specialist',
    );
  });

  it.each([
    '한국어 키워드 1',
    '한국어 키워드 2',
    // ... more Korean patterns
  ])('detects {domain}-specialist for Korean: %s', async prompt => {
    const result = await service.parseMode(`PLAN ${prompt}`);
    expect(result.parallelAgentsRecommendation?.specialists).toContain(
      '{domain}-specialist',
    );
  });

  it('does not detect {domain}-specialist for unrelated prompts', async () => {
    const result = await service.parseMode('PLAN create login form');
    expect(result.parallelAgentsRecommendation?.specialists).not.toContain(
      '{domain}-specialist',
    );
  });
});
```

**Test Coverage Requirements:**
- ✅ English keywords (at least 5 test cases, more for complex domains)
- ✅ Localized keywords (at least 3 test cases per supported language)
- ✅ Negative test (at least 1 unrelated prompt that should NOT trigger)

#### 5. Verify Integration

After completing all integration points and tests, verify everything works:

```bash
# Run specialist pattern tests
yarn vitest run src/keyword/keyword.service.spec.ts -t "{domain}-specialist pattern"

# Run full test suite to ensure no regressions
yarn test
```

**Verification Checklist:**
- [ ] All new pattern tests pass
- [ ] No existing tests broken
- [ ] Specialist appears in `parallelAgentsRecommendation` when keywords match
- [ ] Specialist appears when target files match `FILE_PATTERN_SPECIALISTS`

---

### Updating Existing Specialist Integration

When modifying an existing specialist's integration:

#### Adding New Keywords

1. Add keywords to the existing pattern in `CONTEXT_SPECIALIST_PATTERNS`
2. Add corresponding tests (both English and localized)
3. Run verification to ensure no conflicts

```typescript
// Before
pattern: /existing|keywords/i,

// After
pattern: /existing|keywords|new_keyword|새키워드/i,
```

#### Adding New File Patterns

1. Add patterns to `FILE_PATTERN_SPECIALISTS`
2. Check for conflicts with existing patterns

```typescript
// Adding new pattern
newpattern: ['{domain}-specialist'],
// Or extending existing pattern
existingpattern: ['existing-specialist', '{domain}-specialist'],
```

#### Changing Mode Assignments

1. Update `defaultSpecialists` in relevant mode configs
2. Update `custom-instructions.md` table
3. Document the change rationale

#### Deprecating a Specialist

When removing or deprecating a specialist:

**Common Deprecation Reasons:**
- Specialist merged into another (e.g., combining overlapping domains)
- Domain no longer relevant to project
- Replaced by improved specialist with different approach
- Simplifying agent ecosystem (reducing noise in recommendations)

**Full Deprecation (Remove Completely):**

1. **Remove from all 4 integration points** (reverse order recommended):
   - Remove from `custom-instructions.md` Mode-specific Specialists table
   - Remove from `defaultSpecialists` in `keyword.service.ts`
   - Remove file patterns from `FILE_PATTERN_SPECIALISTS` in `agent.types.ts`
   - Remove keyword pattern from `CONTEXT_SPECIALIST_PATTERNS` in `keyword.service.ts`

2. **Clean up tests**:
   - Remove or update tests in `keyword.service.spec.ts`
   - Run full test suite to ensure no broken references

3. **Handle the agent JSON file**:
   - Option A: Delete `{domain}-specialist.json` if no longer needed
   - Option B: Add `"deprecated": true` field if keeping for reference

4. **Document the deprecation**:
   - Add note in commit message explaining why specialist was removed
   - Update any documentation that references the specialist

5. **Support consumer migration** (if specialist has active users):
   - Announce deprecation in advance (recommend 1-2 sprint cycles)
   - Provide migration path to replacement specialist (if applicable)
   - Update prompts/workflows that explicitly reference the deprecated specialist

**Deprecation Timeline Recommendation:**
- **Announce**: Communicate deprecation intent at least 1 sprint before removal
- **Soft deprecation**: Mark as deprecated but keep functional (optional)
- **Hard deprecation**: Complete removal from all integration points

**Partial Deprecation (Mode-Specific Removal):**

To remove a specialist from specific modes only (e.g., keep in EVAL but remove from PLAN):

1. Update `defaultSpecialists` in the relevant mode config only
2. Update `custom-instructions.md` Mode-specific Specialists table
3. Keep `CONTEXT_SPECIALIST_PATTERNS` and `FILE_PATTERN_SPECIALISTS` intact
4. Document which modes still include the specialist
5. Run `yarn test` to verify partial changes don't break existing functionality

```typescript
// Example: Remove from PLAN but keep in EVAL
PLAN: {
  defaultSpecialists: [
    // '{domain}-specialist' removed from PLAN
  ],
},
EVAL: {
  defaultSpecialists: [
    '{domain}-specialist', // Still included in EVAL
  ],
},
```

**Deprecation Checklist:**
- [ ] Removed from `CONTEXT_SPECIALIST_PATTERNS` (if full deprecation)
- [ ] Removed from `FILE_PATTERN_SPECIALISTS` (if full deprecation)
- [ ] Removed from `defaultSpecialists` (all modes or specific modes)
- [ ] Removed from `custom-instructions.md`
- [ ] Tests cleaned up
- [ ] Agent JSON handled (deleted or marked deprecated)
- [ ] All tests pass

**See also:** [Specialist Integration Checklist (4-Point)](#specialist-integration-checklist-4-point) for the reverse process (adding specialists)

---

## Related Documentation

- **Core Rules**: `core.md`
- **Project Setup**: `project.md`
- **Augmented Coding**: `augmented-coding.md`

---

## Best Practices

1. **Keep agents focused**: One role per agent
2. **Reference project rules**: Use `context_files` - no duplication, reference only
3. **Define clear workflows**: Specify when to use TDD vs test-after
4. **Include checklists**: Help maintain quality standards
5. **Agent activation**: Code Reviewer must be activated automatically on EVAL MODE requests
6. **Evidence-based**: All recommendations must be validated through web search
