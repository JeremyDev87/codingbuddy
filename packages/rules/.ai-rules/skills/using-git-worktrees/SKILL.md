---
name: using-git-worktrees
description: >-
  Use when creating isolated workspaces for parallel execution, feature
  exploration, or plan implementation. Covers worktree creation, naming
  conventions, safety checks, and cleanup procedures.
user-invocable: true
argument-hint: "[create|cleanup|status]"
---

# Using Git Worktrees

## Overview

Git worktrees provide isolated working directories sharing a single `.git` repository. They enable parallel development without stashing, branch-switching conflicts, or duplicate clones.

**Core principle:** EVERY worktree operation must be verified before and after. Unverified worktrees cause lost work, orphaned branches, and corrupted state.

## The Iron Law

```
NO WORKTREE CREATION WITHOUT SAFETY CHECKS.
NO WORKTREE REMOVAL WITHOUT UNCOMMITTED CHANGE VERIFICATION.
```

If you skip the safety checks, you will lose work. There are no exceptions.

## When to Use

- **Parallel execution**: Running multiple tasks simultaneously (taskMaestro waves)
- **Feature isolation**: Working on a feature without disrupting main branch state
- **Plan implementation**: Creating a dedicated workspace before implementing a plan
- **Exploration**: Trying an approach without affecting current work
- **Code review**: Checking out a PR branch while keeping your current work intact

**Use this ESPECIALLY when:**
- You need to work on multiple issues simultaneously
- You want to preserve your current branch state while exploring something else
- A brainstorming session has produced a design ready for implementation
- You are about to run `/taskmaestro wave-transition`

**Don't skip when:**
- "It's just a quick branch switch" (worktrees prevent accidental stash loss)
- "I'll remember to clean up later" (stale worktrees accumulate silently)
- "The repo is small, cloning is fine" (clones don't share history; worktrees do)

---

## Phase 1: Assessment

**BEFORE creating any worktree, answer these questions:**

### 1.1 Determine the Purpose

| Purpose | Directory Convention | Branch Convention |
|---------|---------------------|-------------------|
| Parallel execution (taskMaestro) | `.taskmaestro/wt-N` | `taskmaestro/<epoch>/pane-N` |
| Tool-managed isolation | Tool-specific (e.g., `.claude/worktrees/`) | Auto-managed by the tool |
| Standalone / manual | `.worktrees/<descriptive-name>` | `wt/<description>` or `feat/<issue>-<slug>` |

**Branch naming — Good vs Bad:**

| | Example | Why |
|---|---------|-----|
| **Good** | `feat/42-add-auth-middleware` | Encodes issue number and purpose; easy to find and clean up |
| **Good** | `wt/explore-cache-strategy` | `wt/` prefix makes worktree branches bulk-identifiable |
| **Bad** | `my-branch` | No context — impossible to identify purpose or clean up in bulk |
| **Bad** | `test` | Generic name; will collide with other worktrees or developers |

### 1.2 Check Prerequisites

Run these checks before proceeding:

```bash
# 1. Verify clean working tree (stash or commit first)
git status --porcelain
# Must be empty, or stash changes first

# 2. Verify you are NOT inside an existing worktree
git rev-parse --show-toplevel
# Should match your main repo root

# 3. List existing worktrees to avoid conflicts
git worktree list

# 4. Verify the target branch does not already exist
git branch --list "<your-branch-name>"
# Must be empty — git worktree add -b fails on existing branches

# 5. Verify the target directory does not already exist
ls -d "<your-worktree-path>" 2>/dev/null
# Must not exist, or must be empty
```

**If any check fails:** Resolve the issue before proceeding. Do NOT skip checks.

### 1.3 Choose Base Branch

```bash
# Fetch latest to avoid stale base
git fetch origin master:master 2>/dev/null || git fetch origin main:main 2>/dev/null
```

Use the project's default branch (usually `master` or `main`) as the base unless you specifically need to branch from another point.

---

## Phase 2: Creation

### 2.1 Create the Worktree

**Standard creation (new branch):**

```bash
# Pattern: git worktree add <directory> -b <branch-name> <base-branch>
git worktree add .worktrees/my-feature -b feat/42-user-auth master
```

**taskMaestro pattern:**

```bash
git worktree add .taskmaestro/wt-1 -b "taskmaestro/$(date +%s)/pane-1" master
```

**From existing remote branch:**

```bash
git worktree add .worktrees/review-pr origin/feat/some-branch
```

### 2.2 Verify Creation

```bash
# Confirm worktree appears in the list
git worktree list

# Confirm the directory has a valid .git file (not directory)
cat <worktree-path>/.git
# Should contain: gitdir: /path/to/.git/worktrees/<name>

# Confirm correct branch
git -C <worktree-path> branch --show-current
```

### 2.3 Post-Creation Setup

Each worktree has its own working directory. Shared `.git` objects are reused, but working files are independent.

```bash
# Install dependencies (JS/TS projects)
cd <worktree-path> && npm install   # or yarn install

# Initialize submodules if present
git -C <worktree-path> submodule update --init

# Copy non-tracked config files if needed
cp .env.local <worktree-path>/.env.local  # if applicable
```

**Key understanding:** `node_modules/`, build caches, and IDE configs are NOT shared between worktrees. Each worktree needs its own setup.

---

## Phase 3: Work and Verification

### 3.1 Know Where You Are

Always verify which worktree you are working in:

```bash
# Show current worktree root
git rev-parse --show-toplevel

# Show current branch
git branch --show-current
```

### 3.2 Commit Hygiene

- **Commit frequently** within the worktree — uncommitted work is lost on removal
- **Push before cleanup** — local-only commits disappear with the worktree branch
- **Atomic commits** — each commit should be self-contained

```bash
# Before leaving a worktree, always check
git -C <worktree-path> status --porcelain        # uncommitted changes
git -C <worktree-path> log @{upstream}..HEAD      # unpushed commits
```

### 3.3 Avoid Cross-Contamination

- Do NOT run git commands from one worktree that target another
- Do NOT create nested worktrees (worktree inside a worktree)
- Do NOT symlink `node_modules` between worktrees — it causes subtle bugs
- Do NOT checkout a branch that is already checked out in another worktree

```bash
# If you need to check: which worktrees exist and what branches they use
git worktree list
```

---

## Phase 4: Cleanup

**NEVER skip cleanup.** Stale worktrees and orphaned branches accumulate and cause confusion.

### 4.1 Pre-Cleanup Safety Checks

```bash
# 1. Check for uncommitted changes
git -C <worktree-path> status --porcelain
# Must be empty

# 2. Check for unpushed commits
git -C <worktree-path> log @{upstream}..HEAD 2>/dev/null
# Must be empty (or explicitly accepted as disposable)

# 3. Check lock status
git worktree list --porcelain | grep -A2 "<worktree-path>"
# Should NOT show "locked"
```

**If uncommitted changes exist:** Commit and push, or explicitly confirm disposal.

### 4.2 Remove the Worktree

**Removal — Good vs Bad:**

| | Command | Why |
|---|---------|-----|
| **Good** | `git worktree remove .worktrees/my-feature` | Cleans up both directory and `.git/worktrees/` metadata |
| **Bad** | `rm -rf .worktrees/my-feature` | Leaves orphaned metadata — breaks `git worktree list` and blocks branch ops |

```bash
# Safe removal (fails if dirty)
git worktree remove <worktree-path>

# Force removal (destroys uncommitted work — use only after verification)
git worktree remove <worktree-path> --force
```

### 4.3 Clean Up the Branch

```bash
# Delete the local branch (only after merge or explicit discard)
git branch -d <branch-name>    # safe delete (fails if unmerged)
git branch -D <branch-name>    # force delete (use with caution)

# Delete remote branch if pushed
git push origin --delete <branch-name>
```

### 4.4 Prune Stale References

```bash
# Remove metadata for worktrees whose directories no longer exist
git worktree prune

# Verify clean state
git worktree list
# Should only show active worktrees
```

### 4.5 Bulk Cleanup (taskMaestro Pattern)

For cleaning up an entire parallel wave:

```bash
# Remove all taskMaestro worktrees
for wt_dir in .taskmaestro/wt-*; do
  [ -d "$wt_dir" ] || continue
  branch=$(git -C "$wt_dir" branch --show-current 2>/dev/null)
  git worktree remove "$wt_dir" --force 2>/dev/null || rm -rf "$wt_dir"
  [ -n "$branch" ] && git branch -D "$branch" 2>/dev/null
done
git worktree prune
```

---

## Health Check

Run periodically or when something seems wrong:

```bash
# List all worktrees and their branches
git worktree list

# Prune any stale entries
git worktree prune

# Find worktree-related branches that may be orphaned
git branch --list 'taskmaestro/*'
git branch --list 'wt/*'

# Verify .gitignore includes worktree directories
grep -E '\.taskmaestro/|\.worktrees/|\.claude/worktrees/' .gitignore
```

---

## Verification Checklist

Before considering your worktree work complete:

- [ ] Worktree created from a fresh base branch (`git fetch` ran first)
- [ ] Branch name follows the naming convention for the context
- [ ] `git worktree list` shows the worktree correctly
- [ ] Dependencies installed in the worktree (if applicable)
- [ ] All changes committed and pushed before cleanup
- [ ] Worktree removed with `git worktree remove` (not `rm -rf`)
- [ ] `git worktree prune` ran after removal
- [ ] Associated branch deleted if work is complete

---

## Red Flags — STOP

| Thought | Reality |
|---------|---------|
| "I'll just `rm -rf` the worktree directory" | NO. Use `git worktree remove`. Orphaned metadata in `.git/worktrees/` breaks `git worktree list` and blocks branch operations. |
| "The branch name doesn't matter" | NO. Systematic names enable bulk cleanup (`git branch --list 'wt/*'`). Random names become impossible to identify. |
| "I don't need to fetch before creating" | NO. A stale base branch causes merge conflicts in every worktree created from it. |
| "Uncommitted changes are fine, I'll get them later" | NO. `git worktree remove --force` destroys uncommitted work permanently. No recovery. |
| "One worktree can share `node_modules` with the main tree" | NO. Each worktree has its own working directory. Symlinks cause subtle, hard-to-debug build failures. |
| "I'll skip cleanup, it's just disk space" | NO. Stale worktrees and orphaned branches accumulate and confuse `git branch` / `git worktree list`. Clean up every time. |
| "I can checkout the same branch in two worktrees" | NO. Git forbids this. A branch can only be checked out in one worktree at a time. Create a new branch instead. |

---

## Integration with Other Skills

| Skill | Integration Point |
|-------|-------------------|
| **brainstorming** | After design validation, create a worktree for isolated implementation |
| **writing-plans** | Plans should be implemented in a dedicated worktree |
| **executing-plans** | Execute plan steps inside the worktree, not the main tree |
| **taskmaestro** | Automates worktree lifecycle for parallel waves (`/taskmaestro wave-transition`) |
| **parallel-issues** | Uses taskMaestro worktrees for concurrent issue implementation |

---

## Tool-Specific Notes

### Claude Code

Claude Code provides a built-in `EnterWorktree` tool that:
- Creates worktrees in `.claude/worktrees/<name>`
- Manages branch creation automatically
- Provides `ExitWorktree` for cleanup (keep or remove)

Use `EnterWorktree` for single-worktree isolation within Claude Code sessions. Use the manual git workflow described above for multi-worktree parallel execution.

### Other AI Tools (Cursor, Codex, Q, Kiro)

Use the standard `git worktree` CLI commands described in this skill. No tool-specific APIs exist for worktree management in these environments.

---

## Quick Reference

| Phase | Key Actions | Verification |
|-------|-------------|--------------|
| **1. Assessment** | Check prerequisites, choose naming | `git status`, `git worktree list`, target path clear |
| **2. Creation** | `git worktree add`, install deps | `git worktree list`, branch correct, deps installed |
| **3. Work** | Commit often, push before leaving | `git status --porcelain` empty, no unpushed commits |
| **4. Cleanup** | `git worktree remove`, delete branch, prune | `git worktree list` clean, no orphaned branches |
