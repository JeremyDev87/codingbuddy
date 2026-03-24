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
# Watch & Nudge
WATCH_INTERVAL=30              # seconds between watch cycles
MAX_NUDGE_COUNT=3              # nudges before escalation to conductor
IDLE_CYCLES_BEFORE_NUDGE=2     # consecutive idle cycles before auto-nudge
STATUS_PREV_DIR="/tmp/taskmaestro_status"  # duration tracking state
WAVE_PLAN_FILE=".taskmaestro/wave-plan.json"  # wave sequence definition
# Push Protocol
TM_MSG_PATTERN='\[TM:(DONE|ERROR|PROGRESS)\]'  # ERE pattern for worker push messages
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

#### Step 3.5: Install Worktree Dependencies

Pre-install dependencies in each worktree. Zero overhead when `node_modules` already exists.

```bash
install_worktree_deps() {
  local count="$1"

  for i in $(seq 1 "$count"); do
    local wt_dir="${WORKTREE_BASE}/wt-${i}"

    # Skip if no package.json or node_modules already present
    [ -f "${wt_dir}/package.json" ] || continue
    [ -d "${wt_dir}/node_modules" ] && continue

    # Monorepo (yarn workspaces) → symlink node_modules from repo root
    if [ -d "node_modules" ] && grep -q '"workspaces"' package.json 2>/dev/null; then
      ln -s "$(pwd)/node_modules" "${wt_dir}/node_modules"
      echo "SYMLINKED: node_modules -> wt-${i}"
    # Standalone → yarn install in background
    elif command -v yarn &>/dev/null; then
      (cd "${wt_dir}" && yarn install --frozen-lockfile &>/dev/null &)
      echo "INSTALLING: yarn install in wt-${i} (background)"
    # Fallback → warn worker
    else
      echo "WARNING: wt-${i} has no node_modules — install manually"
    fi
  done
}
```

**Dependency resolution strategy:**

| Condition | Action | Overhead |
|-----------|--------|----------|
| `node_modules` exists | Skip | Zero |
| No `package.json` | Skip | Zero |
| Monorepo (yarn workspaces) | Symlink from repo root | ~0s |
| Standalone project | `yarn install --frozen-lockfile` (background) | Non-blocking |
| No yarn available | Warn worker to install manually | Zero |

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

#### Step 4.5: Worker Pre-Flight Verification

Before launching Claude Code, verify each worktree:

```bash
for PANE_IDX in $WORKER_PANES; do
  WT_PATH="$DIR/.taskmaestro/wt-$PANE_IDX"
  rm -f "$WT_PATH/RESULT.json" "$WT_PATH/TASK.md"
  if [ -f "$REPO/.claude/settings.local.json" ]; then
    mkdir -p "$WT_PATH/.claude"
    cp "$REPO/.claude/settings.local.json" "$WT_PATH/.claude/settings.local.json"
  fi
  if ! git -C "$WT_PATH" diff --quiet 2>/dev/null; then
    echo "WARNING: wt-$PANE_IDX has uncommitted changes"
  fi
done
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

Send the work prompt to each ready pane. The prompt includes the **IRON LAW** for RESULT.json completion, the **ERROR RECOVERY PROTOCOL** for self-healing, and the **PUSH PROTOCOL** for structured status reporting:

```bash
assign_tasks() {
  local -a issues=("$@")

  for i in "${!issues[@]}"; do
    local pane="${SESSION}:0.${i}"
    local issue="${issues[$i]}"

    # Worker prompt: task execution + IRON LAW + ERROR RECOVERY + PUSH PROTOCOL
    local prompt
    read -r -d '' prompt << WORKER_PROMPT || true
Read TASK.md and execute ALL instructions. Follow codingbuddy PLAN→ACT→EVAL. Run 'yarn install' if node_modules missing. NEVER use 'git add -A'. If errors occur, fix yourself. Use /ship to create PR, then write RESULT.json. Start now.

[IRON LAW: RESULT.json]
RESULT.json MUST be the LAST action before idle.
1. Complete implementation
2. Create PR via /ship
3. Write RESULT.json ← MANDATORY
4. Go idle

If /ship fails: write RESULT.json with status "failure" and error details.
NEVER go idle without RESULT.json.

[ERROR RECOVERY PROTOCOL]
If any command fails:
1. DO NOT STOP. Read the error message.
2. Diagnose: run git status, check paths, verify deps
3. Fix: apply minimal fix
4. Retry (max 3 attempts)
5. If 3 retries fail: write RESULT.json with status "failure"

NEVER use 'git add -A' — always stage specific files.
RESULT.json and TASK.md must NEVER be committed.

[PUSH PROTOCOL]
You are pane=${i}, assigned issue=#${issue}.
After each major milestone, emit a status message via Bash:

Phase transition (PLAN→ACT, ACT→EVAL):
  echo '[TM:PROGRESS] pane=${i} issue=#${issue} phase=ACT step=starting-implementation'

Successful completion (AFTER writing RESULT.json):
  echo '[TM:DONE] pane=${i} issue=#${issue} pr=<PR_NUMBER> status=success'

Unrecoverable error (AFTER writing RESULT.json with failure):
  echo '[TM:ERROR] pane=${i} issue=#${issue} error=<SHORT_MSG>'

Rules:
- Use EXACT format — these are machine-parsed by the conductor
- PROGRESS: emit at each mode transition
- DONE/ERROR: emit AFTER writing RESULT.json, BEFORE going idle
- Replace <PR_NUMBER> and <SHORT_MSG> with actual values
[CONTINUOUS EXECUTION DIRECTIVE]
DO NOT stop between steps. Complete ALL tasks without waiting for user input.
Only stop AFTER writing RESULT.json.
If you encounter an error, try to fix it yourself before stopping.
WORKER_PROMPT

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

**Worker prompt components:**

| Component | Purpose | Source |
|-----------|---------|--------|
| Task execution | Read TASK.md, follow PLAN→ACT→EVAL, use /ship | Base prompt |
| IRON LAW: RESULT.json | Guarantee RESULT.json is always written before idle | #868 |
| ERROR RECOVERY PROTOCOL | Self-diagnose and retry on failures (max 3 attempts) | #870 |
| PUSH PROTOCOL | Emit `[TM:DONE]`, `[TM:ERROR]`, `[TM:PROGRESS]` messages for conductor | #886 |

**IRON LAW enforcement:**

| Scenario | Required Action |
|----------|----------------|
| /ship succeeds | Write RESULT.json with `status: "success"` + PR details |
| /ship fails | Write RESULT.json with `status: "failure"` + error details |
| Implementation fails after 3 retries | Write RESULT.json with `status: "failure"` |
| Any other exit path | RESULT.json **must** still be written — no exceptions |

**Error recovery flow:**

```
Command fails → Read error → Diagnose (git status, paths, deps) → Minimal fix → Retry
                                                                         ↓
                                                              Max 3 retries reached?
                                                              Yes → RESULT.json (failure)
                                                              No  → Retry command
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
  echo "[1/8] Stopping current workers..."
  stop_workers

  # Step 2: Clean worktrees
  echo "[2/8] Cleaning worktrees..."
  clean_worktrees

  # Step 3: Create new worktrees
  echo "[3/8] Creating ${count} worktrees..."
  create_worktrees "$count"

  # Step 3.5: Install dependencies
  echo "[4/8] Installing worktree dependencies..."
  install_worktree_deps "$count"

  # Step 4: Launch Claude Code
  echo "[5/8] Launching Claude Code instances..."
  launch_workers "$count"

  # Step 5: Setup conductor layout
  echo "[6/8] Setting up conductor layout..."
  setup_conductor_layout "$count"

  # Step 6: Wait for readiness
  echo "[7/8] Waiting for readiness..."
  local failed
  wait_all_ready "$count"
  failed=$?
  if [ "$failed" -gt 0 ]; then
    echo "WARNING: ${failed} pane(s) failed to initialize"
  fi

  # Step 7: Assign tasks
  echo "[8/8] Assigning tasks..."
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

Check the status of all active panes using **2-pass analysis with duration tracking**:

```bash
status_check() {
  local panes
  panes=$(tmux list-panes -t "$SESSION" -F '#{pane_index}' 2>/dev/null)

  if [ -z "$panes" ]; then
    echo "No active taskMaestro session"
    return 1
  fi

  # Ensure status tracking directory exists
  mkdir -p "$STATUS_PREV_DIR"

  for pane in $panes; do
    local target="${SESSION}:0.${pane}"
    local wt_dir="${WORKTREE_BASE}/wt-$((pane + 1))"
    local branch="none"
    if [ -d "$wt_dir" ]; then
      branch=$(git -C "$wt_dir" branch --show-current 2>/dev/null || echo "detached")
    fi

    # --- Pass 1: 3-Factor Analysis (30-line scan) ---
    local content
    content=$(tmux capture-pane -t "$target" -p 2>/dev/null | tail -30)

    # Factor 1: Error scan — specific patterns (not broad "error|fail")
    local has_error=false
    if echo "$content" | grep -qE 'FAIL|Error:|Cannot find|fatal:|ENOENT|EPERM|ERR!|panic|FATAL'; then
      has_error=true
    fi

    # Factor 2: Active spinner detection
    # Animating braille characters OR Claude's active progress indicator
    local has_active_spinner=false
    if echo "$content" | grep -qE '[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]'; then
      has_active_spinner=true
    fi
    # Claude Code active format: "… (Xm · ↓X ↑X)" — NOT "Crunched for" (completed)
    if echo "$content" | grep -qE '… \([0-9]+[sm] ·' && ! echo "$content" | grep -qE 'Crunched for'; then
      has_active_spinner=true
    fi

    # Factor 3: Completed spinner detection (static ✓ or ✗)
    local has_completed_spinner=false
    if echo "$content" | grep -qE '[✓✗✔✘]|Crunched for'; then
      has_completed_spinner=true
    fi

    # Determine state from 3 factors
    local state="unknown"
    if echo "$content" | grep -qE "$PROMPT_PATTERN"; then
      state="idle"
    elif [ "$has_error" = true ] && [ "$has_active_spinner" = false ]; then
      state="error"
    elif [ "$has_error" = true ] && [ "$has_active_spinner" = true ]; then
      state="error_idle"
    elif [ "$has_active_spinner" = true ]; then
      state="working"
    elif [ "$has_completed_spinner" = true ]; then
      state="step-complete"
    else
      state="unknown"
    fi

    # --- Pass 2: Duration Tracking (stall detection) ---
    local prev_file="${STATUS_PREV_DIR}/pane-${pane}.prev"
    local content_hash
    content_hash=$(echo "$content" | md5sum | cut -d' ' -f1 2>/dev/null || echo "$content" | md5 -q 2>/dev/null)
    local stall_count=0

    if [ -f "$prev_file" ]; then
      local prev_hash prev_stall
      prev_hash=$(head -1 "$prev_file")
      prev_stall=$(tail -1 "$prev_file")

      if [ "$content_hash" = "$prev_hash" ] && [ "$state" = "working" ]; then
        stall_count=$((prev_stall + 1))
        if [ "$stall_count" -ge 2 ]; then
          state="STALLED"
        fi
      fi
    fi

    # Save current state for next cycle
    printf '%s\n%s\n' "$content_hash" "$stall_count" > "$prev_file"

    # --- RESULT.json Validation ---
    local result_status=""
    local result_file="${wt_dir}/RESULT.json"
    if [ -f "$result_file" ]; then
      local result_issue
      result_issue=$(node -e "try{console.log(JSON.parse(require('fs').readFileSync('${result_file}','utf8')).issue||'')}catch(e){console.log('')}" 2>/dev/null)

      # Extract assigned issue from TASK.md if available
      local assigned_issue=""
      if [ -f "${wt_dir}/TASK.md" ]; then
        assigned_issue=$(head -1 "${wt_dir}/TASK.md" | grep -oE '#[0-9]+' | head -1)
      fi

      if [ -z "$result_issue" ]; then
        result_status="(no issue field)"
      elif [ -n "$assigned_issue" ] && [ "#${result_issue}" != "$assigned_issue" ] && ! echo "$result_issue" | grep -qF "${assigned_issue#\#}"; then
        # Stale RESULT.json — issue mismatch, auto-remove
        rm -f "$result_file"
        result_status="(STALE — removed)"
      else
        result_status="(issue: ${result_issue})"
      fi
    fi

    echo "pane-${pane}: ${state} | branch: ${branch} ${result_status}"
    if [ "$has_error" = true ]; then
      echo "  ⚠ errors detected in 30-line scan"
    fi
    if [ "$state" = "STALLED" ]; then
      echo "  🛑 STALLED: same output for ${stall_count}+ cycles — intervene"
    fi
  done
}
```

**2-pass analysis:**

| Pass | Purpose | Method |
|------|---------|--------|
| Pass 1 | 3-factor state detection | Error patterns, active/completed spinners |
| Pass 2 | Duration-based stall detection | Content hash comparison across cycles |

**Enhanced error patterns (#864):**

| Pattern | Catches |
|---------|---------|
| `FAIL` | Test failures |
| `Error:` | Node.js/TypeScript errors |
| `Cannot find` | Missing module/package |
| `fatal:` | Git fatal errors |
| `ENOENT\|EPERM` | File system errors |
| `ERR!` | npm/yarn errors |
| `panic\|FATAL` | System-level panics |

**Active vs Completed spinner discrimination:**

| Pattern | Type | Example |
|---------|------|---------|
| `⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏` | Active (braille animation) | Thinking/processing |
| `… (Xm ·` | Active (Claude progress) | `… (2m · ↓5 ↑3)` |
| `Crunched for` | Completed | `Crunched for 1m 23s` |
| `✓✗✔✘` | Completed (static) | Step done |

**Stall detection flow:**

```
Cycle N: capture content → hash → compare with prev
  Same hash + "working" state → stall_count++
  stall_count >= 2 → state = "STALLED"
  Different hash → stall_count = 0
```

**RESULT.json validation (#864):**

| Check | Action |
|-------|--------|
| No issue field | Flag `(no issue field)` |
| Issue matches TASK.md | Show `(issue: #N)` |
| Issue mismatches TASK.md | Auto-remove + flag `(STALE — removed)` |

### `/taskmaestro watch`

Continuous monitoring loop with **auto-nudge** for stuck workers and **permission prompt auto-handling**:

```bash
# Example: start watching all workers
/taskmaestro watch
```

#### Nudge Worker

Send a contextual nudge message to a stuck worker:

```bash
nudge_worker() {
  local pane="$1"
  local state="$2"  # "idle" or "error_idle"
  local nudge_count="$3"

  local nudge_msg
  if [ "$state" = "error_idle" ]; then
    nudge_msg="You appear stuck with errors. Follow the ERROR RECOVERY PROTOCOL: read the error, diagnose with git status, apply minimal fix, retry. If 3 retries fail, write RESULT.json with status failure."
  else
    nudge_msg="You appear idle without RESULT.json. Continue your task: read TASK.md, complete implementation, use /ship, then write RESULT.json. Do not idle without RESULT.json."
  fi

  tmux send-keys -t "$pane" "$nudge_msg" Enter
  echo "NUDGE (${nudge_count}/${MAX_NUDGE_COUNT}): pane $pane — ${state}"
}
```

#### Permission Prompt Auto-Handling

Detect and auto-approve permission prompts during worker execution:

```bash
handle_permission_prompts() {
  local pane="$1"
  local content="$2"
  local handled=0

  # Edit/proceed permission prompts
  if echo "$content" | grep -qiE 'Do you want to (make this edit|proceed|allow|run)|Allow this|Approve this'; then
    tmux send-keys -t "$pane" Enter
    sleep 1
    handled=$((handled + 1))
    echo "AUTO-APPROVED: permission prompt in pane $pane"
  fi

  # Yes/No tool permission prompts
  if echo "$content" | grep -qiE 'Allow tool|permission.*\(y/n\)|proceed.*\[Y/n\]'; then
    tmux send-keys -t "$pane" "y" Enter
    sleep 1
    handled=$((handled + 1))
    echo "AUTO-APPROVED: tool permission in pane $pane"
  fi

  return "$handled"
}
```

#### Wave Plan Structure

Define a wave plan as a JSON file at `.taskmaestro/wave-plan.json` to enable auto-transition between waves:

```json
{
  "waves": [
    {
      "name": "Wave 1",
      "issues": ["867", "868", "870"],
      "started_at": null,
      "completed_at": null
    },
    {
      "name": "Wave 2",
      "issues": ["861", "864", "869"],
      "started_at": null,
      "completed_at": null
    }
  ],
  "current_wave": 0
}
```

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `waves` | array | Ordered list of waves to execute |
| `waves[].name` | string | Human-readable wave label |
| `waves[].issues` | string[] | Issue numbers assigned to this wave |
| `waves[].started_at` | string\|null | ISO timestamp when wave was assigned |
| `waves[].completed_at` | string\|null | ISO timestamp when all workers completed |
| `current_wave` | number | 0-based index of the active wave |

#### Wave Completion Report

Generate a cost/time summary when a wave completes:

```bash
generate_wave_report() {
  local wave_name="$1"
  local wave_start="$2"  # ISO timestamp
  local pane_count="$3"

  local wave_end
  wave_end=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  # Calculate wave duration
  local start_epoch end_epoch duration_s
  start_epoch=$(date -d "$wave_start" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%SZ" "$wave_start" +%s 2>/dev/null)
  end_epoch=$(date +%s)
  duration_s=$((end_epoch - start_epoch))
  local duration_m=$((duration_s / 60))
  local duration_rem=$((duration_s % 60))

  local total_cost=0
  local success_count=0
  local total_workers=0

  echo ""
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║  ${wave_name} Complete Report                               ║"
  echo "╠══════════════════════════════════════════════════════════════╣"
  echo "║  Duration: ${duration_m}m ${duration_rem}s                  ║"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""
  printf "| %-8s | %-12s | %-10s | %-8s | %-6s |\n" "Worker" "Issue" "Status" "Cost" "PR"
  printf "|----------|--------------|------------|----------|--------|\n"

  for i in $(seq 1 "$pane_count"); do
    local wt_dir="${WORKTREE_BASE}/wt-${i}"
    local result_file="${wt_dir}/RESULT.json"
    total_workers=$((total_workers + 1))

    if [ -f "$result_file" ]; then
      local r_status r_issue r_cost r_pr
      r_status=$(node -e "try{console.log(JSON.parse(require('fs').readFileSync('${result_file}','utf8')).status||'unknown')}catch(e){console.log('error')}" 2>/dev/null)
      r_issue=$(node -e "try{console.log(JSON.parse(require('fs').readFileSync('${result_file}','utf8')).issue||'?')}catch(e){console.log('?')}" 2>/dev/null)
      r_cost=$(node -e "try{console.log(JSON.parse(require('fs').readFileSync('${result_file}','utf8')).cost||'N/A')}catch(e){console.log('N/A')}" 2>/dev/null)
      r_pr=$(node -e "try{console.log(JSON.parse(require('fs').readFileSync('${result_file}','utf8')).pr_number||'—')}catch(e){console.log('—')}" 2>/dev/null)

      [ "$r_status" = "success" ] && success_count=$((success_count + 1))

      # Accumulate cost if numeric
      if echo "$r_cost" | grep -qE '^[0-9.]+$'; then
        total_cost=$(node -e "console.log(($total_cost + $r_cost).toFixed(2))" 2>/dev/null)
      fi

      printf "| pane-%-3s | %-12s | %-10s | %-8s | #%-5s |\n" "$i" "$r_issue" "$r_status" "\$${r_cost}" "$r_pr"
    else
      printf "| pane-%-3s | %-12s | %-10s | %-8s | %-6s |\n" "$i" "?" "no-result" "N/A" "—"
    fi
  done

  echo ""
  local avg_cost="N/A"
  if [ "$total_workers" -gt 0 ] && echo "$total_cost" | grep -qE '^[0-9.]+$'; then
    avg_cost=$(node -e "console.log(($total_cost / $total_workers).toFixed(2))" 2>/dev/null)
  fi
  echo "Workers: ${success_count}/${total_workers} success"
  echo "Total cost: ~\$${total_cost} | Avg: \$${avg_cost}/worker"
  echo ""
}
```

**Report fields:**

| Column | Source | Description |
|--------|--------|-------------|
| Worker | pane index | Which worktree pane |
| Issue | `RESULT.json → issue` | Issue number(s) |
| Status | `RESULT.json → status` | success/failure/error |
| Cost | `RESULT.json → cost` | API cost if available |
| PR | `RESULT.json → pr_number` | Pull request number |

#### Wave Auto-Transition

Automatically transition to the next wave when all workers complete successfully:

```bash
auto_wave_transition() {
  local plan_file="$WAVE_PLAN_FILE"

  if [ ! -f "$plan_file" ]; then
    echo "No wave plan found — skipping auto-transition"
    return 1
  fi

  # Read current wave index
  local current_wave
  current_wave=$(node -e "console.log(JSON.parse(require('fs').readFileSync('${plan_file}','utf8')).current_wave)" 2>/dev/null)
  local total_waves
  total_waves=$(node -e "console.log(JSON.parse(require('fs').readFileSync('${plan_file}','utf8')).waves.length)" 2>/dev/null)

  # Mark current wave as completed
  node -e "
    const fs = require('fs');
    const plan = JSON.parse(fs.readFileSync('${plan_file}', 'utf8'));
    plan.waves[${current_wave}].completed_at = new Date().toISOString();
    plan.current_wave = ${current_wave} + 1;
    fs.writeFileSync('${plan_file}', JSON.stringify(plan, null, 2));
  " 2>/dev/null

  local next_wave=$((current_wave + 1))

  if [ "$next_wave" -ge "$total_waves" ]; then
    echo "=== All waves complete! No more waves in plan. ==="
    return 0
  fi

  # Read next wave issues
  local next_issues
  next_issues=$(node -e "console.log(JSON.parse(require('fs').readFileSync('${plan_file}','utf8')).waves[${next_wave}].issues.join(','))" 2>/dev/null)
  local next_name
  next_name=$(node -e "console.log(JSON.parse(require('fs').readFileSync('${plan_file}','utf8')).waves[${next_wave}].name)" 2>/dev/null)

  echo "=== Auto-Transition: ${next_name} (issues: ${next_issues}) ==="

  # Mark next wave as started
  node -e "
    const fs = require('fs');
    const plan = JSON.parse(fs.readFileSync('${plan_file}', 'utf8'));
    plan.waves[${next_wave}].started_at = new Date().toISOString();
    fs.writeFileSync('${plan_file}', JSON.stringify(plan, null, 2));
  " 2>/dev/null

  # Execute wave transition
  wave_transition "$next_issues"
}
```

**Auto-transition flow:**

```
All workers done (RESULT.json exists)
     ↓
generate_wave_report()  — print summary
     ↓
auto_wave_transition()
     ├── No wave plan? → skip, stay idle
     ├── Last wave? → "All waves complete!"
     └── Next wave exists? → wave_transition(next_issues)
```

#### Watch Loop

Main monitoring loop combining status checks, auto-nudge, permission handling, **wave completion detection**, and **auto-transition**:

```bash
watch_workers() {
  echo "=== Watch Mode Started (interval: ${WATCH_INTERVAL}s) ==="
  echo "Press Ctrl+C to stop watching."

  # Initialize per-pane tracking
  declare -A idle_cycles
  declare -A nudge_counts
  mkdir -p "$STATUS_PREV_DIR"

  # Wave timing: record start time for cost/duration tracking (#872)
  local wave_start
  wave_start=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  local wave_name="Current Wave"
  if [ -f "$WAVE_PLAN_FILE" ]; then
    local cw
    cw=$(node -e "console.log(JSON.parse(require('fs').readFileSync('${WAVE_PLAN_FILE}','utf8')).current_wave||0)" 2>/dev/null)
    wave_name=$(node -e "console.log(JSON.parse(require('fs').readFileSync('${WAVE_PLAN_FILE}','utf8')).waves[${cw}].name||'Wave ${cw}')" 2>/dev/null)
  fi

  while true; do
    local panes
    panes=$(tmux list-panes -t "$SESSION" -F '#{pane_index}' 2>/dev/null)

    if [ -z "$panes" ]; then
      echo "No active taskMaestro session — stopping watch"
      break
    fi

    local pane_count=0
    local done_count=0

    echo "--- $(date '+%H:%M:%S') ---"

    for pane in $panes; do
      pane_count=$((pane_count + 1))
      local target="${SESSION}:0.${pane}"
      local wt_dir="${WORKTREE_BASE}/wt-$((pane + 1))"

      # Capture pane content
      local content
      content=$(tmux capture-pane -t "$target" -p 2>/dev/null | tail -30)

      # --- Permission Prompt Auto-Handling (#869) ---
      handle_permission_prompts "$target" "$content"

      # --- Push Protocol: TM Message Detection (primary) (#886) ---
      local tm_handled=false
      local state="unknown"
      local result_file="${wt_dir}/RESULT.json"
      local has_result=false

      # --- RESULT.json Issue Validation (#887) ---
      if [ -f "$result_file" ]; then
        local result_issue
        result_issue=$(node -e "try{console.log(JSON.parse(require('fs').readFileSync('${result_file}','utf8')).issue||'')}catch(e){console.log('')}" 2>/dev/null)

        local assigned_issue=""
        if [ -f "${wt_dir}/TASK.md" ]; then
          assigned_issue=$(head -1 "${wt_dir}/TASK.md" | grep -oE '#[0-9]+' | head -1)
        fi

        if [ -n "$assigned_issue" ] && [ -n "$result_issue" ] && [ "#${result_issue}" != "$assigned_issue" ] && ! echo "$result_issue" | grep -qF "${assigned_issue#\#}"; then
          rm -f "$result_file"
          echo "  🗑 STALE RESULT.json removed (issue: ${result_issue}, expected: ${assigned_issue})"
        else
          has_result=true
        fi
      fi

      local tm_done tm_error tm_progress
      tm_done=$(echo "$content" | grep -oE '\[TM:DONE\] pane=[0-9]+ issue=#[0-9]+ pr=[^ ]+ status=[a-z]+' | tail -1)
      tm_error=$(echo "$content" | grep -oE '\[TM:ERROR\] pane=[0-9]+ issue=#[0-9]+ error=.+' | tail -1)
      tm_progress=$(echo "$content" | grep -oE '\[TM:PROGRESS\] pane=[0-9]+ issue=#[0-9]+ phase=[A-Z]+ step=.+' | tail -1)

      if [ -n "$tm_done" ]; then
        state="done"
        set_worker_status "$target" "complete"
        local tm_pr
        tm_pr=$(echo "$tm_done" | grep -oE 'pr=[^ ]+' | cut -d= -f2)
        echo "pane-${pane}: DONE (push) pr=${tm_pr}"
        tm_handled=true
      elif [ -n "$tm_error" ]; then
        state="error_idle"
        set_worker_status "$target" "error"
        local tm_err_msg
        tm_err_msg=$(echo "$tm_error" | sed 's/.*error=//')
        echo "pane-${pane}: ERROR (push) ${tm_err_msg}"
        tm_handled=true
      elif [ -n "$tm_progress" ]; then
        local tm_phase tm_step
        tm_phase=$(echo "$tm_progress" | grep -oE 'phase=[A-Z]+' | cut -d= -f2)
        tm_step=$(echo "$tm_progress" | sed 's/.*step=//')
        echo "pane-${pane}: ${tm_phase} (push) ${tm_step}"
        state="working"
        idle_cycles[$pane]=0
        tm_handled=true
      fi

      # --- Polling Fallback: 3-Factor Analysis (when no push message) ---
      if [ "$tm_handled" = false ]; then
        local has_error=false
        if echo "$content" | grep -qE 'FAIL|Error:|Cannot find|fatal:|ENOENT|EPERM|ERR!|panic|FATAL'; then
          has_error=true
        fi

        local has_active_spinner=false
        if echo "$content" | grep -qE '[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]'; then
          has_active_spinner=true
        fi
        if echo "$content" | grep -qE '… \([0-9]+[sm] ·' && ! echo "$content" | grep -qE 'Crunched for'; then
          has_active_spinner=true
        fi

        if echo "$content" | grep -qE "$PROMPT_PATTERN"; then
          if [ "$has_result" = true ]; then
            state="done"
            set_worker_status "$target" "complete"
          elif [ "$has_error" = true ]; then
            state="error_idle"
            set_worker_status "$target" "error"
          else
            state="idle"
          fi
        elif [ "$has_error" = true ] && [ "$has_active_spinner" = false ]; then
          state="error"
          set_worker_status "$target" "error"
        elif [ "$has_active_spinner" = true ]; then
          state="working"
          idle_cycles[$pane]=0  # Reset idle counter
        fi

        echo "pane-${pane}: ${state} (poll)"
      fi

      # --- Auto-Nudge Logic (#861) ---
      if [ "$state" = "idle" ] || [ "$state" = "error_idle" ]; then
        local prev_idle=${idle_cycles[$pane]:-0}
        idle_cycles[$pane]=$((prev_idle + 1))
        local current_nudges=${nudge_counts[$pane]:-0}

        if [ "${idle_cycles[$pane]}" -ge "$IDLE_CYCLES_BEFORE_NUDGE" ]; then
          if [ "$current_nudges" -lt "$MAX_NUDGE_COUNT" ]; then
            nudge_counts[$pane]=$((current_nudges + 1))
            nudge_worker "$target" "$state" "${nudge_counts[$pane]}"
            idle_cycles[$pane]=0  # Reset after nudge
          else
            echo "⚠ ESCALATE: pane-${pane} unresponsive after ${MAX_NUDGE_COUNT} nudges — conductor intervention needed"
            set_worker_status "$target" "error"
          fi
        fi
      elif [ "$state" = "done" ]; then
        idle_cycles[$pane]=0
        nudge_counts[$pane]=0
        done_count=$((done_count + 1))
      fi
    done

    # --- Wave Completion Detection (#871 + #872) ---
    if [ "$pane_count" -gt 0 ] && [ "$done_count" -eq "$pane_count" ]; then
      echo ""
      echo "🎉 ALL ${pane_count} workers completed!"

      # Generate wave report (#872)
      generate_wave_report "$wave_name" "$wave_start" "$pane_count"

      # Attempt auto-transition to next wave (#871)
      if auto_wave_transition; then
        # New wave started — reset tracking
        wave_start=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
        idle_cycles=()
        nudge_counts=()
        if [ -f "$WAVE_PLAN_FILE" ]; then
          local cw
          cw=$(node -e "console.log(JSON.parse(require('fs').readFileSync('${WAVE_PLAN_FILE}','utf8')).current_wave||0)" 2>/dev/null)
          wave_name=$(node -e "console.log(JSON.parse(require('fs').readFileSync('${WAVE_PLAN_FILE}','utf8')).waves[${cw}].name||'Wave ${cw}')" 2>/dev/null)
        fi
      else
        echo "Watch complete — no more waves. Exiting."
        break
      fi
    fi

    sleep "$WATCH_INTERVAL"
  done
}
```

**Watch cycle per pane (hybrid: push primary, polling fallback):**

| Priority | Check | Action |
|----------|-------|--------|
| 0 | Permission prompt detected | Auto-send Enter/y to approve (#869) |
| 0.5 | RESULT.json issue mismatch | Auto-remove stale RESULT.json + log (#887) |
| 1 (push) | `[TM:DONE]` message found | Mark done, extract PR number (#886) |
| 1 (push) | `[TM:ERROR]` message found | Mark error, extract error message (#886) |
| 1 (push) | `[TM:PROGRESS]` message found | Log phase/step, reset idle counter (#886) |
| 2 (poll) | No `[TM:*]` → 3-factor analysis | Fallback for crashed/legacy workers |
| 3 | State = `idle` (no RESULT.json) | Increment idle counter → nudge after 2 cycles (#861) |
| 3 | State = `error_idle` (errors + prompt) | Nudge with error recovery instructions (#861) |
| 3 | State = `done` (RESULT.json valid) | Mark complete, reset counters |
| 3 | State = `working` | Reset idle counter, continue |
| 4 | Nudge count >= 3 | Escalate — conductor alert (#861) |

**Push protocol message format (#886):**

| Message | Format | When |
|---------|--------|------|
| `[TM:PROGRESS]` | `pane=N issue=#NNN phase=PHASE step=DESC` | Phase transitions (PLAN→ACT, ACT→EVAL) |
| `[TM:DONE]` | `pane=N issue=#NNN pr=NNN status=success` | After RESULT.json written (success) |
| `[TM:ERROR]` | `pane=N issue=#NNN error=MSG` | After RESULT.json written (failure) |

**Hybrid detection priority (#886):**

| Priority | Source | Trigger | Reliability |
|----------|--------|---------|-------------|
| Primary | `[TM:*]` push messages | Worker actively emits status | High — explicit signal |
| Fallback | 3-factor polling | No push messages in 30-line scan | Medium — UI pattern inference |

**Nudge escalation:**

| Idle Cycles | Nudge Count | Action |
|-------------|-------------|--------|
| < 2 | — | No action (worker may be pausing normally) |
| >= 2 | 1 | First nudge — contextual message |
| >= 2 | 2 | Second nudge — more urgent |
| >= 2 | 3 | Third and final nudge |
| >= 2 | > 3 | Escalate to conductor — manual intervention |

### Auto-Nudge Protocol

When idle pane detected (❯ visible) but task status is "working":

1. **1st idle**: `tmux send-keys "continue" Enter`
2. **2nd idle**: `tmux send-keys "continue with the next incomplete task" Enter`
3. **3rd idle**: Send explicit instruction with task context
4. Track nudge count per pane in watch report

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

## Status Report Format (with evidence)

Every status line MUST include parenthetical evidence:

```
패널 1: ✅ done - "task" → PR #N (RESULT.json: issue match ✓, pane idle ✓)
패널 2: 🔄 working - "task" (active: ✽ Implementing… · ↓ 5.3k tokens)
패널 3: ⚠️ uncertain - "task" (RESULT.json exists BUT pane active — cross-verify)
패널 4: ❌ error - "task" (error in last 10 lines: "ModuleNotFoundError")
```

Rules: Never bare ✅ without evidence. "thinking" alone ≠ working.

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
- **Push protocol is primary, polling is fallback** — watch loop checks `[TM:*]` messages first; 3-factor analysis only runs when no push messages found (#886)
- **Workers must emit `[TM:DONE]` or `[TM:ERROR]` after writing RESULT.json** — this enables immediate conductor detection without waiting for next poll cycle
- **`[TM:PROGRESS]` is optional but recommended** — helps conductor track phase transitions in real-time

## Status Verification Rules

- **RESULT.json is NOT the sole source of truth** — always validate the `issue` field matches the assigned task AND cross-verify with `capture-pane` output (or `[TM:*]` push messages)
- **3-factor analysis is the polling fallback** — only used when no `[TM:*]` push messages are detected in the 30-line scan. Push messages take priority when present.
- **Active vs Completed spinner discrimination** — animating characters (`⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏`) = active work; static characters (`✓✗✔✘`) = step complete. Never confuse them.
- **"thinking" ≠ productive work** when errors are visible — if errors appear alongside thinking/reasoning indicators, the worker is stuck in a retry loop
- **Stall detection** — duration >5 minutes on the same step with no token/cost change = STALLED. Intervene immediately.
- **NEVER use `git add -A` or `git add .`** — always stage specific files by name. This applies to both the conductor and all worker prompts.
- **RESULT.json and TASK.md must NEVER be committed** — these are ephemeral per-worktree artifacts. If found in staged changes, unstage immediately.
- **Stale RESULT.json auto-removal** — if RESULT.json `issue` field does not match the currently assigned task, remove it (`rm -f RESULT.json`) before the worker starts.

---

## Merge Policy (MANDATORY)

**The conductor MUST NEVER merge PRs or modify the master/main branch.**

Prohibited commands:
- `gh pr merge` (all flags: --squash, --merge, --rebase, --admin, --auto)
- `git merge`
- `git pull origin master` / `git pull origin main` (includes merge)

Allowed:
- `git fetch origin` (read-only)
- `gh pr create` (create PR, not merge)
- `gh pr view` (read-only)

**Protocol:**
1. Worker creates PR → reports PR URL
2. Conductor reports PR URL to user
3. User merges at their discretion
4. User notifies conductor
5. Conductor runs `git fetch origin` to verify, then proceeds

**Wave transition:** Report all PR URLs, wait for user merge confirmation before next wave.

---

## Wave Analysis: Shared File Prediction

Before wave assignment, predict FULL file footprint per issue:

1. **Explicit files**: Listed in issue body
2. **Implicit shared files** (always check):
   - `package.json`, `config.schema.ts`, `index.ts` barrel exports, `README.md`, `.gitignore`
3. **MCP server issues**: Always flag `config.schema.ts`

**Overlap check:** For each issue pair, if shared_files is not empty → move one to next wave.

---

## Shell Script Safety Rules

### Array Indexing Ban

**NEVER use array indexing.** zsh=1-indexed, bash=0-indexed.

```bash
# ❌ BANNED
EXPECTED=("#888" "#811")
echo ${EXPECTED[$IDX]}

# ✅ REQUIRED
for PANE_INFO in "1:#888" "2:#811"; do
  N="${PANE_INFO%%:*}"
  EXP="${PANE_INFO##*:}"
done
```

---

## Session Management

### Compact Cadence

- **Compact after every 2 waves**
- **Save state** to `docs/codingbuddy/context.md` before compact
- **After compact**: re-read taskmaestro-state.json

Warning signs: cost > $2, context > 50%, duration > 2 hours
