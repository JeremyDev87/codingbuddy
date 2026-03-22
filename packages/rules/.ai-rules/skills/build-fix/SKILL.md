---
name: build-fix
description: Use when build fails, TypeScript errors appear, or compilation breaks. Minimal diff fixes only — no refactoring, no architecture changes.
user-invocable: true
allowed-tools: Read, Edit, Grep, Glob, Bash
---

# Build Fix

## Overview

Build errors block everything. Fix them fast, fix them small, fix nothing else.

**Core principle:** Fix ONLY what is broken. A build fix is not an opportunity to refactor, add features, or improve architecture. Touch the minimum lines required to restore a passing build.

**Violating the letter of this process is violating the spirit of build fixing.**

## The Iron Law

```
MINIMAL DIFF, NO ARCHITECTURE CHANGES — FIX WHAT'S BROKEN, NOTHING MORE
```

If your diff touches lines unrelated to the error, you are not build-fixing. You are refactoring. Stop.

**No exceptions:**
- "While I'm here, I'll clean up..." → No. Separate PR.
- "This would be better as..." → No. Separate issue.
- "The real problem is the architecture..." → No. File an issue, fix the build now.

## When to Use

Use for ANY build/compilation failure:
- TypeScript compiler errors (`tsc --noEmit` failures)
- Import/export resolution errors
- Dependency version mismatches or missing packages
- Configuration errors (tsconfig, webpack, vite, etc.)
- CI/CD build pipeline failures
- Module not found errors

**Use this ESPECIALLY when:**
- Build is red and blocking the team
- CI pipeline is failing on compilation
- Dependency update broke the build
- Merge conflict left broken imports

**Do NOT use when:**
- Tests fail but build succeeds → use `systematic-debugging`
- You want to improve code quality → use `refactoring`
- You want to add features → use `brainstorming` + TDD
- Runtime errors, not compile-time → use `error-analysis`

## Error Classification

First, classify the build error:

| Class | Symptoms | Typical Minimal Fix |
|-------|----------|-------------------|
| **TypeScript Error** | `TS2345`, `TS2339`, `TS7006`, `TS2532` | Add type annotation, null check, or correct type |
| **Import Error** | `Cannot find module`, `has no exported member` | Fix path, add missing export, correct import name |
| **Dependency Error** | Version mismatch, missing peer dep, lockfile conflict | Align version, install missing package |
| **Config Error** | `tsconfig.json` invalid, env var missing, wrong target | Fix config value, add missing variable |
| **Syntax Error** | Unexpected token, missing bracket | Fix syntax at reported location |

## The Four Phases

You MUST complete each phase before proceeding to the next.

### Phase 1: Read the Error

**BEFORE attempting ANY fix:**

1. **Read the FULL error output**
   - Don't skim — read every line
   - Note the error code (e.g., `TS2345`)
   - Note the exact file and line number
   - Note what the compiler expected vs. what it got

2. **Classify the error** (see table above)
   - What class does this error belong to?
   - Is it a single error or a cascade?
   - Cascading errors: fix the FIRST error only, then re-run

3. **Count the errors**
   - One error? Fix it directly.
   - Many errors, same root cause? Fix the root, not each symptom.
   - Many unrelated errors? Fix one at a time, verify after each.

### Phase 2: Identify Root Cause

**Find the MINIMUM change needed:**

1. **Check recent changes**
   ```bash
   git diff HEAD~1        # What changed?
   git log --oneline -5   # Recent commits
   ```

2. **Trace the error to its source**
   - TypeScript error at line 42? Read line 42.
   - Import error? Check if the export exists at the source.
   - Dependency error? Check `package.json` versions.

3. **Identify the scope**
   - How many files need to change?
   - If more than 3 files → question whether this is truly a build fix
   - If it requires new files → this is not a build fix, it's a feature

### Phase 3: Minimal Fix

**Apply the SMALLEST possible change:**

1. **One fix at a time**
   - Change one thing
   - Don't bundle fixes
   - Don't "improve" surrounding code

2. **Common minimal fixes**

   ```typescript
   // TypeScript: TS2345 - Type mismatch
   // BAD: Rewrite the function with new types
   // GOOD: Add the correct type annotation or assertion
   const value = data as ExpectedType;

   // TypeScript: TS2532 - Possibly undefined
   // BAD: Refactor to eliminate the possibility
   // GOOD: Add null check or optional chaining
   const name = user?.name ?? 'default';

   // Import: Cannot find module
   // BAD: Restructure the module system
   // GOOD: Fix the import path
   import { Thing } from './correct/path';

   // Dependency: Missing peer dependency
   // BAD: Upgrade the entire dependency tree
   // GOOD: Install the specific missing package
   // $ yarn add missing-package@^required.version
   ```

3. **What NOT to do**
   - Do NOT rename variables for "clarity"
   - Do NOT extract functions for "reusability"
   - Do NOT add error handling beyond what's needed
   - Do NOT update unrelated dependencies
   - Do NOT change code formatting

### Phase 4: Verify

**Confirm the build passes:**

1. **Run the build command**
   ```bash
   # Run the same command that failed
   yarn build          # or npm run build
   tsc --noEmit        # TypeScript check
   ```

2. **Run tests to ensure no regressions**
   ```bash
   yarn test           # or npm test
   ```

3. **Check the diff**
   ```bash
   git diff
   ```
   - Is every changed line directly related to the error?
   - Did you touch anything unrelated? Revert it.
   - Is the diff as small as possible?

4. **If build still fails**
   - Read the NEW error message
   - Is it the same error? → Your fix was wrong. Revert.
   - Is it a different error? → Return to Phase 1 for the new error.
   - Do NOT stack fixes without verifying between each one.

## Red Flags — STOP and Return to Phase 1

If you catch yourself thinking:

| Thought | Reality |
|---------|---------|
| "While I'm fixing this, I'll also..." | Build fix. Nothing else. |
| "This function should really be..." | File an issue. Fix the build. |
| "The types are all wrong, let me redesign..." | Fix the ONE type error. Not all types. |
| "I need to add a new abstraction..." | No new abstractions in a build fix. |
| "Let me upgrade this dependency to latest..." | Only change the version if it fixes the error. |
| "This code is messy, let me clean up..." | Messy code that compiles > clean code in a broken build. |
| "The architecture caused this, so I should..." | Architecture changes are not build fixes. |

**ALL of these mean: STOP. You are no longer build-fixing.**

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "The refactor prevents future build errors" | Future prevention is a separate task. Fix now. |
| "It's just a small improvement" | Small improvements compound into large diffs. |
| "The code is already open in my editor" | Being convenient doesn't make it a build fix. |
| "No one will review a 1-line PR" | 1-line PRs are the BEST PRs. Ship it. |
| "I need to understand the whole module" | You need to understand the error. Not the module. |
| "The dependency is outdated anyway" | Outdated but compiling > updated and broken. |

## Scope Guard

Before committing, verify your changes pass the scope guard:

```
For EACH changed line, ask:
  "Would the build fail without this specific change?"

  YES → Keep it
  NO  → Revert it
```

If any changed line fails the scope guard, you have scope creep. Remove it.

## Quick Reference

| Phase | Key Activity | Success Criteria |
|-------|-------------|------------------|
| **1. Read** | Read full error, classify, count | Know WHAT is broken |
| **2. Identify** | Check changes, trace source | Know WHERE and WHY |
| **3. Fix** | Smallest possible change | Minimal diff applied |
| **4. Verify** | Build passes, tests pass, diff is clean | Build green, no extras |

## Related Skills

- **`error-analysis`** — For classifying and understanding error messages (Phase 1)
- **`systematic-debugging`** — For runtime bugs, not compile-time errors
- **`verification-before-completion`** — For confirming the fix before claiming success
- **`refactoring`** — For when you actually WANT to improve structure (not during build fix)
