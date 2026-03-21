---
name: taskmaestro
description: >-
  Orchestrate parallel Claude Code instances across tmux panes
  with git worktree isolation. Provides wave-transition automation,
  readiness detection via capture-pane polling, and trust/terms
  prompt auto-handling.
argument-hint: [wave-transition <issues> | launch <count> | status]
allowed-tools: Bash, Read, Grep, Glob
user-invocable: true
disable-model-invocation: true
---

# taskMaestro

Orchestrate parallel Claude Code workers in tmux panes with git worktree isolation.

Follow every step in order. Stop and report if any step fails.

## Prerequisites

- `tmux` installed and a session active
- Git repository with a clean working tree
- `claude` CLI available in PATH

## Constants

```bash
SESSION="taskmaestro"
WORKTREE_BASE=".taskmaestro"
PROMPT_PATTERN='⏵⏵|⏵ |❯'   # ERE pattern for grep -qE
MAX_READY_WAIT=90              # seconds to wait for Claude readiness
POLL_INTERVAL=2                # seconds between capture-pane checks
MAX_PROMPT_WAIT=30             # seconds to wait for trust/terms prompts
```

---

## Core Utilities

### Readiness Detection

Detect when a Claude Code instance is ready by polling `capture-pane` for the prompt indicator. **Never use fixed `sleep`** — always poll.

```bash
wait_for_ready() {
  local pane="$1"
  local max_wait="${2:-$MAX_READY_WAIT}"
  local elapsed=0

  while [ "$elapsed" -lt "$max_wait" ]; do
    local content
    content=$(tmux capture-pane -t "$pane" -p 2>/dev/null)

    # Check for Claude Code prompt indicators
    if echo "$content" | grep -qE "$PROMPT_PATTERN"; then
      return 0
    fi

    sleep "$POLL_INTERVAL"
    elapsed=$((elapsed + POLL_INTERVAL))
  done

  echo "TIMEOUT: pane $pane not ready after ${max_wait}s" >&2
  return 1
}
```

**Key points:**
- Returns `0` on success (prompt detected), `1` on timeout
- Caller decides how to handle timeout (retry, skip, abort)
- `POLL_INTERVAL=2` balances responsiveness vs overhead

### Trust/Terms Prompt Handling

Detect and automatically respond to trust/terms prompts that appear during Claude Code startup.

```bash
handle_prompts() {
  local pane="$1"
  local max_wait="${2:-$MAX_PROMPT_WAIT}"
  local elapsed=0
  local handled=0

  while [ "$elapsed" -lt "$max_wait" ]; do
    local content
    content=$(tmux capture-pane -t "$pane" -p 2>/dev/null)

    # Trust project directory prompt — press Enter to accept
    if echo "$content" | grep -qiE 'trust.*directory|trust.*folder|Do you trust'; then
      tmux send-keys -t "$pane" Enter
      sleep 1
      handled=$((handled + 1))
      continue
    fi

    # Terms of service / license agreement — navigate and accept
    if echo "$content" | grep -qiE 'terms of service|license agreement|accept.*terms'; then
      tmux send-keys -t "$pane" Down
      sleep 0.5
      tmux send-keys -t "$pane" Enter
      sleep 1
      handled=$((handled + 1))
      continue
    fi

    # Yes/No confirmation prompt
    if echo "$content" | grep -qiE 'Yes.*No.*\?|y/n|Y/N'; then
      tmux send-keys -t "$pane" "y" Enter
      sleep 1
      handled=$((handled + 1))
      continue
    fi

    # If prompt is ready, we're done
    if echo "$content" | grep -qE "$PROMPT_PATTERN"; then
      break
    fi

    sleep "$POLL_INTERVAL"
    elapsed=$((elapsed + POLL_INTERVAL))
  done

  return "$handled"  # number of prompts handled (0 = none encountered)
}
```

**Known prompt patterns:**

| Pattern | Action | Description |
|---------|--------|-------------|
| `trust.*directory` | `Enter` | Trust project directory |
| `terms of service` | `Down` + `Enter` | Accept terms |
| `Yes.*No` / `y/n` | `y` + `Enter` | Generic confirmation |

### Startup Sequence

Combines trust/terms handling with readiness detection in the correct order:

```bash
wait_for_startup() {
  local pane="$1"

  # Phase 1: Handle any trust/terms prompts
  handle_prompts "$pane" "$MAX_PROMPT_WAIT"

  # Phase 2: Wait for Claude to be fully ready
  if ! wait_for_ready "$pane" "$MAX_READY_WAIT"; then
    echo "ERROR: pane $pane failed to reach ready state" >&2
    return 1
  fi

  return 0
}
```

---

## Wave Transition

Transition from one wave to the next in a single operation. Stops current workers, cleans up worktrees, creates fresh ones, launches Claude Code, and assigns new tasks.

### Input

```
wave_transition <issues> [--prompt <text>] [--panes <n>]

  <issues>   Comma-separated issue numbers (e.g., "732,733,734")
  --prompt   Custom prompt prefix (default: "AUTO: Issue #<N> 구현")
  --panes    Number of panes (default: matches issue count)
```

### Process

#### Step 1: Stop Current Workers

Send `/exit` to each active pane and wait for termination:

```bash
stop_workers() {
  local panes
  panes=$(tmux list-panes -t "$SESSION" -F '#{pane_index}' 2>/dev/null)

  for pane in $panes; do
    # Send /exit command
    tmux send-keys -t "${SESSION}:0.${pane}" "/exit" Enter
  done

  # Wait for all panes to terminate
  sleep 3

  # Verify — force kill any remaining
  for pane in $panes; do
    local pid
    pid=$(tmux display-message -t "${SESSION}:0.${pane}" -p '#{pane_pid}' 2>/dev/null)
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      tmux send-keys -t "${SESSION}:0.${pane}" C-c
      sleep 1
    fi
  done
}
```

#### Step 2: Clean Existing Worktrees

Remove worktrees from the previous wave:

```bash
clean_worktrees() {
  local base_dir="${WORKTREE_BASE}"

  for wt_dir in "${base_dir}"/wt-*; do
    [ -d "$wt_dir" ] || continue
    git worktree remove "$wt_dir" --force 2>/dev/null || rm -rf "$wt_dir"
  done

  # Prune stale worktree references
  git worktree prune
}
```

#### Step 3: Create New Worktrees

Create fresh worktrees from master for each pane:

```bash
create_worktrees() {
  local count="$1"

  # Ensure master is up to date
  git fetch origin master:master 2>/dev/null || true

  for i in $(seq 1 "$count"); do
    local wt_dir="${WORKTREE_BASE}/wt-${i}"
    local branch="taskmaestro/$(date +%s)/pane-${i}"
    git worktree add "$wt_dir" -b "$branch" master
  done
}
```

#### Step 4: Launch Claude Code Instances

Launch Claude Code in each pane, pointing to the corresponding worktree:

```bash
launch_workers() {
  local count="$1"

  # Kill existing session if present
  tmux kill-session -t "$SESSION" 2>/dev/null || true

  # Create new session with first pane
  tmux new-session -d -s "$SESSION" -c "${WORKTREE_BASE}/wt-1"
  tmux send-keys -t "${SESSION}:0.0" "claude" Enter

  # Create additional panes
  for i in $(seq 2 "$count"); do
    tmux split-window -t "$SESSION" -c "${WORKTREE_BASE}/wt-${i}"
    tmux send-keys -t "${SESSION}:0.$((i-1))" "claude" Enter
    tmux select-layout -t "$SESSION" tiled
  done
}
```

#### Step 5: Wait for All Workers Ready

Poll each pane for readiness using `wait_for_startup`:

```bash
wait_all_ready() {
  local count="$1"
  local failed=0

  for i in $(seq 0 $((count - 1))); do
    local pane="${SESSION}:0.${i}"

    if ! wait_for_startup "$pane"; then
      echo "WARNING: pane ${i} not ready, will retry once" >&2
      # Retry: restart Claude in this pane
      tmux send-keys -t "$pane" C-c
      sleep 1
      tmux send-keys -t "$pane" "claude" Enter
      if ! wait_for_startup "$pane"; then
        echo "ERROR: pane ${i} failed after retry" >&2
        failed=$((failed + 1))
      fi
    fi
  done

  return "$failed"
}
```

#### Step 6: Assign Tasks

Send the work prompt to each ready pane:

```bash
assign_tasks() {
  local -a issues=("$@")

  for i in "${!issues[@]}"; do
    local pane="${SESSION}:0.${i}"
    local issue="${issues[$i]}"
    local prompt="AUTO: Issue #${issue} 구현"

    # Verify pane is ready before sending
    if ! tmux capture-pane -t "$pane" -p | grep -qE "$PROMPT_PATTERN"; then
      echo "SKIP: pane ${i} not ready, skipping issue #${issue}" >&2
      continue
    fi

    tmux send-keys -t "$pane" "$prompt" Enter
    echo "ASSIGNED: pane ${i} <- issue #${issue}"
  done
}
```

### Full Wave Transition

Combines all steps into one operation:

```bash
wave_transition() {
  local issues_csv="$1"
  local custom_prompt="${2:-}"

  # Parse issues
  IFS=',' read -ra ISSUES <<< "$issues_csv"
  local count=${#ISSUES[@]}

  echo "=== Wave Transition: ${count} issues ==="

  # Step 1: Stop current workers
  echo "[1/6] Stopping current workers..."
  stop_workers

  # Step 2: Clean worktrees
  echo "[2/6] Cleaning worktrees..."
  clean_worktrees

  # Step 3: Create new worktrees
  echo "[3/6] Creating ${count} worktrees..."
  create_worktrees "$count"

  # Step 4: Launch Claude Code
  echo "[4/6] Launching Claude Code instances..."
  launch_workers "$count"

  # Step 5: Wait for readiness
  echo "[5/6] Waiting for readiness..."
  local failed
  wait_all_ready "$count"
  failed=$?
  if [ "$failed" -gt 0 ]; then
    echo "WARNING: ${failed} pane(s) failed to initialize"
  fi

  # Step 6: Assign tasks
  echo "[6/6] Assigning tasks..."
  assign_tasks "${ISSUES[@]}"

  echo "=== Wave Transition Complete ==="
  echo "Session: tmux attach -t $SESSION"
}
```

---

## Commands

### `/taskmaestro wave-transition <issues>`

Run the full wave transition:

```bash
# Example: transition to wave 2 with issues 740, 741, 742
/taskmaestro wave-transition 740,741,742
```

Execute `wave_transition` with the provided issue list.

### `/taskmaestro launch <count>`

Launch fresh workers without stopping existing ones:

```bash
# Example: launch 3 new workers
/taskmaestro launch 3
```

Execute steps 3-6 only (create worktrees, launch, wait, but no task assignment).

### `/taskmaestro status`

Check the status of all active panes:

```bash
status_check() {
  local panes
  panes=$(tmux list-panes -t "$SESSION" -F '#{pane_index}' 2>/dev/null)

  if [ -z "$panes" ]; then
    echo "No active taskMaestro session"
    return 1
  fi

  for pane in $panes; do
    local target="${SESSION}:0.${pane}"
    local content
    content=$(tmux capture-pane -t "$target" -p 2>/dev/null | tail -5)

    local state="unknown"
    if echo "$content" | grep -qE "$PROMPT_PATTERN"; then
      state="idle"
    elif echo "$content" | grep -qiE 'error|fail'; then
      state="error"
    else
      state="working"
    fi

    local wt_dir="${WORKTREE_BASE}/wt-$((pane + 1))"
    local branch="none"
    if [ -d "$wt_dir" ]; then
      branch=$(git -C "$wt_dir" branch --show-current 2>/dev/null || echo "detached")
    fi

    echo "pane-${pane}: ${state} | branch: ${branch}"
  done
}
```

---

## Error Handling

| Failure | Recovery |
|---------|----------|
| Pane not ready after timeout | Restart Claude in that pane, retry once |
| Worktree removal fails | `rm -rf` as fallback, then `git worktree prune` |
| `git fetch` fails | Continue with local master (warn user) |
| tmux session missing | Create new session from scratch |
| Trust/terms prompt not recognized | Log the captured content, wait for manual intervention |

## Important Notes

- **Never use fixed `sleep` for readiness** — always use `wait_for_ready()` with capture-pane polling
- **Always call `handle_prompts()` before `wait_for_ready()`** — trust/terms prompts block the ready state
- **Wave transition is atomic** — if any critical step fails (worktree creation, launch), abort and report
- **Pane indices are 0-based** in tmux but worktree dirs are 1-based (`wt-1`, `wt-2`, ...)
