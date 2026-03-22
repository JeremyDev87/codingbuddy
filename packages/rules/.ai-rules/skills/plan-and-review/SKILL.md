---
name: plan-and-review
description: Use when creating implementation plans that need quality review before execution — 4-phase workflow combining plan creation with automated plan-reviewer validation
---

# Plan and Review

## Overview

Create implementation plans and validate them through automated review before execution. This skill combines the writing-plans methodology with plan-reviewer agent dispatch to catch quality issues (missing file paths, vague acceptance criteria, scope gaps, TDD omissions) before any code is written.

**Announce at start:** "I'm using the plan-and-review skill to create and validate the implementation plan."

**Core principle:** No plan reaches execution without passing review. Critical/High findings must be resolved first.

## The 4 Phases

```
Phase 1: Create Plan → Phase 2: Review → Phase 3: Revise (if needed) → Phase 4: Approved
```

### Phase 1: Create Plan

Use the writing-plans methodology to create the implementation plan.

1. **Invoke the writing-plans skill** (superpowers:writing-plans or equivalent)
2. Follow all writing-plans requirements:
   - Bite-sized tasks (2-5 minutes each)
   - Exact file paths for all changes
   - TDD structure (Red-Green-Refactor) for core logic
   - Complete code in plan (no placeholders)
   - Alternatives exploration for non-trivial decisions
3. Save plan to `docs/plans/YYYY-MM-DD-<feature-name>.md`

### Phase 2: Dispatch Plan Reviewer

Dispatch the plan-reviewer agent as a subAgent to review the plan.

1. **Dispatch plan-reviewer** using the Agent tool:
   ```
   subagent_type: "general-purpose"
   prompt: |
     You are the Plan Reviewer agent. Review the implementation plan at
     docs/plans/<plan-file>.md against the original spec/issue.

     Review checklist:
     - File paths: All paths valid (Modify files exist, Create paths have valid parents)
     - Acceptance criteria: Specific, measurable, verifiable (no vague terms)
     - Scope alignment: Plan matches spec — no scope creep, no missing items
     - TDD compliance: Red-Green-Refactor for core logic tasks
     - Backward compatibility: Breaking changes documented with migration steps

     Output a severity-rated findings table:
     | Finding | Location | Severity | Recommendation |

     End with Review Summary showing counts per severity and verdict:
     APPROVED (Critical=0 AND High=0) or REVISE REQUIRED.
   ```
2. Collect the review results

### Phase 3: Revise Plan (if Critical/High findings)

If the review verdict is **REVISE REQUIRED**:

1. Read each Critical and High finding
2. Revise the plan to address each finding:
   - Fix invalid file paths
   - Make acceptance criteria specific and testable
   - Add missing spec requirements as tasks
   - Add TDD structure where missing
   - Document breaking changes with migration steps
3. Save the revised plan (overwrite the same file)
4. **Re-dispatch plan-reviewer** (return to Phase 2)
5. Repeat until verdict is **APPROVED**

**Maximum iterations:** 3 revision cycles. If still not approved after 3 cycles, present remaining findings to user for manual resolution.

### Phase 4: Plan Approved

When the review verdict is **APPROVED**:

1. Announce: "Plan approved by plan-reviewer — ready for execution."
2. Present remaining Medium/Low findings as optional improvements
3. Offer execution choice:
   - **Subagent-Driven (this session):** Use superpowers:subagent-driven-development
   - **Parallel Session (separate):** Use superpowers:executing-plans

## When to Use This Skill

- Creating implementation plans for non-trivial features
- Plans that will be executed by other agents or in separate sessions
- When plan quality is critical (e.g., parallel execution with multiple workers)
- When the spec is complex and scope alignment matters

## When NOT to Use This Skill

- Single-file changes or trivial fixes
- Plans you will execute yourself immediately in the same session
- Exploratory prototyping where the plan will evolve rapidly

## Integration with Parallel Orchestrator

When used within parallel execution workflows:

- The conductor generates worker directives that include plan creation
- Each worker can use this skill to self-validate their plan before ACT mode
- The plan-reviewer findings feed into the conductor's quality gates

## Key Principles

- **No plan without review** — every plan gets at least one review pass
- **Severity drives action** — Critical/High must be fixed, Medium/Low are optional
- **Evidence-based findings** — every finding references a specific plan section
- **Bounded iteration** — maximum 3 revision cycles to prevent infinite loops
- **Clear verdict** — APPROVED or REVISE REQUIRED, no ambiguity
