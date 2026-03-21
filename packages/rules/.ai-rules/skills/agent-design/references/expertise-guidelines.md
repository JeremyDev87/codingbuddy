# Agent Expertise Definition Guidelines

How to define clear, differentiated expertise items for codingbuddy specialist agents.

## The Expertise Quality Spectrum

| Level | Example | Verdict |
|-------|---------|---------|
| Too broad | "Databases" | Rejected — could mean anything |
| Too vague | "Backend development" | Rejected — overlaps with many agents |
| Right level | "PostgreSQL Query Plan Optimization" | Accepted — specific, testable |
| Right level | "Zero-Downtime Schema Migrations" | Accepted — clear domain boundary |
| Too narrow | "PostgreSQL 15.2 BRIN index tuning" | Risky — might be too version-specific |

## Writing Expertise Items

### Formula

```
[Technique/Pattern] + [Domain/Technology] + [Qualifier (optional)]
```

**Examples:**
- "Expand-Contract Migration Pattern" (technique + domain)
- "React Server Component Performance Profiling" (technique + technology)
- "OWASP Top 10 Vulnerability Assessment" (standard + domain)
- "Zero-Downtime Blue-Green Deployments" (qualifier + technique)

### Rules

1. **3-7 items per agent** — fewer than 3 means the agent is too narrow; more than 7 means it's too broad
2. **Each item is independently meaningful** — someone reading just the expertise list should understand the agent's domain
3. **No overlapping items within the same agent** — if two items cover similar ground, merge them
4. **Use established terminology** — reference known patterns, standards, and methodologies

## Differentiation Matrix

Before adding an agent, compare expertise against existing agents:

```
New Agent Expertise          Existing Agent Expertise       Overlap?
─────────────────────────    ─────────────────────────      ────────
API Rate Limiting            API Gateway Patterns           PARTIAL → ok if boundaries clear
REST API Versioning          GraphQL Schema Evolution       NO → different domains
Error Response Standards     Error Handling Patterns         YES → merge or split
```

**Overlap thresholds:**
- 0-1 shared items: Safe to add
- 2 shared items: Review carefully, ensure boundaries are clear
- 3+ shared items: Merge agents or fundamentally redesign scope

## Expertise vs. Responsibilities

| | Expertise | Responsibilities |
|---|-----------|------------------|
| **What** | Knowledge domains the agent has | Actions the agent takes |
| **Format** | Noun phrases (domain areas) | Verb phrases (active duties) |
| **Count** | 3-7 items | 2-4 items |
| **Example** | "Container Orchestration Patterns" | "Design Kubernetes deployment manifests" |

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|-------------|---------|-----|
| "Best practices" | Meaningless without context | Name the specific practice |
| "General development" | Every agent does this | What SPECIFIC development? |
| "Code review" | Too broad — review for what? | "Security-focused code review" |
| "Testing" | Every engineer tests | "Property-based testing strategies" |
| "Architecture" | Name the architecture concern | "Event-driven architecture design" |
| Tool names alone ("Docker") | Knowing a tool isn't expertise | "Container image optimization" |

## Expertise Validation Checklist

For each expertise item, verify:

```
- [ ] Could I write a 30-minute talk about JUST this item?
- [ ] Is this clearly different from the other items in this agent?
- [ ] Would another agent's expertise NOT cover this?
- [ ] Can I name 3 concrete tasks that require this specific expertise?
- [ ] Is this stable enough to last 6+ months without rewording?
```

## Tier-Specific Guidance

### Primary Agents (type: "primary")

Used as the main agent in a workflow mode. Expertise should be broad enough to lead a mode but focused on a methodology:

```json
"expertise": [
  "Solution Architecture Design",
  "Technology Selection and Trade-off Analysis",
  "System Integration Planning",
  "Scalability and Performance Architecture"
]
```

### Specialist Agents (type: "specialist")

Called in parallel for domain reviews. Expertise should be deep and narrow:

```json
"expertise": [
  "OWASP Top 10 Vulnerability Assessment",
  "Authentication and Authorization Patterns",
  "Secrets Management and Rotation",
  "Security Header Configuration",
  "Dependency Vulnerability Scanning"
]
```
