# Parallel Execution Guidelines

Rules for running multiple tasks concurrently using sub-agents, workers, or parallel processes. These rules are tool-agnostic and apply to any AI assistant orchestrating parallel work.

---

## The Iron Rule

```
ISSUES MODIFYING THE SAME FILES MUST NOT RUN IN THE SAME PARALLEL WAVE
```

No exceptions. If two tasks touch the same file, they run sequentially in different waves. Violating this rule causes merge conflicts, lost work, and corrupted state.

**Why:** Parallel workers operate on isolated copies (e.g., git worktrees, branches). When two workers modify the same file simultaneously, their changes conflict on merge. One worker's changes will be lost or require manual resolution.

---

## Wave Planning

Parallel tasks are organized into **waves** — groups of tasks that execute concurrently. Tasks within a wave must be independent; tasks across waves may depend on each other.

### Step 1: File Overlap Matrix

Before assigning tasks to waves, build a file overlap matrix. This is **mandatory**, not optional.

**Process:**

1. For each task, list all files that will be created or modified
2. Compare every pair of tasks for file overlap
3. Any overlap means those tasks **cannot** be in the same wave

**Example Matrix:**

```
         Task A    Task B    Task C    Task D
Task A     -       overlap     -         -
Task B   overlap     -         -       overlap
Task C     -         -         -         -
Task D     -       overlap     -         -
```

**Result:** A and B cannot be in the same wave. B and D cannot be in the same wave. C is independent and can go in any wave.

### Step 2: Dependency Analysis

Beyond file overlap, check for logical dependencies:

- Does Task B require output from Task A? (sequential dependency)
- Does Task C need a type/interface that Task A creates? (creation dependency)
- Does Task D modify a function that Task B also calls? (behavioral dependency)

Tasks with dependencies must run in later waves than their prerequisites.

### Step 3: Wave Assignment

Use a greedy coloring algorithm:

```
1. Sort tasks by number of conflicts (most conflicts first)
2. For each task:
   a. Find the earliest wave where no conflict exists
   b. Assign the task to that wave
3. Result: minimum number of waves
```

**Example Result:**

```
Wave 1: Task A, Task C, Task D  (no mutual conflicts)
Wave 2: Task B                  (conflicts with A and D)
```

### Step 4: Wave Ordering

Order waves considering:

- **Foundation first:** Tasks that create shared types, interfaces, or utilities go in Wave 1
- **Consumers later:** Tasks that depend on Wave 1 outputs go in Wave 2+
- **Independent tasks:** Can go in any wave; prefer earlier waves to maximize parallelism

---

## Implementation vs Read-Only Task Dispatch

Implementation tasks (code changes, file modifications, commits) MUST use tmux-based parallel execution (e.g., taskMaestro), NOT background sub-agents.

| Task Type | Dispatch Method | Rationale |
|-----------|----------------|-----------|
| **Implementation** (write code, modify files, commit, create PR) | taskMaestro (tmux panes) with git worktree isolation | Full environment, git operations, pre-push checks |
| **Read-only** (research, analysis, code review, search) | Background sub-agents (Agent tool) | No file mutations, safe to run in parallel without isolation |

**Why:** Background sub-agents lack proper git worktree isolation, cannot run pre-push checks reliably, and risk file conflicts when multiple agents write to the same workspace. taskMaestro provides each worker with an isolated worktree, proper shell environment, and full CI toolchain access.

## Monorepo Path Safety

In monorepo environments, always use absolute paths or `git -C <path>` for git commands to prevent path doubling:

```bash
# ✅ Correct — absolute path or git -C
git -C /absolute/path/to/repo status
git -C "$REPO_ROOT" add src/file.ts

# ❌ Wrong — relative path after cd can double
cd packages/my-lib
git add packages/my-lib/src/file.ts  # Path doubled!

# ❌ Wrong — assuming cwd after operations
git add src/file.ts  # May not be in expected directory
```

**Why:** Relative paths in monorepo subdirectories frequently cause `git add` to target wrong files or fail silently. After any `cd` or worktree operation, verify cwd or use absolute paths.

---

## Sub-Agent Parallelization Strategy

When dispatching parallel sub-agents (workers), follow these guidelines:

### Worker Isolation

Each worker must operate in an isolated environment:

- **Separate working copy:** Each worker gets its own git worktree, branch, or directory
- **No shared mutable state:** Workers must not write to the same files, databases, or caches simultaneously
- **Independent commits:** Each worker commits to its own branch

### Worker Prompt Design

Each worker prompt must include:

1. **Clear scope:** Exactly which files to create or modify
2. **Boundary constraints:** Files the worker must NOT touch
3. **Context:** Shared types, interfaces, or utilities the worker may read but not modify
4. **Success criteria:** How to verify the task is complete
5. **Verification command:** A command to run before completing (e.g., tests, lint)

### Merge Strategy

After all workers in a wave complete:

1. **Verify each worker's changes:** Run tests and lint on each branch independently
2. **Merge sequentially:** Merge each worker's branch into the target branch one at a time
3. **Run integration tests:** After all merges, verify the combined changes work together
4. **Resolve conflicts immediately:** If a merge conflict occurs, investigate the root cause — it likely indicates a violation of the Iron Rule

---

## Continuous Execution Rule

Workers MUST complete all assigned tasks in a single uninterrupted flow.
Stopping between tasks to wait for user input is a protocol violation.

- DO NOT stop between steps
- Complete ALL tasks without waiting for user input
- Only stop after writing RESULT.json
- Auto-nudge from conductor is a fallback safety net, not the primary mechanism

---

## AUTO Mode Iteration Methodology

When using AUTO mode with parallel execution:

### Iteration Structure

```
Iteration 1:
  PLAN  → Identify tasks, build file overlap matrix, assign waves
  ACT   → Execute Wave 1 (parallel workers)
        → Merge Wave 1 results
        → Execute Wave 2 (parallel workers)
        → Merge Wave 2 results
        → ... repeat for all waves
  EVAL  → Verify all tasks complete, run full test suite
        → If Critical/High issues found → iterate

Iteration 2 (if needed):
  PLAN  → Address issues found in previous EVAL
  ACT   → Fix issues (may or may not need parallel execution)
  EVAL  → Re-verify
```

### Quality Gates Between Waves

Before starting the next wave:

- All workers in the current wave must have completed successfully
- All changes from the current wave must be merged
- Tests must pass after merging
- No unresolved conflicts

### Escape Conditions

Stop iterating when:

- All acceptance criteria are met
- EVAL reports Critical = 0 AND High = 0
- Maximum iterations reached (default: 3)

---

## Post-Execution Verification Checklist

After all waves complete, verify:

```
- [ ] All tasks completed successfully
- [ ] All branches merged without conflicts
- [ ] Full test suite passes
- [ ] No files were modified by multiple workers (Iron Rule verification)
- [ ] Lint and format checks pass
- [ ] Type checking passes
- [ ] No unintended changes outside task scope
```

### Iron Rule Verification Command

Run this after merging to confirm no file was modified by multiple workers:

```bash
# For git-based workflows: check if any file appears in multiple worker branches
# Compare each worker's changed files against all other workers
git diff --name-only main..worker-1 > /tmp/w1.txt
git diff --name-only main..worker-2 > /tmp/w2.txt
comm -12 <(sort /tmp/w1.txt) <(sort /tmp/w2.txt)
# Output must be empty — any listed files indicate an Iron Rule violation
```

---

## Common Pitfalls

| Pitfall | Prevention |
|---------|------------|
| Skipping file overlap matrix | **Always** build the matrix before assigning waves |
| "It probably won't conflict" | Assume it will. Check explicitly. No exceptions |
| Shared config files (package.json, tsconfig) | Only one worker per wave may modify shared config |
| Generated files (lock files, build output) | Exclude from worker scope; regenerate after merge |
| Test files that import from multiple modules | Treat test files as modifying the modules they test |
| Workers exceeding their scope | Define explicit file boundaries in worker prompts |

---

## Reference

- For detailed wave analysis algorithms, see the skill-specific documentation in your tool's configuration
- For AUTO mode general workflow, see [core.md](core.md) — Auto Mode section
- For TDD practices during parallel execution, see [augmented-coding.md](augmented-coding.md)
