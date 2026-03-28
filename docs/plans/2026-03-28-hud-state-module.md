# HUD State Module Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create `hud_state.py` module for managing `~/.codingbuddy/hud-state.json` — the shared state file for statusLine and mode-detect hooks.

**Architecture:** Functional module (no class) with file-locked JSON read/write, following `stats.py` patterns. All functions return safe defaults on error.

**Tech Stack:** Python 3, `fcntl.flock()`, `json`, `datetime`

**Issue:** #1087

## Alternatives

### Decision: Module Style — Class vs Functions

| Criteria | Class (like stats.py) | Functions (standalone) |
|---|---|---|
| Complexity | More boilerplate, init required | Simpler, direct calls |
| Usage pattern | Long-lived instance in one process | Called from multiple hooks independently |
| State management | In-memory + disk | Disk only (stateless) |
| Testability | Requires fixture setup | Simple function calls |

**Decision:** Functions — HUD state is read/written by different processes (session-start, mode-detect, statusLine script). No single process holds a long-lived instance. Stateless functions are simpler and safer for cross-process access.

---

## Steps

### Step 1: Write failing test — `test_read_hud_state_missing_file`

**File:** `packages/claude-code-plugin/tests/test_hud_state.py`

```python
"""Tests for HUD state management module (#1087)."""
import json
import os
import sys
import pytest

_tests_dir = os.path.dirname(os.path.abspath(__file__))
_lib_dir = os.path.join(os.path.dirname(_tests_dir), "hooks", "lib")
if _lib_dir not in sys.path:
    sys.path.insert(0, _lib_dir)

from hud_state import read_hud_state


class TestReadHudState:
    def test_returns_empty_dict_when_file_missing(self, tmp_path):
        path = str(tmp_path / "nonexistent.json")
        result = read_hud_state(path)
        assert result == {}
```

**Run:** `cd packages/claude-code-plugin && python -m pytest tests/test_hud_state.py::TestReadHudState::test_returns_empty_dict_when_file_missing -v`
**Expected:** FAIL (ImportError — module doesn't exist yet)

### Step 2: Create minimal `hud_state.py` — make Step 1 pass

**File:** `packages/claude-code-plugin/hooks/lib/hud_state.py`

```python
"""HUD state management for CodingBuddy statusLine (#1087).

Manages ~/.codingbuddy/hud-state.json shared between hooks.
Uses fcntl.flock() for file-level locking on every IO operation.
"""
import json
import os
from typing import Any, Dict

try:
    import fcntl
    HAS_FCNTL = True
except ImportError:
    HAS_FCNTL = False

DEFAULT_STATE_FILE = os.path.join(
    os.path.expanduser("~"), ".codingbuddy", "hud-state.json"
)


def read_hud_state(state_file: str = DEFAULT_STATE_FILE) -> Dict[str, Any]:
    """Read HUD state from JSON file with shared lock.

    Returns empty dict on any error (missing file, parse error).
    """
    try:
        with open(state_file, "r", encoding="utf-8") as f:
            if HAS_FCNTL:
                fcntl.flock(f.fileno(), fcntl.LOCK_SH)
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return {}
```

**Run:** Same test
**Expected:** PASS

### Step 3: Write failing test — `test_read_hud_state_corrupted_json`

```python
    def test_returns_empty_dict_when_json_corrupted(self, tmp_path):
        path = str(tmp_path / "bad.json")
        with open(path, "w") as f:
            f.write("{invalid json")
        result = read_hud_state(path)
        assert result == {}
```

**Run:** `python -m pytest tests/test_hud_state.py::TestReadHudState -v`
**Expected:** PASS (already handled by except clause)

### Step 4: Write failing test — `test_read_hud_state_valid`

```python
    def test_reads_valid_state(self, tmp_path):
        path = str(tmp_path / "state.json")
        data = {"sessionId": "abc", "currentMode": "PLAN"}
        with open(path, "w") as f:
            json.dump(data, f)
        result = read_hud_state(path)
        assert result == data
```

**Expected:** PASS

### Step 5: Write failing test — `test_init_hud_state`

```python
class TestInitHudState:
    def test_creates_file_with_correct_schema(self, tmp_path):
        path = str(tmp_path / "hud-state.json")
        from hud_state import init_hud_state
        init_hud_state("session-123", "5.1.1", state_file=path)

        with open(path, "r") as f:
            data = json.load(f)

        assert data["sessionId"] == "session-123"
        assert data["version"] == "5.1.1"
        assert data["currentMode"] is None
        assert data["activeAgent"] is None
        assert "sessionStartTimestamp" in data
        assert "updatedAt" in data
```

**Expected:** FAIL (init_hud_state doesn't exist)

### Step 6: Implement `init_hud_state` — make Step 5 pass

Add to `hud_state.py`:

```python
from datetime import datetime, timezone


def init_hud_state(
    session_id: str,
    version: str,
    state_file: str = DEFAULT_STATE_FILE,
) -> None:
    """Initialize HUD state for a new session.

    Creates parent directory if needed. Overwrites existing state.
    """
    now = datetime.now(timezone.utc).isoformat()
    data = {
        "sessionStartTimestamp": now,
        "sessionId": session_id,
        "version": version,
        "currentMode": None,
        "activeAgent": None,
        "updatedAt": now,
    }
    _locked_write(state_file, data)


def _locked_write(state_file: str, data: Dict[str, Any]) -> None:
    """Write state file with exclusive lock."""
    os.makedirs(os.path.dirname(state_file), mode=0o700, exist_ok=True)
    with open(state_file, "w", encoding="utf-8") as f:
        if HAS_FCNTL:
            fcntl.flock(f.fileno(), fcntl.LOCK_EX)
        json.dump(data, f)
```

**Run:** `python -m pytest tests/test_hud_state.py -v`
**Expected:** PASS

### Step 7: Write failing test — `test_init_creates_parent_directory`

```python
    def test_creates_parent_directory(self, tmp_path):
        path = str(tmp_path / "nested" / "deep" / "hud-state.json")
        from hud_state import init_hud_state
        init_hud_state("s1", "5.1.1", state_file=path)
        assert os.path.isfile(path)
```

**Expected:** PASS (already handled by `os.makedirs`)

### Step 8: Write failing test — `test_update_hud_state`

```python
class TestUpdateHudState:
    def test_merges_kwargs_into_existing_state(self, tmp_path):
        path = str(tmp_path / "hud-state.json")
        from hud_state import init_hud_state, update_hud_state
        init_hud_state("s1", "5.1.1", state_file=path)
        update_hud_state(state_file=path, currentMode="ACT")

        result = read_hud_state(path)
        assert result["currentMode"] == "ACT"
        assert result["sessionId"] == "s1"  # preserved
        assert result["version"] == "5.1.1"  # preserved
```

**Expected:** FAIL (update_hud_state doesn't exist)

### Step 9: Implement `update_hud_state` — make Step 8 pass

Add to `hud_state.py`:

```python
def update_hud_state(
    state_file: str = DEFAULT_STATE_FILE,
    **kwargs: Any,
) -> None:
    """Update HUD state by merging kwargs into existing state.

    Read-modify-write with exclusive lock. Silently no-ops on error.
    """
    try:
        data = read_hud_state(state_file)
        data.update(kwargs)
        data["updatedAt"] = datetime.now(timezone.utc).isoformat()
        _locked_write(state_file, data)
    except Exception:
        pass
```

**Run:** `python -m pytest tests/test_hud_state.py -v`
**Expected:** PASS

### Step 10: Write failing test — `test_update_updates_timestamp`

```python
    def test_updates_timestamp(self, tmp_path):
        path = str(tmp_path / "hud-state.json")
        from hud_state import init_hud_state, update_hud_state
        init_hud_state("s1", "5.1.1", state_file=path)

        before = read_hud_state(path)["updatedAt"]
        import time; time.sleep(0.01)
        update_hud_state(state_file=path, currentMode="EVAL")

        after = read_hud_state(path)["updatedAt"]
        assert after > before
```

**Expected:** PASS

### Step 11: Write failing test — `test_update_on_missing_file`

```python
    def test_noop_when_file_missing(self, tmp_path):
        path = str(tmp_path / "nonexistent.json")
        from hud_state import update_hud_state
        # Should not raise
        update_hud_state(state_file=path, currentMode="PLAN")
        # File may or may not be created — just ensure no crash
```

**Expected:** PASS (try/except in update_hud_state)

### Step 12: Write failing test — `test_roundtrip`

```python
class TestRoundtrip:
    def test_init_read_update_read(self, tmp_path):
        path = str(tmp_path / "hud-state.json")
        from hud_state import init_hud_state, update_hud_state

        init_hud_state("rt-1", "5.1.1", state_file=path)
        state1 = read_hud_state(path)
        assert state1["currentMode"] is None

        update_hud_state(state_file=path, currentMode="PLAN", activeAgent="architect")
        state2 = read_hud_state(path)
        assert state2["currentMode"] == "PLAN"
        assert state2["activeAgent"] == "architect"
        assert state2["sessionId"] == "rt-1"

        update_hud_state(state_file=path, currentMode="ACT")
        state3 = read_hud_state(path)
        assert state3["currentMode"] == "ACT"
        assert state3["activeAgent"] == "architect"  # preserved
```

**Expected:** PASS

### Step 13: Run all tests + commit

**Run:** `cd packages/claude-code-plugin && python -m pytest tests/test_hud_state.py -v`
**Expected:** All PASS

**Commit:** `git add packages/claude-code-plugin/hooks/lib/hud_state.py packages/claude-code-plugin/tests/test_hud_state.py && git commit -m "feat(plugin): add HUD state module (#1087)"`

---

## Verification

```bash
cd packages/claude-code-plugin
python -m pytest tests/test_hud_state.py -v
```

All tests must pass. The module is ready for consumption by:
- `codingbuddy-hud.py` (#1088) — reads state
- `session-start.py` (#1089) — calls `init_hud_state()`
- `user-prompt-submit.py` (#1090) — calls `update_hud_state(currentMode=...)`
