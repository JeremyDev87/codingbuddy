# Agents Directory

AI Agent definitions for specialized development roles.

---

## Table of Contents

- [Quick Reference: Which Agent?](#quick-reference-which-agent)
- [Available Agents](#available-agents)
  - [Core Agents](#core-agents-auto-activated)
  - [Domain Specialists](#domain-specialists)
  - [Utility Agents](#utility-agents)
- [Agent Details](#agent-details)
- [Usage](#usage)
- [Workflow Modes](#workflow-modes)
- [Agent Structure](#agent-structure)
- [Adding New Agents](#adding-new-agents)
- [Best Practices](#best-practices)

---

## Quick Reference: Which Agent?

| 작업 유형 | 추천 에이전트 | 파일 |
|----------|-------------|------|
| **React/Next.js 개발** | Frontend Developer | `frontend-developer.json` |
| **백엔드 API 개발** | Backend Developer | `backend-developer.json` |
| **코드 리뷰 (EVAL)** | Code Reviewer | `code-reviewer.json` |
| **아키텍처 설계** | Architecture Specialist | `architecture-specialist.json` |
| **테스트 전략** | Test Strategy Specialist | `test-strategy-specialist.json` |
| **성능 최적화** | Performance Specialist | `performance-specialist.json` |
| **보안 검토** | Security Specialist | `security-specialist.json` |
| **접근성 검토** | Accessibility Specialist | `accessibility-specialist.json` |
| **SEO 최적화** | SEO Specialist | `seo-specialist.json` |
| **UI/UX 디자인** | UI/UX Designer | `ui-ux-designer.json` |
| **문서화** | Documentation Specialist | `documentation-specialist.json` |
| **코드 품질** | Code Quality Specialist | `code-quality-specialist.json` |
| **인프라/배포** | DevOps Engineer | `devops-engineer.json` |

### Agent Summary

| Agent | 한 줄 설명 |
|-------|-----------|
| Frontend Developer | React/Next.js TDD 기반 프론트엔드 개발 |
| Backend Developer | 멀티스택 지원 백엔드 API 개발 (Node, Python, Go, Java, Rust) |
| Code Reviewer | EVAL 모드 자동 활성화, 다차원 코드 품질 평가 |
| Architecture Specialist | 레이어 경계, 의존성 방향, Clean Architecture |
| Test Strategy Specialist | TDD 전략, 테스트 커버리지, 테스트 품질 |
| Performance Specialist | Core Web Vitals, 번들 최적화, 렌더링 성능 |
| Security Specialist | OWASP, 인증/인가, XSS/CSRF 방어 |
| Accessibility Specialist | WCAG 2.1 AA, 시맨틱 HTML, 스크린 리더 |
| SEO Specialist | 메타데이터, JSON-LD, Open Graph |
| UI/UX Designer | 비주얼 계층, UX 법칙, 인터랙션 패턴 |
| Documentation Specialist | 코드 주석, JSDoc, 문서 품질 평가 |
| Code Quality Specialist | SOLID, DRY, 복잡도 분석 |
| DevOps Engineer | Docker, 모니터링, 배포 최적화 |

---

## Available Agents

### Core Agents (Auto-activated)

These agents are automatically activated based on workflow mode:

- **Primary Developer Agent**: Auto-activated in PLAN/ACT mode
  - Example: `frontend-developer.json` (React/Next.js projects)
  - Customize per project: `backend-developer.json`, `mobile-developer.json`, etc.
- **Code Reviewer** (`code-reviewer.json`): Auto-activated in EVAL mode

### Domain Specialists

Unified specialist agents organized by domain:

- **Accessibility** (`accessibility-specialist.json`)
- **Architecture** (`architecture-specialist.json`)
- **UI/UX Design** (`ui-ux-designer.json`)
- **Documentation** (`documentation-specialist.json`)
- **Performance** (`performance-specialist.json`)
- **Security** (`security-specialist.json`)
- **SEO** (`seo-specialist.json`)
- **Test Strategy** (`test-strategy-specialist.json`)

### Utility Agents

- **Code Quality** (`code-quality-specialist.json`): Code quality assessment
- **DevOps Engineer** (`devops-engineer.json`): Infrastructure and monitoring

---

## Agent Details

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
├── frontend-developer.json          # Primary Developer Agent example (auto-activated)
├── backend-developer.json           # Primary Developer Agent for backend (auto-activated)
├── code-reviewer.json               # Core agent (auto-activated)
├── code-quality-specialist.json     # Utility agent
├── devops-engineer.json             # Utility agent
├── accessibility-specialist.json    # Domain specialist
├── architecture-specialist.json     # Domain specialist
├── ui-ux-designer.json              # Domain specialist
├── documentation-specialist.json    # Domain specialist
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
