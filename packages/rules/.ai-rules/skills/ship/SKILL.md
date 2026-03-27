---
name: ship
description: "Run local CI checks and ship changes — create branch, commit, push, and PR. Optionally link to a GitHub issue. Use when changes are ready to ship."
---

# Ship Changes

Run local CI checks, then create branch, commit, push, and PR in one workflow.

Follow every step in order. Stop and report if any step fails.

## Step 1: Determine Issue Context

Check if `$ARGUMENTS` is provided:

- **With issue** (`/ship 613` or `/ship https://github.com/.../issues/613`):
  ```bash
  gh issue view <number> --json title,body,labels
  ```
  Use the issue title and labels to inform branch name, commit message, and PR description.

- **Without issue** (`/ship`):
  Skip issue fetch. Derive context entirely from the changed files and `git diff`. The user will be asked to confirm the commit message and PR title before proceeding.

## Step 2: Check Working Tree

```bash
git status
git diff --stat
```

If there are no changes to ship, stop and inform the user.

## Step 3: Detect Project Structure

Detect whether the project is a **monorepo** or **single-repo** by checking for configuration:

### Option A: Configured via `codingbuddy.config.json`

If `codingbuddy.config.json` exists and contains `custom.ship`, use it:

```jsonc
// codingbuddy.config.json
{
  "custom": {
    "ship": {
      "packageManager": "yarn",        // "yarn" | "npm" | "pnpm" | "bun"
      "structure": "monorepo",          // "monorepo" | "single"
      "workspaces": [
        {
          "name": "my-app",
          "paths": ["apps/my-app/**"],
          "checks": ["lint", "format:check", "typecheck", "test:coverage", "build"]
        },
        {
          "name": "my-lib",
          "paths": ["packages/my-lib/**"],
          "checks": ["lint", "typecheck", "test"]
        }
      ],
      "globalChecks": [
        {
          "name": "schema-validation",
          "command": "npx ajv-cli validate -s schema.json -d 'data/*.json'"
        },
        {
          "name": "markdown-lint",
          "command": "npx markdownlint-cli2 '**/*.md'"
        }
      ],
      "skipPaths": ["docs/**", "*.md", ".github/**"]
    }
  }
}
```

### Option B: Auto-detection (no config)

If no `custom.ship` config exists, auto-detect:

1. **Package manager**: Check for lock files in order: `bun.lock` → `pnpm-lock.yaml` → `yarn.lock` → `package-lock.json`. Default to `npm`.
2. **Structure**: Check `package.json` for `workspaces` field. If present → monorepo; otherwise → single-repo.
3. **Workspaces** (monorepo): Parse `workspaces` from `package.json`, resolve glob patterns against `git diff --name-only` to find affected workspaces.
4. **Checks** (auto): Run standard checks for each affected workspace:
   ```bash
   <pm> [workspace <name>] lint
   <pm> [workspace <name>] typecheck
   <pm> [workspace <name>] test
   <pm> [workspace <name>] build
   ```
   Where `<pm>` is the detected package manager and `workspace <name>` is included only for monorepos.

## Step 4: Classify Changed Files

Run `git diff --name-only` (include both staged and unstaged) and classify into workspaces.

**Monorepo**: Match changed file paths against workspace `paths` patterns to find affected workspaces.

**Single-repo**: All changes belong to the single workspace.

If changed files match only `skipPaths` (or don't match any workspace in auto-detect), skip CI checks entirely and proceed to Step 6.

## Step 5: Run Local CI Checks

### Workspace checks

Run checks **only for affected workspaces**. Execute checks sequentially within each workspace. Stop at first failure.

**Configured** (from `custom.ship.workspaces`):
```bash
# For each affected workspace, run each check:
<pm> workspace <workspace-name> <check>
```

**Auto-detected**:
```bash
# Monorepo — run for each affected workspace:
<pm> workspace <workspace-name> lint
<pm> workspace <workspace-name> typecheck
<pm> workspace <workspace-name> test
<pm> workspace <workspace-name> build

# Single-repo — run at project root:
<pm> run lint
<pm> run typecheck
<pm> run test
<pm> run build
```

Skip any script that does not exist in the workspace's `package.json` — check with `<pm> run --json` or by reading `package.json` scripts.

### Global checks

If `custom.ship.globalChecks` is configured, run each global check command after workspace checks pass:

```bash
<command>   # executed from project root
```

If ANY check fails, stop and report the failure. Do NOT proceed to shipping.

## Step 6: Check Commit Convention

```bash
git log --oneline -10
```

Identify the commit message convention from recent history. Common conventions:
- `type(scope): description` (Conventional Commits)
- `type: description`
- Free-form

## Step 7: Create Branch and Commit

### Branch naming

- **With issue:** `<type>/<short-description>-<issue-number>` (e.g., `feat/add-auth-613`)
- **Without issue:** `<type>/<short-description>` (e.g., `fix/login-redirect`)

### Commit

```bash
git checkout -b <branch-name>

# Stage relevant files (never use git add -A)
git add <specific-files>

# Exclude task artifacts from staging
git reset HEAD RESULT.json TASK.md 2>/dev/null || true

# Commit with convention — use HEREDOC for message
git commit -m "$(cat <<'EOF'
type(scope): concise description

- Detail 1
- Detail 2

Closes #<issue-number>   ← only if issue provided
EOF
)"
```

**Rules:**
- Write commit message in **English**
- Do NOT include author information
- Follow the detected convention from Step 6
- Use specific file paths in `git add` (never `git add -A` or `git add .`)
- Only include `Closes #<number>` if an issue was provided

## Step 8: Push and Create PR

```bash
git push -u origin <branch-name>
```

Create PR using `gh pr create`:

### With issue

```bash
gh pr create --title "<type>(scope): description" --label "<labels>" --body "$(cat <<'EOF'
## Summary
<bullet points summarizing changes>

## Test plan
<verification steps>

Closes #<issue-number>
EOF
)"
```

- Labels: detect from issue labels, add relevant ones

### Without issue

```bash
gh pr create --title "<type>(scope): description" --label "<labels>" --body "$(cat <<'EOF'
## Summary
<bullet points summarizing changes>

## Test plan
<verification steps>
EOF
)"
```

- Labels: infer from change type (e.g., `enhancement` for feat, `bug` for fix)

**PR Rules:**
- Title: under 70 characters, English, follows commit convention
- Body: English, include Summary + Test plan sections
- Do NOT include author information

## Step 9: Report Result

Print the PR URL and a summary of:
- Which CI checks were run and passed (or "skipped — no matching workspace")
- Branch name
- Commit hash
- PR URL
- Linked issue (or "none")
