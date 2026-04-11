"""Session self-heal and stale state detection (#1326, Wave 1-B).

Addresses the bug where ``hud-state.json`` retains stale fields from
a previous session (e.g., ``sessionId="manual-fix"``, ``version="5.2.0"``)
and the statusLine renders them as if they were current. This was the
root cause of the bug report: "현재 PLAN 모드인데 ACT로 되어 있고".

When Claude Code invokes statusLine, stdin carries the real session
ID. If it does not match ``hud_state.sessionId``, the leftover state
is a snapshot from a different session (or a manual edit) and must
be healed before rendering. Additionally, any state older than
``SESSION_STALE_SECONDS`` is treated as stale even without a stdin
mismatch so abandoned sessions do not bleed into fresh ones.

Healing is a *soft reset*: the cleared fields (currentMode, version,
activeAgent, phase, focus, blockerCount) are overwritten in memory
but the file on disk is not touched — that is the responsibility of
``session-start.py`` or an explicit ``reset_stale_session()`` call.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, Optional

# A session older than this is considered stale even when the session
# ID matches. Four hours covers lunch breaks and short meetings but
# catches overnight leftovers and manual edits from yesterday.
SESSION_STALE_SECONDS = 4 * 60 * 60  # 4 hours

# sessionId values that indicate a not-really-a-session state. Any
# match triggers an immediate heal regardless of other signals.
_REPAIR_MARKERS = frozenset({"", "manual-fix", "unknown", "none"})


def detect_stale_session(
    state: Dict[str, Any],
    *,
    now: Optional[datetime] = None,
    stdin_session_id: str = "",
) -> bool:
    """Return True if ``state`` should be healed before rendering.

    Staleness indicators (any one triggers stale):

    1. ``state`` is empty (nothing to heal — returns False).
    2. ``state.sessionId`` is a repair marker (``""``, ``"manual-fix"``,
       ``"unknown"``, ``"none"``).
    3. ``stdin_session_id`` is non-empty and differs from
       ``state.sessionId`` — caller is from a different session.
    4. ``state.sessionStartTimestamp`` is older than
       :data:`SESSION_STALE_SECONDS` or unparseable.

    Args:
        state: Current HUD state dict from ``read_hud_state``.
        now: Optional clock override for deterministic age tests.
            Defaults to ``datetime.now(timezone.utc)``.
        stdin_session_id: The current Claude Code session id read
            from stdin. Empty string means "not available — skip
            mismatch check".
    """
    if not state:
        return False

    session_id = state.get("sessionId", "") or ""

    # (2) Repair marker check
    if session_id in _REPAIR_MARKERS:
        return True

    # (3) stdin mismatch check
    if stdin_session_id and session_id != stdin_session_id:
        return True

    # (4) Age check — prefer `updatedAt` (refreshed on every
    # `update_hud_state` write) so long active sessions do not
    # falsely flag stale after SESSION_STALE_SECONDS. Fall back
    # to `sessionStartTimestamp` when `updatedAt` is absent.
    ts = state.get("updatedAt", "") or state.get("sessionStartTimestamp", "")
    if ts:
        try:
            start = datetime.fromisoformat(ts)
            if start.tzinfo is None:
                start = start.replace(tzinfo=timezone.utc)
            current = now or datetime.now(timezone.utc)
            age_seconds = (current - start).total_seconds()
            if age_seconds > SESSION_STALE_SECONDS:
                return True
        except (ValueError, TypeError):
            # Unparseable timestamp => definitely stale
            return True

    return False


def heal_stale_state(state: Dict[str, Any]) -> Dict[str, Any]:
    """Return a *new* state dict with ephemeral fields cleared.

    Does **not** mutate the input and does **not** write to disk. The
    caller is expected to pass the healed copy to ``format_status_line``
    immediately; persisting a fresh baseline is the responsibility of
    ``session-start.py`` on the next session boot or of
    :func:`reset_stale_session` for callers that want durability now.

    Cleared fields (so the HUD renders a safe default):

    - ``currentMode`` → ``None`` (statusLine shows "Ready")
    - ``version``     → ``""`` (hud_version falls back to plugin.json)
    - ``activeAgent`` → ``None``
    - ``phase``       → ``"ready"``
    - ``focus``       → ``None``
    - ``blockerCount``→ ``0``

    Preserved fields:

    - ``sessionId`` (so debugging can see what was there)
    - ``sessionStartTimestamp`` (for audit / forensics)
    - Any other field not listed above
    """
    healed: Dict[str, Any] = dict(state)
    healed["currentMode"] = None
    healed["version"] = ""
    healed["activeAgent"] = None
    healed["phase"] = "ready"
    healed["focus"] = None
    healed["blockerCount"] = 0
    return healed


def reset_stale_session(state_file: str) -> None:
    """Persist a healed copy of ``state_file`` to disk.

    Reads the current state, runs :func:`detect_stale_session` on it,
    and if stale, writes the healed copy via ``hud_state.update_hud_state``.
    Intended for call sites that need durable healing (e.g., session
    boot). No-ops silently on any failure so it never blocks the caller.
    """
    try:
        from hud_state import read_hud_state, update_hud_state

        current = read_hud_state(state_file, fill_defaults=False)
        if not detect_stale_session(current):
            return
        healed = heal_stale_state(current)
        # update_hud_state merges kwargs — only pass the fields we healed
        update_hud_state(
            state_file=state_file,
            currentMode=healed["currentMode"],
            version=healed["version"],
            activeAgent=healed["activeAgent"],
            phase=healed["phase"],
            focus=healed["focus"],
            blockerCount=healed["blockerCount"],
        )
    except Exception:
        pass
