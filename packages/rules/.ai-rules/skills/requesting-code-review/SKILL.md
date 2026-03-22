---
name: requesting-code-review
description: Use when preparing code for review before submitting PRs — covers pre-flight validation, change summary generation, test evidence collection, review focus areas, and structured review request formatting
disable-model-invocation: true
---

# Requesting Code Review

## Overview

Prepare your code for review before asking others to look at it. A well-prepared review request gets faster, higher-quality feedback and respects the reviewer's time.

**Core principle:** The author's job is to make the reviewer's job easy. Every minute you spend preparing saves ten minutes of back-and-forth.

**Violating the letter of this process is violating the spirit of code review.**

## When to Use

**Always use for:**
- New feature PRs
- Bug fix PRs
- Refactoring PRs
- Any PR touching security-sensitive code
- Any PR with breaking changes

**Lighter preparation acceptable for:**
- Documentation-only changes
- Configuration tweaks
- Single-line fixes with obvious intent

**Never skip:**
- Pre-Flight Checks (Phase 1) — takes 2 minutes, catches 80% of review round-trips

## The Iron Law

```
NO REVIEW REQUEST WITHOUT PASSING TESTS AND SELF-REVIEW
```

If tests fail, fix them. If you haven't read your own diff, read it. Requesting review on broken or unreviewed code wastes everyone's time.

## Quick Reference

| Phase | Purpose | Time |
|-------|---------|------|
| 1. Pre-Flight Checks | Validate code is review-ready | ~2 min |
| 2. Self-Review | Catch issues before the reviewer does | ~5-15 min |
| 3. Change Summary | Explain what, why, and impact | ~5 min |
| 4. Test Evidence | Prove it works | ~2 min |
| 5. Review Focus Areas | Guide the reviewer's attention | ~3 min |
| 6. Review Request Assembly | Format the PR description | ~5 min |

## Phase 1: Pre-Flight Checks

**Run before anything else. All must pass.**

```bash
# Tests passing
npm test
# Expected: all green, zero failures

# TypeScript compilation
npx tsc --noEmit
# Expected: no errors

# Linting
npx eslint .
# Expected: no errors (warnings acceptable)

# Formatting
npx prettier --check .
# Expected: all files formatted
```

### Automated Check

If the project has a validate script, use it:
```bash
npm run validate
# Runs all checks in one command
```

### Diff Hygiene

```bash
# No TODO/FIXME in your changes
git diff --cached | grep -n "TODO\|FIXME\|HACK\|XXX"
# Expected: no matches (or documented exceptions)

# No unintended files
git diff --cached --name-only
# Review: every file should be intentional

# No debug artifacts
git diff --cached | grep -n "console\.log\|debugger\|\.only("
# Expected: no matches
```

**If ANY check fails → fix before proceeding. No exceptions.**

## Phase 2: Self-Review

**Read your own diff as if you are the reviewer.**

```bash
# View the full diff
git diff main...HEAD
# Or for staged changes:
git diff --cached
```

### Self-Review Checklist

```
- [ ] Every changed file is intentional (no accidental modifications)
- [ ] Variable and function names are clear without context
- [ ] No hardcoded values that should be constants or config
- [ ] Error cases handled (not just happy path)
- [ ] Edge cases considered (null, empty, boundary values)
- [ ] No copy-pasted code that should be extracted
- [ ] Comments explain "why", not "what"
- [ ] No leftover debugging code
```

### Common Issues to Catch

| Issue | Detection | Fix |
|-------|-----------|-----|
| Forgotten console.log | `grep -rn "console.log" src/` | Remove or replace with proper logging |
| Hardcoded secrets | `grep -rn "password\|secret\|token\|apiKey" src/` | Move to environment variables |
| Missing error handling | Look for unhandled promises, bare try/catch | Add specific error handling |
| Overly large diff | `git diff --stat` shows 500+ lines | Split into smaller PRs |

## Phase 3: Change Summary Generation

**Answer three questions:**

### 1. What Changed?

```bash
# File-level summary
git diff main...HEAD --stat

# Logical grouping of changes
git log main..HEAD --oneline
```

Categorize changes:
- **Added:** New files, functions, components, tests
- **Modified:** Changed behavior, updated logic, fixed bugs
- **Removed:** Deleted code, deprecated features
- **Refactored:** Structural changes without behavior change

### 2. Why Did It Change?

Link to the motivation:
- Issue/ticket reference (e.g., "Closes #123")
- Problem statement (what was broken or missing)
- Business context (why this matters now)

### 3. What Could Break?

```bash
# Find direct dependents of changed files
git diff main...HEAD --name-only | while read file; do
  echo "=== $file ==="
  grep -rn "from.*$(basename $file .ts)" src/ --include="*.ts" | head -5
done
```

Assess impact radius:
- **Direct:** Files importing your changed modules
- **Indirect:** Consumers of your module's public API
- **External:** API contracts, database schemas, config formats

## Phase 4: Test Evidence

**Show, don't tell. Include actual output.**

### Test Results

```bash
# Run tests with verbose output
npm test -- --reporter=verbose 2>&1 | tail -20

# Example output to include:
# ✓ should create user with valid email (3ms)
# ✓ should reject duplicate email (2ms)
# ✓ should handle network timeout (15ms)
# Tests: 47 passed, 0 failed
```

### Coverage Delta

```bash
# Generate coverage report
npm run test:coverage 2>&1 | grep -A 5 "Coverage summary"

# Example output:
# Statements   : 92.3% (+1.2%)
# Branches     : 87.5% (+3.0%)
# Functions    : 95.0% (+0.5%)
# Lines        : 91.8% (+1.1%)
```

If coverage decreased, explain why:
- Removed well-tested dead code
- Added error handling paths not yet fully tested
- New feature has planned follow-up test PR

### New Tests Written

List new test cases with descriptions:
```
New tests:
- "should validate email format before creating user"
- "should return 409 when email already exists"
- "should retry on transient network failure"
- "should timeout after 5 seconds"
```

## Phase 5: Review Focus Areas

**Guide the reviewer to what matters most.**

### Highlight Categories

| Category | What to Flag | Example |
|----------|-------------|---------|
| **Complex logic** | Algorithms, state machines, tricky conditions | "The retry logic in `fetchWithBackoff` handles 5 failure modes" |
| **Security-sensitive** | Auth, input validation, data exposure | "New endpoint requires auth — please verify middleware chain" |
| **Breaking changes** | API changes, schema migrations, config changes | "Response format changed from array to paginated object" |
| **Uncertainty** | Code you're not confident about | "Not sure if this caching strategy handles concurrent writes correctly" |
| **Trade-offs** | Deliberate compromises | "Chose N+1 query for readability; volume is < 100 items" |

### Format

```markdown
### Review Focus Areas

1. **[Complex]** `src/services/retry.ts:25-60` — Exponential backoff
   with jitter. Please verify the max delay calculation.

2. **[Security]** `src/middleware/auth.ts:15` — Added rate limiting.
   Check if the window size is appropriate.

3. **[Breaking]** `src/api/users.ts:42` — Changed response from
   `User[]` to `{ data: User[], pagination: Pagination }`.
   All consumers need to update.

4. **[Uncertain]** `src/cache/store.ts:78` — Cache invalidation
   on concurrent writes. Would appreciate a second opinion.
```

## Phase 6: Review Request Assembly

**Combine all phases into a structured PR description.**

### PR Description Template

```markdown
## Summary

[1-3 sentences: what this PR does and why]

Closes #[issue-number]

## Changes

- [Categorized list from Phase 3]

## Test Evidence

- All tests passing: [X] passed, 0 failed
- Coverage: [X]% (+/-Y%)
- New tests: [count] added

## Review Focus Areas

1. **[Category]** `file:line` — [Description]
2. **[Category]** `file:line` — [Description]

## Impact

- **Breaking changes:** [Yes/No — details if yes]
- **Dependencies affected:** [list or "none"]
- **Migration needed:** [Yes/No — steps if yes]

## Checklist

- [ ] Tests passing
- [ ] Lint clean
- [ ] No TODO/FIXME in diff
- [ ] Self-reviewed
- [ ] Documentation updated (if needed)
```

### PR Title Convention

```
<type>(<scope>): <description>

Examples:
  feat(auth): add JWT refresh token rotation
  fix(api): handle timeout in user creation endpoint
  refactor(db): extract query builder from repository
```

## Verification Checklist

Before submitting the review request:

```
- [ ] All pre-flight checks passing (Phase 1)
- [ ] Self-review completed, no issues found (Phase 2)
- [ ] Change summary includes what, why, and impact (Phase 3)
- [ ] Test evidence shows actual output, not "tests pass" (Phase 4)
- [ ] At least one review focus area identified (Phase 5)
- [ ] PR description follows template (Phase 6)
- [ ] PR title follows convention
- [ ] No TODO/FIXME in diff
- [ ] No debug artifacts in diff
- [ ] Branch is up-to-date with base
```

**Cannot check all boxes? Do not submit the review request.**

## Red Flags — STOP

| Thought | Reality |
|---------|---------|
| "Tests are probably passing" | Run them. "Probably" is not evidence. |
| "The diff is small, no need to self-review" | Small diffs cause big bugs. 2 minutes to check. |
| "I'll add test evidence later" | Reviewers need it NOW to evaluate correctness. |
| "The reviewer will figure out what changed" | That's YOUR job. Respect their time. |
| "No breaking changes... I think" | Check consumers. "I think" is not analysis. |
| "I'll just describe what I did" | Describe WHY, not just WHAT. |
| "This is urgent, skip preparation" | Urgency increases risk. Preparation prevents rework. |
| "The PR is too big to summarize" | Split it. If you can't summarize it, reviewers can't review it. |

## Related Skills

| Skill | Relationship |
|-------|-------------|
| `pr-review` | Complement — pr-review is for CONDUCTING reviews; this skill is for REQUESTING them |
| `deployment-checklist` | Sequential — deploy after review approval |
| `test-driven-development` | Supporting — TDD produces the test evidence this skill requires |
| `security-audit` | Supporting — security audit informs review focus areas |
