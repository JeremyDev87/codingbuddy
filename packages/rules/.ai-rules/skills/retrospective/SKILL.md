---
name: retrospective
description: "Analyze recent session context archives to identify coding patterns, agent usage, TDD cycle stats, and common EVAL issues. Generates a summary report with data-driven improvement suggestions."
---

# Session Retrospective

## Overview

Analyze accumulated PLAN/ACT/EVAL session data from context archives to surface coding habits, recurring patterns, and actionable improvement suggestions. Transforms passive session history into data-driven growth insights.

**Core principle:** Decisions improve when informed by patterns, not just memory. Review what actually happened, not what you think happened.

## When to Use

- After completing a sprint or milestone
- During periodic team/personal retrospectives
- When noticing repeated issues across sessions
- Before planning process improvements
- When onboarding to understand team patterns

## When NOT to Use

- Mid-session (wait until a natural checkpoint)
- With fewer than 3 archived sessions (insufficient data)
- For real-time debugging (use `systematic-debugging` instead)

## Prerequisites

- Context archive system enabled (#999)
- At least 3 archived sessions in `docs/codingbuddy/archive/`
- MCP tools available: `get_context_history`, `search_context_archives`

## Process

### Phase 1: Data Collection

Gather session archives and extract structured data.

1. **Retrieve recent archives**
   - Call `get_context_history` with appropriate limit (default: 20)
   - If no archives exist, inform user and suggest running a few PLAN/ACT/EVAL sessions first
   - Note the date range covered

2. **Read archive contents**
   - Read each archived context document
   - Extract from each session:
     - Mode transitions (PLAN, ACT, EVAL, AUTO)
     - Primary agent used
     - Task description and title
     - Decisions made
     - Notes recorded
     - Progress items (ACT mode)
     - Findings and recommendations (EVAL mode)
     - Status (completed, in_progress, blocked)

### Phase 2: Pattern Analysis

Analyze collected data across five dimensions.

#### 2a. Mode Usage Patterns

- Count sessions per mode (PLAN, ACT, EVAL, AUTO)
- Calculate EVAL adoption rate: `EVAL sessions / total sessions`
- Identify sessions that skipped EVAL (potential quality gaps)
- Flag AUTO mode usage frequency

#### 2b. Agent Utilization

- Rank agents by frequency of use
- Identify underutilized specialists (available but rarely used)
- Detect agent concentration (over-reliance on one agent)
- Note any specialist gaps for the project's tech stack

#### 2c. TDD Cycle Indicators

Search archives for TDD-related patterns:
- `search_context_archives` with keywords: "TDD", "test", "RED", "GREEN", "REFACTOR"
- Count sessions mentioning test-first vs test-after
- Identify sessions where tests were skipped or deferred
- Calculate approximate TDD adherence rate

#### 2d. Recurring Issues

Search for repeated problems:
- `search_context_archives` with keywords: "blocked", "failed", "error", "issue", "bug"
- Group similar issues by category (build, test, integration, deployment)
- Identify issues that appear in 2+ sessions (systemic problems)
- Note resolution patterns (same fix applied repeatedly?)

#### 2e. Decision Patterns

Analyze decisions across sessions:
- Extract all recorded decisions
- Identify decisions that were later reversed or modified
- Spot recurring decision themes (architecture, tooling, process)
- Flag decisions made without EVAL validation

### Phase 3: Report Generation

Generate a structured markdown report.

```markdown
# Session Retrospective Report

> Period: {start_date} - {end_date}
> Sessions analyzed: {count}
> Generated: {current_date}

## Summary Statistics

| Metric | Value |
|--------|-------|
| Total sessions | {n} |
| PLAN sessions | {n} |
| ACT sessions | {n} |
| EVAL sessions | {n} |
| AUTO sessions | {n} |
| EVAL adoption rate | {n}% |
| Completion rate | {n}% |

## Top Agents

| Rank | Agent | Sessions | % |
|------|-------|----------|---|
| 1 | {agent} | {n} | {n}% |
| ... | ... | ... | ... |

## TDD Health

- Adherence rate: {n}%
- Test-first sessions: {n}
- Test-after sessions: {n}
- No-test sessions: {n}

## Recurring Issues

### {Issue Category}
- **Frequency**: {n} sessions
- **Pattern**: {description}
- **Impact**: {assessment}

## Key Decisions Timeline

| Date | Decision | Mode | Validated? |
|------|----------|------|------------|
| {date} | {decision} | {mode} | {yes/no} |

## Improvement Suggestions

### High Priority
1. {suggestion with rationale}

### Medium Priority
1. {suggestion with rationale}

### Process Observations
1. {observation}
```

### Phase 4: Improvement Suggestions

Generate actionable suggestions based on findings.

**Auto-generate suggestions for:**

| Pattern Detected | Suggestion |
|-----------------|------------|
| EVAL rate < 30% | Increase EVAL usage for quality gates |
| Single agent > 60% | Diversify specialist agents for broader coverage |
| TDD adherence < 50% | Reinforce test-first discipline with TDD skill |
| Same issue 3+ times | Create a checklist or rule to prevent recurrence |
| Blocked sessions > 20% | Investigate common blockers and add preventive steps |
| No decisions recorded | Improve decision documentation in context |
| Decisions reversed > 2x | Add EVAL validation before major decisions |

### Phase 5: Output

1. **Display report** in conversation
2. **Save report** to `docs/codingbuddy/retrospective-{YYYY-MM-DD}.md`
3. **Offer next steps:**
   - "Create GitHub issues for high-priority improvements?"
   - "Update project rules based on findings?"
   - "Schedule recurring retrospectives?"

## Key Principles

- **Data over opinion** - Base all observations on archive evidence
- **Patterns over incidents** - Focus on recurring themes, not one-off events
- **Actionable suggestions** - Every finding should have a clear next step
- **No blame** - Focus on process improvement, not individual mistakes
- **Incremental** - Suggest 2-3 improvements per retrospective, not a complete overhaul
