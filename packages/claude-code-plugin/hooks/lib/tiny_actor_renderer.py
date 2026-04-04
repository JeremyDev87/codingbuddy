"""Width-safe Tiny Actor card renderer (#1269).

Renders a compact 2-3 line card (face, label, optional quote) using
display-width-safe helpers from ``buddy_renderer``.  Every output line
is guaranteed to have exactly ``card_width`` display columns.
"""
from __future__ import annotations

from typing import List

from tiny_actor_card import TinyActorCard
from buddy_renderer import (
    display_width,
    pad_to_display_width,
    truncate_to_display_width,
)


def _center_to_width(text: str, width: int) -> str:
    """Center *text* within *width* display columns.

    Left-pads with spaces so the visible content sits roughly in the
    middle, then right-pads to exactly *width*.
    """
    text_w = display_width(text)
    if text_w >= width:
        return pad_to_display_width(truncate_to_display_width(text, width), width)
    left_pad = (width - text_w) // 2
    return pad_to_display_width((" " * left_pad) + text, width)


def render_card(
    card: TinyActorCard,
    *,
    card_width: int = 14,
    show_quote: bool = True,
) -> List[str]:
    """Render a :class:`TinyActorCard` as a list of display-width-safe lines.

    Parameters
    ----------
    card:
        The actor card to render.
    card_width:
        Target display width for every line (default 14).
    show_quote:
        When ``False``, the quote line is always omitted even if the
        card has a quote.

    Returns
    -------
    list[str]
        2 or 3 lines, each exactly *card_width* display columns wide.
    """
    lines: List[str] = []

    # Line 1: face (centered)
    lines.append(_center_to_width(card.face, card_width))

    # Line 2: label (centered, truncated if too wide)
    lines.append(_center_to_width(card.label, card_width))

    # Line 3 (optional): quote
    if show_quote and card.quote is not None:
        truncated = truncate_to_display_width(card.quote, card_width)
        lines.append(pad_to_display_width(truncated, card_width))

    return lines
