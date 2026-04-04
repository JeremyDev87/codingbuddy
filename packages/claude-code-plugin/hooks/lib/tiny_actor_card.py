"""TinyActorCard contract and mood-to-face mapping for ASCII actor scenes (#1270).

Provides a stable, reusable data contract for the Tiny Actor Grid.
Face generation is deterministic from ``eye + mood``.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

DEFAULT_EYE: str = "\u25cf"  # ●
DEFAULT_EYE_ASCII: str = "o"

# Unicode mouth glyphs keyed by mood
_MOOD_MOUTHS: dict[str, str] = {
    "speaking": "\u203f",  # ‿
    "reviewing": "\u2304",  # ⌄
    "proposing": "\u2040",  # ⁀
    "unsure": "_",
    "blocked": "x",
}

# ASCII mouth glyphs keyed by mood
_MOOD_MOUTHS_ASCII: dict[str, str] = {
    "speaking": "_",
    "reviewing": ".",
    "proposing": "~",
    "unsure": "_",
    "blocked": "x",
}

_DEFAULT_MOOD = "unsure"


# ---------------------------------------------------------------------------
# Dataclass
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class TinyActorCard:
    """Immutable card representing a single actor in the Tiny Actor Grid."""

    agent_id: str
    label: str
    face: str
    eye: str
    mood: str
    quote: Optional[str] = None
    color_ansi: Optional[str] = None
    is_moderator: bool = False


# ---------------------------------------------------------------------------
# Face builder
# ---------------------------------------------------------------------------


def build_face(
    mood: str,
    eye_glyph: Optional[str] = None,
    *,
    eye_fallback: Optional[str] = None,
    ascii_mode: bool = False,
) -> str:
    """Build a deterministic face string from *mood* and optional eye glyph.

    Parameters
    ----------
    mood:
        Mood key (``speaking``, ``reviewing``, ``proposing``, ``unsure``,
        ``blocked``).  Unknown moods fall back to ``unsure``.
    eye_glyph:
        Unicode eye character (e.g. ``★``).  Ignored when *ascii_mode* is
        ``True``.
    eye_fallback:
        ASCII single-char eye used when *ascii_mode* is ``True``.
        Defaults to ``o``.
    ascii_mode:
        When ``True``, produce a pure-ASCII face.
    """
    if ascii_mode:
        eye = eye_fallback or DEFAULT_EYE_ASCII
        mouth = _MOOD_MOUTHS_ASCII.get(mood, _MOOD_MOUTHS_ASCII[_DEFAULT_MOOD])
        return f"{eye}{mouth}{eye}"

    eye = eye_glyph or DEFAULT_EYE
    mouth = _MOOD_MOUTHS.get(mood, _MOOD_MOUTHS[_DEFAULT_MOOD])
    return f"{eye}{mouth}{eye}"


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------


def create_actor_card(
    agent_id: str,
    label: str,
    *,
    mood: str = _DEFAULT_MOOD,
    eye_glyph: Optional[str] = None,
    eye_fallback: Optional[str] = None,
    quote: Optional[str] = None,
    color_ansi: Optional[str] = None,
    is_moderator: bool = False,
    ascii_mode: bool = False,
) -> TinyActorCard:
    """Create a :class:`TinyActorCard` with a deterministic face.

    Parameters
    ----------
    agent_id:
        Agent identifier (e.g. ``"security-specialist"``).
    label:
        Short display name (e.g. ``"Security"``).
    mood:
        Mood key — defaults to ``"unsure"``.
    eye_glyph:
        Unicode eye glyph from agent JSON ``visual.eye``.
    eye_fallback:
        ASCII eye character for fallback rendering.
    quote:
        Optional status text or quote.
    color_ansi:
        ANSI colour name (``red``, ``green``, …).
    is_moderator:
        ``True`` for Buddy / moderator cards.
    ascii_mode:
        Produce a pure-ASCII face when ``True``.
    """
    face = build_face(
        mood,
        eye_glyph=eye_glyph,
        eye_fallback=eye_fallback,
        ascii_mode=ascii_mode,
    )
    eye = (eye_fallback or DEFAULT_EYE_ASCII) if ascii_mode else (eye_glyph or DEFAULT_EYE)

    return TinyActorCard(
        agent_id=agent_id,
        label=label,
        face=face,
        eye=eye,
        mood=mood,
        quote=quote,
        color_ansi=color_ansi,
        is_moderator=is_moderator,
    )
