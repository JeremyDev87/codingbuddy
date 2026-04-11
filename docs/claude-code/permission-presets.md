# Permission Presets

Pre-registered permission sets for `.claude/settings.local.json` to streamline common workflows.

---

## Presets

### 1. parallel-execution (Active)

For multi-agent parallel execution via tmux/worktrees. Covers git operations, CI tooling, and project editing.

**Allowed CLI Tools:**

| Tool | Purpose |
|------|---------|
| `git` | Version control (granular subcommands, not blanket `git:*`) |
| `gh` | GitHub CLI (issues, PRs, checks, releases) |
| `tmux` | Terminal multiplexer for parallel pane management |
| `yarn` | Package manager and script runner |
| `node` | Node.js runtime |
| `cat` | File content reading |
| `ls` | Directory listing |
| `mkdir` | Directory creation |
| `sleep` | Wait/delay operations |

**Allowed Edit Paths:**

| Path | Scope |
|------|-------|
| `.claude/**` | Claude Code configuration |
| `packages/rules/**` | AI coding rules package |
| `packages/rules/.ai-rules/**` | Shared AI rules (subset of above, explicit) |
| `apps/mcp-server/**` | MCP server application |
| `docs/**` | Documentation |

**Allowed MCP Tools:**

| Pattern | Purpose |
|---------|---------|
| `mcp__codingbuddy__*` | All codingbuddy MCP tools (parse_mode, update_context, etc.) |

### 2. development

For local development and testing. Covers package management and source code editing.

**Allowed CLI Tools:**

| Tool | Purpose |
|------|---------|
| `git` | Version control (granular subcommands) |
| `yarn` | Package manager |
| `npm` | Alternative package manager |
| `node` | Node.js runtime |
| `npx` | Package runner |

**Allowed Edit Paths:**

| Path | Scope |
|------|-------|
| `src/**` | Source code |
| `tests/**` | Test files |
| `packages/**` | All packages |

**To activate**, replace the `allow` array in `.claude/settings.local.json`:

```json
{
  "permissions": {
    "allow": [
      "Bash(git status:*)",
      "Bash(git diff:*)",
      "Bash(git log:*)",
      "Bash(git add:*)",
      "Bash(git commit:*)",
      "Bash(git checkout:*)",
      "Bash(git branch:*)",
      "Bash(git fetch:*)",
      "Bash(git pull:*)",
      "Bash(git stash:*)",
      "Bash(git worktree:*)",
      "Bash(git remote:*)",
      "Bash(git cherry-pick:*)",
      "Bash(git rebase:*)",
      "Bash(git rev-parse:*)",
      "Bash(git -C:*)",
      "Bash(git push -u origin:*)",
      "Bash(git push origin:*)",
      "Bash(yarn:*)",
      "Bash(npm:*)",
      "Bash(node:*)",
      "Bash(npx:*)",
      "Edit(src/**)",
      "Edit(tests/**)",
      "Edit(packages/**)"
    ],
    "deny": [
      "Bash(rm -rf:*)",
      "Bash(git push --force:*)",
      "Bash(git push -f:*)",
      "Bash(git reset --hard:*)",
      "Bash(git clean -f:*)",
      "Bash(git checkout -- .)",
      "Bash(git restore .)"
    ]
  }
}
```

---

## Security: Denied Commands

Both presets share the same deny list. These destructive commands are **always blocked**:

| Pattern | Risk |
|---------|------|
| `rm -rf` | Recursive forced deletion |
| `git push --force` / `git push -f` | Overwrites remote history |
| `git reset --hard` | Discards all uncommitted changes |
| `git clean -f` | Deletes untracked files |
| `git checkout -- .` | Discards all working tree changes |
| `git restore .` | Discards all working tree changes |

The `deny` list takes precedence over `allow` — even if a command matches an allow pattern, it will be blocked if it also matches a deny pattern.

---

## How to Switch Presets

1. Open `.claude/settings.local.json`
2. Replace the `allow` array with the desired preset's permissions
3. Keep the `deny` array unchanged (shared across all presets)

> **Note:** `.claude/settings.local.json` is gitignored and local to each developer. Do not modify `.claude/settings.json` (the shared, checked-in configuration).
