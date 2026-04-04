"""Feature-flagged Tiny Actor Grid preview (#1271).

Provides a controlled preview path for the Tiny Actor Grid.
The feature is gated behind ``CODINGBUDDY_TINY_ACTORS`` env var (default: off).
"""
from __future__ import annotations

import os
from typing import Optional

from tiny_actor_card import create_actor_card, TinyActorCard
from tiny_actor_grid import layout_grid
from tiny_actor_presets import get_cast_preset, BUDDY_FACE
from tiny_actor_renderer import render_card

# ---------------------------------------------------------------------------
# Feature flag
# ---------------------------------------------------------------------------

_FLAG_ENV = "CODINGBUDDY_TINY_ACTORS"
_TRUTHY = {"1", "true", "yes"}


def is_tiny_actors_enabled() -> bool:
    """Return ``True`` when the Tiny Actor preview is explicitly enabled."""
    return os.environ.get(_FLAG_ENV, "").lower() in _TRUTHY


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

_CARD_WIDTH = 14


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

        # Render each card through the width-safe renderer
        rendered = [render_card(c, card_width=_CARD_WIDTH) for c in cards]

        # Assemble via the responsive grid layout
        grid_lines = layout_grid(
            rendered,
            available_width=available_width,
            card_width=_CARD_WIDTH,
        )

        return "\n".join(grid_lines) if grid_lines else None

    except Exception:
        return None


def _agent_id_to_label(agent_id: str) -> str:
    """Convert an agent id like ``'security-specialist'`` to ``'Security'``."""
    parts = agent_id.split("-")
    if not parts:
        return agent_id
    return parts[0].capitalize()
