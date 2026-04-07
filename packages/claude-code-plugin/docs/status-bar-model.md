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
◕‿◕ CB v5.4.0 | PLAN 🟢 | 12m | ~$0.42 | ♻800/1.5k | Ctx:45%
```

| Segment         | Source                          | Description                                |
| --------------- | ------------------------------- | ------------------------------------------ |
| `◕‿◕`          | Constant                        | Buddy face                                 |
| `CB v5.4.0`    | `hud_state.version`             | Plugin version                             |
| `PLAN`          | `hud_state.currentMode`         | Current workflow mode (PLAN/ACT/EVAL/AUTO) |
| `🟢`           | Computed from `ctx_pct`          | Health indicator (see below)               |
| `12m`           | `hud_state.sessionStartTimestamp`| Session duration                           |
| `~$0.42`       | Computed from stdin token usage  | Estimated session cost                     |
| `♻800/1.5k`    | Computed from stdin token usage  | Cache tokens (last API call, see below)    |
| `Ctx:45%`      | `stdin.context_window.used_percentage` | Context window usage               |

The segment is omitted entirely when cache usage data is absent — do not assume it is always present.

### Cache Segment Semantics (Last-Call Only)

The cache segment renders raw token counts from **the most recent API call**, not cumulative session cache efficiency. This is a deliberate design choice driven by how Claude Code exposes telemetry (see #1355, #1356).

**Format:** `♻{cache_read_input_tokens}/{total_input_tokens}` — e.g. `♻2k/3.5k`

- **Numerator:** `stdin.context_window.current_usage.cache_read_input_tokens`
- **Denominator:** `input_tokens + cache_creation_input_tokens + cache_read_input_tokens`
- **Compact format:** values < 1000 render as integers (`532`), values ≥ 1000 render as `Nk` with trailing `.0` trimmed for whole thousands (`1k`, `1.5k`, `128k`)

**Why not a percentage?**

An earlier design rendered this as `Cache:XX%`. The calculation was mathematically correct but semantically misleading: users frequently saw values like `Cache:100%` and reasonably assumed their entire session was fully cached, even though the number only described the last request. Claude Code's status-line stdin explicitly documents `context_window.current_usage` as **last-call** token counts, not cumulative session totals. Raw token display removes the ambiguity.

**Fallback behavior:**

- `context_window` missing → segment omitted entirely
- `current_usage` missing or null → segment omitted entirely
- All three token counts are 0 → segment omitted entirely (no meaningful ratio to show)
- Any of the three values is `None` → coerced to 0 via `or 0` defensive pattern

**Rendering reference:** see `format_cache_segment()` and `format_compact_tokens()` in `hooks/codingbuddy-hud.py`.

**Contributor caution:** do **not** reintroduce a percentage-based rendering (e.g. `Cache:XX%`). Regression tests in `tests/test_hud.py::TestFormatCacheSegment::test_regression_no_percent_in_output` and `TestFormatStatusLineCacheSegment::test_status_line_no_longer_contains_cache_percent` explicitly guard against this.

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

**Used for:** model identification, cost estimation, last-call cache tokens, context percentage.

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
◕‿◕ CB v5.4.0 | PLAN 🟢 | 5m | ~$0.12 | ♻1.2k/3k | Ctx:22%
```

### ACT Mode (With Agent)

```
◕‿◕ CB v5.4.0 | ACT 🟢 | 18m | ~$1.05 | ♻8k/13k | Ctx:48%
🤖 frontend-developer
```

### EVAL Mode (High Context)

```
◕‿◕ CB v5.4.0 | EVAL 🟡 | 45m | ~$3.20 | ♻24k/34k | Ctx:73%
🤖 security-specialist
```

### AUTO Mode (Critical Context)

```
◕‿◕ CB v5.4.0 | AUTO 🔴 | 1h12m | ~$8.50 | ♻95k/172k | Ctx:91%
🤖 code-quality-specialist
```

### No Mode Set (Initial State — Cache Segment Hidden)

```
◕‿◕ CB v5.4.0 | Ready 🟢 | 0m | ~$0.00 | Ctx:0%
```

> The cache segment is **omitted** in the initial state because no API calls have been made yet — there is no `current_usage` data to render. This is the documented fallback behavior, not a bug.

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
