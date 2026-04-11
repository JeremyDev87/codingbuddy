"""Rate-limit formatting for CodingBuddy statusLine (#1326, Wave 1-C).

Wave 0 extracted ``format_rate_limits`` verbatim from the monolith.
Wave 1-C upgrades the badge presentation:

* severity-icon rendering instead of colon-delimited percentages
* space separator between tiers instead of comma
* defensive float coercion so a non-numeric ``used_percentage``
  (e.g. ``None``, ``"N/A"``) is silently treated as ``0`` instead
  of crashing the entire status line
* ``"RL:"`` prefix is retained so downstream surfaces keep a stable
  ``startswith/contains`` anchor

Output example:

    ``RL:5h░13% 7d▓96%``

Severity icons (U+2591 / U+2592 / U+2593 block-drawing shades):

* ``░`` light  — ``pct <= 60`` (low / healthy)
* ``▒`` medium — ``60 < pct <= 85`` (warning)
* ``▓`` dark   — ``pct > 85`` (critical)
"""
from __future__ import annotations

from typing import Any, Dict

# Block-drawing glyphs (U+2591 light, U+2592 medium, U+2593 dark).
_ICON_LOW = "\u2591"  # ░
_ICON_MID = "\u2592"  # ▒
_ICON_HIGH = "\u2593"  # ▓


def _severity_icon(pct: float) -> str:
    """Return a single block-drawing character reflecting quota usage.

    Tiers:
        * ``pct > 85``  → ▓ (dark / critical)
        * ``pct > 60``  → ▒ (medium / warning)
        * otherwise      → ░ (light / healthy)
    """
    if pct > 85:
        return _ICON_HIGH
    if pct > 60:
        return _ICON_MID
    return _ICON_LOW


def _coerce_percentage(raw: Any) -> float:
    """Defensively turn a ``used_percentage`` field into a float.

    Accepts ``int``/``float``/numeric string. Returns ``0.0`` for
    ``None``, empty strings, non-numeric strings, or any other
    unexpected type. Never raises — ``format_rate_limits`` lives on
    the statusLine hot path and must degrade gracefully (see Wave 1-A
    review HIGH finding for context on why defensive coercion matters).
    """
    if raw is None:
        return 0.0
    try:
        return float(raw)
    except (TypeError, ValueError):
        return 0.0


def format_rate_limits(stdin_data: Dict[str, Any]) -> str:
    """Format Claude Code rate-limit badge with severity icons.

    Returns an empty string when no rate-limit data is supplied so
    the badge can be dropped from the status line silently.
    """
    rl = stdin_data.get("rate_limits")
    if not rl:
        return ""

    parts: list = []

    five = rl.get("five_hour")
    if five:
        pct = _coerce_percentage(five.get("used_percentage", 0))
        icon = _severity_icon(pct)
        parts.append(f"5h{icon}{pct:.0f}%")

    seven = rl.get("seven_day")
    if seven:
        pct = _coerce_percentage(seven.get("used_percentage", 0))
        icon = _severity_icon(pct)
        parts.append(f"7d{icon}{pct:.0f}%")

    if not parts:
        return ""

    return "RL:" + " ".join(parts)
