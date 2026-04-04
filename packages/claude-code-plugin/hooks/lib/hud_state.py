"""HUD state management for CodingBuddy statusLine (#1087, #1326).

Manages ~/.codingbuddy/hud-state.json shared between hooks.
Uses fcntl.flock() for file-level locking on every IO operation.
"""
import json
import os
from datetime import datetime, timezone
from typing import Any, Dict

# Default values for extended schema fields (#1326).
_EXTENDED_DEFAULTS: Dict[str, Any] = {
    "phase": "ready",
    "focus": None,
    "executionStrategy": None,
    "councilStatus": None,
    "blockerCount": 0,
    "lastHandoff": None,
}

try:
    import fcntl
    HAS_FCNTL = True
except ImportError:
    HAS_FCNTL = False

DEFAULT_STATE_FILE = os.path.join(
    os.environ.get(
        "CLAUDE_PLUGIN_DATA",
        os.path.join(os.path.expanduser("~"), ".codingbuddy"),
    ),
    "hud-state.json",
)


def read_hud_state(
    state_file: str = DEFAULT_STATE_FILE,
    *,
    fill_defaults: bool = False,
) -> Dict[str, Any]:
    """Read HUD state from JSON file with shared lock.

    Args:
        state_file: Path to the state JSON file.
        fill_defaults: When True, back-fill missing extended-schema keys
            with their defaults so callers always see the full schema.

    Returns empty dict on any error (missing file, parse error).
    """
    try:
        with open(state_file, "r", encoding="utf-8") as f:
            if HAS_FCNTL:
                fcntl.flock(f.fileno(), fcntl.LOCK_SH)
            data: Dict[str, Any] = json.load(f)
    except (json.JSONDecodeError, OSError):
        return {}

    if fill_defaults:
        for key, default in _EXTENDED_DEFAULTS.items():
            data.setdefault(key, default)

    return data


def init_hud_state(
    session_id: str,
    version: str,
    state_file: str = DEFAULT_STATE_FILE,
) -> None:
    """Initialize HUD state for a new session.

    Creates parent directory if needed. Overwrites existing state.
    """
    now = datetime.now(timezone.utc).isoformat()
    data: Dict[str, Any] = {
        "sessionStartTimestamp": now,
        "sessionId": session_id,
        "version": version,
        "currentMode": None,
        "activeAgent": None,
        # Extended schema (#1326)
        "phase": "ready",
        "focus": None,
        "executionStrategy": None,
        "councilStatus": None,
        "blockerCount": 0,
        "lastHandoff": None,
        "updatedAt": now,
    }
    _locked_write(state_file, data)


def update_hud_state(
    state_file: str = DEFAULT_STATE_FILE,
    **kwargs: Any,
) -> None:
    """Update HUD state by merging kwargs into existing state.

    Atomic read-modify-write under a single exclusive lock.
    Silently no-ops on error.
    """
    try:
        os.makedirs(os.path.dirname(state_file), mode=0o700, exist_ok=True)
        with open(state_file, "r+", encoding="utf-8") as f:
            if HAS_FCNTL:
                fcntl.flock(f.fileno(), fcntl.LOCK_EX)
            data = json.load(f)
            data.update(kwargs)
            data["updatedAt"] = datetime.now(timezone.utc).isoformat()
            f.seek(0)
            f.truncate()
            json.dump(data, f)
    except (OSError, json.JSONDecodeError):
        pass


def _locked_write(state_file: str, data: Dict[str, Any]) -> None:
    """Write state file with exclusive lock."""
    os.makedirs(os.path.dirname(state_file), mode=0o700, exist_ok=True)
    with open(state_file, "w", encoding="utf-8") as f:
        if HAS_FCNTL:
            fcntl.flock(f.fileno(), fcntl.LOCK_EX)
        json.dump(data, f)
