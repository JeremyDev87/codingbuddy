---
name: tmux-master
description: >-
  Background knowledge for tmux session, window, and pane lifecycle management,
  layout control, inter-pane communication, styling, and troubleshooting.
  Used by taskMaestro and parallel execution workflows.
user-invocable: false
---

# tmux Master

## Overview

tmux is the backbone of parallel AI agent execution. Misconfigured sessions cause orphaned processes, lost output, and silent failures that waste entire execution waves.

**Core principle:** Every tmux operation must be targeted to a specific session, window, or pane by ID — never rely on "current" context in automated workflows.

**Violating the letter of this process is violating the spirit of reliable automation.**

## The Iron Law

```
ALWAYS USE EXPLICIT TARGETS (-t session:window.pane). NEVER ASSUME CONTEXT.
```

Automated workflows run outside interactive shells. `tmux` commands without `-t` targets silently operate on the wrong pane or fail entirely. There are no exceptions.

**No exceptions:**
- "The session is obvious" → Explicit `-t` anyway
- "There's only one pane" → Panes get added; target explicitly
- "I'll fix the target later" → Fix it now; debugging wrong-pane issues is expensive

## When to Use

This skill provides background knowledge for ANY tmux operation:
- Creating sessions, windows, or panes for parallel agents
- Managing layouts for multi-pane orchestration
- Sending commands to panes programmatically
- Polling pane output for readiness or completion
- Styling panes for visual differentiation
- Debugging tmux-related failures in CI or automation

**Relevant contexts:**
- taskMaestro wave execution with multiple parallel panes
- AI agent orchestration requiring isolated terminal environments
- Any workflow that spawns, monitors, or communicates with tmux panes

## When NOT to Use

- **Interactive tmux usage** — Manual terminal multiplexing needs no formal process
- **Single-pane workflows** — If you only need one terminal, tmux adds no value
- **Docker/container orchestration** — Use container tools, not tmux, for process isolation

---

## Phase 1: Session, Window, and Pane Lifecycle

### 1.1 Session Management

```bash
# Create a named session (detached)
tmux new-session -d -s "my-session"

# Create session with a specific starting directory
tmux new-session -d -s "my-session" -c "/path/to/project"

# List all sessions
tmux list-sessions

# Kill a specific session
tmux kill-session -t "my-session"

# Kill ALL sessions (use with caution)
tmux kill-server
```

### 1.2 Window Management

```bash
# Create a new window in an existing session
tmux new-window -t "my-session" -n "build"

# Rename a window
tmux rename-window -t "my-session:0" "conductor"

# List windows
tmux list-windows -t "my-session"

# Close a window
tmux kill-window -t "my-session:build"
```

### 1.3 Pane Management

```bash
# Split horizontally (top/bottom)
tmux split-window -t "my-session:0" -v

# Split vertically (left/right)
tmux split-window -t "my-session:0" -h

# Split with a specific starting directory
tmux split-window -t "my-session:0" -v -c "/path/to/worktree"

# List panes with their IDs
tmux list-panes -t "my-session:0" -F '#{pane_index}: #{pane_id} #{pane_current_command}'

# Kill a specific pane
tmux kill-pane -t "my-session:0.2"
```

### 1.4 Multi-Pane Creation Pattern (taskMaestro)

```bash
SESSION="taskmaestro-$(date +%s)"
PANE_COUNT=4

tmux new-session -d -s "$SESSION" -c "$PROJECT_ROOT"

for i in $(seq 1 $((PANE_COUNT - 1))); do
  tmux split-window -t "$SESSION:0" -v -c "$PROJECT_ROOT"
done

# Rebalance after all splits
tmux select-layout -t "$SESSION:0" tiled
```

**Good vs Bad:**

| | Example | Why |
|---|---------|-----|
| **Good** | `tmux split-window -t "$SESSION:0" -v -c "$WT_DIR"` | Explicit target, explicit directory |
| **Bad** | `tmux split-window` | No target, no directory — operates on whatever is "current" |
| **Good** | `tmux kill-pane -t "$SESSION:0.3"` | Targets exact pane |
| **Bad** | `tmux kill-pane` | Kills whichever pane happens to be selected |

---

## Phase 2: Layout Management

### 2.1 Built-in Layouts

```bash
# Apply a preset layout
tmux select-layout -t "$SESSION:0" even-horizontal
tmux select-layout -t "$SESSION:0" even-vertical
tmux select-layout -t "$SESSION:0" main-horizontal
tmux select-layout -t "$SESSION:0" main-vertical
tmux select-layout -t "$SESSION:0" tiled
```

### 2.2 Manual Resize

```bash
# Resize pane by cell count
tmux resize-pane -t "$SESSION:0.1" -D 10   # down 10 rows
tmux resize-pane -t "$SESSION:0.1" -U 5    # up 5 rows
tmux resize-pane -t "$SESSION:0.1" -R 20   # right 20 columns
tmux resize-pane -t "$SESSION:0.1" -L 10   # left 10 columns

# Resize to exact percentage
tmux resize-pane -t "$SESSION:0.0" -y 25%  # 25% of window height
tmux resize-pane -t "$SESSION:0.0" -x 50%  # 50% of window width
```

### 2.3 Swap Panes

```bash
# Swap two panes by index
tmux swap-pane -s "$SESSION:0.0" -t "$SESSION:0.2"

# Move current pane up/down in order
tmux swap-pane -t "$SESSION:0.1" -U
tmux swap-pane -t "$SESSION:0.1" -D
```

### 2.4 Conductor-Bottom Layout Pattern

The conductor pane (orchestrator) sits at the bottom, worker panes fill the top:

```bash
LAST_PANE=$((PANE_COUNT - 1))

# Conductor is pane 0 initially; swap it to the last position
tmux swap-pane -s "$SESSION:0.0" -t "$SESSION:0.$LAST_PANE"

# Resize the conductor (now at bottom) to 25% height
tmux resize-pane -t "$SESSION:0.$LAST_PANE" -y 25%
```

This produces:

```
┌──────────┬──────────┬──────────┐
│ Worker 1 │ Worker 2 │ Worker 3 │  75%
├──────────┴──────────┴──────────┤
│         Conductor              │  25%
└────────────────────────────────┘
```

---

## Phase 3: Pane Communication

### 3.1 Sending Commands

```bash
# Send a command to a specific pane
tmux send-keys -t "$SESSION:0.1" "cd /path/to/worktree && yarn test" Enter

# Send literal text (no Enter)
tmux send-keys -t "$SESSION:0.1" "echo hello"

# Send special keys
tmux send-keys -t "$SESSION:0.1" C-c       # Ctrl+C (interrupt)
tmux send-keys -t "$SESSION:0.1" C-l       # Ctrl+L (clear screen)
tmux send-keys -t "$SESSION:0.1" Enter     # Press Enter
```

### 3.2 Capturing Output

```bash
# Capture visible pane content
tmux capture-pane -t "$SESSION:0.1" -p

# Capture with scrollback history (last 1000 lines)
tmux capture-pane -t "$SESSION:0.1" -p -S -1000

# Capture to a file
tmux capture-pane -t "$SESSION:0.1" -p > /tmp/pane-output.txt
```

### 3.3 Readiness Polling

Wait for a pane to be ready (shell prompt visible) before sending commands:

```bash
PANE="$SESSION:0.1"
MAX_WAIT=30
ELAPSED=0

while [ $ELAPSED -lt $MAX_WAIT ]; do
  # Check for common shell prompt indicators
  if tmux capture-pane -t "$PANE" -p | grep -qE '⏵⏵|❯|\$\s*$'; then
    echo "Pane $PANE is ready"
    break
  fi
  sleep 1
  ELAPSED=$((ELAPSED + 1))
done

if [ $ELAPSED -ge $MAX_WAIT ]; then
  echo "ERROR: Pane $PANE not ready after ${MAX_WAIT}s"
  exit 1
fi
```

**Prompt patterns to detect:**

| Shell / Tool | Pattern |
|-------------|---------|
| bash/zsh default | `$` or `%` at end of line |
| Starship / Powerline | `❯` or `⏵⏵` |
| Claude Code | `❯` or `⏵⏵` |
| Custom PS1 | Project-specific — adapt the grep pattern |

### 3.4 Completion Polling

Wait for a long-running command to finish:

```bash
PANE="$SESSION:0.1"

# Poll until the shell prompt returns (command finished)
while ! tmux capture-pane -t "$PANE" -p | tail -5 | grep -qE '⏵⏵|❯|\$\s*$'; do
  sleep 2
done
```

---

## Phase 4: Styling

### 4.1 Pane Background Colors

Differentiate panes visually by role:

```bash
# Set pane background color
tmux select-pane -t "$SESSION:0.0" -P 'bg=#1a1a2e'   # deep blue — conductor
tmux select-pane -t "$SESSION:0.1" -P 'bg=#1a2e1a'   # deep green — worker 1
tmux select-pane -t "$SESSION:0.2" -P 'bg=#2e1a1a'   # deep red — worker 2
tmux select-pane -t "$SESSION:0.3" -P 'bg=#2e2e1a'   # deep yellow — worker 3

# Reset pane style to default
tmux select-pane -t "$SESSION:0.0" -P 'default'
```

### 4.2 Pane Border Styling

```bash
# Set pane border style (tmux 3.2+)
tmux set-option -t "$SESSION" pane-border-style 'fg=#444444'
tmux set-option -t "$SESSION" pane-active-border-style 'fg=#00aaff'

# Show pane border labels (tmux 3.4+)
tmux set-option -t "$SESSION" pane-border-status top
tmux set-option -t "$SESSION" pane-border-format ' #{pane_index}: #{pane_title} '
```

### 4.3 Setting Pane Titles

```bash
# Set a pane title for identification
tmux select-pane -t "$SESSION:0.1" -T "Worker: issue-42"

# Read pane title
tmux display-message -t "$SESSION:0.1" -p '#{pane_title}'
```

---

## Phase 5: Socket and Session Management

### 5.1 Socket Detection

Identify which socket the current tmux session uses:

```bash
# Get the socket path from inside a tmux session
TMUX_SOCKET=$(tmux display-message -p '#{socket_path}')
echo "Socket: $TMUX_SOCKET"

# The TMUX env variable also encodes socket info
# Format: /path/to/socket,pid,session_index
echo "$TMUX"
```

### 5.2 Multiple Servers

Run independent tmux servers for isolation:

```bash
# Start a tmux server on a custom socket
tmux -L my-custom-socket new-session -d -s "isolated"

# List sessions on a specific socket
tmux -L my-custom-socket list-sessions

# Target commands to a specific server
tmux -L my-custom-socket send-keys -t "isolated:0.0" "echo hello" Enter

# Kill a specific server
tmux -L my-custom-socket kill-server
```

### 5.3 Environment Variables

```bash
# Pass environment variables into a tmux session
tmux set-environment -t "$SESSION" MY_VAR "my-value"

# Read an environment variable
tmux show-environment -t "$SESSION" MY_VAR

# Propagate env to new panes (global)
tmux set-environment -g MY_GLOBAL_VAR "global-value"

# Update environment from parent shell on reattach
tmux set-option -g update-environment "SSH_AUTH_SOCK DISPLAY"
```

### 5.4 Session Survival

```bash
# Detach from a session (keeps it running)
tmux detach-client -t "$SESSION"

# Reattach to a session
tmux attach-session -t "$SESSION"

# Check if a session exists
tmux has-session -t "$SESSION" 2>/dev/null && echo "exists" || echo "not found"
```

---

## Phase 6: Troubleshooting

### 6.1 Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `no server running on /tmp/tmux-*/default` | tmux server not started | Start a session first: `tmux new-session -d -s tmp` |
| `can't find pane: %42` | Pane was killed or ID changed | Re-query: `tmux list-panes -t "$SESSION" -F '#{pane_id}'` |
| `session not found: foo` | Typo or session killed | Check: `tmux list-sessions` |
| `duplicate session: foo` | Session already exists | Use `tmux has-session -t foo` before creating |
| `create window failed: index in use: 0` | Window index conflict | Use `-a` flag or specify unused index |
| `pane too small` | Window area insufficient for split | Resize window or use fewer panes |

### 6.2 macOS vs Linux Differences

| Feature | macOS (Homebrew tmux) | Linux (apt/yum tmux) |
|---------|----------------------|----------------------|
| **Default version** | Usually latest (3.4+) | Varies: Ubuntu 22.04 ships 3.2a, older distros may have 2.x |
| **Socket path** | `/private/tmp/tmux-$UID/default` | `/tmp/tmux-$UID/default` |
| **Clipboard** | `pbcopy`/`pbpaste` | `xclip` or `xsel` (requires X11) |
| **`pane-border-status`** | Available (3.2+) | May not be available on older distros |
| **`pane-border-format`** | Available (3.4+) | Requires tmux 3.4+ (not in Ubuntu 22.04 default) |
| **`select-pane -P`** | Available (3.0+) | May need version check on old systems |
| **Reattach to user namespace** | No longer needed (macOS 10.10+) | N/A |
| **True color support** | Requires `set -g default-terminal "tmux-256color"` | Same — some terminals need `TERM=xterm-256color` |

**Version detection pattern:**

```bash
TMUX_VERSION=$(tmux -V | sed 's/tmux //')
TMUX_MAJOR=$(echo "$TMUX_VERSION" | cut -d. -f1)
TMUX_MINOR=$(echo "$TMUX_VERSION" | cut -d. -f2 | sed 's/[a-z]//g')

if [ "$TMUX_MAJOR" -ge 3 ] && [ "$TMUX_MINOR" -ge 2 ]; then
  echo "tmux 3.2+ features available"
fi
```

### 6.3 Debugging Techniques

```bash
# Verbose logging
tmux -v new-session -d -s debug
# Logs written to tmux-client-*.log and tmux-server-*.log in current dir

# Inspect tmux server state
tmux show-options -g        # global options
tmux show-options -s        # server options
tmux show-options -t "$SESSION"   # session options

# List all key bindings
tmux list-keys

# Show all tmux environment variables
tmux show-environment -t "$SESSION"

# Check pane process
tmux list-panes -t "$SESSION:0" -F '#{pane_pid}: #{pane_current_command}'
```

---

## Verification Checklist

Before considering tmux automation complete:

- [ ] All `tmux` commands use explicit `-t` targets (no implicit context)
- [ ] Sessions and windows have meaningful names (not default indices)
- [ ] Pane readiness is verified before sending commands
- [ ] Error handling exists for "session not found" and "pane not found"
- [ ] Socket path is detected, not hardcoded
- [ ] Cleanup logic kills sessions/panes when workflow completes or errors
- [ ] Cross-platform compatibility verified (or version-gated features noted)
- [ ] Pane output capture works for the expected prompt pattern

## Red Flags — STOP

| Thought | Reality |
|---------|---------|
| "I don't need `-t`, there's only one session" | Other tools or users may create sessions. Always target explicitly. |
| "I'll hardcode the socket path" | Socket paths differ between macOS and Linux. Detect with `display-message`. |
| "The pane is probably ready by now" | Probably is not certainly. Poll for readiness before sending commands. |
| "I'll just `sleep 5` instead of polling" | Sleep is fragile — too short misses slow starts, too long wastes time. Poll. |
| "kill-server is fine for cleanup" | `kill-server` destroys ALL sessions, including unrelated ones. Target specific sessions. |
| "Pane colors are cosmetic, skip them" | In multi-agent workflows, color is the only way to visually identify pane roles. |
| "I'll parse tmux output with awk" | tmux has `-F` format strings for structured output. Use them. |
| "This works on my Mac, ship it" | Linux tmux versions vary wildly. Check `tmux -V` and gate features. |

## Related Skills

| Skill | Relationship |
|-------|-------------|
| `using-git-worktrees` | Worktrees provide filesystem isolation; tmux provides terminal isolation. Used together for parallel execution. |
| `dispatching-parallel-agents` | Dispatches agents into tmux panes for concurrent work. |
| `executing-plans` | Plan steps may execute in separate tmux panes. |
| `systematic-debugging` | Debugging tmux automation failures follows the same root-cause-first approach. |

## Related Agents

| Agent | When to Involve |
|-------|----------------|
| Platform Engineer | When tmux automation spans multiple environments (CI, local, remote) |
| DevOps Engineer | When tmux is part of deployment or infrastructure automation |
| Tooling Engineer | When building reusable tmux orchestration scripts |
