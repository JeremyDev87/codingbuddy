# CodingBuddy Skills

Reusable workflows for consistent development practices.

## Available Skills

### Core Development

| Skill | Description | When to Use |
|-------|-------------|-------------|
| api-design | REST/GraphQL API design with OpenAPI spec, versioning, and documentation | Designing new APIs |
| brainstorming | Explores user intent, requirements and design before implementation | Before any creative work |
| database-migration | Zero-downtime schema changes, large-scale data migrations, rollback planning | Schema changes, data migrations, production database modifications |
| dependency-management | Systematic dependency updates, CVE response, and license compliance | Security vulnerabilities, major upgrades, license audits |
| frontend-design | Create distinctive, production-grade frontend interfaces | Building web components/pages |
| refactoring | Structured, test-driven refactoring workflow with Tidy First principles | Improving code structure without changing behavior |
| test-driven-development | Write tests first, then minimal code to pass | Before implementing features |
| widget-slot-architecture | Next.js App Router Parallel Routes based Widget-Slot architecture | Large-scale Next.js project page structure design |

### Quality & Security

| Skill | Description | When to Use |
|-------|-------------|-------------|
| code-explanation | Structured analysis from bird's eye to line-by-line for onboarding and reviews | Explaining unfamiliar code, onboarding, code reviews |
| performance-optimization | Profiling-first performance optimization workflow | Performance issues, bottleneck analysis, optimization |
| security-audit | OWASP Top 10 based security review, secrets scanning, auth/authz checks | Before shipping features, security assessments |
| tech-debt | Debt identification, ROI-based prioritization, and incremental paydown planning | Sprint planning, pre-feature assessment, quarterly reviews |

### Workflow & Process

| Skill | Description | When to Use |
|-------|-------------|-------------|
| agent-discussion | Terminal formatter for multi-agent debate output with severity badges and consensus indicators | Rendering parallel agent findings, code review debates, EVAL summaries |
| context-management | Preserve critical decisions across sessions and context compaction | Long tasks, multi-session work, PLAN→ACT→EVAL transitions |
| deployment-checklist | Pre-deploy validation, health checks, rollback planning | Before every staging/production deployment |
| dispatching-parallel-agents | Handle 2+ independent tasks without shared state | Parallel task execution |
| error-analysis | Classify and trace errors from stack traces to root cause | Encountering error messages, unexpected behavior |
| executing-plans | Execute implementation plans with review checkpoints | Following written plans |
| incident-response | Systematic organizational response to production incidents | Production incidents, alerts, service degradation |
| legacy-modernization | Strangler fig pattern for incremental migration of legacy code | Modernizing old patterns, major version upgrades |
| subagent-driven-development | Execute plans with independent tasks in current session | In-session plan execution |
| systematic-debugging | Systematic approach before proposing fixes | Encountering bugs or failures |
| cross-repo-issues | Detect, confirm, and create issues in upstream/related repositories with safety checks | Bug belongs upstream, dependency issue, fork-to-upstream reporting |
| writing-plans | Create implementation plans before coding | Multi-step tasks with specs |

### Documentation & Communication

| Skill | Description | When to Use |
|-------|-------------|-------------|
| documentation-generation | Generate README, API docs, CHANGELOG, and ADRs from code | Creating or updating project documentation |
| pr-all-in-one | Unified commit and PR workflow with smart issue linking | `/pr-all-in-one [target] [issue]` |
| pr-review | Systematic, evidence-based PR review with anti-sycophancy principles | Conducting manual PR reviews |
| prompt-engineering | Write and optimize prompts for AI tools and agent system prompts | AI tool instructions, MCP tool descriptions, agent prompts |

### DevOps & Infrastructure

| Skill | Description | When to Use |
|-------|-------------|-------------|
| tmux-master | Background knowledge for tmux session/window/pane lifecycle, layout, communication, styling, and troubleshooting | Parallel agent execution, taskMaestro workflows, tmux automation |

### codingbuddy Specific

| Skill | Description | When to Use |
|-------|-------------|-------------|
| agent-design | Design new specialist agent JSON definitions with schema, expertise, and system prompts | Adding new agents to codingbuddy |
| mcp-builder | NestJS-based MCP server development with Tools/Resources/Prompts design | Building or extending MCP servers |
| rule-authoring | Write unambiguous AI coding rules compatible across multiple AI tools | Creating rules for .ai-rules/ directories |
| skill-creator | Create, eval, improve, and benchmark skills with measurable behavior-change tests | Creating new skills, testing skill effectiveness, optimizing underperforming skills |

## Skill Format

Skills use YAML frontmatter + Markdown:

```markdown
---
name: skill-name
description: "Brief description (max 500 chars)"
---

# Skill Title

## When to Use
...

## Process/Checklist
...
```

### Frontmatter Requirements

- `name`: lowercase alphanumeric with hyphens only (`^[a-z0-9-]+$`)
- `description`: 1-500 characters

## Usage by Platform

### Claude Code (MCP)

```
list_skills                        # List all available skills
get_skill("test-driven-development")  # Get specific skill content
```

### Codex / GitHub Copilot

```bash
cat .ai-rules/skills/<skill-name>/SKILL.md
```

### Cursor

```
@.ai-rules/skills/test-driven-development/SKILL.md
```

## Creating Custom Skills

1. Create directory: `skills/<name>/`
2. Create `SKILL.md` with YAML frontmatter
3. Follow the format specification above

### Example

```bash
mkdir -p .ai-rules/skills/my-skill
cat > .ai-rules/skills/my-skill/SKILL.md << 'EOF'
---
name: my-skill
description: My custom skill for specific workflow
---

# My Skill

## When to Use
- Specific scenario 1
- Specific scenario 2

## Checklist
- [ ] Step 1
- [ ] Step 2
EOF
```

## Directory Structure

```
.ai-rules/skills/
├── README.md                       # This file
│
├── [Core Development]
├── api-design/
│   └── SKILL.md
├── brainstorming/
│   └── SKILL.md
├── database-migration/
│   ├── SKILL.md
│   ├── expand-contract-patterns.md
│   ├── large-scale-migration.md
│   ├── rollback-strategies.md
│   └── validation-procedures.md
├── dependency-management/
│   ├── SKILL.md
│   ├── security-vulnerability-response.md
│   ├── major-upgrade-guide.md
│   ├── lock-file-management.md
│   └── license-compliance.md
├── frontend-design/
│   └── SKILL.md
├── refactoring/
│   ├── SKILL.md
│   └── refactoring-catalog.md
├── test-driven-development/
│   └── SKILL.md
├── widget-slot-architecture/
│   └── SKILL.md
│
├── [Quality & Security]
├── code-explanation/
│   └── SKILL.md
├── performance-optimization/
│   ├── SKILL.md
│   └── documentation-template.md
├── security-audit/
│   └── SKILL.md
├── tech-debt/
│   └── SKILL.md
│
├── [Workflow & Process]
├── agent-discussion/
│   └── SKILL.md
├── cross-repo-issues/
│   └── SKILL.md
├── context-management/
│   └── SKILL.md
├── deployment-checklist/
│   └── SKILL.md
├── dispatching-parallel-agents/
│   └── SKILL.md
├── error-analysis/
│   └── SKILL.md
├── executing-plans/
│   └── SKILL.md
├── incident-response/
│   ├── SKILL.md
│   ├── communication-templates.md
│   ├── escalation-matrix.md
│   ├── postmortem-template.md
│   └── severity-classification.md
├── legacy-modernization/
│   └── SKILL.md
├── subagent-driven-development/
│   └── SKILL.md
├── systematic-debugging/
│   └── SKILL.md
├── writing-plans/
│   └── SKILL.md
│
├── [Documentation & Communication]
├── documentation-generation/
│   └── SKILL.md
├── pr-all-in-one/
│   ├── SKILL.md
│   ├── configuration-guide.md
│   ├── issue-patterns.md
│   └── pr-templates.md
├── pr-review/
│   └── SKILL.md
├── prompt-engineering/
│   └── SKILL.md
│
├── [DevOps & Infrastructure]
├── tmux-master/
│   └── SKILL.md
│
└── [codingbuddy Specific]
    ├── agent-design/
    │   └── SKILL.md
    ├── mcp-builder/
    │   └── SKILL.md
    ├── rule-authoring/
    │   └── SKILL.md
    └── skill-creator/
        └── SKILL.md
```
