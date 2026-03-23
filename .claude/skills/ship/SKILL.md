---
name: ship
description: Run local CI checks and ship changes — create branch, commit, push, and PR. Optionally link to a GitHub issue. Use when changes are ready to ship.
argument-hint: [issue-url-or-number]
allowed-tools: Bash, Read, Grep, Glob
user-invocable: true
disable-model-invocation: true
---

# Ship Changes

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

## Step 3: Detect Affected Workspaces

Run `git diff --name-only` (include both staged and unstaged changes) and classify changed files into workspaces:

| Path Pattern | Workspace | Checks |
|-------------|-----------|--------|
| `apps/mcp-server/**` | `codingbuddy` | lint, format:check, typecheck, test:coverage, circular, build |
| `packages/rules/**` | `codingbuddy` + rules-validation | Above + `ajv-cli validate` + `markdownlint-cli2` |
| `packages/claude-code-plugin/**` | `codingbuddy-claude-plugin` | lint, format:check, typecheck, test:coverage, circular, build |
| `apps/landing-page/**` | `landing-page` | lint, format:check, typecheck, test:coverage, check:circular, build |
| `.claude/**`, `.cursor/**`, `.antigravity/**`, `.codex/**`, `.github/**`, `scripts/**` | rules-validation only | `ajv-cli validate` + `markdownlint-cli2` |

If changed files don't match any pattern (e.g., docs-only, root config), skip CI checks entirely and proceed to Step 5.

## Step 4: Run Local CI Checks

Run checks **only for affected workspaces**. Execute checks sequentially within each workspace. Stop at first failure.

### codingbuddy workspace

```bash
yarn workspace codingbuddy lint
yarn workspace codingbuddy format:check
yarn workspace codingbuddy typecheck
yarn workspace codingbuddy test:coverage
yarn workspace codingbuddy circular
yarn workspace codingbuddy build
```

### codingbuddy-claude-plugin workspace

```bash
yarn workspace codingbuddy-claude-plugin lint
yarn workspace codingbuddy-claude-plugin format:check
yarn workspace codingbuddy-claude-plugin typecheck
yarn workspace codingbuddy-claude-plugin test:coverage
yarn workspace codingbuddy-claude-plugin circular
yarn workspace codingbuddy-claude-plugin build
```

### landing-page workspace

```bash
yarn workspace landing-page lint
yarn workspace landing-page format:check
yarn workspace landing-page typecheck
yarn workspace landing-page test:coverage
yarn workspace landing-page check:circular
yarn workspace landing-page build
```

### rules-validation

```bash
yarn dlx ajv-cli@5.0.0 validate -s packages/rules/.ai-rules/schemas/agent.schema.json -d "packages/rules/.ai-rules/agents/*.json" --spec=draft7
yarn dlx markdownlint-cli2@0.20.0 "packages/rules/.ai-rules/**/*.md"
```

If ANY check fails, stop and report the failure. Do NOT proceed to shipping.

## Step 5: Check Commit Convention

```bash
git log --oneline -10
```

Identify the commit message convention. This project uses: `type(scope): description`

Common types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`, `ci`

## Step 6: Create Branch and Commit

### Branch naming

- **With issue:** `<type>/<short-description>-<issue-number>` (e.g., `docs/opencode-audit-613`)
- **Without issue:** `<type>/<short-description>` (e.g., `docs/update-opencode-adapter`)

### Commit

```bash
git checkout -b <branch-name>

# Stage relevant files (never use git add -A)
git add <specific-files>

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
- Follow the detected convention from Step 5
- Use specific file paths in `git add` (never `git add -A` or `git add .`)
- **Never stage `RESULT.json` or `TASK.md`** — these are ephemeral per-worktree artifacts and must not be committed
- Only include `Closes #<number>` if an issue was provided

## Step 7: Push and Create PR

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

- Labels: infer from change type (e.g., `documentation` for docs, `enhancement` for feat, `bug` for fix)

**PR Rules:**
- Title: under 70 characters, English, follows commit convention
- Body: English, include Summary + Test plan sections
- Do NOT include author information

## Step 8: Report Result

Print the PR URL and a summary of:
- Which CI checks were run and passed (or "skipped — no matching workspace")
- Branch name
- Commit hash
- PR URL
- Linked issue (or "none")
