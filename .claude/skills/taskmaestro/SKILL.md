---
name: taskmaestro
description: >-
  Orchestrate parallel Claude Code instances across tmux panes
  with git worktree isolation. Provides wave-transition automation,
  readiness detection via capture-pane polling, and trust/terms
  prompt auto-handling.
argument-hint: "wave-transition <issues> | launch <count> | status | stop | cleanup [--force]"
allowed-tools: Bash, Read, Grep, Glob
user-invocable: true
disable-model-invocation: true
---

# taskMaestro

Orchestrate parallel Claude Code workers in tmux panes with git worktree isolation.

Follow every step in order. Stop and report if any step fails.

## Step 0: Prerequisite Check

Run these checks at the start of every command. Each check is idempotent — zero overhead when already satisfied.

```bash
check_prerequisites() {
  # --- 1. tmux installed? ---
  if ! command -v tmux &>/dev/null; then
    echo "ERROR: tmux is not installed." >&2

    # Detect OS and suggest install command
    case "$(uname -s)" in
      Darwin)
        if command -v brew &>/dev/null; then
          echo "Detected macOS with Homebrew." >&2
          echo "Run: brew install tmux" >&2
          # Safe to auto-execute (no sudo required)
          # Use AskUserQuestion to confirm before running
          return 1
        else
          echo "Detected macOS without Homebrew." >&2
          echo "Install Homebrew first: https://brew.sh" >&2
          echo "Then run: brew install tmux" >&2
          return 1
        fi
        ;;
      Linux)
        if [ -f /etc/os-release ]; then
          . /etc/os-release
          case "$ID" in
            ubuntu|debian)
              echo "Detected $PRETTY_NAME." >&2
              echo "Run: sudo apt install -y tmux" >&2
              ;;
            alpine)
              echo "Detected Alpine Linux." >&2
              echo "Run: apk add tmux" >&2
              ;;
            fedora|rhel|centos)
              echo "Detected $PRETTY_NAME." >&2
              echo "Run: sudo dnf install -y tmux" >&2
              ;;
            arch|manjaro)
              echo "Detected $PRETTY_NAME." >&2
              echo "Run: sudo pacman -S tmux" >&2
              ;;
            *)
              echo "Detected Linux ($PRETTY_NAME)." >&2
              echo "Install tmux using your package manager." >&2
              ;;
          esac
        else
          echo "Detected Linux (unknown distro)." >&2
          echo "Install tmux using your package manager." >&2
        fi
        return 1
        ;;
      *)
        echo "Unsupported OS: $(uname -s)" >&2
        echo "Install tmux manually: https://github.com/tmux/tmux/wiki/Installing" >&2
        return 1
        ;;
    esac
  fi

  # --- 2. Running inside tmux session? ---
  if [ -z "$TMUX" ]; then
    echo "WARNING: Not inside a tmux session." >&2
    echo "Creating new tmux session '${SESSION}'..." >&2
    tmux new-session -d -s "$SESSION" 2>/dev/null || true
    echo "Re-enter with: tmux attach -t $SESSION" >&2
    return 1
  fi

  # --- 3. Git repository? ---
  if ! git rev-parse --is-inside-work-tree &>/dev/null; then
    echo "ERROR: Not inside a git repository." >&2
    echo "Run this command from a git project root." >&2
    return 1
  fi

  return 0
}
```

**Check summary:**

| Check | Pass | Fail |
|-------|------|------|
| `command -v tmux` | Continue | Detect OS → suggest install command |
| `$TMUX` set | Continue | Create session → ask user to re-enter |
| `git rev-parse` | Continue | Error and abort |

**Install commands by OS:**

| OS | Command | Auto-executable? |
|----|---------|-------------------|
| macOS (Homebrew) | `brew install tmux` | Yes — no sudo, confirm via AskUserQuestion |
| Ubuntu / Debian | `sudo apt install -y tmux` | No — show command for user |
| Alpine | `apk add tmux` | No — show command for user |
| Fedora / RHEL | `sudo dnf install -y tmux` | No — show command for user |
| Arch / Manjaro | `sudo pacman -S tmux` | No — show command for user |
| Other | Manual install | No — link to tmux wiki |

**Integration:** Call `check_prerequisites` at the top of `wave_transition()`, `launch_workers()`, and `status_check()` before any tmux operations.

## Constants

```bash
SESSION="taskmaestro"
WORKTREE_BASE=".taskmaestro"
PROMPT_PATTERN='⏵⏵|⏵ |❯'   # ERE pattern for grep -qE
MAX_READY_WAIT=90              # seconds to wait for Claude readiness
POLL_INTERVAL=2                # seconds between capture-pane checks
MAX_PROMPT_WAIT=30             # seconds to wait for trust/terms prompts
# Layout & Colors
CONDUCTOR_BG="#1a1a2e"          # dark navy background
CONDUCTOR_BORDER="#E67E22"      # orange border
WORKER_ERROR_BORDER="#E74C3C"   # red border (error state)
WORKER_DONE_BORDER="#27AE60"    # green border (complete state)
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

### Conductor Layout

Rearrange panes so the conductor (pane 0) occupies the bottom 25% of the window and workers fill the upper 75% in a tiled grid. Must run after `launch_workers()`.

```bash
setup_conductor_layout() {
  local count="$1"  # total pane count

  if [ "$count" -lt 2 ]; then
    # Single pane — apply conductor styling only
    tmux select-pane -t "${SESSION}:0.0" -P "bg=${CONDUCTOR_BG}"
    tmux set-option -p -t "${SESSION}:0.0" \
      pane-border-style "fg=${CONDUCTOR_BORDER}"
    tmux set-option -p -t "${SESSION}:0.0" \
      pane-active-border-style "fg=${CONDUCTOR_BORDER}"
    return 0
  fi

  local last=$((count - 1))

  # Move conductor (pane 0) to full-width bottom at 25% height
  tmux swap-pane -s "${SESSION}:0.0" -t "${SESSION}:0.${last}"
  tmux break-pane -t "${SESSION}:0.${last}" -d
  [ "$last" -gt 1 ] && tmux select-layout -t "${SESSION}:0" tiled
  tmux join-pane -fv -s "${SESSION}:1" -t "${SESSION}:0" -l "25%"

  # Conductor is now the last pane after rejoin
  local cond
  cond=$(tmux list-panes -t "${SESSION}:0" -F '#{pane_index}' | tail -1)

  # Session continuity: resume Claude if interrupted by pane move
  sleep 1
  if ! tmux capture-pane -t "${SESSION}:0.${cond}" -p 2>/dev/null \
       | grep -qE "${PROMPT_PATTERN}"; then
    tmux send-keys -t "${SESSION}:0.${cond}" "claude --resume" Enter
  fi

  # Apply conductor color scheme
  tmux select-pane -t "${SESSION}:0.${cond}" -P "bg=${CONDUCTOR_BG}"
  tmux set-option -p -t "${SESSION}:0.${cond}" \
    pane-border-style "fg=${CONDUCTOR_BORDER}"
  tmux set-option -p -t "${SESSION}:0.${cond}" \
    pane-active-border-style "fg=${CONDUCTOR_BORDER}"
}
```

**Layout procedure:**

| Step | tmux Command | Effect |
|------|-------------|--------|
| 1. Swap | `swap-pane -s :0.0 -t :0.$last` | Move conductor content to last position |
| 2. Break | `break-pane -t :0.$last -d` | Isolate conductor in temporary window |
| 3. Tile | `select-layout tiled` | Arrange workers in grid |
| 4. Join | `join-pane -fv -l 25%` | Conductor rejoins at full-width bottom |
| 5. Resume | `claude --resume` | Restore Claude session if interrupted |
| 6. Style | `select-pane -P`, `set-option -p` | Apply conductor colors |

**Color scheme:**

| Element | Property | Value | Visual |
|---------|----------|-------|--------|
| Conductor background | `bg` | `#1a1a2e` | Dark navy |
| Conductor border | `pane-border-style fg` | `#E67E22` | Orange |
| Worker (normal) | — | terminal default | — |
| Worker (error) | `pane-border-style fg` | `#E74C3C` | Red |
| Worker (complete) | `pane-border-style fg` | `#27AE60` | Green |

### Worker Status Colors

Update a worker pane's border color to reflect its current state:

```bash
set_worker_status() {
  local pane="$1"   # target pane (e.g., "${SESSION}:0.2")
  local status="$2" # "error", "complete", or "normal"

  case "$status" in
    error)
      tmux set-option -p -t "$pane" pane-border-style "fg=${WORKER_ERROR_BORDER}"
      tmux set-option -p -t "$pane" pane-active-border-style "fg=${WORKER_ERROR_BORDER}"
      ;;
    complete)
      tmux set-option -p -t "$pane" pane-border-style "fg=${WORKER_DONE_BORDER}"
      tmux set-option -p -t "$pane" pane-active-border-style "fg=${WORKER_DONE_BORDER}"
      ;;
    normal|*)
      tmux set-option -p -t "$pane" -u pane-border-style
      tmux set-option -p -t "$pane" -u pane-active-border-style
      ;;
  esac
}
```

**Status transitions:**

| Status | Border Color | When |
|--------|-------------|------|
| `normal` | terminal default | Initial state / reset |
| `error` | `#E74C3C` (red) | Worker hits error or test failure |
| `complete` | `#27AE60` (green) | Worker finishes successfully |

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

    # Artifact cleanup: remove ephemeral files that may exist from previous runs
    rm -f "${wt_dir}/RESULT.json" "${wt_dir}/TASK.md"
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

    # Worker prompt includes git add safety rules and artifact commit ban
    local prompt="Read the file TASK.md in this directory carefully and execute ALL instructions exactly as written. Follow codingbuddy PLAN→ACT→EVAL. Run 'yarn install' first if node_modules missing. NEVER use 'git add -A' — always stage specific files. If errors occur, diagnose and fix yourself. Use /ship to create PR, then write RESULT.json. Start now."

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
  echo "[1/7] Stopping current workers..."
  stop_workers

  # Step 2: Clean worktrees
  echo "[2/7] Cleaning worktrees..."
  clean_worktrees

  # Step 3: Create new worktrees
  echo "[3/7] Creating ${count} worktrees..."
  create_worktrees "$count"

  # Step 4: Launch Claude Code
  echo "[4/7] Launching Claude Code instances..."
  launch_workers "$count"

  # Step 5: Setup conductor layout
  echo "[5/7] Setting up conductor layout..."
  setup_conductor_layout "$count"

  # Step 6: Wait for readiness
  echo "[6/7] Waiting for readiness..."
  local failed
  wait_all_ready "$count"
  failed=$?
  if [ "$failed" -gt 0 ]; then
    echo "WARNING: ${failed} pane(s) failed to initialize"
  fi

  # Step 7: Assign tasks
  echo "[7/7] Assigning tasks..."
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

Execute steps 3-7 only (create worktrees, launch, conductor layout, wait, but no task assignment).

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
    local wt_dir="${WORKTREE_BASE}/wt-$((pane + 1))"
    local branch="none"
    if [ -d "$wt_dir" ]; then
      branch=$(git -C "$wt_dir" branch --show-current 2>/dev/null || echo "detached")
    fi

    # --- 3-Factor Analysis (30-line scan) ---
    local content
    content=$(tmux capture-pane -t "$target" -p 2>/dev/null | tail -30)

    # Factor 1: Error scan (30 lines, not 8)
    local has_error=false
    if echo "$content" | grep -qiE 'error|fail|exception|panic|FATAL'; then
      has_error=true
    fi

    # Factor 2: Active spinner detection (animating characters)
    local has_active_spinner=false
    if echo "$content" | grep -qE '[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]'; then
      has_active_spinner=true
    fi

    # Factor 3: Completed spinner detection (static ✓ or ✗)
    local has_completed_spinner=false
    if echo "$content" | grep -qE '[✓✗✔✘]'; then
      has_completed_spinner=true
    fi

    # Determine state from 3 factors
    local state="unknown"
    if echo "$content" | grep -qE "$PROMPT_PATTERN"; then
      state="idle"
    elif [ "$has_error" = true ] && [ "$has_active_spinner" = false ]; then
      state="error"
    elif [ "$has_error" = true ] && [ "$has_active_spinner" = true ]; then
      state="stuck (errors + thinking)"
    elif [ "$has_active_spinner" = true ]; then
      state="working"
    elif [ "$has_completed_spinner" = true ]; then
      state="step-complete"
    else
      state="unknown"
    fi

    # --- RESULT.json Validation ---
    local result_status=""
    local result_file="${wt_dir}/RESULT.json"
    if [ -f "$result_file" ]; then
      local result_issue
      result_issue=$(node -e "try{console.log(JSON.parse(require('fs').readFileSync('${result_file}','utf8')).issue||'')}catch(e){console.log('')}" 2>/dev/null)

      # Check if RESULT.json issue matches assigned task
      # Extract assigned issue from branch name (taskmaestro/<ts>/pane-N)
      local assigned_issue=""
      # If result_issue is empty or mismatched, flag as stale
      if [ -z "$result_issue" ]; then
        result_status="(no issue field)"
      else
        result_status="(issue: ${result_issue})"
      fi

      # Auto-remove stale RESULT.json if status is not from current task
      # (conductor should verify issue match against Wave assignment)
    fi

    echo "pane-${pane}: ${state} | branch: ${branch} ${result_status}"
    if [ "$has_error" = true ]; then
      echo "  ⚠ errors detected in 30-line scan"
    fi
  done
}
```

### `/taskmaestro stop`

Stop all active workers without removing worktrees:

```bash
# Example: stop workers but keep worktrees for inspection
/taskmaestro stop
```

Execute `stop_workers` only. Worktrees and branches remain intact for manual inspection or resumption.

### `/taskmaestro cleanup [--force]`

Full post-parallel cleanup: stop workers, remove worktrees, kill tmux session, delete branches.

```bash
# Clean up after a completed wave
/taskmaestro cleanup

# Force cleanup even with uncommitted changes
/taskmaestro cleanup --force
```

#### Uncommitted Changes Detection

Before removing worktrees, check for uncommitted or unpushed work:

```bash
check_uncommitted() {
  local base_dir="${WORKTREE_BASE}"
  local issues=()

  for wt_dir in "${base_dir}"/wt-*; do
    [ -d "$wt_dir" ] || continue

    local branch
    branch=$(git -C "$wt_dir" branch --show-current 2>/dev/null || echo "detached")
    local has_issues=false

    # Check uncommitted changes
    local status
    status=$(git -C "$wt_dir" status --porcelain 2>/dev/null)
    if [ -n "$status" ]; then
      echo "WARNING: Uncommitted changes in ${wt_dir} (${branch}):" >&2
      echo "$status" | head -5 >&2
      has_issues=true
    fi

    # Check unpushed commits
    local unpushed
    unpushed=$(git -C "$wt_dir" log --oneline @{upstream}..HEAD 2>/dev/null)
    if [ -n "$unpushed" ]; then
      echo "WARNING: Unpushed commits in ${wt_dir} (${branch}):" >&2
      echo "$unpushed" | head -5 >&2
      has_issues=true
    fi

    if [ "$has_issues" = true ]; then
      issues+=("${wt_dir}")
    fi
  done

  if [ ${#issues[@]} -gt 0 ]; then
    echo "" >&2
    echo "DANGER: ${#issues[@]} worktree(s) have unsaved work." >&2
    echo "Use --force to cleanup anyway, or commit/push changes first." >&2
    return 1
  fi

  return 0
}
```

**Detection covers:**

| Check | What It Catches |
|-------|-----------------|
| `git status --porcelain` | Uncommitted/unstaged changes, untracked files |
| `git log @{upstream}..HEAD` | Commits not pushed to remote |

#### Cleanup Process

```bash
cleanup_all() {
  local force="${1:-false}"

  echo "=== Post-Parallel Cleanup ==="

  # Step 1: Check for uncommitted changes
  echo "[1/4] Checking for uncommitted changes..."
  if ! check_uncommitted; then
    if [ "$force" != "true" ]; then
      echo "ABORT: Use --force to override." >&2
      return 1
    fi
    echo "WARNING: Proceeding with --force, unsaved work will be lost."
  fi

  # Step 2: Stop workers and kill tmux session
  echo "[2/4] Stopping workers..."
  stop_workers
  tmux kill-session -t "$SESSION" 2>/dev/null || true

  # Step 3: Remove worktrees and branches
  echo "[3/4] Removing worktrees and branches..."
  for wt_dir in "${WORKTREE_BASE}"/wt-*; do
    [ -d "$wt_dir" ] || continue

    local branch
    branch=$(git -C "$wt_dir" branch --show-current 2>/dev/null)

    git worktree remove "$wt_dir" --force 2>/dev/null || rm -rf "$wt_dir"

    # Delete the associated branch
    if [ -n "$branch" ]; then
      git branch -D "$branch" 2>/dev/null || true
    fi
  done
  git worktree prune

  # Step 4: Clean base directory
  echo "[4/4] Cleaning up..."
  if [ -d "$WORKTREE_BASE" ] && [ -z "$(ls -A "$WORKTREE_BASE" 2>/dev/null)" ]; then
    rmdir "$WORKTREE_BASE" 2>/dev/null || true
  fi

  echo "=== Cleanup Complete ==="
  echo "Removed: worktrees, branches, tmux session"
}
```

**Cleanup targets:**

| Target | Action | Reversible? |
|--------|--------|-------------|
| Active workers | `/exit` + `C-c` fallback | N/A |
| tmux session | `kill-session` | Re-create with `/taskmaestro launch` |
| Worktree dirs | `git worktree remove --force` | No — commit first |
| Git branches | `git branch -D` | Recover via reflog within 30 days |
| Base directory | `rmdir` if empty | Re-created on next launch |

---

## Error Handling

| Failure | Recovery |
|---------|----------|
| Pane not ready after timeout | Restart Claude in that pane, retry once |
| Worktree removal fails | `rm -rf` as fallback, then `git worktree prune` |
| `git fetch` fails | Continue with local master (warn user) |
| tmux session missing | Create new session from scratch |
| Trust/terms prompt not recognized | Log the captured content, wait for manual intervention |
| Cleanup with uncommitted changes | Abort and list dirty worktrees; user runs `--force` or commits first |
| Branch deletion fails | Branch may be checked out elsewhere; `git worktree prune` first |

## Important Notes

- **Never use fixed `sleep` for readiness** — always use `wait_for_ready()` with capture-pane polling
- **Always call `handle_prompts()` before `wait_for_ready()`** — trust/terms prompts block the ready state
- **Wave transition is atomic** — if any critical step fails (worktree creation, launch), abort and report
- **Pane indices are 0-based** in tmux but worktree dirs are 1-based (`wt-1`, `wt-2`, ...)
- **Always run `cleanup` after a wave completes** — leftover worktrees and branches accumulate over time
- **Never `cleanup --force` without checking** — review warnings first to avoid losing uncommitted work
- **Conductor layout requires tmux ≥ 2.3** — uses `-f` flag for full-width `join-pane`
- **After layout setup, conductor is the last pane** — pane indices shift during `swap-pane` + `break-pane` + `join-pane`
- **Worker status colors are pane-local** — use `set_worker_status()` to update border colors per pane

## Status Verification Rules

- **RESULT.json is NOT the sole source of truth** — always validate the `issue` field matches the assigned task AND cross-verify with `capture-pane` output
- **3-factor analysis for status** — every status check must evaluate: (1) error scan across 30 lines, (2) active spinner presence, (3) completed spinner presence
- **Active vs Completed spinner discrimination** — animating characters (`⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏`) = active work; static characters (`✓✗✔✘`) = step complete. Never confuse them.
- **"thinking" ≠ productive work** when errors are visible — if errors appear alongside thinking/reasoning indicators, the worker is stuck in a retry loop
- **Stall detection** — duration >5 minutes on the same step with no token/cost change = STALLED. Intervene immediately.
- **NEVER use `git add -A` or `git add .`** — always stage specific files by name. This applies to both the conductor and all worker prompts.
- **RESULT.json and TASK.md must NEVER be committed** — these are ephemeral per-worktree artifacts. If found in staged changes, unstage immediately.
- **Stale RESULT.json auto-removal** — if RESULT.json `issue` field does not match the currently assigned task, remove it (`rm -f RESULT.json`) before the worker starts.
