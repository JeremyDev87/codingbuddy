---
name: verification-before-completion
description: Use when about to claim work is complete, fixed, or passing, before committing or creating PRs - requires running verification commands and confirming output before making any success claims
user-invocable: true
---

# Verification Before Completion

## Overview

Claiming success without evidence is guessing. "It should work" is not verification.

**Core principle:** ALWAYS run verification commands and confirm output before claiming work is complete. Evidence before assertions.

**Violating the letter of these checks is violating the spirit of quality.**

## The Iron Law

```
NO SUCCESS CLAIMS WITHOUT RUNNING VERIFICATION COMMANDS
```

If you haven't seen passing output with your own eyes, you cannot claim it works.

**No exceptions:**
- Don't say "tests should pass" — run them
- Don't say "build looks fine" — build it
- Don't say "no lint errors" — lint it
- Don't say "changes look good" — diff them

## When to Use

**Always, before:**
- Claiming work is "done" or "complete"
- Committing code
- Creating pull requests
- Closing issues
- Reporting success to teammates
- Moving to the next task

**Use this ESPECIALLY when:**
- Under time pressure (rushing guarantees missed issues)
- Changes seem trivial ("just a typo" can break builds)
- You've made multiple changes across files
- Refactoring existing code
- Fixing bugs (verify the fix AND no regressions)

**Don't skip when:**
- Change seems too small to break anything (small changes break things)
- You're confident it works (confidence ≠ evidence)
- You "already tested manually" (manual ≠ systematic)
- CI will catch it (catch it NOW, not after push)

## The Four Phases

You MUST complete all four phases before claiming completion. Order matters.

### Phase 1: Test Execution

**Run ALL relevant tests, not just the ones you think matter.**

```bash
# Run tests for affected area
npm test -- --coverage path/to/affected/
# OR
yarn test path/to/affected/

# Run full test suite if changes are cross-cutting
npm test
```

**Verify:**
- [ ] All tests pass (zero failures)
- [ ] No test warnings or errors in output
- [ ] Coverage hasn't decreased
- [ ] New code has corresponding tests
- [ ] No skipped tests you forgot to unskip

**Test fails?** Fix it. Do NOT proceed to Phase 2.

**No tests exist?** Write them first. Untested code is unverified code.

### Phase 2: Build Verification

**Confirm the project compiles and builds without errors.**

```bash
# TypeScript projects
npx tsc --noEmit

# Build the project
npm run build
# OR
yarn build
```

**Verify:**
- [ ] Zero TypeScript errors
- [ ] Zero build errors
- [ ] Zero build warnings (or only pre-existing ones)
- [ ] Output artifacts are generated correctly

**Build fails?** Fix it. Do NOT proceed to Phase 3.

**"It builds on my machine"** is not verification. Run the actual build command.

### Phase 3: Lint and Quality Check

**Run linters and formatters to catch style and quality issues.**

```bash
# Lint
npm run lint
# OR
npx eslint src/

# Format check
npm run format:check
# OR
npx prettier --check .
```

**Verify:**
- [ ] Zero lint errors
- [ ] Zero formatting issues
- [ ] No new warnings introduced
- [ ] Pre-commit hooks will pass

**Lint fails?** Fix it. Do NOT proceed to Phase 4.

**Don't disable rules** to make lint pass. Fix the code.

### Phase 4: Diff Review

**Review your own changes before anyone else sees them.**

```bash
# Review all changes
git diff

# Review staged changes
git diff --cached

# Check for untracked files
git status
```

**Verify:**
- [ ] No debug code (console.log, debugger, TODO hacks)
- [ ] No commented-out code
- [ ] No unintended file changes
- [ ] No secrets, credentials, or API keys
- [ ] No large binary files accidentally staged
- [ ] Commit scope matches intent (no unrelated changes)

**Found issues?** Fix them. Do NOT commit.

**"I'll clean it up later"** — No. Clean it up now.

## The Verification Report

After completing all four phases, summarize evidence:

```
## Verification Complete

- Tests: ✅ X passed, 0 failed (Y% coverage)
- Build: ✅ Clean compilation, zero errors
- Lint:  ✅ No errors, no new warnings
- Diff:  ✅ Reviewed, no debug code or secrets
```

**Only after this report can you claim work is complete.**

## Red Flags — STOP and Verify

If you catch yourself thinking:

| Thought | Reality |
|---------|---------|
| "Tests should pass" | Run them. "Should" isn't evidence. |
| "I only changed one line" | One line can break everything. Verify. |
| "CI will catch it" | Catch it now. Don't waste CI time. |
| "I already tested manually" | Manual testing is incomplete. Run automated checks. |
| "Build was fine last time" | Your changes may have broken it. Build again. |
| "Lint is too strict" | Fix code, don't disable rules. |
| "I'll review the diff later" | Review now. Later never comes. |
| "It's just a docs change" | Docs can have broken links, bad formatting. Verify. |
| "Tests take too long" | Run them anyway. Slow tests > shipped bugs. |
| "I'm confident it works" | Confidence without evidence is arrogance. |

**ALL of these mean: STOP. Run the verification.**

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "Too simple to break" | Simple changes break builds. 30-second check prevents hours of debugging. |
| "I'll verify after commit" | Post-commit fixes require amend/revert. Verify before. |
| "Only changed tests" | Test changes can mask real failures. Run the suite. |
| "CI runs everything" | CI feedback is slow. Local verification is fast. Catch issues immediately. |
| "Time pressure, ship it" | Shipping broken code creates MORE time pressure. Verify now. |
| "Other tests are flaky" | Distinguish your failures from flaky ones. Don't hide behind noise. |
| "Reviewer will catch it" | Reviewers miss things. Self-review catches 80% of issues. |
| "It worked in dev" | Dev ≠ prod. Build and test in the actual target environment. |

## Quick Reference

| Phase | Command | Success Criteria |
|-------|---------|------------------|
| **1. Tests** | `npm test` | All pass, no warnings |
| **2. Build** | `npm run build` / `tsc --noEmit` | Zero errors |
| **3. Lint** | `npm run lint` | Zero errors, no new warnings |
| **4. Diff** | `git diff` + `git status` | Clean, no debug code |

## Integration with Other Skills

- **After TDD:** Verification is the final gate after Red-Green-Refactor completes
- **After debugging:** Verify the fix AND verify no regressions were introduced
- **Before shipping:** This skill is the prerequisite to any commit or PR workflow

**Related skills:**
- **superpowers:test-driven-development** — For writing tests (Phase 1 input)
- **superpowers:systematic-debugging** — For investigating failures found during verification

## Final Rule

```
Evidence before assertions.
Verification before completion.
Output before claims.
```

No exceptions without your human partner's permission.
