#!/usr/bin/env python3
"""Alignment regression tests for Tiny Actor Grid (#1273).

Ensures display-width consistency across Unicode faces, ASCII fallback,
CJK labels, emoji, ANSI color codes, and narrow terminal widths.

Run with:
    python3 -m pytest tests/test_tiny_actor_alignment.py -v
"""

import os
import sys
from pathlib import Path

# Ensure hooks/lib is importable
_hooks_lib = str(Path(__file__).resolve().parent.parent / "hooks" / "lib")
if _hooks_lib not in sys.path:
    sys.path.insert(0, _hooks_lib)

from buddy_renderer import (  # noqa: E402
    display_width,
    pad_to_display_width,
    render_box_line,
    render_face_banner,
    strip_ansi,
    truncate_to_display_width,
)

# ---------------------------------------------------------------------------
# Mock card data (inline — no external fixtures needed)
# ---------------------------------------------------------------------------

UNICODE_FACES = [
    {"face": "\u25d5\u203f\u25d5", "label": "Security"},
    {"face": "\u2b21\u203f\u2b21", "label": "Architecture"},
    {"face": "\u2299\u203f\u2299", "label": "Performance"},
    {"face": "\u25c9\u203f\u25c9", "label": "Testing"},
    {"face": "\u00b0\u25c7\u00b0", "label": "Code Quality"},
]

ASCII_FACES = [
    {"face": "o_o", "label": "Security"},
    {"face": "o.o", "label": "Architecture"},
    {"face": "^_^", "label": "Performance"},
    {"face": ">_<", "label": "Testing"},
    {"face": "=_=", "label": "Code Quality"},
]

CJK_LABELS = [
    {"face": "\u25d5\u203f\u25d5", "label": "\ubcf4\uc548"},       # Korean: 보안
    {"face": "\u2b21\u203f\u2b21", "label": "\uc131\ub2a5"},       # Korean: 성능
    {"face": "\u2299\u203f\u2299", "label": "\uc811\uadfc\uc131"},  # Korean: 접근성
    {"face": "\u25c9\u203f\u25c9", "label": "\u5b89\u5168"},       # Chinese: 安全
    {"face": "\u00b0\u25c7\u00b0", "label": "\u6027\u80fd"},       # Chinese: 性能
]

EMOJI_FACES = [
    {"face": "\U0001f916", "label": "Bot"},
    {"face": "\U0001f47b", "label": "Ghost"},
    {"face": "\U0001f525\U0001f916", "label": "Fire Bot"},
    {"face": "\u2728", "label": "Sparkle"},
]

ANSI_COLORED_FACES = [
    {"face": "\033[31m\u25d5\u203f\u25d5\033[0m", "label": "Red"},
    {"face": "\033[32m\u2b21\u203f\u2b21\033[0m", "label": "Green"},
    {"face": "\033[1;34m\u2299\u203f\u2299\033[0m", "label": "Bold Blue"},
    {"face": "\033[38;5;208m^_^\033[0m", "label": "Orange"},
]


def _make_card_line(face: str, label: str, target_width: int) -> str:
    """Simulate a grid cell: '| <face> <label> |' padded to target_width."""
    inner = f" {face} {label} "
    return pad_to_display_width(inner, target_width)


def _make_box_rows(face: str, label: str, inner_width: int) -> list:
    """Build a simple boxed card: top border, face row, label row, bottom."""
    top = "\u2500" * (inner_width + 2)
    face_cell = pad_to_display_width(f" {face} ", inner_width + 2)
    label_cell = pad_to_display_width(f" {label} ", inner_width + 2)
    return [
        f"\u250c{top}\u2510",
        f"\u2502{face_cell}\u2502",
        f"\u2502{label_cell}\u2502",
        f"\u2514{top}\u2518",
    ]


# ===================================================================
# 1. Unicode mode — standard agent faces
# ===================================================================

class TestUnicodeFaceAlignment:
    """Cards with Unicode faces (◕‿◕ etc.) maintain consistent width."""

    def test_all_face_banners_have_matching_border_widths(self):
        for card in UNICODE_FACES:
            lines = render_face_banner(card["face"])
            top, middle, bottom = lines[0], lines[1], lines[2]
            assert display_width(top) == display_width(bottom), (
                f"Top/bottom mismatch for {card['label']}: "
                f"top={display_width(top)}, bottom={display_width(bottom)}"
            )

    def test_padded_cells_have_equal_display_width(self):
        target = 20
        widths = []
        for card in UNICODE_FACES:
            cell = _make_card_line(card["face"], card["label"], target)
            w = display_width(cell)
            widths.append((card["label"], w))
        first_width = widths[0][1]
        for label, w in widths:
            assert w == first_width, (
                f"Width mismatch: {label}={w}, expected={first_width}"
            )

    def test_render_box_line_uniform_width(self):
        width = 24
        for card in UNICODE_FACES:
            line = render_box_line(f" {card['face']} {card['label']} ", width)
            assert display_width(line) == width + 2, (
                f"box_line width for {card['label']}: "
                f"got {display_width(line)}, expected {width + 2}"
            )


# ===================================================================
# 2. ASCII fallback mode
# ===================================================================

class TestAsciiFallbackAlignment:
    """ASCII-only faces (o_o, ^_^) keep consistent width with no Unicode."""

    def test_no_unicode_in_ascii_faces(self):
        for card in ASCII_FACES:
            for ch in card["face"]:
                assert ord(ch) < 128, (
                    f"Non-ASCII char U+{ord(ch):04X} in face '{card['face']}'"
                )

    def test_face_banner_border_match(self):
        for card in ASCII_FACES:
            lines = render_face_banner(card["face"])
            assert display_width(lines[0]) == display_width(lines[2])

    def test_padded_cells_equal_width(self):
        target = 18
        widths = set()
        for card in ASCII_FACES:
            cell = _make_card_line(card["face"], card["label"], target)
            widths.add(display_width(cell))
        assert len(widths) == 1, f"Non-uniform widths: {widths}"


# ===================================================================
# 3. CJK text in labels
# ===================================================================

class TestCjkLabelAlignment:
    """Labels with CJK double-width characters stay aligned."""

    def test_cjk_chars_are_double_width(self):
        assert display_width("\ubcf4\uc548") == 4    # 보안: 2 chars x 2 width
        assert display_width("\u5b89\u5168") == 4    # 安全: 2 chars x 2 width
        assert display_width("\uc811\uadfc\uc131") == 6  # 접근성: 3 chars x 2 width

    def test_padded_cells_uniform_despite_cjk(self):
        target = 22
        widths = set()
        for card in CJK_LABELS:
            cell = _make_card_line(card["face"], card["label"], target)
            widths.add(display_width(cell))
        assert len(widths) == 1, f"CJK width drift: {widths}"

    def test_box_rows_consistent(self):
        inner = 18
        for card in CJK_LABELS:
            rows = _make_box_rows(card["face"], card["label"], inner)
            expected = display_width(rows[0])
            for i, row in enumerate(rows):
                assert display_width(row) == expected, (
                    f"Row {i} width mismatch for '{card['label']}': "
                    f"got {display_width(row)}, expected {expected}"
                )

    def test_mixed_cjk_ascii_labels(self):
        """CJK and ASCII labels padded to same width produce equal display width."""
        target = 24
        mixed = [
            {"face": "\u25d5\u203f\u25d5", "label": "\ubcf4\uc548 Check"},
            {"face": "\u2b21\u203f\u2b21", "label": "Security"},
            {"face": "\u2299\u203f\u2299", "label": "\u6027\u80fd Test"},
        ]
        widths = set()
        for card in mixed:
            cell = _make_card_line(card["face"], card["label"], target)
            widths.add(display_width(cell))
        assert len(widths) == 1, f"Mixed CJK/ASCII width drift: {widths}"


# ===================================================================
# 4. Emoji in face or status
# ===================================================================

class TestEmojiAlignment:
    """Emoji characters should not break alignment."""

    def test_emoji_face_display_width(self):
        # Common emoji should be treated as double-width
        assert display_width("\U0001f916") == 2  # robot
        assert display_width("\U0001f47b") == 2  # ghost
        assert display_width("\U0001f525") == 2  # fire

    def test_emoji_face_banners_aligned(self):
        for card in EMOJI_FACES:
            lines = render_face_banner(card["face"])
            assert display_width(lines[0]) == display_width(lines[2]), (
                f"Emoji banner mismatch for {card['label']}"
            )

    def test_emoji_padded_cells_uniform(self):
        target = 20
        widths = set()
        for card in EMOJI_FACES:
            cell = _make_card_line(card["face"], card["label"], target)
            widths.add(display_width(cell))
        assert len(widths) == 1, f"Emoji cell width drift: {widths}"


# ===================================================================
# 5. ANSI color codes
# ===================================================================

class TestAnsiColorAlignment:
    """ANSI escape codes should have zero display width."""

    def test_ansi_codes_zero_width(self):
        plain = "\u25d5\u203f\u25d5"
        colored = "\033[31m\u25d5\u203f\u25d5\033[0m"
        assert display_width(plain) == display_width(colored)

    def test_strip_ansi_removes_all_codes(self):
        colored = "\033[1;38;5;208mhello\033[0m"
        assert strip_ansi(colored) == "hello"

    def test_ansi_face_banners_match_plain(self):
        plain_face = "\u25d5\u203f\u25d5"
        ansi_face = "\033[31m\u25d5\u203f\u25d5\033[0m"
        plain_lines = render_face_banner(plain_face)
        ansi_lines = render_face_banner(ansi_face)
        for i in range(len(plain_lines)):
            assert display_width(plain_lines[i]) == display_width(ansi_lines[i]), (
                f"ANSI banner line {i} width differs from plain"
            )

    def test_ansi_colored_cells_uniform(self):
        target = 22
        widths = set()
        for card in ANSI_COLORED_FACES:
            cell = _make_card_line(card["face"], card["label"], target)
            widths.add(display_width(cell))
        assert len(widths) == 1, f"ANSI cell width drift: {widths}"


# ===================================================================
# 6. Narrow terminal widths
# ===================================================================

class TestNarrowTerminalAlignment:
    """Grid should not break at narrow terminal widths."""

    def test_box_line_at_40_columns(self):
        width = 38  # inner width for 40-col terminal (minus box borders)
        for card in UNICODE_FACES:
            line = render_box_line(
                f" {card['face']} {card['label']} ", width
            )
            assert display_width(line) == width + 2

    def test_box_line_at_80_columns(self):
        width = 78  # inner width for 80-col terminal
        for card in UNICODE_FACES:
            line = render_box_line(
                f" {card['face']} {card['label']} ", width
            )
            assert display_width(line) == width + 2

    def test_truncation_respects_narrow_width(self):
        long_text = "\u25d5\u203f\u25d5 Security Specialist \ubcf4\uc548"
        for w in (10, 15, 20, 30):
            result = truncate_to_display_width(long_text, w)
            assert display_width(result) <= w, (
                f"Truncated to {w} but got width {display_width(result)}"
            )

    def test_all_card_types_at_narrow_width(self):
        """All card types stay uniform at 40 columns."""
        all_cards = UNICODE_FACES + ASCII_FACES + CJK_LABELS
        target = 36
        widths = set()
        for card in all_cards:
            cell = _make_card_line(card["face"], card["label"], target)
            widths.add(display_width(cell))
        assert len(widths) == 1, f"Narrow-width drift across card types: {widths}"


# ===================================================================
# 7. Integration: mixed content in a single grid row
# ===================================================================

class TestMixedGridRow:
    """Simulate a row with different content types — all cells same width."""

    def test_mixed_row_uniform(self):
        """Unicode, CJK, emoji, ANSI cards in one row have equal width."""
        target = 26
        cards = [
            {"face": "\u25d5\u203f\u25d5", "label": "Plain"},
            {"face": "\u25d5\u203f\u25d5", "label": "\ubcf4\uc548"},
            {"face": "\U0001f916", "label": "Bot"},
            {"face": "\033[31m\u25d5\u203f\u25d5\033[0m", "label": "Red"},
        ]
        widths = set()
        for card in cards:
            cell = _make_card_line(card["face"], card["label"], target)
            widths.add(display_width(cell))
        assert len(widths) == 1, f"Mixed row width drift: {widths}"

    def test_face_banner_widths_stable_across_types(self):
        """render_face_banner top/bottom always match for any face type."""
        faces = [
            "\u25d5\u203f\u25d5",           # Unicode
            "o_o",                           # ASCII
            "\U0001f916",                    # Emoji
            "\033[32m\u25d5\u203f\u25d5\033[0m",  # ANSI
            "\u2b21\u203f\u2b21",            # Unicode alt
        ]
        for face in faces:
            lines = render_face_banner(face)
            top_w = display_width(lines[0])
            bottom_w = display_width(lines[2])
            assert top_w == bottom_w, (
                f"Face banner mismatch for '{strip_ansi(face)}': "
                f"top={top_w}, bottom={bottom_w}"
            )
