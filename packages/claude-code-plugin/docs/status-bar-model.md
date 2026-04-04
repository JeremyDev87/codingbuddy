# Two-Line Status Bar Model

The CodingBuddy status bar uses a **two-line model** to display session telemetry and active agent information in Claude Code's status line area.

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│ Line 1 (always): ◕‿◕ CB v5.x | PLAN 🟢 | 12m | ~$0.42 | ...  │  ← Telemetry
│ Line 2 (optional): 🤖 architect                                 │  ← Active agent
└──────────────────────────────────────────────────────────────────┘
```

The status bar is rendered by `codingbuddy-hud.py`, a standalone Python script invoked by Claude Code via the `statusLine.command` setting.

## Line 1: Telemetry (Always Present)

Displays session metrics computed from stdin data and HUD state.

**Format:**

```
◕‿◕ CB v5.1.1 | PLAN 🟢 | 12m | ~$0.42 | Cache:53% | Ctx:45%
```

| Segment         | Source                          | Description                                |
| --------------- | ------------------------------- | ------------------------------------------ |
| `◕‿◕`          | Constant                        | Buddy face                                 |
| `CB v5.1.1`    | `hud_state.version`             | Plugin version                             |
| `PLAN`          | `hud_state.currentMode`         | Current workflow mode (PLAN/ACT/EVAL/AUTO) |
| `🟢`           | Computed from `ctx_pct`          | Health indicator (see below)               |
| `12m`           | `hud_state.sessionStartTimestamp`| Session duration                           |
| `~$0.42`       | Computed from stdin token usage  | Estimated session cost                     |
| `Cache:53%`    | Computed from stdin token usage  | Cache hit rate                             |
| `Ctx:45%`      | `stdin.context_window.used_percentage` | Context window usage               |

### Health Indicator

| Emoji | Condition       | Meaning               |
| ----- | --------------- | --------------------- |
| 🟢    | ctx < 60%       | Healthy               |
| 🟡    | 60% <= ctx <= 85% | Warning             |
| 🔴    | ctx > 85%       | Critical              |

## Line 2: Active Agent (Conditional)

Displayed only when a specialist agent is active.

**Format:**

```
🤖 architect
```

The agent name comes from the `CODINGBUDDY_ACTIVE_AGENT` environment variable, set by hooks when an agent is activated during PLAN/ACT/EVAL/AUTO workflows.

**Rendering logic** (`codingbuddy-hud.py:format_status_line`):

```python
if not active_agent:
    return line1                              # Single-line output

return f"{line1}\n\U0001f916 {active_agent}"  # Two-line output
```

When no agent is active, the status bar is a single line. When an agent is present, a newline separates the two lines.

## Stable Status Bar vs Transient Spinner

The plugin uses two separate display mechanisms:

| Aspect           | Stable Status Bar             | Transient Spinner             |
| ---------------- | ----------------------------- | ----------------------------- |
| **Location**     | Bottom status line            | Spinner text during tool use  |
| **Duration**     | Entire session                | Only while a tool executes    |
| **Script/Hook**  | `codingbuddy-hud.py`          | `pre-tool-use.py`             |
| **Update method**| stdin polling (continuous)     | Hook invocation (per tool)    |
| **Content**      | Telemetry + optional agent    | Agent status only             |
| **Line count**   | 1-2 lines                     | 1 line                        |

### Stable Status Bar

The `statusLine.command` in `settings.json` points to `codingbuddy-hud.py`. Claude Code invokes it repeatedly, piping session telemetry as JSON through stdin. The script outputs formatted text to stdout.

### Transient Spinner (statusMessage)

During tool execution, `pre-tool-use.py` returns a `statusMessage` in its hook output:

```python
# pre-tool-use.py
status_msg = build_status_message()   # from lib/agent_status.py
hook_output["statusMessage"] = status_msg
# e.g., "🟡 ★‿★ Frontend Developer"
```

This message appears as the spinner text while the tool runs, then disappears when the tool completes.

## Data-Source Priorities

The status bar resolves data through a three-tier priority chain:

```
Tier 1 (highest): stdin JSON    ← Claude Code passes telemetry directly
Tier 2 (medium):  HUD state     ← ~/.codingbuddy/hud-state.json (file-locked)
Tier 3 (lowest):  env vars      ← CODINGBUDDY_ACTIVE_AGENT, CODINGBUDDY_HUD_STATE_FILE
```

### Tier 1: Stdin JSON

Claude Code passes session data as JSON to the statusLine script's stdin:

```json
{
  "model": { "id": "claude-opus-4-6" },
  "context_window": {
    "context_window_size": 200000,
    "used_percentage": 45,
    "current_usage": {
      "input_tokens": 1000,
      "cache_creation_input_tokens": 500,
      "cache_read_input_tokens": 2000
    }
  }
}
```

**Used for:** model identification, cost estimation, cache rate, context percentage.

### Tier 2: HUD State File

Managed by hooks via `lib/hud_state.py` with `fcntl.flock()` for cross-process safety:

```json
{
  "sessionId": "abc-123",
  "version": "5.1.1",
  "currentMode": "PLAN",
  "activeAgent": "architect",
  "sessionStartTimestamp": "2026-04-04T10:30:00+00:00"
}
```

**Used for:** version, current mode, session start time.

### Tier 3: Environment Variables (Fallback)

| Variable                       | Purpose                          | Default                       |
| ------------------------------ | -------------------------------- | ----------------------------- |
| `CODINGBUDDY_ACTIVE_AGENT`     | Active agent name (line 2)       | `""` (no agent line)          |
| `CODINGBUDDY_HUD_STATE_FILE`   | Path to HUD state file           | `~/.codingbuddy/hud-state.json` |
| `CLAUDE_PLUGIN_DATA`           | Plugin data directory            | `~/.codingbuddy`              |

### Crash Fallback

If any exception occurs during rendering, the script outputs a minimal fallback:

```
◕‿◕ CodingBuddy
```

## Mode Examples

### PLAN Mode (No Agent)

```
◕‿◕ CB v5.1.1 | PLAN 🟢 | 5m | ~$0.12 | Cache:40% | Ctx:22%
```

### ACT Mode (With Agent)

```
◕‿◕ CB v5.1.1 | ACT 🟢 | 18m | ~$1.05 | Cache:62% | Ctx:48%
🤖 frontend-developer
```

### EVAL Mode (High Context)

```
◕‿◕ CB v5.1.1 | EVAL 🟡 | 45m | ~$3.20 | Cache:71% | Ctx:73%
🤖 security-specialist
```

### AUTO Mode (Critical Context)

```
◕‿◕ CB v5.1.1 | AUTO 🔴 | 1h12m | ~$8.50 | Cache:55% | Ctx:91%
🤖 code-quality-specialist
```

### No Mode Set (Initial State)

```
◕‿◕ CB v5.1.1 | Ready 🟢 | 0m | ~$0.00 | Cache:0% | Ctx:0%
```

## Multiline Behavior

The statusLine output supports exactly **one or two lines**:

- **One line:** Default when no agent is active. Contains all telemetry.
- **Two lines:** When `CODINGBUDDY_ACTIVE_AGENT` is set. Lines are separated by a single `\n`.
- **No trailing newline:** Python's `print()` adds the final newline automatically.

Claude Code's status line renderer handles newlines in the command output, displaying each line as a separate row in the status area.

## Contributor Guide

### File Map

| File                            | Role                                   |
| ------------------------------- | -------------------------------------- |
| `hooks/codingbuddy-hud.py`      | Main statusLine renderer (line 1 + 2)  |
| `hooks/lib/hud_state.py`        | File-locked JSON state (read/write)    |
| `hooks/lib/agent_status.py`     | Agent visual builder (spinner message) |
| `hooks/pre-tool-use.py`         | Transient spinner via `statusMessage`  |
| `hooks/user-prompt-submit.py`   | Mode detection, HUD state update       |
| `hooks/session-start.py`        | StatusLine installation + state init   |

### Execution Flow

```
session-start.py
  ├─ _find_hud_source() → locate codingbuddy-hud.py
  ├─ Copy to ~/.claude/hud/codingbuddy-hud.py
  ├─ init_hud_state() → create hud-state.json
  └─ Write settings.json statusLine.command
       │
       ▼
user-prompt-submit.py (on each prompt)
  ├─ detect_mode() → PLAN/ACT/EVAL/AUTO
  └─ update_hud_state(currentMode=mode)
       │
       ▼
codingbuddy-hud.py (continuous, via statusLine)
  ├─ parse_stdin() → read telemetry JSON
  ├─ read_state() → read hud-state.json (shared lock)
  ├─ format_status_line() → render line 1 + optional line 2
  └─ print() → stdout

pre-tool-use.py (per tool invocation)
  ├─ build_status_message() → agent visual string
  └─ return hookSpecificOutput.statusMessage → spinner text
```

### Test Files

| Test File                       | Covers                                 |
| ------------------------------- | -------------------------------------- |
| `tests/test_hud.py`             | StatusLine rendering (unit + integration) |
| `tests/test_hud_state.py`       | HUD state read/write with file locking |
| `tests/test_agent_status.py`    | Agent status message building          |
| `tests/test_session_start_hud.py` | StatusLine installation              |
