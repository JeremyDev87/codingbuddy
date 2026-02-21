---
name: tech-debt
description: Use when identifying, prioritizing, and planning resolution of technical debt. Provides structured assessment, ROI-based prioritization, and incremental paydown strategies.
---

# Tech Debt

## Overview

Technical debt is borrowed time — the gap between the code you have and the code you need. Left unmanaged, it compounds interest: every new feature costs more, every bug takes longer to fix.

**Core principle:** Not all debt is equal. Pay down debt that blocks you, not debt that merely annoys you.

**Iron Law:**
```
MEASURE DEBT BEFORE PAYING IT. PRIORITIZE BY IMPACT, NOT BY DISCOMFORT.
```

## When to Use

- Sprint planning (decide which debt to pay down)
- Before major feature work (assess what debt will slow you down)
- After incidents (identify debt that contributed)
- Quarterly tech health reviews
- Before refactoring (use the refactoring skill after this one)

## Types of Technical Debt

| Type | Example | Urgency |
|------|---------|---------|
| **Critical** | Security vulnerability, data loss risk | Fix now |
| **Architectural** | God class, circular dependencies | Fix before next major feature |
| **Code quality** | Duplicated logic, magic numbers | Fix this quarter |
| **Test debt** | Missing tests, brittle tests | Fix this sprint |
| **Documentation debt** | Outdated docs, missing docs | Fix when touching code |
| **Dependency debt** | Outdated packages, EOL dependencies | Fix on cadence |
| **Performance debt** | N+1 queries, memory leaks | Fix when it hurts |

## The Assessment Process

### Phase 1: Discover

**Automated discovery:**
```bash
# Code complexity
npx ts-complexity src/ --threshold 10

# Duplicate code
npx jscpd src/ --min-lines 5 --reporters console

# Test coverage gaps
npx jest --coverage

# Dependency age and CVEs
npm outdated
npm audit

# TODO/FIXME/HACK markers
grep -rn "TODO\|FIXME\|HACK\|XXX\|TEMP\|WORKAROUND" \
  --include="*.ts" --include="*.js" src/ | wc -l
```

**Manual discovery checklist:**
```
Architecture smells:
- [ ] Classes > 300 lines (God class)
- [ ] Functions > 30 lines (God function)
- [ ] Files with > 10 imports (high coupling)
- [ ] Circular dependencies
- [ ] Global mutable state

Code quality smells:
- [ ] Duplicate code blocks (> 5 lines, 2+ occurrences)
- [ ] Magic numbers/strings without constants
- [ ] Deep nesting (> 3 levels)
- [ ] Long parameter lists (> 4 params)
- [ ] Boolean traps (function(true, false, false))

Test smells:
- [ ] Test coverage < 80%
- [ ] Tests that always pass (no assertions)
- [ ] Tests that mock everything
- [ ] No integration tests
- [ ] Flaky tests
```

### Phase 2: Catalog

Create a tech debt register:

```markdown
## Tech Debt Register — [Date]

| ID | Type | Description | File | Discovered | Owner |
|----|------|-------------|------|------------|-------|
| TD-001 | Architecture | McpService is a God class (450 lines) | mcp.service.ts | 2024-01-15 | — |
| TD-002 | Test | RulesService has 45% coverage | rules.service.ts | 2024-01-15 | — |
| TD-003 | Dependency | NestJS 9 → 10 migration pending | package.json | 2024-01-15 | — |
| TD-004 | Code quality | searchRules logic duplicated 3 times | *.service.ts | 2024-01-15 | — |
```

### Phase 3: Prioritize

**Priority formula:**
```
Priority Score = (Velocity Impact × Bug Risk) / Effort

Scale: 1-5 for each factor
- Velocity Impact: How much does this slow down development?
- Bug Risk: How likely is this to cause bugs?
- Effort: How hard is this to fix?
```

**Prioritization matrix:**
```markdown
| ID | Description | Velocity | Bug Risk | Effort | Score |
|----|-------------|----------|----------|--------|-------|
| TD-001 | God class McpService | 4 | 3 | 4 | (4×3)/4 = 3.0 |
| TD-002 | Low test coverage | 3 | 5 | 2 | (3×5)/2 = 7.5 ← Fix first |
| TD-003 | NestJS upgrade | 2 | 3 | 3 | (2×3)/3 = 2.0 |
| TD-004 | Duplicate logic | 3 | 3 | 1 | (3×3)/1 = 9.0 ← Fix first |
```

**Priority tiers:**
- **Score ≥ 7**: Fix this sprint (blocks progress)
- **Score 4-7**: Fix this quarter (accumulating interest)
- **Score < 4**: Backlog (low ROI)

### Phase 4: Plan Resolution

For each high-priority item, create a paydown plan:

```markdown
## Paydown Plan: TD-004 (Duplicate searchRules logic)

**Goal:** Extract shared search logic into reusable utility

**Approach:** Refactoring skill (not a rewrite)

**Steps:**
1. Write tests covering all three duplicate sites (2h)
2. Extract to `src/shared/search.utils.ts` (1h)
3. Replace all three call sites (1h)
4. Verify tests pass (30m)

**Risk:** Low — covered by tests before and after
**Estimate:** 4.5h
**Assigned to:** —

**Definition of Done:**
- [ ] Tests cover all search scenarios
- [ ] Single implementation in search.utils.ts
- [ ] All three call sites use shared utility
- [ ] Coverage increased to > 90% for search logic
```

### Phase 5: Track Progress

Update the debt register as items are resolved:

```markdown
| ID | Status | Resolution | Date |
|----|--------|------------|------|
| TD-004 | ✅ Done | Extracted to search.utils.ts | 2024-01-20 |
| TD-002 | 🔄 In Progress | Coverage at 78%, target 90% | — |
| TD-001 | 📋 Planned | Sprint 5 | — |
| TD-003 | 🚫 Deferred | Low score, Q2 | — |
```

## Debt Prevention

Good practices that prevent debt accumulation:

```
Definition of Done (add these):
- [ ] New code has > 80% test coverage
- [ ] No functions > 30 lines
- [ ] No TODO/FIXME left in merged code
- [ ] Dependencies not introducing CVEs
- [ ] Architecture review for files > 200 lines
```

**The Boy Scout Rule:** Leave code cleaner than you found it.
- Fix ONE small thing whenever you touch a file
- 10 minutes per PR on adjacent debt
- Over time: debt decreases without dedicated sprints

## Talking About Debt

**With product managers:**
```
❌ "We need a refactoring sprint"
✅ "The authentication module is slowing every login feature
   by 3x. A 2-day investment now saves 6 days in the next
   quarter. Here's the ROI breakdown."
```

**In sprint planning:**
```
Rule of thumb:
- 20% capacity on debt paydown (sustainable)
- 0% = debt accumulates, velocity declines
- 50%+ = not enough new value
```

## Quick Reference

| Signal | Likely Debt Type | Action |
|--------|-----------------|--------|
| New features take 2× longer | Architectural debt | God class audit |
| Same bug keeps appearing | Test debt | Coverage analysis |
| Security alert | Dependency debt | `npm audit fix` |
| "Nobody touches that file" | Code quality debt | Complexity analysis |
| Onboarding takes weeks | Documentation debt | Codebase guide |

## Red Flags — STOP

| Thought | Reality |
|---------|---------|
| "We'll pay it back later" | Without a plan, later = never |
| "All debt is bad" | Debt taken consciously is a tool |
| "We need a big rewrite" | Incremental refactoring is safer |
| "Let's fix it all this sprint" | Context switches kill velocity |
| "The score is wrong for this item" | Trust the formula; bias skews perception |
