# Wave 3: Auto-Install StatusLine + tmux Sidebar + Config Change

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire up statusLine auto-installation in session-start, add tmux sidebar auto-setup, and set `CODINGBUDDY_AUTO_TUI=0`. All changes are in `session-start.py`.

**Architecture:** Three new functions added to `session-start.py`, inserted as Step 2.5, Step 4.5, and Step 6.5 in the existing `main()` flow.

**Tech Stack:** Python 3, shutil, subprocess, json

**Issues:** #1089, #1091, #1092

## Alternatives

### Decision: HUD script source discovery

| Criteria | Reuse find_plugin_source() with param | Separate find function |
|---|---|---|
| DRY | Reuses existing 3-tier search | Duplicates logic |
| Flexibility | Need to parameterize filename | Hardcoded to one file |
| Risk | Changing shared function may break hook install | Isolated |

**Decision:** Separate helper `_find_hud_source()` that follows the same 3-tier pattern but searches for `codingbuddy-hud.py`. Simpler and zero risk to existing hook installation.

---

## Part A: #1089 — Auto-Install StatusLine

### Step A1: Write test — `_install_statusline`

**File:** `packages/claude-code-plugin/tests/test_session_start_hud.py`

Tests:
- `test_installs_hud_script_to_claude_hud_dir` — copies file, sets permissions
- `test_sets_statusline_in_settings` — writes statusLine config
- `test_replaces_omc_statusline` — replaces omc-hud with codingbuddy-hud
- `test_skips_custom_statusline` — preserves non-OMC custom statusLine
- `test_skips_if_already_installed` — no-op when codingbuddy-hud already set
- `test_sets_auto_tui_to_zero` — changes CODINGBUDDY_AUTO_TUI from 1 to 0

### Step A2: Implement `_find_hud_source()`

Same 3-tier search as `find_plugin_source()` but for `codingbuddy-hud.py`:
1. `CLAUDE_PLUGIN_DIR` env → `hooks/codingbuddy-hud.py`
2. Plugin cache paths → `hooks/codingbuddy-hud.py`
3. Dev paths → `hooks/codingbuddy-hud.py`

### Step A3: Implement `_install_statusline(home, settings_file)`

```python
def _install_statusline(home: Path, settings_file: Path) -> None:
    """Install codingbuddy statusLine and set CODINGBUDDY_AUTO_TUI=0."""
    # 1. Find source
    source = _find_hud_source()
    if not source:
        return

    # 2. Copy to ~/.claude/hud/
    hud_dir = home / ".claude" / "hud"
    hud_dir.mkdir(parents=True, exist_ok=True)
    target = hud_dir / "codingbuddy-hud.py"
    shutil.copy(source, target)
    target.chmod(0o755)

    # 3. Update settings.json
    settings = _read_settings_file(settings_file) if settings_file.exists() else {}

    # Check existing statusLine
    current_sl = settings.get("statusLine", {}).get("command", "")
    if "codingbuddy-hud" in current_sl:
        pass  # already installed
    elif "omc-hud" in current_sl or not current_sl:
        settings["statusLine"] = {
            "type": "command",
            "command": f'python3 "{home}/.claude/hud/codingbuddy-hud.py"'
        }
    # else: custom statusLine, preserve

    # 4. Set CODINGBUDDY_AUTO_TUI=0 (#1092)
    env = settings.setdefault("env", {})
    if env.get("CODINGBUDDY_AUTO_TUI") == "1":
        env["CODINGBUDDY_AUTO_TUI"] = "0"

    _write_settings_file(settings_file, settings)
```

### Step A4: Wire into `main()` as Step 2.5

After line 492 (after status message), before Step 3:
```python
        # Step 2.5: Install codingbuddy statusLine (#1089, #1092)
        try:
            _install_statusline(home, settings_file)
        except Exception:
            pass
```

### Step A5: Implement Step 4.5 — Init HUD state

After line 525 (after stats init):
```python
        # Step 4.5: Initialize HUD state (#1089)
        try:
            _ensure_lib_path()
            from hud_state import init_hud_state
            from session_utils import get_session_id as _get_sid_hud
            init_hud_state(_get_sid_hud(), "5.1.1")
        except Exception:
            pass
```

---

## Part B: #1091 — tmux Sidebar Auto-Setup

### Step B1: Write test — tmux detection + sidebar

**File:** `packages/claude-code-plugin/tests/test_tmux_sidebar.py`

Tests:
- `test_detects_tmux_env` — returns True when $TMUX set
- `test_no_tmux_env` — returns False when $TMUX unset
- `test_sidebar_pane_exists_detection` — detects existing codingbuddy pane
- `test_prints_tmux_suggestion_when_not_in_tmux` — outputs tip message

### Step B2: Implement `_setup_tmux_sidebar()`

```python
import subprocess

TMUX_SUGGESTION = {
    "en": (
        "╭───────────────────────────────────────────────╮\n"
        "│ ◕‿◕ Tip: Run Claude Code inside tmux for     │\n"
        "│     the full CodingBuddy sidebar experience!  │\n"
        "│                                               │\n"
        "│     tmux new -s dev                           │\n"
        "│     claude                                    │\n"
        "╰───────────────────────────────────────────────╯"
    ),
    "ko": (
        "╭───────────────────────────────────────────────╮\n"
        "│ ◕‿◕ Tip: tmux 안에서 Claude Code를 실행하면  │\n"
        "│     CodingBuddy 사이드바를 볼 수 있어요!      │\n"
        "│                                               │\n"
        "│     tmux new -s dev                           │\n"
        "│     claude                                    │\n"
        "╰───────────────────────────────────────────────╯"
    ),
}

def _sidebar_pane_exists() -> bool:
    try:
        result = subprocess.run(
            ["tmux", "list-panes", "-F", "#{pane_current_command}"],
            capture_output=True, text=True, timeout=2,
        )
        return "codingbuddy" in result.stdout
    except Exception:
        return False

def _setup_tmux_sidebar() -> None:
    if not os.environ.get("TMUX"):
        # Print suggestion
        lang = _get_cached_language()
        tip = TMUX_SUGGESTION.get(lang, TMUX_SUGGESTION["en"])
        print(tip, file=sys.stderr)
        return

    if _sidebar_pane_exists():
        return

    subprocess.Popen(
        ["tmux", "split-window", "-h", "-l", "25%", "-d", "codingbuddy", "tui"],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    subprocess.Popen(
        ["tmux", "select-pane", "-L"],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
```

### Step B3: Wire into `main()` as Step 6.5

After buddy greeting (end of Step 6):
```python
        # Step 6.5: tmux sidebar auto-setup (#1091)
        try:
            _setup_tmux_sidebar()
        except Exception:
            pass
```

---

## Execution Order

1. Write tests (A1 + B1)
2. Implement functions (A2-A5 + B2-B3)
3. Run all tests
4. Commit + ship

## Files Modified

| File | Changes |
|------|---------|
| `hooks/session-start.py` | Add `_find_hud_source`, `_install_statusline`, `_setup_tmux_sidebar`, `_sidebar_pane_exists`, `TMUX_SUGGESTION` + wire Steps 2.5, 4.5, 6.5 |
| `tests/test_session_start_hud.py` | NEW — statusLine install tests |
| `tests/test_tmux_sidebar.py` | NEW — tmux detection tests |

## Verification

1. `python3 -m pytest tests/test_session_start_hud.py tests/test_tmux_sidebar.py -v`
2. `python3 -m pytest tests/ -q` (full regression)
3. Manual: Start new Claude Code session → check `~/.claude/settings.json` statusLine
4. Manual (tmux): Start Claude Code in tmux → verify sidebar pane appears
