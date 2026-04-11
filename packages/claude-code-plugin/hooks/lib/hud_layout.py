"""Adaptive layout engine for CodingBuddy statusLine (#1326, Wave 1-D).

Provides width-aware segment rendering so the status bar never spills
out of the terminal. The core primitives are:

- :data:`SEGMENT_PRIORITY` — canonical drop order for Wave 3 integrator
- :data:`SACRED_PRIORITY` — threshold below which segments are never dropped
- :func:`visible_len` — width-aware character count (emoji/CJK = 2 cols)
- :func:`terminal_width` — shutil-backed width detection with fallback
- :func:`shorten_model_label` — compact Claude model-name helper
- :func:`fit_segments` — priority-based assembly with overflow truncation

Wave 1-D only ships the layout helpers. Wave 3 integrator wires them
into ``format_status_line``; until then the monolith continues to
build its status line inline and this module is consumed only by
the new tests.
"""
from __future__ import annotations

import re
import shutil
import unicodedata
from typing import List, Tuple

# ------------------------------------------------------------------------
# Constants
# ------------------------------------------------------------------------

#: Canonical drop order for statusLine segments. Priority is ascending;
#: higher numbers are dropped first when width is tight. Entries at or
#: below :data:`SACRED_PRIORITY` are never dropped.
SEGMENT_PRIORITY: List[Tuple[str, int]] = [
    ("face_version", 0),  # sacred: "◕‿◕ CB v5.5.0"
    ("mode_health", 1),   # sacred: "PLAN 🟢"
    ("cost", 2),
    ("duration", 3),
    ("ctx", 4),
    ("cache", 5),
    ("model", 6),
    ("rate_limits", 7),
    ("worktree", 8),
]

#: Priorities ``<= SACRED_PRIORITY`` are never dropped by :func:`fit_segments`.
SACRED_PRIORITY: int = 1

#: Default separator used between segments.
DEFAULT_SEPARATOR: str = " | "

#: Fallback terminal width when ``shutil.get_terminal_size`` cannot
#: report a real value (tests, pipes, detached TTYs).
FALLBACK_TERMINAL_WIDTH: int = 120

#: Single-character ellipsis glyph used for hard truncation.
_ELLIPSIS: str = "\u2026"  # …


# ------------------------------------------------------------------------
# Width helpers
# ------------------------------------------------------------------------


def visible_len(s: str) -> int:
    """Approximate the visible column count of ``s``.

    Emoji, CJK, and other full-width characters count as 2 columns;
    everything else counts as 1. This mirrors how most monospaced
    terminals render the corresponding glyphs.

    Note: ANSI escape sequences are NOT stripped. When Wave 2-D adds
    ANSI coloring, callers that mix coloring with layout must strip
    escapes before passing to this function.
    """
    width = 0
    for ch in s:
        if unicodedata.east_asian_width(ch) in ("W", "F"):
            width += 2
        else:
            width += 1
    return width


def terminal_width(*, fallback: int = FALLBACK_TERMINAL_WIDTH) -> int:
    """Return the current terminal width with a safe fallback.

    Uses ``shutil.get_terminal_size`` and degrades to *fallback*
    whenever the call raises or reports a non-positive column count.
    """
    try:
        size = shutil.get_terminal_size((fallback, 20))
        return size.columns if size.columns > 0 else fallback
    except Exception:
        return fallback


# ------------------------------------------------------------------------
# Model label helper
# ------------------------------------------------------------------------

_CONTEXT_SUFFIX_RE = re.compile(r"\s*\([^)]*context\)\s*$", re.IGNORECASE)
_COMPACT_PATTERN_RE = re.compile(r"(\w+).*?(\d+[KMG])", re.IGNORECASE)


def shorten_model_label(name: str, *, compact: bool = False) -> str:
    """Produce a compact version of a Claude model display name.

    Normal mode (compact=False, default) just strips the trailing
    ``" (1M context)"`` marker so a long display name like
    ``"Opus 4.6 (1M context)"`` becomes ``"Opus 4.6"``.

    Compact mode (compact=True) extracts the model family and the
    context size into a tight ``Family(NM)`` pattern so the string
    fits in very narrow terminals. If no context marker is present,
    only the first whitespace-separated token is returned.

    Examples:

        >>> shorten_model_label("Opus 4.6 (1M context)")
        'Opus 4.6'
        >>> shorten_model_label("Opus 4.6 (1M context)", compact=True)
        'Opus(1M)'
        >>> shorten_model_label("Sonnet 4.5")
        'Sonnet 4.5'
        >>> shorten_model_label("Sonnet 4.5", compact=True)
        'Sonnet'
        >>> shorten_model_label("")
        ''
    """
    if not name:
        return ""

    if not compact:
        return _CONTEXT_SUFFIX_RE.sub("", name).strip()

    match = _COMPACT_PATTERN_RE.match(name)
    if match:
        return f"{match.group(1)}({match.group(2)})"

    parts = name.split()
    return parts[0] if parts else name


# ------------------------------------------------------------------------
# Fit segments
# ------------------------------------------------------------------------


def fit_segments(
    segments: List[Tuple[str, int, str]],
    width: int,
    *,
    separator: str = DEFAULT_SEPARATOR,
) -> str:
    """Render segments with priority-based drop-until-fit semantics.

    Args:
        segments: List of ``(name, priority, text)`` tuples. ``name``
            is a caller-supplied identifier (ignored during render),
            ``priority`` is the drop order (higher = dropped first,
            0/1 are sacred), and ``text`` is the literal text.
        width: Maximum visible column count. Rendering tries to fit
            within this budget by dropping the lowest-priority
            (highest number) segments first.
        separator: String inserted between kept segments. Defaults to
            :data:`DEFAULT_SEPARATOR` (`` | ``).

    Returns:
        The assembled status line. When even the sacred segments
        (priority ``<= SACRED_PRIORITY``) exceed the budget, the
        result is hard-truncated with a trailing U+2026 (``…``).

    Contract:
        * Empty text segments are always skipped.
        * Priority ≤ SACRED_PRIORITY segments are NEVER dropped.
        * Output preserves the caller-provided segment order.
    """
    # Drop empty text up-front so they don't contribute to width or
    # produce double separators.
    non_empty = [(n, p, t) for n, p, t in segments if t]

    def render(segs: List[Tuple[str, int, str]]) -> str:
        return separator.join(t for _, _, t in segs)

    # Try rendering everything first — the common case.
    line = render(non_empty)
    if visible_len(line) <= width:
        return line

    # Drop segments from highest priority number down until fit or
    # only sacred segments remain.
    kept = list(non_empty)
    droppable_priorities = sorted(
        {p for _, p, _ in kept if p > SACRED_PRIORITY},
        reverse=True,
    )
    for p in droppable_priorities:
        kept = [s for s in kept if s[1] != p]
        line = render(kept)
        if visible_len(line) <= width:
            return line

    # Even sacred segments alone don't fit — hard truncate.
    line = render(kept)
    if visible_len(line) > width:
        return _hard_truncate(line, width)
    return line


def _hard_truncate(s: str, width: int) -> str:
    """Truncate ``s`` to ``width`` visible columns with trailing ellipsis.

    Walks characters left-to-right until the visible budget (minus
    one column reserved for the ``…`` glyph) is consumed. Returns
    just the ellipsis when ``width <= 1``.
    """
    if width <= 0:
        return ""
    if width == 1:
        return _ELLIPSIS
    budget = width - 1  # reserve 1 column for the ellipsis
    result: list = []
    cost = 0
    for ch in s:
        ch_width = 2 if unicodedata.east_asian_width(ch) in ("W", "F") else 1
        if cost + ch_width > budget:
            break
        result.append(ch)
        cost += ch_width
    return "".join(result) + _ELLIPSIS
