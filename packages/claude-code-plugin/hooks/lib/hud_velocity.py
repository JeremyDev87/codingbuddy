"""Cost velocity indicator for CodingBuddy statusLine (#1326, Wave 2-B).

Shows how fast the session is burning dollars by rendering a
per-minute spend rate next to the absolute cost. Users can see at
a glance whether they're on a slow planning pass ($0.01/min) or a
heavy refactor burn ($0.50/min).

Output format::

    $1.23↗$0.08/m

- ``$1.23``    — absolute cost so far (passed through unchanged)
- ``↗/🔥/💤`` — trend glyph reflecting the burn rate
- ``$0.08/m`` — computed spend rate (USD per minute)

Wave 2-B ships a **stateless** session-average rate: ``rate = cost /
elapsed_minutes`` derived from Claude Code's own stdin ``cost`` and
``duration_ms`` fields. A richer windowed/ring-buffer implementation
can be added later without changing the public API; the stateless
version is sufficient for UX purposes and avoids touching the
``hud_state.py`` schema.

Primary entry points:

- :func:`compute_spend_rate` — pure arithmetic helper
- :func:`trend_glyph` — map rate → visual tier
- :func:`format_velocity_segment` — end-to-end renderer
- :func:`format_cost_with_velocity` — cost prefix + velocity suffix
"""
from __future__ import annotations

from typing import Any, Dict, Optional

# ------------------------------------------------------------------------
# Trend tier thresholds (USD per minute)
# ------------------------------------------------------------------------

#: Below this rate the session is considered idle / coasting.
TREND_IDLE_MAX: float = 0.01

#: Above this rate the session is a hot burn ("🔥").
TREND_HOT_MIN: float = 0.20

# ------------------------------------------------------------------------
# Glyphs
# ------------------------------------------------------------------------

_GLYPH_HOT = "\U0001f525"   # 🔥
_GLYPH_RISING = "\u2197"    # ↗
_GLYPH_STEADY = "\u2192"    # → (sideways arrow for low steady rate)
_GLYPH_IDLE = "\U0001f4a4"  # 💤 (zzz face)


def compute_spend_rate(cost_usd: Any, duration_ms: Any) -> float:
    """Return the session spend rate in USD per minute.

    Formula::

        rate = cost_usd / (duration_ms / 60_000)

    Defensive coercion:

    * Non-numeric or negative inputs return ``0.0``.
    * ``duration_ms <= 0`` returns ``0.0`` (avoids divide-by-zero).
    * ``cost_usd == 0`` returns ``0.0`` regardless of duration.
    """
    try:
        cost = float(cost_usd)
        duration = float(duration_ms)
    except (TypeError, ValueError):
        return 0.0
    if cost <= 0 or duration <= 0:
        return 0.0
    minutes = duration / 60_000.0
    if minutes <= 0:
        return 0.0
    return cost / minutes


def trend_glyph(rate_usd_per_min: float) -> str:
    """Return a glyph reflecting the spend tier.

    Tiers:

    * ``rate >= TREND_HOT_MIN``   → 🔥 (hot burn)
    * ``rate >= TREND_IDLE_MAX``  → ↗ (rising / normal)
    * ``rate > 0``                → → (steady, very low)
    * ``rate <= 0``               → 💤 (idle, no meaningful rate)
    """
    try:
        rate = float(rate_usd_per_min)
    except (TypeError, ValueError):
        return _GLYPH_IDLE
    if rate >= TREND_HOT_MIN:
        return _GLYPH_HOT
    if rate >= TREND_IDLE_MAX:
        return _GLYPH_RISING
    if rate > 0:
        return _GLYPH_STEADY
    return _GLYPH_IDLE


def format_velocity_segment(
    stdin_data: Dict[str, Any],
    hud_state: Optional[Dict[str, Any]] = None,
) -> str:
    """Render the velocity suffix like ``↗$0.08/m``.

    Reads ``stdin_data.cost.total_cost_usd`` and
    ``stdin_data.cost.total_duration_ms`` — both optional. Falls
    back to ``hud_state.sessionStartTimestamp`` when stdin does not
    supply the duration (useful when Claude Code omits the cost
    payload early in a session).

    Returns an empty string when insufficient data is available to
    compute a meaningful rate so callers can conditionally append
    without extra guards.
    """
    if not stdin_data:
        return ""

    cost_info = stdin_data.get("cost") or {}
    cost_usd = cost_info.get("total_cost_usd")
    duration_ms = cost_info.get("total_duration_ms")

    if cost_usd is None:
        return ""

    # When stdin doesn't carry duration, try computing from hud_state.
    if duration_ms is None and hud_state:
        duration_ms = _duration_ms_from_state(hud_state)

    if duration_ms is None:
        return ""

    rate = compute_spend_rate(cost_usd, duration_ms)
    if rate <= 0:
        return ""

    glyph = trend_glyph(rate)
    return f"{glyph}${rate:.2f}/m"


def format_cost_with_velocity(
    cost_usd: Any,
    stdin_data: Dict[str, Any],
    hud_state: Optional[Dict[str, Any]] = None,
    *,
    is_exact: bool = True,
) -> str:
    """Render the full cost segment with velocity appended.

    Output format:

        ``$1.23↗$0.08/m``    (when velocity is available)
        ``$1.23``            (when velocity cannot be computed)
        ``~$1.23↗$0.08/m``   (when cost is an estimate)

    Args:
        cost_usd: Absolute session cost. Non-numeric → ``$0.00``.
        stdin_data: Claude Code stdin payload (drives velocity).
        hud_state: Optional HUD state for duration fallback.
        is_exact: When ``False``, prefix with ``~`` to signal estimation.
    """
    try:
        cost = float(cost_usd)
    except (TypeError, ValueError):
        cost = 0.0
    prefix = "$" if is_exact else "~$"
    velocity = format_velocity_segment(stdin_data, hud_state)
    return f"{prefix}{cost:.2f}{velocity}"


def _duration_ms_from_state(hud_state: Dict[str, Any]) -> Optional[float]:
    """Compute elapsed milliseconds from hud_state.sessionStartTimestamp."""
    ts = hud_state.get("sessionStartTimestamp", "")
    if not ts:
        return None
    try:
        from datetime import datetime, timezone

        start = datetime.fromisoformat(ts)
        if start.tzinfo is None:
            start = start.replace(tzinfo=timezone.utc)
        now = datetime.now(timezone.utc)
        delta = (now - start).total_seconds() * 1000.0
        return delta if delta > 0 else None
    except (ValueError, TypeError):
        return None
