# fix(taskmaestro): yarn install pre-flight + mandatory pre-push verification

## Issue

GitHub Issue: #1032

## Root Cause

`git worktree add` checks out source code but does NOT include `node_modules/`.
When workers run `yarn prettier`, `yarn lint`, or `yarn test`, they fail with
"node_modules state file not found" errors. Workers often ignore these and push,
causing repeated CI failures.

## Changes Applied (to `~/.claude/skills/taskmaestro/SKILL.md`)

### 1. Pre-Flight `yarn install` (Step 4.5)

Added dependency installation to the worker pre-flight verification step:

```bash
# 3. Install dependencies (CRITICAL — without this, yarn prettier/lint/test all fail)
echo "Installing dependencies in wt-$PANE_IDX..."
(cd "$WT_PATH" && yarn install --immutable 2>/dev/null) || echo "WARNING: yarn install failed in wt-$PANE_IDX"
```

This runs **before** launching Claude Code in each worktree, ensuring `node_modules/`
is available when workers execute local CI checks.

### 2. Mandatory Pre-Push Verification (Worker Prompt Template)

Added a `[MANDATORY PRE-PUSH VERIFICATION]` section to the worker prompt template
in the `assign` subcommand. Workers are now instructed to run these checks before
every `git push`:

1. `yarn prettier --write .`
2. `yarn lint --fix`
3. `yarn type-check`
4. `yarn test`

All four must pass before pushing. This catches issues locally before they reach CI.

## Impact

- Eliminates the most common cause of CI failures from taskmaestro workers
- Workers can now run local validation reliably in isolated worktrees
- Pre-push verification acts as a second safety net even if pre-flight is skipped
