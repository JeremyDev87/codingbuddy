---
name: ship
description: Run local CI checks and ship changes — create branch, commit, push, and PR. Optionally link to a GitHub issue. Use `--full` to run all workspace checks. Use when changes are ready to ship.
argument-hint: "[--full] [issue-url-or-number]"
allowed-tools: Bash, Read, Grep, Glob, mcp__codingbuddy__pr_quality_report
user-invocable: true
disable-model-invocation: true
---

# Ship Changes

Follow every step in order. Stop and report if any step fails.

## Step 1: Parse Arguments and Determine Issue Context

Parse `$ARGUMENTS` for:
- **`--full` flag**: If present, run ALL workspace checks (matches CI exactly). Remove `--full` from arguments before processing issue context.
- **Issue context**: Remaining argument is an issue number or URL.

Check if issue context is provided:

- **With issue** (`/ship 613` or `/ship --full 613`):
  ```bash
  gh issue view <number> --json title,body,labels
  ```
  Use the issue title and labels to inform branch name, commit message, and PR description.

- **Without issue** (`/ship` or `/ship --full`):
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

**Docs-only changes**: If changed files don't match any pattern above (e.g., docs-only, root config) AND `--full` is NOT set, skip all CI checks (including security) and proceed to Step 7.

**`--full` mode**: If `--full` flag is set, mark ALL workspaces as affected regardless of changed files.

## Step 3.5: Verify Dependencies

Before running CI checks, ensure project dependencies are available:

```bash
# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "node_modules missing, installing dependencies..."
  yarn install --frozen-lockfile
fi

# Verify npx is available
npx --version
```

- If `node_modules` does not exist, run `yarn install --frozen-lockfile`
- If install fails → **STOP**. Do NOT proceed to CI checks or PR creation.
- Verify `npx` is available by running `npx --version`

**Iron Law:** Never skip CI checks due to missing dependencies.

## Step 4: Run Cross-cutting Security Checks

**Security is cross-cutting** — always run security audit for ALL workspaces when any workspace has changes, even if only one workspace is affected. This matches CI behavior where all security jobs run on every triggered push.

```bash
yarn workspace codingbuddy npm audit --severity high
yarn workspace codingbuddy-claude-plugin npm audit --severity high
yarn workspace landing-page npm audit --severity high
```

If ANY security check fails, stop and report the failure. Do NOT proceed to shipping.

## Step 5: Run Local CI Checks

Run checks for **affected workspaces only** (or ALL workspaces if `--full` is set). Execute checks sequentially within each workspace. Stop at first failure.

**Note:** Security audits were already run in Step 4 for all workspaces — do not repeat them here.

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

## Step 6: Check Commit Convention

```bash
git log --oneline -10
```

Identify the commit message convention. This project uses: `type(scope): description`

Common types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`, `ci`

## Step 7: Create Branch and Commit

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
- Follow the detected convention from Step 6
- Use specific file paths in `git add` (never `git add -A` or `git add .`)
- **Never stage `RESULT.json` or `TASK.md`** — these are ephemeral per-worktree artifacts and must not be committed
- Only include `Closes #<number>` if an issue was provided

## Step 8: Push

```bash
git push -u origin <branch-name>
```

## Step 9: Quality Gate (PR Guardian)

Before creating the PR, run an automated quality check:

1. Get changed files:
   ```bash
   git diff --name-only origin/master...HEAD
   ```
2. Call `pr_quality_report` MCP tool with the file list
3. The tool will:
   - Auto-detect relevant domains (security, accessibility, code-quality, performance)
   - Run specialist analysis on each domain
   - Return a formatted Quality Report
4. Include the Quality Report in the PR body under a `## CodingBuddy Quality Report` section
5. If any domain has status `fail`, warn the user before proceeding
6. If the tool times out or returns a partial result, include whatever is available and note any incomplete domains

## Step 10: Create PR

Create PR using `gh pr create`:

### With issue

```bash
gh pr create --title "<type>(scope): description" --label "<labels>" --body "$(cat <<'EOF'
## Summary
<bullet points summarizing changes>

## CodingBuddy Quality Report
<quality report from Step 9>

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

## CodingBuddy Quality Report
<quality report from Step 9>

## Test plan
<verification steps>
EOF
)"
```

- Labels: infer from change type (e.g., `documentation` for docs, `enhancement` for feat, `bug` for fix)

**PR Rules:**
- Title: under 70 characters, English, follows commit convention
- Body: English, include Summary + Test plan + CodingBuddy Quality Report sections
- Do NOT include author information

## Step 11: Report Result

Print the PR URL and a summary of:
- Which CI checks were run and passed (or "skipped — no matching workspace")
- Security checks: always-run status for all workspaces
- Whether `--full` mode was used
- Branch name
- Commit hash
- PR URL
- Linked issue (or "none")
