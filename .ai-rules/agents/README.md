# Agents Directory

AI Agent definitions for specialized development roles.

## Available Agents

### Core Agents (Auto-activated)

These agents are automatically activated based on workflow mode:

- **Frontend Developer** (`frontend-developer.json`): Auto-activated in PLAN/ACT mode
- **Code Reviewer** (`code-reviewer.json`): Auto-activated in EVAL mode

### Domain Specialists

Unified specialist agents organized by domain:

- **Accessibility** (`accessibility-specialist.json`)
- **Architecture** (`architecture-specialist.json`)
- **Design System** (`design-system-specialist.json`)
- **Documentation** (`documentation-specialist.json`)
- **Performance** (`performance-specialist.json`)
- **Security** (`security-specialist.json`)
- **SEO** (`seo-specialist.json`)
- **Test Strategy** (`test-strategy-specialist.json`)

### Utility Agents

- **Code Quality** (`code-quality-specialist.json`): Code quality assessment
- **DevOps Engineer** (`devops-engineer.json`): Infrastructure and monitoring

---

### 🎨 Frontend Developer (`frontend-developer.json`) v1.3.0

**Expertise:**

- React + Next.js (See .cursor/rules/project.mdc 'Tech Stack' for versions)
- TypeScript strict mode
- TDD (Test-Driven Development)
- Augmented Coding practices
- Server Components & Server Actions
- Accessibility & SEO optimization
- Project design system (See .cursor/rules/project.mdc 'Tech Stack' and .cursor/rules/styles.mdc)

**Development Philosophy:**

- 🔍 **Modern Approach**: Actively researches latest React/Next.js patterns
- 🖥️ **Server-First**: Defaults to Server Components, uses Client Components only when needed
- ⚙️ **Server Actions**: Prefers Server Actions over API routes for mutations
- 🎨 **HTML/CSS First**: Solves with HTML/CSS before JavaScript
- 🎭 **Design System First**: Always prefers project design system components (See .cursor/rules/project.mdc 'Tech Stack' and .cursor/rules/styles.mdc)
- 🔧 **ClassName Composition**: Uses twJoin/twMerge, never string concatenation
- ♿ **Accessibility**: WCAG AA compliance with semantic HTML
- 🔍 **SEO**: Comprehensive metadata and structured data

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

### 🔧 DevOps Engineer (`devops-engineer.json`) v1.0.0

**Expertise:**

- Docker containerization & optimization
- Datadog monitoring & observability (APM, RUM, Logs)
- Next.js standalone deployment
- Build performance optimization
- Production debugging & troubleshooting

**Development Philosophy:**

- 🐋 **Optimization First**: Minimize Docker image size and build time
- 📊 **Observability First**: Comprehensive monitoring with Datadog APM/RUM
- 🔒 **Security Conscious**: No hardcoded secrets, official images only
- 🎯 **Reliability Focus**: Health checks, graceful shutdown, error recovery
- 🐛 **Debug Ready**: Source maps enabled, detailed error tracking

**Responsibilities:**

- Optimize Docker multi-stage builds
- Configure Datadog APM, RUM, logs, and metrics
- Manage Next.js production builds
- Optimize build performance and memory usage
- Debug production issues with source maps
- Monitor and improve application performance

**Infrastructure Focus:**

- **Docker**: Multi-stage builds (node:24.11.0-alpine), layer caching, minimal images
- **Datadog**: Full observability stack (APM, RUM, logs, metrics, tracing)
- **Next.js**: Standalone output, source maps, memory optimization
- **Performance**: Bundle size monitoring, Core Web Vitals tracking

---

### 🔍 Code Reviewer (`code-reviewer.json`)

**Expertise:**

- Multi-dimensional code quality evaluation
- Architecture and design pattern analysis
- Performance and security assessment
- Test strategy evaluation
- Risk identification and mitigation
- Latest best practices research and validation

**Evaluation Philosophy:**

- 🎯 **Multi-Dimensional**: Evaluate code from various perspectives (code quality, architecture, performance, security, accessibility)
- 🔍 **Evidence-Based**: Validate recommendations through web search for evidence-based approach
- 💬 **Honest**: Admit uncertainty, explicitly state parts that need verification
- 🔄 **Broad Perspective**: Consider conversation context but evaluate comprehensively from a wide perspective
- ⚖️ **Practical**: Balance idealism with real-world constraints

**Responsibilities:**

- Comprehensive code quality evaluation from multiple perspectives
- Identify risks across various dimensions with clear prioritization
- Present evidence-based recommendations through web search validation
- Provide actionable improvement plans with clear priorities
- Assess production readiness and deployment blockers

**Activation:**

- 🔴 **STRICT**: When user types `EVAL`, `EVALUATE`, `평가해`, or `개선안 제시해`, this Agent **MUST** be activated automatically
- EVAL Mode request automatically applies this Agent's evaluation framework

**Evaluation Framework:**

**Mandatory Evaluation Perspectives:**

- 🔴 Code Quality: SOLID principles, DRY, complexity (Reference: `augmented-coding.mdc`)
- 🔴 Architecture: Layer boundaries, dependency direction (Reference: `project.mdc`)
- 🔴 Type Safety: TypeScript usage, any type usage (Reference: `project.mdc`)
- 🔴 Test Coverage: 90%+ goal achievement (Reference: `augmented-coding.mdc`)
- 🔴 Performance: Bundle size, rendering optimization (Reference: `project.mdc`)
- 🔴 Security: XSS/CSRF, authentication/authorization (Reference: `project.mdc`)
- 🔴 Accessibility: WCAG 2.1 AA compliance (Reference: `project.mdc`)
- 🔴 SEO: Metadata, structured data (Reference: `project.mdc`)
- 🔴 Design System: Project design system usage (Reference: `project.mdc` 'Tech Stack' and `styles.mdc`)

**Risk Assessment:**

- 🔴 **Critical**: Immediate production issues, security vulnerabilities, potential data loss
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

### In Cursor/Claude

Reference the agent in your prompts:

```
@.cursor/agents/frontend-developer.json

Create a new newsletter subscription feature
```

### In Chat

```
Using the Frontend Developer agent,
implement user authentication flow with Server Actions
```

### Example Output

The agent will generate code following these principles:

**Server Component (Default) with Design System:**

```tsx
// app/newsletter/page.tsx
import { Button, Input, Typography } from '@wishket/design-system';
import { twJoin } from 'tailwind-merge';
import { subscribeNewsletter } from './actions';

export default function NewsletterPage() {
  return (
    <main
      className={twJoin(
        'flex min-h-screen flex-col items-center',
        'p-4 mobile:p-6 tablet:p-8 desktop:p-12',
      )}
    >
      <Typography variant="heading2" className="mb-6 text-w-gray-900">
        Subscribe to Newsletter
      </Typography>

      <form action={subscribeNewsletter} className="w-full max-w-md">
        <Input
          type="email"
          name="email"
          placeholder="Enter your email"
          required
          className="mb-4"
        />
        <Button type="submit" variant="primary" size="large" fullWidth>
          Subscribe
        </Button>
      </form>
    </main>
  );
}
```

**Server Action:**

```tsx
// app/newsletter/actions.ts
'use server';

export async function subscribeNewsletter(formData: FormData) {
  const email = formData.get('email') as string;

  // Server-side validation
  if (!email || !isValidEmail(email)) {
    return { error: 'Invalid email' };
  }

  // Database operation
  await db.newsletter.create({ email });

  return { success: true };
}
```

**Custom Component (with twMerge):**

```tsx
// shared/Components/Card.tsx
import { Typography } from '@wishket/design-system';
import { twMerge } from 'tailwind-merge';

interface CardProps {
  title: string;
  className?: string;
  children: React.ReactNode;
}

export function Card({ title, className, children }: CardProps) {
  return (
    <div className={twMerge('rounded-lg bg-white p-6 shadow-md', className)}>
      <Typography variant="subTitle1" className="mb-4 text-w-gray-900">
        {title}
      </Typography>
      {children}
    </div>
  );
}
```

**Key Features:**

- ✅ Uses project design system components (Button, Input, Typography) - See .cursor/rules/project.mdc 'Tech Stack' and .cursor/rules/styles.mdc
- ✅ Uses twJoin for static classes, twMerge for prop className
- ✅ Uses design tokens (text-w-gray-900, not arbitrary colors)
- ✅ Server Component by default
- ✅ Server Action for form handling
- ✅ Responsive with custom breakpoints (mobile:, tablet:, desktop:)
- ✅ Semantic structure and accessibility built-in

---

## Real Project Examples

### Frontend Developer: Newsletter Subscription

**Example project structure (core logic with TDD):**

```
entities/{domain}/
├── {feature}.api.ts           # API call function
├── {feature}.api.unit.spec.ts # API tests
├── {feature}.model.ts         # React Query hook
├── {feature}.model.unit.spec.tsx # Model tests
├── {feature}.types.ts         # Type definitions
├── {feature}.constants.ts     # Error messages
└── index.ts                             # Public exports
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

### DevOps Engineer: Docker Optimization

**Current Dockerfile structure:**

**Builder Stage:**

```dockerfile
FROM node:24.11.0-alpine AS builder
WORKDIR /app

# Yarn 4.2.2 installation
RUN corepack enable && corepack prepare yarn@4.2.2 --activate

# Cache optimization: Copy package files first
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn

RUN yarn install --frozen-lockfile

# Memory optimization for build
ENV NODE_OPTIONS="--max-old-space-size=4096 ..."

# Source code and build
COPY . .
RUN yarn build
```

**Runner Stage:**

```dockerfile
FROM node:24.11.0-alpine AS runner
WORKDIR /app

# Copy only necessary files from builder
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static

# Datadog configuration
ENV DD_SERVICE='yozm'
ENV DD_APM_ENABLED='true'
ENV DD_RUNTIME_METRICS_ENABLED='true'
# ... more Datadog configs

EXPOSE 3000
CMD ["node", "server.js"]
```

**Optimization achieved:**

- 📦 **Image size**: 1.2GB → **~150MB** (87% reduction)
- ⚡ **Build time**: With cache hit ~1min (vs ~5min cold)
- 🚀 **Startup time**: 15s → **3s**
- 💾 **Memory**: 4GB heap prevents OOM errors

---

## Multi-Agent Workflows

### Scenario 1: New Feature Development

**Step 1: Frontend Developer** - Implement feature

```
@.cursor/agents/frontend-developer.json

Create a new image upload feature with:
- TDD for upload logic
- Server Action for handling upload
- Project design system components (See .cursor/rules/project.mdc 'Tech Stack')
- Accessibility and progress indication
```

**Step 2: DevOps Engineer** - Monitor and optimize

```
@.cursor/agents/devops-engineer.json

Setup Datadog monitoring for image upload feature:
- Track upload success/failure rates
- Monitor upload duration and file sizes
- Alert on memory spikes during processing
```

---

### Scenario 2: Performance Issue Investigation

**Step 1: DevOps Engineer** - Identify issue

```
@.cursor/agents/devops-engineer.json

Datadog shows page load time increased to 5s (was 2s).
Analyze APM traces and RUM data to find the bottleneck.
```

**Agent analyzes:**

- Datadog APM traces
- Core Web Vitals (LCP spike)
- Server response times
- Bundle size changes

**Step 2: Frontend Developer** - Fix implementation

```
@.cursor/agents/frontend-developer.json

Based on analysis (large bundle, heavy components),
optimize the article list page:
- Code splitting with dynamic imports
- React.memo for expensive components
- Lazy loading for images
```

---

### Scenario 3: Production Debugging

**Step 1: DevOps Engineer** - Investigate error

```
@.cursor/agents/devops-engineer.json

Production error in Datadog: "Cannot read property of undefined"
But stack trace is minified. Help debug with source maps.
```

**Agent provides:**

- Source map decoding
- Original file and line number
- Full error context from Datadog

**Step 2: Frontend Developer** - Fix bug

```
@.cursor/agents/frontend-developer.json

Fix the error at src/features/Article/ArticleDetail.tsx:42
Add null checks and proper error handling with TDD.
```

---

### Scenario 4: Memory Leak Investigation

**Step 1: DevOps Engineer** - Detect and analyze

```
@.cursor/agents/devops-engineer.json

Container memory usage keeps increasing (2GB → 3.5GB over 24h).
Analyze Datadog metrics and identify leak source.
```

**Step 2: Frontend Developer** - Fix leak

```
@.cursor/agents/frontend-developer.json

Memory leak identified in useEffect without cleanup.
Fix subscription cleanup and add tests to prevent regression.
```

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
    (🔴 Code Reviewer Agent automatically activated)

    ## 📋 Implementation Analysis
    - Implemented: Feature X with Y approach
    - Files modified: [list]

    ## ✅ Strengths
    - Type-safe implementation ✅
    - Test coverage: 85% (goal: 90%+)
    - Server Action used appropriately ✅

    ## ⚠️ Improvement Opportunities

    **Critical:**
    1. **Test Coverage**: 85% → 90%+ required
       - Missing edge cases: [specific cases]
       - Impact: Potential bugs in production
       - Evidence: See augmented-coding.mdc Testing Standards

    **High:**
    2. **Error Boundary**: Missing error boundary wrapper
       - Impact: Unhandled errors can crash the app
       - Solution: Add ErrorBoundary component
       - Evidence: React 19 error handling best practices

    **Medium:**
    3. **Performance**: React.memo not used for expensive component
       - Impact: Unnecessary re-renders
       - Solution: Wrap [ComponentName] with React.memo
       - Evidence: React performance optimization docs

    ## 🎯 Improved PLAN
    1. Add tests for missing edge cases (Critical)
       - Network error scenarios
       - Invalid input handling
       - Boundary value testing

    2. Add ErrorBoundary wrapper (High)
       - Implement error boundary component
       - Add fallback UI
       - Log errors to monitoring

    3. Optimize re-renders (Medium)
       - Apply React.memo to [ComponentName]
       - Review useMemo/useCallback usage

User: ACT
AI: # Mode: ACT
    [Implement improvements]

User: EVAL
AI: # Mode: EVAL
    (Code Reviewer Agent evaluates again)

    ✅ Test coverage: 93% (exceeds 90% goal)
    ✅ ErrorBoundary implemented
    ✅ Performance optimizations applied

    ✅ **Ready for production!**
```

---

### Real Example: Newsletter Form with EVAL

**Initial Implementation:**

```
User: 뉴스레터 구독 폼 만들어줘

AI: # Mode: PLAN
    [TDD 기반 구현 계획 제시]

User: ACT

AI: # Mode: ACT
    ✅ Form component created with Server Action
    ✅ Basic validation implemented
    ✅ Tests passing (coverage: 75%)
    # Mode: PLAN (automatic return)

(At this point, work is complete. User can stop here or request EVAL for improvements)
```

**First Evaluation (User explicitly requests - Code Reviewer Agent activated):**

```
User: EVAL  (Explicit request for evaluation)

AI: # Mode: EVAL
    (🔴 Code Reviewer Agent automatically activated)

    ## 📋 Implementation Analysis
    Created newsletter subscription form:
    - Server Component + Server Action ✅
    - Project design system components ✅ (See .cursor/rules/project.mdc 'Tech Stack' and .cursor/rules/styles.mdc)
    - Basic validation ✅
    - Unit tests (coverage: 75%) ⚠️
    - Files: {feature}.model.ts, {Feature}Form.tsx

    ## ✅ Strengths
    - TDD workflow followed correctly (Reference: augmented-coding.mdc)
    - Type-safe implementation with TypeScript (no `any` usage) ✅
    - Server Action used appropriately (Reference: project.mdc)
    - Design system components utilized (Reference: styles.mdc)

    ## ⚠️ Improvement Opportunities

    **🔴 Critical:**
    1. **Test Coverage**: 75% → 90%+ required
       - Missing: Invalid email edge cases, network timeout scenarios
       - Impact: Potential production bugs
       - Evidence: augmented-coding.mdc Testing Standards (90%+ goal)

    **High:**
    2. **Accessibility**: WCAG 2.1 AA compliance gaps
       - Missing ARIA labels for form inputs
       - Impact: Screen readers can't properly use the form
       - Solution: Add aria-label, aria-describedby
       - Evidence: WCAG 2.1 Form Labels (Reference: project.mdc Accessibility)

    3. **UX Feedback**: Missing loading and success states
       - No loading indicator during submission
       - No success confirmation after subscription
       - Impact: Poor user experience, confusion
       - Solution: useFormStatus hook + Toast notification
       - Evidence: React 19 useFormStatus best practices

    **Medium:**
    4. **Error Handling**: Generic error messages
       - Current: "An error occurred"
       - Impact: Users can't understand what went wrong
       - Solution: Specific error messages per error type
       - Evidence: UX best practices for form validation

    ## 🎯 Improved PLAN

    1. **Test Coverage (Critical - Must be resolved)**
       - Add tests for invalid email formats
       - Add tests for network errors and timeouts
       - Add tests for already subscribed scenario
       - Target: 90%+ coverage

    2. **Accessibility (High)**
       - Add ARIA labels: aria-label="Email input"
       - Add helper text with aria-describedby
       - Implement proper focus management
       - Reference: styles.mdc, project.mdc 'Code Review Checklist > UX & Accessibility' section

    3. **UX Feedback (High)**
       - Add loading spinner with useFormStatus
       - Implement success Toast notification
       - Reference: Project design system Toast component (See .cursor/rules/project.mdc 'Tech Stack' and .cursor/rules/styles.mdc)

    4. **Error Handling (Medium)**
       - Map error codes to user-friendly messages
       - Display inline error messages
       - Reference: project.mdc Error Handling guidelines

    **Impact**: Production-ready with 90%+ coverage, WCAG AA compliance, and complete UX feedback loop

    Type `ACT` to apply improvements.

User: ACT

AI: # Mode: ACT
    ✅ Test coverage increased to 93%
    ✅ ARIA labels added
    ✅ Loading states with useFormStatus
    ✅ Success Toast notification
    ✅ Improved error messages
    # Mode: PLAN
```

**Second Evaluation:**

```
User: EVAL

AI: # Mode: EVAL

    ## 📋 Implementation Analysis
    Applied all improvements from previous evaluation

    ## ✅ Strengths
    - Test coverage: 93% ✅ (exceeds 90% goal)
    - Accessibility: WCAG AA compliant ✅
    - UX: Complete feedback loop ✅
    - Error handling: User-friendly messages ✅
    - Type safety: No `any` usage ✅
    - Design system: Proper component usage ✅

    ## ⚠️ Improvement Opportunities
    None identified - Implementation meets all quality standards

    ✅ **Ready for production!**

    No further iterations needed.
```

**Iteration Summary:**

```
v1 (First ACT): Basic working form
         ↓ EVAL (user requested)
v2 (Second ACT): Quality improved (tests, a11y, UX)
         ↓ EVAL (user requested)
v3: Production ready ✅
```

---

### When to Use EVAL Mode

**✅ Request EVAL for:**

- Complex features with multiple approaches
- Production-critical implementations
- First-time patterns you're learning
- When quality is more important than speed
- Large refactoring that needs review
- Features with security or accessibility concerns

**⏭️ Skip EVAL for:**

- Simple bug fixes
- Straightforward implementations
- Already meeting all quality standards
- Time-sensitive quick changes
- Minor documentation updates
- Configuration changes

**Pro Tip:**
Start with PLAN → ACT for quick iteration. Request EVAL when you need production-level quality assurance and want to learn what could be improved.

---

## Agent Structure

### Flat Structure (평면 구조)

All agent files are located directly in `.cursor/agents/` directory without subdirectories. This simplifies file access and maintains consistency.

**Rationale:**

- Each domain has only one unified specialist file
- File names already include domain information (e.g., `architecture-specialist.json`)
- Simpler path structure: `.cursor/agents/{domain}-specialist.json`
- Consistent with core agents (frontend-developer.json, code-reviewer.json)

**File Organization:**

```
.cursor/agents/
├── frontend-developer.json          # Core agent (auto-activated)
├── code-reviewer.json                # Core agent (auto-activated)
├── code-quality-specialist.json      # Utility agent
├── devops-engineer.json              # Utility agent
├── accessibility-specialist.json     # Domain specialist
├── architecture-specialist.json     # Domain specialist
├── design-system-specialist.json     # Domain specialist
├── documentation-specialist.json    # Domain specialist
├── performance-specialist.json      # Domain specialist
├── security-specialist.json          # Domain specialist
├── seo-specialist.json               # Domain specialist
└── test-strategy-specialist.json     # Domain specialist
```

**Future Expansion:**

- If a domain needs multiple files (e.g., multiple test strategy agents), consider creating a subdirectory for that domain
- Current structure supports one file per domain efficiently
- When adding new agents, follow the naming pattern: `{domain}-specialist.json` or `{purpose}-{type}.json`

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

- Reference: `.cursor/agents/{domain}-specialist.json modes.{planning|implementation|evaluation}`
- Example: `.cursor/agents/architecture-specialist.json modes.planning`

### Agent File Structure

Each agent JSON contains:

- **name**: Agent identifier
- **role**: Title and expertise areas
- **context_files**: Cursor rules to reference
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

- **Core Agents**: `{purpose}-{type}.json` (e.g., `frontend-developer.json`, `code-reviewer.json`)
- **Domain Specialists**: `{domain}-specialist.json` (e.g., `architecture-specialist.json`, `security-specialist.json`)
- **Utility Agents**: `{purpose}-{type}.json` (e.g., `code-quality-specialist.json`, `devops-engineer.json`)

**Naming Rules:**

- Use kebab-case (lowercase with hyphens)
- Domain names with hyphens are preserved (e.g., `test-strategy-specialist.json`)
- Be descriptive and consistent with existing patterns

### File Location

**Current Structure:** All agent files are in `.cursor/agents/` (flat structure)

**When to Create Subdirectories:**

- Only if a domain needs **3+ related files**
- Example: If `test-strategy/` needs `test-strategy-specialist.json`, `test-strategy-helper.json`, and `test-strategy-validator.json`
- In most cases, keep files in the root directory

### Agent File Structure

Create a new JSON file following this structure:

```json
{
  "name": "Agent Name",
  "version": "1.0.0",
  "description": "Brief description",
  "role": {
    "title": "Role Title",
    "expertise": [],
    "responsibilities": []
  },
  "context_files": [".cursor/rules/core.mdc"],
  "workflow": {},
  "reference": {}
}
```

---

## Related Documentation

- **Core Rules**: `.cursor/rules/core.mdc`
- **Project Setup**: `.cursor/rules/project.mdc`
- **Augmented Coding**: `.cursor/rules/augmented-coding.mdc`
- **Design System**: `.cursor/rules/styles.mdc`

---

## Best Practices

1. **Keep agents focused**: One role per agent
2. **Reference project rules**: Use `context_files` - no duplication, reference only
3. **Define clear workflows**: Specify when to use TDD vs test-after
4. **Include checklists**: Help maintain quality standards
5. **Agent activation**: Code Reviewer must be activated automatically on EVAL MODE requests
6. **Evidence-based**: All recommendations must be validated through web search

---

**Last Updated**: 2025-01-10
