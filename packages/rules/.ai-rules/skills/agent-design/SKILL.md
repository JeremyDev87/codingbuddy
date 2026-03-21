---
name: agent-design
description: Use when creating new specialist agent definitions for codingbuddy. Covers JSON schema design, expertise definition, system prompt authoring, and differentiation from existing agents.
---

# Agent Design

## Overview

Agents are specialist personas that AI assistants embody to provide focused, domain-specific guidance. A well-designed agent has a clear identity, distinct expertise, and precise activation triggers.

**Core principle:** Each agent does ONE thing exceptionally well. Overlap is a design flaw.

**Iron Law:**
```
DEFINE THE AGENT'S "NO" BEFORE DEFINING ITS "YES"
What this agent explicitly does NOT handle is as important as what it does.
```

## When to Use

- Adding a new specialist domain to codingbuddy
- Improving an existing agent's focus and expertise
- Designing agent activation trigger patterns
- Reviewing agent differentiation before adding to the registry

## Agent Schema Reference

Agents are defined in `packages/rules/.ai-rules/agents/<name>.json` (filename is kebab-case):

```json
{
  "name": "My Specialist",
  "description": "One-sentence description of what this agent specializes in",
  "role": {
    "title": "Specialist Role Title",
    "type": "specialist",
    "expertise": [
      "Domain Expertise Area 1",
      "Domain Expertise Area 2",
      "Domain Expertise Area 3"
    ],
    "responsibilities": [
      "Key responsibility 1",
      "Key responsibility 2"
    ]
  },
  "context_files": [
    ".ai-rules/rules/core.md",
    ".ai-rules/rules/project.md"
  ],
  "modes": {
    "planning": {
      "activation": { "trigger": "When planning..." }
    },
    "evaluation": {
      "activation": { "trigger": "When evaluating..." }
    }
  }
}
```

### Required Fields

| Field | Type | Rules |
|-------|------|-------|
| `name` | string | Display name, Title Case (e.g., "Migration Specialist") |
| `description` | string | 10+ chars, one sentence |
| `role` | object | Must include `title` at minimum |
| `role.title` | string | Official role title |
| `role.expertise` | string[] | 3-7 items, specific domains |
| `context_files` | string[] | Paths starting with `.ai-rules/` |

> **Note:** The JSON filename uses kebab-case (e.g., `migration-specialist.json`), while `name` is Title Case.

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `role.type` | string | `primary` (main agent in a mode) / `specialist` (domain reviews) |
| `role.responsibilities` | string[] | Key responsibilities |
| `modes.planning` | object | Planning mode activation config |
| `modes.implementation` | object | Implementation mode activation config |
| `modes.evaluation` | object | Evaluation mode activation config |
| `activation` | object | Activation triggers, workflow integration |
| `model` | object | Preferred AI model config (`preferred`, `reason`) |

## Design Process

### Phase 1: Define the Domain

Answer these questions before writing any JSON:

```
1. What SPECIFIC problem domain does this agent own?
   Example: "Database schema migrations with zero downtime"
   NOT: "Databases" (too broad)

2. What does this agent explicitly NOT handle?
   Example: "Does not handle query optimization (→ performance-specialist)"

3. What 3 things is this agent the BEST at?
   (These become expertise items)

4. Who calls this agent? (Which modes, which tasks)

5. Name 3 existing agents. Is there overlap? If yes, redesign.
```

### Phase 2: Differentiation Check

Before finalizing, compare against all existing agents:

```bash
# List all existing agents
ls packages/rules/.ai-rules/agents/*.json | \
  xargs -I{} jq -r '.name + ": " + .description' {}
```

**Overlap detection:**
- If two agents share > 2 expertise items → merge or split differently
- If trigger keywords match another agent → tighten the triggers
- If the description could apply to another agent → rewrite

### Phase 3: Write the System Prompt

The system prompt is the agent's constitution. It must:

```markdown
# [DisplayName]

You are a [Role] specialist agent focused on [narrow domain].

## Your Expertise

You excel at:
- [Specific skill 1]
- [Specific skill 2]
- [Specific skill 3]

## Your Approach

When activated, you:
1. [First thing you always do]
2. [Second thing you always do]
3. [How you structure your output]

## What You DO NOT Handle

Redirect to appropriate specialists for:
- [Out-of-scope concern 1] → [other-agent]
- [Out-of-scope concern 2] → [other-agent]

## Output Format

Always structure your responses as:
- [Output element 1]
- [Output element 2]
```

### Phase 4: Write the JSON

Save as `packages/rules/.ai-rules/agents/migration-specialist.json`:

```json
{
  "name": "Migration Specialist",
  "description": "Zero-downtime database schema migration planning and execution specialist",
  "role": {
    "title": "Database Migration Engineer",
    "type": "specialist",
    "expertise": [
      "Zero-Downtime Schema Changes",
      "Expand-Contract Migration Pattern",
      "Rollback Strategy Design",
      "Large Data Migration Batching",
      "Migration Validation Procedures"
    ],
    "responsibilities": [
      "Plan and verify zero-downtime schema migrations",
      "Design rollback strategies for all migration scenarios",
      "Validate data integrity pre and post migration"
    ]
  },
  "context_files": [
    ".ai-rules/rules/core.md",
    ".ai-rules/rules/project.md"
  ],
  "modes": {
    "planning": {
      "activation": {
        "trigger": "When planning database schema migrations",
        "auto_activate_conditions": ["Schema change planning", "Migration strategy design"]
      }
    },
    "evaluation": {
      "activation": {
        "trigger": "When evaluating migration safety and rollback readiness"
      }
    }
  }
}
```

### Phase 5: Validate

```bash
# Validate JSON syntax
cat packages/rules/.ai-rules/agents/my-agent.json | jq .

# Check filename uniqueness (filenames are kebab-case)
ls packages/rules/.ai-rules/agents/ | grep "my-agent"

# Validate against schema (required: name, description, role, context_files)
npx ajv validate \
  -s packages/rules/.ai-rules/schemas/agent.schema.json \
  -d packages/rules/.ai-rules/agents/my-agent.json
```

## Naming Conventions

| Pattern | Example | Use for |
|---------|---------|---------|
| `<domain>-specialist` | `security-specialist` | Narrow domain expert |
| `<role>-engineer` | `devops-engineer` | Engineering role |
| `<role>-developer` | `frontend-developer` | Developer persona |
| `<role>-architect` | `solution-architect` | Architecture role |
| `<domain>-mode` | `plan-mode` | Workflow mode agent |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Too broad ("backend developer") | Narrow to specific domain (e.g., "api-designer") |
| Expertise overlaps with existing agent | Merge or redefine scope |
| System prompt has no "you do NOT handle" | Every agent needs explicit boundaries |
| Expertise items are vague ("databases") | Make specific ("PostgreSQL Query Optimization") |
| No mode specified | Always define which PLAN/ACT/EVAL modes apply |
| Filename uses camelCase | Use kebab-case for filenames (e.g., `my-agent.json`) |

## Quick Reference

```
Agent Tier Definitions:
─────────────────────────────
primary     → Used as main agent in a mode (solution-architect, plan-mode)
specialist  → Called in parallel for domain reviews (security-specialist)

Mode Usage:
─────────────────────────────
PLAN   → Design, architecture, planning agents
ACT    → Implementation, development agents
EVAL   → Review, quality, security agents
ALL    → Cross-cutting agents (code-reviewer)
```

## Checklist Before Adding Agent

```
- [ ] Domain is specific, not broad
- [ ] No significant overlap with existing agents (< 2 shared expertise items)
- [ ] System prompt includes "what this agent does NOT handle"
- [ ] 3-7 expertise items, all specific
- [ ] JSON validates against agent.schema.json
- [ ] Filename follows kebab-case convention
- [ ] Modes reflect actual usage patterns
- [ ] README.md updated with new agent
- [ ] Added to relevant adapter configurations
```

## Additional resources

- [Agent JSON template](examples/agent-template.json) — Copy-and-adapt template with all required/optional fields and a design checklist
- [Expertise definition guidelines](references/expertise-guidelines.md) — How to write differentiated expertise items, avoid overlaps, and validate quality
