"""Tests for responsive Tiny Actor Grid layout engine (#1268)."""
import os
import sys

import pytest

# Ensure hooks/lib is on path
_tests_dir = os.path.dirname(os.path.abspath(__file__))
_lib_dir = os.path.join(os.path.dirname(_tests_dir), "hooks", "lib")
if _lib_dir not in sys.path:
    sys.path.insert(0, _lib_dir)

from buddy_renderer import display_width
from tiny_actor_grid import layout_grid

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_CARD_WIDTH = 14


def _make_card(lines: int = 3, width: int = _CARD_WIDTH, label: str = "X") -> list[str]:
    """Create a fake pre-rendered card with *lines* rows, each *width* chars."""
    rows: list[str] = []
    for i in range(lines):
        text = f"{label}{i}"
        rows.append(text.ljust(width))
    return rows


# ---------------------------------------------------------------------------
# Column calculation
# ---------------------------------------------------------------------------


class TestColumnCalculation:
    """layout_grid picks the right number of columns for the available width."""

    def test_three_cards_fit_one_row_at_80_cols(self):
        """3 cards (14 wide, gap 2) need 14+2+14+2+14 = 46 chars => fits in 80."""
        cards = [_make_card(label=c) for c in "ABC"]
        lines = layout_grid(cards, available_width=80, card_width=_CARD_WIDTH, gap=2)
        # All 3 cards in one row => only 3 visual lines (card height)
        assert len(lines) == 3

    def test_six_cards_wrap_to_two_rows_at_80_cols(self):
        """80 cols fits max 5 cards (14+2)*5-2=78. 6 cards => 2 rows."""
        cards = [_make_card(label=c) for c in "ABCDEF"]
        lines = layout_grid(cards, available_width=80, card_width=_CARD_WIDTH, gap=2)
        # 5 cards first row + 1 card second row => 3 + 3 = 6 visual lines
        assert len(lines) == 6

    def test_single_card_at_40_cols(self):
        """1 card at 40 cols => single column, 3 lines."""
        cards = [_make_card()]
        lines = layout_grid(cards, available_width=40, card_width=_CARD_WIDTH, gap=2)
        assert len(lines) == 3

    def test_narrow_width_forces_column_reduction(self):
        """Width of 20 with card_width 14 and gap 2 => max 1 column."""
        cards = [_make_card(label=c) for c in "AB"]
        lines = layout_grid(cards, available_width=20, card_width=_CARD_WIDTH, gap=2)
        # 2 cards in 1 column => 2 rows => 6 visual lines
        assert len(lines) == 6


# ---------------------------------------------------------------------------
# Output consistency
# ---------------------------------------------------------------------------


class TestOutputConsistency:
    """All output lines have consistent display width within each row group."""

    def test_all_lines_consistent_width(self):
        """Every line in the output should have the same display width."""
        cards = [_make_card(label=c) for c in "ABCD"]
        lines = layout_grid(cards, available_width=80, card_width=_CARD_WIDTH, gap=2)
        widths = {len(line) for line in lines}
        assert len(widths) == 1, f"Expected uniform width, got {widths}"

    def test_cjk_labels_consistent_display_width(self):
        """Cards with CJK text must produce uniform display width across rows."""
        from buddy_renderer import pad_to_display_width

        def _cjk_card() -> list[str]:
            return [
                pad_to_display_width("한국어", _CARD_WIDTH),
                pad_to_display_width("테스트", _CARD_WIDTH),
                pad_to_display_width("라벨", _CARD_WIDTH),
            ]

        cards = [_cjk_card(), _make_card(label="A"), _cjk_card()]
        lines = layout_grid(cards, available_width=80, card_width=_CARD_WIDTH, gap=2)
        widths = {display_width(line) for line in lines}
        assert len(widths) == 1, f"CJK grid display widths not uniform: {widths}"

    def test_ansi_colored_text_consistent_display_width(self):
        """Cards with ANSI escape codes must produce uniform display width."""
        from buddy_renderer import pad_to_display_width

        RED = "\033[31m"
        RESET = "\033[0m"

        def _ansi_card() -> list[str]:
            return [
                pad_to_display_width(f"{RED}colored{RESET}", _CARD_WIDTH),
                pad_to_display_width(f"{RED}face{RESET}", _CARD_WIDTH),
                pad_to_display_width(f"{RED}text{RESET}", _CARD_WIDTH),
            ]

        cards = [_ansi_card(), _make_card(label="B"), _ansi_card()]
        lines = layout_grid(cards, available_width=80, card_width=_CARD_WIDTH, gap=2)
        widths = {display_width(line) for line in lines}
        assert len(widths) == 1, f"ANSI grid display widths not uniform: {widths}"

    def test_mixed_cjk_ansi_ascii_consistent(self):
        """Mixed CJK, ANSI, and ASCII cards in one grid stay aligned."""
        from buddy_renderer import pad_to_display_width

        GREEN = "\033[32m"
        RESET = "\033[0m"

        cjk_card = [
            pad_to_display_width("보안전문가", _CARD_WIDTH),
            pad_to_display_width("분석중", _CARD_WIDTH),
            pad_to_display_width("완료", _CARD_WIDTH),
        ]
        ansi_card = [
            pad_to_display_width(f"{GREEN}status{RESET}", _CARD_WIDTH),
            pad_to_display_width(f"{GREEN}ok{RESET}", _CARD_WIDTH),
            pad_to_display_width(f"{GREEN}done{RESET}", _CARD_WIDTH),
        ]
        ascii_card = _make_card(label="Z")

        cards = [cjk_card, ansi_card, ascii_card]
        lines = layout_grid(cards, available_width=80, card_width=_CARD_WIDTH, gap=2)
        widths = {display_width(line) for line in lines}
        assert len(widths) == 1, f"Mixed grid display widths not uniform: {widths}"


# ---------------------------------------------------------------------------
# Edge cases
# ---------------------------------------------------------------------------


class TestEdgeCases:
    """Edge cases: empty input, uneven card heights."""

    def test_empty_input_returns_empty_list(self):
        assert layout_grid([], available_width=80, card_width=_CARD_WIDTH) == []

    def test_cards_with_different_line_counts_are_padded(self):
        """Cards with 2 and 4 lines in same row => shorter card padded to 4."""
        short_card = _make_card(lines=2, label="S")
        tall_card = _make_card(lines=4, label="T")
        lines = layout_grid(
            [short_card, tall_card],
            available_width=80,
            card_width=_CARD_WIDTH,
            gap=2,
        )
        # Both in same row, padded to tallest (4 lines)
        assert len(lines) == 4
        # Every line should have content (no None, no missing)
        for line in lines:
            assert isinstance(line, str)
            assert len(line) > 0
