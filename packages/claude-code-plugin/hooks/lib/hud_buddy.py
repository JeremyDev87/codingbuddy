"""Buddy face state engine for CodingBuddy statusLine (#1326, Wave 2-A).

``BUDDY_FACE`` is still canonically defined in
``tiny_actor_presets.BUDDY_FACE`` and re-exported here for import
clarity at the HUD layer. Wave 2-A adds a **state-aware** face
picker so the Buddy appears to "breathe" as the session moves
through its lifecycle phases:

- **Idle / Ready**       → ``◕‿◕`` — resting, calm
- **Thinking / Planning** → ``◔‿◔`` — half-closed eyes, pondering
- **Active / Executing** → ``◕◡◕`` — smiling, working
- **Error / Blocked**    → ``◕︵◕`` — concerned, something broke
- **Victory / Completed**→ ``◕ᴗ◕`` — beaming, success

Priority rules:

1. ``blocker_count > 0`` always wins (error face) regardless of phase.
2. ``recent_event == "victory"`` wins over phase when set.
3. Otherwise the phase mapping decides.
4. Unknown/empty phase falls back to the canonical idle face.

Primary entry points:

- :data:`BUDDY_FACE` — canonical idle glyph (re-exported)
- :data:`FACE_*` — individual state glyphs as constants
- :func:`get_buddy_face` — state-to-glyph lookup
- :func:`select_face_from_state` — HUD-state-dict convenience wrapper
"""
from __future__ import annotations

from typing import Any, Dict, Optional

from tiny_actor_presets import BUDDY_FACE  # canonical SSoT (idle face)

# ------------------------------------------------------------------------
# Face glyph constants
# ------------------------------------------------------------------------

#: Default / idle face — ``◕‿◕`` (U+25D5 U+203F U+25D5).
FACE_IDLE: str = BUDDY_FACE

#: Thinking face — ``◔‿◔`` (half-closed eyes).
FACE_THINKING: str = "\u25d4\u203f\u25d4"

#: Active face — ``◕◡◕`` (smiling, working).
FACE_ACTIVE: str = "\u25d5\u25e1\u25d5"

#: Error / blocked face — ``◕︵◕`` (concerned).
FACE_ERROR: str = "\u25d5\ufe35\u25d5"

#: Victory / completed face — ``◕ᴗ◕`` (beaming).
FACE_VICTORY: str = "\u25d5\u1d17\u25d5"


# ------------------------------------------------------------------------
# Phase → face mapping
# ------------------------------------------------------------------------

_PHASE_FACE_MAP: Dict[str, str] = {
    "ready": FACE_IDLE,
    "planning": FACE_THINKING,
    "executing": FACE_ACTIVE,
    "evaluating": FACE_THINKING,
    "cycling": FACE_ACTIVE,
    "completed": FACE_VICTORY,
}


# ------------------------------------------------------------------------
# Public API
# ------------------------------------------------------------------------


def get_buddy_face(
    phase: Optional[str] = None,
    *,
    blocker_count: int = 0,
    recent_event: Optional[str] = None,
) -> str:
    """Return the buddy face glyph for the given state.

    Priority resolution (highest wins):

    1. ``blocker_count > 0`` → :data:`FACE_ERROR`
    2. ``recent_event == "victory"`` → :data:`FACE_VICTORY`
    3. Phase lookup against :data:`_PHASE_FACE_MAP`
    4. Fallback: :data:`FACE_IDLE`

    Args:
        phase: HUD state phase. One of
            ``ready``, ``planning``, ``executing``, ``evaluating``,
            ``cycling``, ``completed`` (case-insensitive). Unknown
            or empty values fall back to the idle face.
        blocker_count: Number of blockers detected. Any positive
            value triggers the error face.
        recent_event: Optional one-off event marker. Currently only
            ``"victory"`` is recognised.

    Returns:
        A 3-character glyph string, never empty.
    """
    # (1) Error: blockers take precedence
    try:
        if int(blocker_count) > 0:
            return FACE_ERROR
    except (TypeError, ValueError):
        pass  # ignore malformed counter, fall through

    # (2) Victory event beats phase
    if recent_event and recent_event.lower() == "victory":
        return FACE_VICTORY

    # (3) Phase mapping
    if phase:
        return _PHASE_FACE_MAP.get(phase.lower(), FACE_IDLE)

    # (4) Fallback
    return FACE_IDLE


def select_face_from_state(hud_state: Dict[str, Any]) -> str:
    """Convenience wrapper that extracts face inputs from a hud_state dict.

    Reads:

    - ``phase``         — HUD phase string
    - ``blockerCount``  — integer blocker count (default 0)
    - ``lastEvent``     — optional one-off event marker
    """
    if not hud_state:
        return FACE_IDLE
    return get_buddy_face(
        phase=hud_state.get("phase"),
        blocker_count=hud_state.get("blockerCount", 0) or 0,
        recent_event=hud_state.get("lastEvent"),
    )


__all__ = [
    "BUDDY_FACE",
    "FACE_IDLE",
    "FACE_THINKING",
    "FACE_ACTIVE",
    "FACE_ERROR",
    "FACE_VICTORY",
    "get_buddy_face",
    "select_face_from_state",
]
