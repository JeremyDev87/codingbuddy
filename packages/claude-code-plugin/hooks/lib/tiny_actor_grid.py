"""Responsive Tiny Actor Grid layout engine with column fallback (#1268).

Accepts pre-rendered card lines and assembles them into a responsive grid
that adapts to the available terminal width.
"""
from __future__ import annotations

from itertools import zip_longest


def layout_grid(
    cards: list[list[str]],
    *,
    available_width: int = 80,
    card_width: int = 14,
    gap: int = 2,
) -> list[str]:
    """Arrange pre-rendered cards into a responsive grid.

    Parameters
    ----------
    cards:
        Each card is a list of strings (one per visual line).
    available_width:
        Maximum terminal columns for the output.
    card_width:
        Display width of a single card.
    gap:
        Number of space characters between adjacent columns.

    Returns
    -------
    list[str]
        Assembled lines ready for terminal output.
    """
    if not cards:
        return []

    max_columns = max(1, (available_width + gap) // (card_width + gap))

    rows: list[list[list[str]]] = []
    for i in range(0, len(cards), max_columns):
        rows.append(cards[i : i + max_columns])

    separator = " " * gap
    row_width = max_columns * card_width + (max_columns - 1) * gap

    output: list[str] = []
    for row in rows:
        tallest = max(len(card) for card in row)

        padded_cards: list[list[str]] = []
        for card in row:
            padded = list(card) + [" " * card_width] * (tallest - len(card))
            padded_cards.append(padded)

        for line_parts in zip_longest(*padded_cards, fillvalue=" " * card_width):
            parts = [part.ljust(card_width) for part in line_parts]
            # Pad row to full width when fewer cards than max_columns
            while len(parts) < max_columns:
                parts.append(" " * card_width)
            line = separator.join(parts)
            output.append(line)

    return output
