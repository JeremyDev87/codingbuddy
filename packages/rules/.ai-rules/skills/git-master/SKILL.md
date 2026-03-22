---
name: git-master
description: Use when performing git operations - commits, rebasing, cherry-picking, history cleanup, or conflict resolution. Ensures atomic commits, clean history, and consistent commit message style.
allowed-tools: Read, Grep, Glob, Bash
---

# Git Master

## Overview

Messy git history obscures intent, makes debugging harder, and wastes reviewer time. Clean history tells the story of WHY changes were made, not just WHAT changed.

**Core principle:** Every commit should be a single, complete, logical change that can be understood, reverted, or cherry-picked independently.

**Violating the letter of this process is violating the spirit of clean version control.**

## The Iron Law

```
ONE LOGICAL CHANGE PER COMMIT. NO EXCEPTIONS.
```

If a commit does two things, it should be two commits. If a commit is incomplete, it should not exist yet.

**No exceptions:**
- "I'll split it later" → Split it now
- "It's a small extra change" → Separate commit
- "They're related" → Related is not identical

## When to Use

Use for ANY git operation beyond trivial:
- Creating commits (single or multiple)
- Rebasing branches (interactive or standard)
- Cherry-picking commits across branches
- Cleaning up history (amend, squash, fixup)
- Resolving merge conflicts
- Preparing branches for review

**Use this ESPECIALLY when:**
- Repository has established commit conventions
- Branch has messy work-in-progress commits before PR
- Cherry-picking between release branches
- Resolving complex merge conflicts
- History needs cleanup before merging

**Don't skip when:**
- "It's just a quick fix" (quick fixes deserve clean commits too)
- "Nobody reads commit history" (future-you does, during `git bisect`)
- "I'll squash on merge anyway" (squash merges lose valuable context)

## When NOT to Use

- **Initial prototyping** — Experiment freely, clean up before PR
- **Throwaway branches** — No need for perfect history on disposable work
- **Automated commits** — CI/CD generated commits follow their own patterns

## The Six Phases

### Phase 1: Style Detection

**BEFORE making any commit, understand the repo's conventions:**

1. **Analyze Recent History**
   ```bash
   git log --oneline -20
   ```

2. **Detect Commit Message Pattern**

   | Pattern | Example | Convention |
   |---------|---------|------------|
   | **Conventional Commits** | `feat(auth): add OAuth2 flow` | `type(scope): description` |
   | **Imperative mood** | `Add user validation` | Verb-first, present tense |
   | **Ticket prefix** | `[PROJ-123] Fix login bug` | `[TICKET] description` |
   | **Emoji prefix** | `:bug: Fix null pointer` | Emoji + description |
   | **Freeform** | `Fixed the login thing` | No consistent pattern |

3. **Match the Detected Style**
   - Use the same pattern for your commits
   - If no pattern detected, default to Conventional Commits
   - Never mix styles within a PR

**Completion criteria:**
- [ ] `style_detected` — Commit message pattern identified
- [ ] `convention_noted` — Will follow detected convention

### Phase 2: Atomic Commits

**Every commit must be atomic — one logical change, complete and self-contained.**

1. **Stage Selectively**
   ```bash
   # Stage specific files, not everything
   git add src/auth/login.ts src/auth/login.test.ts

   # For partial file staging
   git add -p src/utils/helpers.ts
   ```

   **Never use `git add .` or `git add -A` unless you have verified every change belongs together.**

2. **Verify Staged Content**
   ```bash
   git diff --cached    # Review what you're about to commit
   git diff             # Check what's NOT staged
   ```

3. **Write the Commit Message**

   **Structure:**
   ```
   <type>(<scope>): <what changed> (max 72 chars)

   <why this change was needed>
   <any important context>

   Refs: #issue-number (if applicable)
   ```

   **Good vs Bad:**

   | Bad | Good |
   |-----|------|
   | `fix stuff` | `fix(auth): prevent session timeout on token refresh` |
   | `WIP` | `feat(cart): add quantity validation for checkout` |
   | `updates` | `refactor(api): extract retry logic into shared middleware` |
   | `fix tests` | `test(auth): cover edge case for expired JWT tokens` |

4. **Verify Atomicity**
   - Does this commit do exactly ONE thing?
   - Could someone revert JUST this commit safely?
   - Does the codebase compile/pass tests at this commit?

**Completion criteria:**
- [ ] `changes_staged_selectively` — No unrelated changes staged
- [ ] `message_follows_convention` — Matches repo's detected style
- [ ] `commit_is_atomic` — Single logical change

### Phase 3: Rebase Workflows

**Use rebase to maintain a clean, linear history.**

1. **Standard Rebase (update branch)**
   ```bash
   git fetch origin
   git rebase origin/main
   ```

2. **Interactive Rebase (clean up commits)**
   ```bash
   git rebase -i HEAD~N    # N = number of commits to review
   ```

   **Action guide:**

   | Action | When to Use |
   |--------|-------------|
   | `pick` | Keep commit as-is |
   | `reword` | Fix commit message only |
   | `squash` | Merge into previous, combine messages |
   | `fixup` | Merge into previous, discard message |
   | `drop` | Remove commit entirely |

3. **Safe Rebase Checklist**
   - [ ] Branch is NOT shared with others (or team agrees on force-push)
   - [ ] All changes are committed (no uncommitted work)
   - [ ] You understand what each commit does before reordering

   > **AI Agent Note:** Interactive commands (`rebase -i`, `add -p`) require terminal interaction. AI agents without interactive input support should use non-interactive alternatives (e.g., `git rebase --onto`, `git add <specific-files>`) or prepare the rebase todo list programmatically.

4. **If Rebase Goes Wrong**
   ```bash
   git rebase --abort          # Cancel in-progress rebase
   git reflog                  # Find pre-rebase state
   git reset --hard HEAD@{N}   # Restore (DESTRUCTIVE — uncommitted changes lost)
   ```

**Completion criteria:**
- [ ] `history_is_linear` — No unnecessary merge commits
- [ ] `commits_are_clean` — WIP commits squashed

### Phase 4: Cherry-Pick

**Safely move individual commits between branches.**

1. **Before Cherry-Picking**
   - Identify the exact commit(s): `git log --oneline source-branch`
   - Verify the commit is self-contained (atomic)
   - Check for dependencies on other commits

2. **Execute Cherry-Pick**
   ```bash
   git cherry-pick <commit-hash>

   # For multiple commits
   git cherry-pick <hash1> <hash2> <hash3>

   # For a range
   git cherry-pick <older-hash>..<newer-hash>
   ```

3. **Handle Cherry-Pick Conflicts**
   ```bash
   # View conflicting files
   git status

   # Resolve conflicts, then
   git add <resolved-files>
   git cherry-pick --continue

   # Or abort if too complex
   git cherry-pick --abort
   ```

4. **Verify After Cherry-Pick**
   - Tests pass on the target branch
   - No unintended side effects
   - Commit message still makes sense in new context

**Completion criteria:**
- [ ] `commit_identified` — Correct commit(s) selected
- [ ] `conflicts_resolved` — All conflicts handled
- [ ] `tests_pass` — Target branch is green

### Phase 5: History Cleanup

**Fix mistakes without breaking history for others.**

1. **Amend Last Commit**
   ```bash
   # Add forgotten changes
   git add <forgotten-file>
   git commit --amend

   # Fix message only
   git commit --amend -m "corrected message"
   ```
   **Only amend unpushed commits.** Amending pushed commits requires force-push.

2. **Fixup Older Commits**
   ```bash
   # Create a fixup commit
   git commit --fixup=<target-hash>

   # Auto-squash during rebase
   git rebase -i --autosquash HEAD~N
   ```

3. **Recovery with Reflog**
   ```bash
   # View recent HEAD movements
   git reflog

   # Restore accidentally deleted commit
   git cherry-pick <reflog-hash>

   # Restore to a previous state (DESTRUCTIVE — all uncommitted changes are lost)
   git reset --hard HEAD@{N}
   ```

4. **Safety Rules**
   - Never rewrite history on shared branches without team agreement
   - Always verify `git reflog` shows the state you want to restore
   - Create a backup branch before destructive operations: `git branch backup-before-cleanup`

**Completion criteria:**
- [ ] `history_corrected` — Mistakes fixed
- [ ] `no_shared_history_rewritten` — Shared branches untouched
- [ ] `backup_created` — Safety branch exists for risky operations

### Phase 6: Conflict Resolution

**Resolve merge conflicts systematically, not by guessing.**

1. **Understand the Conflict**
   ```bash
   # See which files conflict
   git status

   # See what both sides changed
   git diff --merge
   git log --merge --oneline
   ```

2. **Resolve Each File**
   - Read BOTH sides of the conflict markers
   - Understand WHY each side made their change
   - Choose the resolution that preserves BOTH intents
   - If unsure, check the original commits for context

3. **Resolution Strategies**

   | Situation | Strategy |
   |-----------|----------|
   | One side is clearly correct | Take that side |
   | Both changes needed | Combine manually |
   | Changes are incompatible | Consult the other author |
   | Complex logic conflict | Write a new implementation that satisfies both |

4. **After Resolving**
   ```bash
   git add <resolved-files>
   git commit    # or git rebase --continue / git merge --continue
   ```

5. **Verify Resolution**
   - Run tests — conflicts often introduce subtle bugs
   - Review the merge commit diff — ensure nothing was lost
   - Check that both features still work as intended

**Completion criteria:**
- [ ] `all_conflicts_resolved` — No remaining conflict markers
- [ ] `both_intents_preserved` — No changes silently dropped
- [ ] `tests_pass` — Resolution doesn't break anything

## Verification Checklist

Before completing any git operation:

- [ ] Commit message matches repo's detected convention
- [ ] Each commit contains exactly one logical change
- [ ] No `git add .` used without reviewing all changes
- [ ] Shared branch history not rewritten without team agreement
- [ ] Tests pass at every commit (not just the last one)
- [ ] No conflict markers left in code (`<<<<<<<`, `=======`, `>>>>>>>`)
- [ ] Backup branch created before destructive operations

## Red Flags — STOP

| Thought | Reality |
|---------|---------|
| "I'll clean up the history later" | Later never comes. Clean it now. |
| "Just one big commit is fine" | Big commits are impossible to review, revert, or bisect. |
| "Nobody reads commit messages" | `git blame` and `git bisect` users do. Future-you does. |
| "Force push is fine, I'm the only one on this branch" | Verify first. CI, bots, and reviewers may have fetched. |
| "The merge conflict is obvious, just take mine" | Obvious conflicts hide subtle logic bugs. Read both sides. |
| "I'll squash on merge anyway" | Squash loses the story. Clean history beats squashed history. |
| "Rebase is scary, I'll just merge" | Merge commits obscure linear history. Learn rebase. |
| "This commit message is good enough" | Future readers have zero context. Be specific. |

**ALL of these mean: STOP. Follow the relevant phase.**

## Related Skills

| Skill | Relationship |
|-------|-------------|
| `refactoring` | Refactoring produces commits — use git-master for commit hygiene |
| `test-driven-development` | TDD cycle maps to atomic commits: one test + impl per commit |
| `pr-all-in-one` | PR preparation requires clean history — git-master feeds into it |
| `deployment-checklist` | Deploy from clean branches with verified history |

## Related Agents

| Agent | When to Involve |
|-------|----------------|
| Code Reviewer | When commit organization affects review quality |
| DevOps Engineer | When branch strategy impacts CI/CD pipeline |
