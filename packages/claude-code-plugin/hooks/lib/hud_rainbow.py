"""Mode rainbow ANSI coloring for CodingBuddy statusLine (#1326, Wave 2-D).

Renders the statusLine mode label with per-mode ANSI coloring and a
tier-specific glyph so users can tell at a glance which workflow
mode is active:

    PLAN  → ◇ blue       (planning — cool, deliberate)
    ACT   → ◆ green      (executing — go)
    EVAL  → ◈ purple     (evaluating — reflective)
    AUTO  → ◊ rainbow    (cycling — energetic gradient)

Color output honours the ``NO_COLOR`` environment variable
(https://no-color.org) — when it is set to any non-empty value,
:func:`render_mode_rainbow` emits plain text without escape codes so
redirected/logged output stays clean.

Primary entry points:

- :func:`is_color_enabled` — check the NO_COLOR env var
- :func:`mode_glyph` — per-mode Unicode glyph
- :func:`gradient_ansi` — character-by-character RGB gradient
- :func:`render_mode_rainbow` — end-to-end mode label renderer
"""
from __future__ import annotations

import os
from typing import Dict, List, Tuple

# ------------------------------------------------------------------------
# Constants
# ------------------------------------------------------------------------

# ANSI escape codes
_CSI = "\x1b["
_RESET = f"{_CSI}0m"

# Basic 8-bit color codes (38;5;N) for simple modes.
_FG_BLUE = 33    # bright blue
_FG_GREEN = 42   # bright green
_FG_PURPLE = 135  # bright purple
_FG_RED = 196
_FG_ORANGE = 208
_FG_YELLOW = 226
_FG_CYAN = 51

# Per-mode glyphs (mirror AGENT_GLYPHS in codingbuddy-hud.py).
_MODE_GLYPHS: Dict[str, str] = {
    "PLAN": "\u25c7",   # ◇
    "ACT": "\u25c6",    # ◆
    "EVAL": "\u25c8",   # ◈
    "AUTO": "\u25ca",   # ◊
}

# Per-mode RGB anchor pairs for gradient rendering. AUTO uses a
# 6-stop rainbow; PLAN/ACT/EVAL use a single solid hue applied to
# every character.
MODE_PALETTE: Dict[str, List[Tuple[int, int, int]]] = {
    "PLAN": [(64, 128, 255)],     # steady blue
    "ACT": [(64, 200, 96)],       # steady green
    "EVAL": [(180, 96, 220)],     # steady purple
    "AUTO": [
        (255, 64, 64),    # red
        (255, 144, 32),   # orange
        (255, 224, 32),   # yellow
        (64, 200, 96),    # green
        (64, 128, 255),   # blue
        (180, 96, 220),   # purple
    ],
}

# Reset sequence exposed for callers (tests).
RESET: str = _RESET


# ------------------------------------------------------------------------
# Environment detection
# ------------------------------------------------------------------------


def is_color_enabled(env: Dict[str, str] = None) -> bool:  # type: ignore[assignment]
    """Return True when ANSI color output should be produced.

    Honours the ``NO_COLOR`` standard (https://no-color.org): any
    non-empty value disables color. When ``env`` is omitted, reads
    from :data:`os.environ`.
    """
    if env is None:
        env = os.environ
    value = env.get("NO_COLOR", "")
    return not value


# ------------------------------------------------------------------------
# Glyph helper
# ------------------------------------------------------------------------


def mode_glyph(mode: str) -> str:
    """Return the Unicode glyph for a mode, or an empty string.

    Mode matching is case-insensitive. Unknown modes return
    an empty string so callers can render just the text label.
    """
    if not mode:
        return ""
    return _MODE_GLYPHS.get(mode.upper(), "")


# ------------------------------------------------------------------------
# Gradient renderer
# ------------------------------------------------------------------------


def _rgb_escape(r: int, g: int, b: int) -> str:
    """Return the ANSI truecolor foreground escape for ``(r, g, b)``."""
    return f"{_CSI}38;2;{r};{g};{b}m"


def gradient_ansi(text: str, palette: List[Tuple[int, int, int]]) -> str:
    """Apply a character-by-character gradient to ``text``.

    When ``palette`` has a single color, every character is rendered
    in that color. When it has multiple colors, each character is
    linearly mapped to a stop on the palette so the first character
    is ``palette[0]`` and the last character is ``palette[-1]``.

    Returns ``text`` unchanged (without escapes) when ``palette`` is
    empty or ``text`` is empty.
    """
    if not text or not palette:
        return text

    if len(palette) == 1:
        r, g, b = palette[0]
        return f"{_rgb_escape(r, g, b)}{text}{_RESET}"

    n_chars = len(text)
    n_stops = len(palette)
    out: List[str] = []
    for i, ch in enumerate(text):
        # Map character index to palette stop (0..n_stops-1)
        stop = int(i * n_stops / max(n_chars, 1))
        stop = min(stop, n_stops - 1)
        r, g, b = palette[stop]
        out.append(f"{_rgb_escape(r, g, b)}{ch}")
    out.append(_RESET)
    return "".join(out)


# ------------------------------------------------------------------------
# End-to-end renderer
# ------------------------------------------------------------------------


def render_mode_rainbow(
    mode: str,
    *,
    enabled: bool = None,  # type: ignore[assignment]
    env: Dict[str, str] = None,  # type: ignore[assignment]
) -> str:
    """Render the mode label with glyph + ANSI color.

    Output format:

        ``<glyph> <MODE>``

    The label text is the uppercased mode name. When color is
    enabled, the whole string (glyph + space + label) is wrapped
    in the mode's palette via :func:`gradient_ansi`. When color
    is disabled, plain text is returned.

    Args:
        mode: Workflow mode name (case-insensitive: PLAN/ACT/EVAL/AUTO).
        enabled: Explicit override. ``None`` (default) defers to
            :func:`is_color_enabled` which honours ``NO_COLOR``.
        env: Optional environment override for testing.

    Returns an empty string when ``mode`` is empty.
    """
    if not mode:
        return ""

    mode_upper = mode.upper()
    glyph = mode_glyph(mode_upper)
    label = f"{glyph} {mode_upper}" if glyph else mode_upper

    if enabled is None:
        enabled = is_color_enabled(env)
    if not enabled:
        return label

    palette = MODE_PALETTE.get(mode_upper)
    if not palette:
        return label  # unknown mode: plain text

    return gradient_ansi(label, palette)


def strip_ansi(s: str) -> str:
    """Remove ANSI CSI sequences from ``s`` (helper for tests and layout).

    Simple state machine — recognises ``ESC [`` ... ``m`` escape
    runs. Sufficient for the escapes this module emits.
    """
    if not s or "\x1b" not in s:
        return s
    out: List[str] = []
    i = 0
    n = len(s)
    while i < n:
        ch = s[i]
        if ch == "\x1b" and i + 1 < n and s[i + 1] == "[":
            # Skip until 'm'
            j = i + 2
            while j < n and s[j] != "m":
                j += 1
            i = j + 1
            continue
        out.append(ch)
        i += 1
    return "".join(out)
