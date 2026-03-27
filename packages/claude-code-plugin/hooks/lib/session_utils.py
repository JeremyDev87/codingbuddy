"""Session ID resolution utilities for CodingBuddy hooks (#976).

Claude Code CLI does not always provide CLAUDE_SESSION_ID as an environment
variable.  This module implements a multi-strategy fallback so that every hook
can obtain a stable, unique session identifier.

Resolution order:
1. CLAUDE_SESSION_ID environment variable (official, when available)
2. Last entry in ~/.claude/history.jsonl (sessionId field)
3. Generate a UUID and persist it for the lifetime of the process
"""

import json
import os
import uuid
from pathlib import Path
from typing import Optional

# Module-level cache — resolved once per process
_cached_session_id: Optional[str] = None


def _from_env() -> Optional[str]:
    """Try CLAUDE_SESSION_ID environment variable."""
    value = os.environ.get("CLAUDE_SESSION_ID")
    if value and value != "unknown":
        return value
    return None


def _from_history() -> Optional[str]:
    """Parse the last line of ~/.claude/history.jsonl for sessionId."""
    try:
        history_file = Path.home() / ".claude" / "history.jsonl"
        if not history_file.exists():
            return None

        # Read only the last line efficiently
        with open(history_file, "rb") as f:
            # Seek to end, then scan backwards for the last newline
            f.seek(0, 2)  # end of file
            size = f.tell()
            if size == 0:
                return None

            # Read last 4KB at most (a single JSONL entry is typically small)
            read_size = min(4096, size)
            f.seek(size - read_size)
            tail = f.read().decode("utf-8", errors="replace")

        # Get the last non-empty line
        lines = tail.strip().split("\n")
        if not lines:
            return None

        last_line = lines[-1].strip()
        if not last_line:
            return None

        data = json.loads(last_line)
        session_id = data.get("sessionId")
        if session_id and isinstance(session_id, str) and session_id != "unknown":
            return session_id
    except Exception:
        pass
    return None


def _generate_persistent() -> str:
    """Generate a UUID and persist it for the current session.

    The file is written to ~/.codingbuddy/current_session_id so that
    multiple hooks within the same session share the same generated ID.
    """
    session_file = Path(
        os.environ.get("CLAUDE_PLUGIN_DATA", "")
        or os.path.join(str(Path.home()), ".codingbuddy")
    ) / "current_session_id"

    # If a persisted ID already exists, reuse it
    try:
        if session_file.exists():
            stored = session_file.read_text(encoding="utf-8").strip()
            if stored:
                return stored
    except OSError:
        pass

    # Generate a new one
    new_id = str(uuid.uuid4())
    try:
        session_file.parent.mkdir(parents=True, exist_ok=True)
        session_file.write_text(new_id, encoding="utf-8")
    except OSError:
        pass  # Best-effort persistence
    return new_id


def get_session_id() -> str:
    """Resolve the current Claude Code session ID.

    Uses a module-level cache so the resolution runs at most once per
    process (each hook invocation is a separate process, so the cache
    lives for the duration of a single hook execution).

    Returns:
        A non-empty session ID string, never "unknown".
    """
    global _cached_session_id
    if _cached_session_id is not None:
        return _cached_session_id

    _cached_session_id = (
        _from_env()
        or _from_history()
        or _generate_persistent()
    )
    return _cached_session_id
