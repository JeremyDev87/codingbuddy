"""Feature-flagged Tiny Actor Grid preview (#1271).

Provides a controlled preview path for the Tiny Actor Grid.
The feature is gated behind ``CODINGBUDDY_TINY_ACTORS`` env var (default: off).
"""
from __future__ import annotations

import os
from typing import Optional

from tiny_actor_card import create_actor_card, TinyActorCard
from tiny_actor_presets import get_cast_preset, BUDDY_FACE

# ---------------------------------------------------------------------------
# Feature flag
# ---------------------------------------------------------------------------

_FLAG_ENV = "CODINGBUDDY_TINY_ACTORS"
_TRUTHY = {"1", "true", "yes"}


def is_tiny_actors_enabled() -> bool:
    """Return ``True`` when the Tiny Actor preview is explicitly enabled."""
    return os.environ.get(_FLAG_ENV, "").lower() in _TRUTHY


# ---------------------------------------------------------------------------
# Card rendering helpers
# ---------------------------------------------------------------------------

_CARD_WIDTH = 14
_SEPARATOR = " "


def _render_card_lines(card: TinyActorCard, width: int) -> list[str]:
    """Render a single actor card as a list of fixed-width lines."""
    label = card.label[:width]
    face = card.face
    lines = [
        label.center(width),
        face.center(width),
    ]
    if card.quote:
        quote = card.quote[:width]
        lines.append(quote.center(width))
    return lines


def _arrange_cards_horizontal(
    cards: list[TinyActorCard],
    available_width: int,
) -> str:
    """Arrange actor cards in a horizontal row, wrapping to fit *available_width*."""
    if not cards:
        return ""

    card_w = min(_CARD_WIDTH, available_width)
    sep_w = len(_SEPARATOR)
    # Cards per row: at least 1
    cards_per_row = max(1, (available_width + sep_w) // (card_w + sep_w))

    rows_output: list[str] = []
    for row_start in range(0, len(cards), cards_per_row):
        row_cards = cards[row_start : row_start + cards_per_row]
        rendered = [_render_card_lines(c, card_w) for c in row_cards]

        # Pad all to same number of lines
        max_lines = max(len(r) for r in rendered)
        for r in rendered:
            while len(r) < max_lines:
                r.append(" " * card_w)

        # Merge horizontally
        for line_idx in range(max_lines):
            merged = _SEPARATOR.join(r[line_idx] for r in rendered)
            rows_output.append(merged[:available_width])

    return "\n".join(rows_output)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def render_actor_preview(
    mode: str,
    available_width: int = 80,
) -> Optional[str]:
    """Render a Tiny Actor Grid preview for *mode*.

    Returns ``None`` if the feature flag is disabled, the mode has no preset,
    or an error occurs during rendering.
    """
    if not is_tiny_actors_enabled():
        return None

    try:
        preset = get_cast_preset(mode)
        if preset is None:
            return None

        cards: list[TinyActorCard] = []

        # Buddy moderator card
        moderator = create_actor_card(
            agent_id="buddy",
            label="Buddy",
            mood="speaking",
            eye_glyph="\u25d5",  # ◕
            quote=preset["moderator_copy"],
            is_moderator=True,
        )
        cards.append(moderator)

        # Primary agent card
        primary = create_actor_card(
            agent_id=preset["primary"],
            label=_agent_id_to_label(preset["primary"]),
            mood="proposing",
        )
        cards.append(primary)

        # Specialist cards
        for spec_id in preset["specialists"]:
            card = create_actor_card(
                agent_id=spec_id,
                label=_agent_id_to_label(spec_id),
                mood="reviewing",
            )
            cards.append(card)

        return _arrange_cards_horizontal(cards, available_width)

    except Exception:
        return None


def _agent_id_to_label(agent_id: str) -> str:
    """Convert an agent id like ``'security-specialist'`` to ``'Security'``."""
    parts = agent_id.split("-")
    if not parts:
        return agent_id
    return parts[0].capitalize()
