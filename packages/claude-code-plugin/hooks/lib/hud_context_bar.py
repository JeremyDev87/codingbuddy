"""Smart context bar visualization for CodingBuddy statusLine (#1326, Wave 2-E).

Renders the context-window usage percentage as a compact visual
progress bar so users can see at a glance how close they are to
overflow:

    ``[████░░░░░░] 42%``         (safe — low usage)
    ``[███████░░░] 73%``         (warning — approaching the danger zone)
    ``[█████████▓] 92%⚠``        (critical — near exhaustion)

Primary entry point: :func:`render_context_bar`.

The bar width is :data:`CONTEXT_BAR_WIDTH` (10 cells by default),
chosen to keep the status line compact while still providing
meaningful resolution (each cell represents ~10% of the budget).

Thresholds (:data:`CONTEXT_BAR_THRESHOLDS`) drive two visual
signals:

1. A dark-shade glyph (``▓``) replaces the trailing full block when
   usage crosses the *danger* threshold — so the last cell pulses
   visually even when the bar looks otherwise full.
2. A ``⚠`` suffix is appended when usage crosses the *warning*
   threshold — a distinct text marker that survives greyscale /
   monochrome renders.
"""
from __future__ import annotations

from typing import Any, Dict, Tuple

# ------------------------------------------------------------------------
# Constants
# ------------------------------------------------------------------------

#: Number of cells in the rendered bar. 10 gives ~10% resolution per cell.
CONTEXT_BAR_WIDTH: int = 10

#: (warning, danger, critical) thresholds as percentages.
#:
#: * ``warning``  (80) — append a ``⚠`` suffix
#: * ``danger``   (85) — replace the trailing full block with ``▓``
#: * ``critical`` (95) — both signals always active
CONTEXT_BAR_THRESHOLDS: Tuple[float, float, float] = (80.0, 85.0, 95.0)

# Block-drawing glyphs
_FULL = "\u2588"   # █
_EMPTY = "\u2591"  # ░
_DARK = "\u2593"   # ▓

# Warning suffix
_WARN = "\u26a0"  # ⚠


def _clamp_percentage(pct: Any) -> float:
    """Coerce an arbitrary value to a percentage in ``[0.0, 100.0]``.

    Non-numeric inputs return ``0.0``. Values above 100 are capped
    at 100; values below 0 are floored at 0.
    """
    try:
        value = float(pct)
    except (TypeError, ValueError):
        return 0.0
    if value < 0.0:
        return 0.0
    if value > 100.0:
        return 100.0
    return value


def render_context_bar(
    used_pct: Any,
    *,
    width: int = CONTEXT_BAR_WIDTH,
) -> str:
    """Render a context-bar string from a usage percentage.

    Output format:

        ``[<bar>] <N>%[⚠]``

    The bar contains ``width`` cells; each cell represents
    ``100 / width`` percent. The number of filled cells is
    ``round(used_pct / 100 * width)``. When usage crosses the
    danger threshold, the last full block becomes ``▓`` to make
    the "full" state visually distinct from a true max. When usage
    crosses the warning threshold, a trailing ``⚠`` is appended.

    Args:
        used_pct: Context-window usage percentage (0-100).
            Accepts ``int``/``float``/numeric string. Non-numeric
            input renders as ``0%``.
        width: Override the bar cell count (tests / layout tuning).

    Returns an empty string when ``width <= 0``.
    """
    if width <= 0:
        return ""

    pct = _clamp_percentage(used_pct)
    warning, danger, _critical = CONTEXT_BAR_THRESHOLDS

    # Number of filled cells (rounded for UX — 5% fills half a cell).
    filled = int(round(pct / 100.0 * width))
    if filled < 0:
        filled = 0
    if filled > width:
        filled = width

    # Build the bar
    bar_cells = [_FULL] * filled + [_EMPTY] * (width - filled)

    # Danger glyph replaces the trailing full block
    if pct >= danger and filled > 0:
        bar_cells[filled - 1] = _DARK

    bar = "".join(bar_cells)
    suffix = _WARN if pct >= warning else ""
    return f"[{bar}] {pct:.0f}%{suffix}"


def format_context_bar_segment(stdin_data: Dict[str, Any]) -> str:
    """Render the context bar from a Claude Code stdin payload.

    Extracts ``context_window.used_percentage`` and forwards to
    :func:`render_context_bar`. Returns an empty string when the
    field is absent — callers can append the result conditionally
    without surrounding logic.
    """
    if not stdin_data:
        return ""
    ctx = stdin_data.get("context_window") or {}
    pct = ctx.get("used_percentage")
    if pct is None:
        return ""
    return render_context_bar(pct)
