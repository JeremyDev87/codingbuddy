# Council Surface Model

> Developer-facing reference for the Tiny Actor / council UX across Claude Code surfaces.
> Each surface has a distinct responsibility — mixing them leads to a cluttered experience.

## Overview

The council UX spans five Claude Code surfaces. Each surface serves a specific role
in the lifecycle of a user request:

| Surface | Role | Output Style |
|---------|------|-------------|
| **SessionStart** | Greeting & bootstrap | Setup diagnostics |
| **UserPromptSubmit** | Opening council scene | Full scene (instructions, mode header) |
| **PreToolUse** | Live council cue | Compact badge (spinner text) |
| **PostToolUse** | State transition tracking | Silent (side-effects only) |
| **Status bar** | Persistent snapshot | Two-line compact strip |

```
 Request lifecycle
 ─────────────────────────────────────────────────────────
 SessionStart ──► UserPromptSubmit ──► PreToolUse ──► PostToolUse
      │                  │                  │              │
  bootstrap        full scene         compact cue     silent tracking
                                                           │
                                          Status bar ◄─────┘
                                       (persistent snapshot)
```

---

## 1. SessionStart — Greeting & Bootstrap

**File:** `hooks/session-start.py`

**Role:** One-time session setup. This is NOT the main council surface.

**What it does:**
- Installs the global UserPromptSubmit hook (`~/.claude/hooks/codingbuddy-mode-detect.py`)
- Registers MCP server entry in `~/.claude/mcp.json`
- Initializes HUD state file (`~/.codingbuddy/hud-state.json`)
- Installs the statusLine command in settings.json

**What it renders:**
- Localized installation status messages (e.g., "CodingBuddy mode detection hook installed")
- Permission hints and diagnostics on failure

**Council contract:** None. SessionStart must not render council scenes,
actor cards, or agent grids. Its job is infrastructure only.

---

## 2. UserPromptSubmit — Opening Council Scene

**File:** `hooks/user-prompt-submit.py` (installed globally at `~/.claude/hooks/`)

**Role:** The primary surface for the opening council scene. Fires when the user
submits a prompt, before Claude processes it.

**What it does:**
- Detects PLAN/ACT/EVAL/AUTO keywords (multilingual: en, ko, ja, zh, es)
- Outputs mode-specific instructions (standalone or MCP-enhanced)
- Resets workflow-related HUD fields (`focus`, `blockerCount`, `activeAgent`, etc.)
- Updates HUD state with `currentMode` and `phase`

**What it renders:**
- Mode header with backend marker (standalone vs. MCP-enhanced)
- Full enriched instructions from `.ai-rules/rules/core.md` when available
- Fallback minimal instructions when MCP is unavailable

**Council contract:** This is the one surface allowed to produce a full council
scene — mode announcements, agent activation text, and workflow instructions.
Future council "opening acts" (e.g., actor introductions, deliberation previews)
belong here.

---

## 3. PreToolUse — Compact Live Council Cue

**File:** `hooks/pre-tool-use.py`

**Role:** Lightweight, transient feedback during tool execution.
Appears in the Claude Code spinner area.

**What it does:**
- Enforces quality gates on git commits
- Suggests related tests for staged files (collapsed count)
- Auto-selects relevant checklists (domain summary counts)
- Displays active agent status in the spinner

**What it renders (compact badge style per #1039):**

| Cue | Example |
|-----|---------|
| Agent status | `🟡 ★‿★ Frontend Developer` |
| Test suggestion | `3 related test(s) found — consider running before commit` |
| Checklist warning | `[Checklist] security(2), performance(1)` |
| TDD indicator | Progress marker from `build_tdd_indicator()` |

**Return structure:**
```python
{
    "hookSpecificOutput": {
        "statusMessage": "...",       # Transient spinner text
        "additionalContext": "..."    # Quality gate warnings
    }
}
```

**Council contract:** Compact only. No full scenes, no multi-line actor cards,
no grids. Think "badge in a spinner" — one line, domain counts not item lists,
agent glyph not agent biography.

---

## 4. PostToolUse — State Transition Tracking

**File:** `hooks/post-tool-use.py`

**Role:** Silent bookkeeping. Records what happened and detects state transitions.

**What it does:**
- Records tool call statistics via `SessionStats`
- Tracks tool calls in history database (`HistoryDB`)
- Detects PR creation and sends notifications
- Detects agent handoffs and mode changes from `parse_mode` results
- Updates HUD state fields (`lastHandoff`, phase transitions)

**What it renders:** Nothing visible. Returns `None`.

**Council contract:** This surface must remain silent. All its work is
side-effect based (file writes, database records, HUD state updates).
Never add visible output here — the status bar will pick up state changes
from the HUD state file on its next refresh.

---

## 5. Status Bar — Compact Persistent Snapshot

**File:** `hooks/codingbuddy-hud.py`

**Role:** Always-visible, two-line summary strip at the bottom of the terminal.
Refreshed continuously by Claude Code.

**Layout:**

```
Line 1 (always):
◕‿◕ CB v5.3.0 | PLAN 🟢 | 12m | ~$0.42 | ♻800/1.5k | Ctx:45%

Line 2 (conditional — only when agent is active):
[◮ secu] [auth flow] [✓]
```

**Line 1 segments:**

| Segment | Source | Example |
|---------|--------|---------|
| Buddy face | Constant | `◕‿◕` |
| Version | `installed_plugins.json` / HUD state | `CB v5.3.0` |
| Mode | `hud-state.currentMode` | `PLAN` |
| Health | Context usage thresholds | `🟢` (<60%), `🟡` (60-85%), `🔴` (>85%) |
| Duration | stdin `cost.total_duration_ms` / HUD state | `12m` |
| Cost | stdin `cost.total_cost_usd` / estimate | `~$0.42` |
| Cache | Last-call token counts (not session-wide) | `♻800/1.5k` |
| Context | Context window usage % | `Ctx:45%` |

**Line 2 segments (conditional):**

| Segment | Source | Example |
|---------|--------|---------|
| Actor badge | Agent glyph + 4-char abbreviation | `[◮ secu]` |
| Focus | Current file or action | `[auth flow]` |
| State | Blocker count or checkmark | `[⚠2]` or `[✓]` |

**Data source priority (three tiers):**
1. **Stdin JSON** (highest): model, context, cost, rate limits from Claude Code
2. **HUD state file**: version, mode, agent, timestamps (fcntl.flock protected)
3. **Environment variables** (lowest): fallbacks

**Crash fallback:** `◕‿◕ CodingBuddy`

**Council contract:** Snapshot only. The status bar reflects the latest known
state — it does not initiate transitions or produce scenes. It reads from
HUD state that other hooks write to.

---

## Design Principles

### 1. One Full Scene Surface

Only **UserPromptSubmit** may render full council scenes. All other surfaces
use compact representations or remain silent.

### 2. Compact Means Compact

PreToolUse and status bar use collapsed counts, abbreviations, and glyphs.
Never expand details that belong in the opening scene.

### 3. Silent Bookkeeping

PostToolUse never produces visible output. State changes propagate to the
status bar via the shared HUD state file.

### 4. Data Flows Downhill

```
SessionStart (bootstrap)
    └──► UserPromptSubmit (writes HUD state: mode, phase)
            └──► PreToolUse (writes HUD state: agent, focus, strategy)
                    └──► PostToolUse (writes HUD state: handoffs, transitions)
                            └──► Status bar (reads HUD state, renders snapshot)
```

### 5. Crash Resilience

Every surface wraps its work in try/except. A failing hook must never block
Claude Code execution. The status bar has a single-line crash fallback.

---

## Cross-Reference

| Document | Scope |
|----------|-------|
| [status-bar-model.md](status-bar-model.md) | Detailed status bar architecture and segment specs |
| [bootstrap-architecture.md](bootstrap-architecture.md) | UserPromptSubmit global installation rationale |
| [namespace-policy.md](namespace-policy.md) | File naming and namespace conventions |
