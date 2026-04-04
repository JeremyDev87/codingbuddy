"""Tests for width-safe Tiny Actor card renderer (#1269)."""
import os
import sys

import pytest

# Ensure hooks/lib is on path
_tests_dir = os.path.dirname(os.path.abspath(__file__))
_lib_dir = os.path.join(os.path.dirname(_tests_dir), "hooks", "lib")
if _lib_dir not in sys.path:
    sys.path.insert(0, _lib_dir)

from tiny_actor_card import TinyActorCard, create_actor_card
from tiny_actor_renderer import render_card
from buddy_renderer import display_width, strip_ansi

from typing import Optional


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_card(
    label: str = "Security",
    mood: str = "speaking",
    quote: "Optional[str]" = "Checking…",
    color_ansi: "Optional[str]" = None,
    ascii_mode: bool = False,
) -> TinyActorCard:
    return create_actor_card(
        agent_id="test-agent",
        label=label,
        mood=mood,
        quote=quote,
        color_ansi=color_ansi,
        ascii_mode=ascii_mode,
    )


# ---------------------------------------------------------------------------
# Basic rendering
# ---------------------------------------------------------------------------


class TestBasicRendering:
    """render_card returns the correct number of lines."""

    def test_card_with_quote_returns_three_lines(self):
        card = _make_card(quote="Hello")
        lines = render_card(card)
        assert len(lines) == 3

    def test_card_without_quote_returns_two_lines(self):
        card = _make_card(quote=None)
        lines = render_card(card)
        assert len(lines) == 2

    def test_show_quote_false_omits_quote_line(self):
        card = _make_card(quote="Hello")
        lines = render_card(card, show_quote=False)
        assert len(lines) == 2


# ---------------------------------------------------------------------------
# Display-width safety
# ---------------------------------------------------------------------------


class TestDisplayWidthSafety:
    """All lines have equal display width matching card_width."""

    def test_all_lines_equal_display_width(self):
        card = _make_card()
        lines = render_card(card, card_width=14)
        widths = [display_width(line) for line in lines]
        assert all(w == 14 for w in widths), f"widths: {widths}"

    def test_custom_card_width(self):
        card = _make_card()
        lines = render_card(card, card_width=20)
        widths = [display_width(line) for line in lines]
        assert all(w == 20 for w in widths), f"widths: {widths}"

    def test_narrow_card_width(self):
        card = _make_card(label="X", quote=None)
        lines = render_card(card, card_width=6)
        widths = [display_width(line) for line in lines]
        assert all(w == 6 for w in widths), f"widths: {widths}"


# ---------------------------------------------------------------------------
# CJK and multibyte text
# ---------------------------------------------------------------------------


class TestCJKTruncation:
    """CJK labels and quotes are truncated to fit display width."""

    def test_cjk_label_truncated_correctly(self):
        card = _make_card(label="보안전문가입니다", quote=None)
        lines = render_card(card, card_width=14)
        widths = [display_width(line) for line in lines]
        assert all(w == 14 for w in widths), f"widths: {widths}"

    def test_japanese_label(self):
        card = _make_card(label="セキュリティ", quote=None)
        lines = render_card(card, card_width=14)
        widths = [display_width(line) for line in lines]
        assert all(w == 14 for w in widths), f"widths: {widths}"

    def test_cjk_quote_truncated(self):
        card = _make_card(label="Sec", quote="한글 인용 테스트입니다")
        lines = render_card(card, card_width=14)
        widths = [display_width(line) for line in lines]
        assert all(w == 14 for w in widths), f"widths: {widths}"


# ---------------------------------------------------------------------------
# ANSI-colored faces
# ---------------------------------------------------------------------------


class TestANSIColoredFace:
    """ANSI escape codes in face don't break alignment."""

    def test_ansi_face_does_not_break_width(self):
        card = _make_card(color_ansi="red")
        # Wrap face in ANSI manually to simulate colored face
        colored_face = f"\033[31m{card.face}\033[0m"
        colored_card = TinyActorCard(
            agent_id=card.agent_id,
            label=card.label,
            face=colored_face,
            eye=card.eye,
            mood=card.mood,
            quote=card.quote,
            color_ansi=card.color_ansi,
            is_moderator=card.is_moderator,
        )
        lines = render_card(colored_card, card_width=14)
        widths = [display_width(line) for line in lines]
        assert all(w == 14 for w in widths), f"widths: {widths}"

    def test_ansi_stripped_face_has_visible_content(self):
        card = _make_card()
        colored_face = f"\033[32m{card.face}\033[0m"
        colored_card = TinyActorCard(
            agent_id=card.agent_id,
            label=card.label,
            face=colored_face,
            eye=card.eye,
            mood=card.mood,
            quote=card.quote,
            color_ansi=card.color_ansi,
            is_moderator=card.is_moderator,
        )
        lines = render_card(colored_card, card_width=14)
        # Face line should contain visible characters
        assert len(strip_ansi(lines[0]).strip()) > 0


# ---------------------------------------------------------------------------
# ASCII mode
# ---------------------------------------------------------------------------


class TestASCIIMode:
    """ASCII mode produces only ASCII characters in face."""

    def test_ascii_mode_face_is_ascii_only(self):
        card = _make_card(ascii_mode=True)
        lines = render_card(card, card_width=14)
        face_line = strip_ansi(lines[0])
        assert face_line.isascii(), f"non-ASCII in face: {face_line!r}"

    def test_ascii_mode_display_width_correct(self):
        card = _make_card(ascii_mode=True)
        lines = render_card(card, card_width=14)
        widths = [display_width(line) for line in lines]
        assert all(w == 14 for w in widths), f"widths: {widths}"


# ---------------------------------------------------------------------------
# Content correctness
# ---------------------------------------------------------------------------


class TestContentCorrectness:
    """Rendered lines contain expected content."""

    def test_face_appears_in_first_line(self):
        card = _make_card()
        lines = render_card(card, card_width=14)
        assert card.face in lines[0]

    def test_label_appears_in_second_line(self):
        card = _make_card(label="Test")
        lines = render_card(card, card_width=14)
        assert "Test" in lines[1]

    def test_quote_appears_in_third_line(self):
        card = _make_card(quote="Hi")
        lines = render_card(card, card_width=14)
        assert "Hi" in lines[2]
