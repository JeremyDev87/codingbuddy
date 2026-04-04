"""Tests for TinyActorCard contract and mood-to-face mapping (#1270)."""
import os
import sys

import pytest

# Ensure hooks/lib is on path
_tests_dir = os.path.dirname(os.path.abspath(__file__))
_lib_dir = os.path.join(os.path.dirname(_tests_dir), "hooks", "lib")
if _lib_dir not in sys.path:
    sys.path.insert(0, _lib_dir)

from tiny_actor_card import TinyActorCard, build_face, create_actor_card

# ---------------------------------------------------------------------------
# build_face — mood-to-face mapping
# ---------------------------------------------------------------------------

DEFAULT_EYE = "\u25cf"  # ●


class TestBuildFaceMoods:
    """build_face returns the correct face for each mood."""

    def test_speaking_mood(self):
        assert build_face("speaking") == f"{DEFAULT_EYE}\u203f{DEFAULT_EYE}"

    def test_reviewing_mood(self):
        assert build_face("reviewing") == f"{DEFAULT_EYE}\u2304{DEFAULT_EYE}"

    def test_proposing_mood(self):
        assert build_face("proposing") == f"{DEFAULT_EYE}\u2040{DEFAULT_EYE}"

    def test_unsure_mood(self):
        assert build_face("unsure") == f"{DEFAULT_EYE}_{DEFAULT_EYE}"

    def test_blocked_mood(self):
        assert build_face("blocked") == f"{DEFAULT_EYE}x{DEFAULT_EYE}"

    def test_unknown_mood_falls_back_to_unsure(self):
        assert build_face("nonexistent") == f"{DEFAULT_EYE}_{DEFAULT_EYE}"


class TestBuildFaceCustomEye:
    """build_face with custom eye_glyph replaces the default eye."""

    def test_star_eye(self):
        assert build_face("speaking", eye_glyph="\u2605") == "\u2605\u203f\u2605"

    def test_diamond_eye(self):
        assert build_face("reviewing", eye_glyph="\u25c6") == "\u25c6\u2304\u25c6"

    def test_buddy_eye(self):
        # Buddy uses ◕ (U+25D5)
        assert build_face("proposing", eye_glyph="\u25d5") == "\u25d5\u2040\u25d5"


class TestBuildFaceAsciiFallback:
    """build_face ASCII fallback mode produces safe ASCII faces."""

    def test_speaking_ascii(self):
        assert build_face("speaking", ascii_mode=True) == "o_o"

    def test_reviewing_ascii(self):
        assert build_face("reviewing", ascii_mode=True) == "o.o"

    def test_proposing_ascii(self):
        assert build_face("proposing", ascii_mode=True) == "o~o"

    def test_unsure_ascii(self):
        assert build_face("unsure", ascii_mode=True) == "o_o"

    def test_blocked_ascii(self):
        assert build_face("blocked", ascii_mode=True) == "oxo"

    def test_ascii_with_eye_fallback(self):
        assert build_face("speaking", eye_fallback="O", ascii_mode=True) == "O_O"

    def test_ascii_unknown_mood(self):
        assert build_face("whatever", ascii_mode=True) == "o_o"


# ---------------------------------------------------------------------------
# TinyActorCard — dataclass contract
# ---------------------------------------------------------------------------


class TestTinyActorCard:
    """TinyActorCard dataclass holds the expected fields."""

    def test_all_fields_present(self):
        card = TinyActorCard(
            agent_id="security-specialist",
            label="Security",
            face="\u2605\u203f\u2605",
            eye="\u2605",
            mood="speaking",
            quote="analyzing",
            color_ansi="yellow",
            is_moderator=False,
        )
        assert card.agent_id == "security-specialist"
        assert card.label == "Security"
        assert card.face == "\u2605\u203f\u2605"
        assert card.eye == "\u2605"
        assert card.mood == "speaking"
        assert card.quote == "analyzing"
        assert card.color_ansi == "yellow"
        assert card.is_moderator is False

    def test_optional_fields_default(self):
        card = TinyActorCard(
            agent_id="test",
            label="Test",
            face="o_o",
            eye=DEFAULT_EYE,
            mood="unsure",
        )
        assert card.quote is None
        assert card.color_ansi is None
        assert card.is_moderator is False


# ---------------------------------------------------------------------------
# create_actor_card — factory function
# ---------------------------------------------------------------------------


class TestCreateActorCard:
    """create_actor_card factory builds valid cards."""

    def test_creates_card_with_defaults(self):
        card = create_actor_card("frontend-developer", "Frontend")
        assert card.agent_id == "frontend-developer"
        assert card.label == "Frontend"
        assert card.mood == "unsure"  # default mood
        assert card.eye == DEFAULT_EYE
        assert card.face == f"{DEFAULT_EYE}_{DEFAULT_EYE}"
        assert card.quote is None
        assert card.color_ansi is None
        assert card.is_moderator is False

    def test_creates_card_with_custom_mood(self):
        card = create_actor_card("backend-developer", "Backend", mood="speaking")
        assert card.mood == "speaking"
        assert card.face == f"{DEFAULT_EYE}\u203f{DEFAULT_EYE}"

    def test_creates_card_with_eye_glyph(self):
        card = create_actor_card(
            "security-specialist", "Security", eye_glyph="\u2605"
        )
        assert card.eye == "\u2605"
        assert card.face == "\u2605_\u2605"

    def test_creates_card_with_all_options(self):
        card = create_actor_card(
            "test-engineer",
            "Test",
            mood="proposing",
            eye_glyph="\u25c6",
            quote="running tests",
            color_ansi="green",
            is_moderator=False,
        )
        assert card.agent_id == "test-engineer"
        assert card.face == "\u25c6\u2040\u25c6"
        assert card.quote == "running tests"
        assert card.color_ansi == "green"

    def test_buddy_moderator_card(self):
        card = create_actor_card(
            "buddy",
            "Buddy",
            mood="speaking",
            eye_glyph="\u25d5",
            is_moderator=True,
        )
        assert card.is_moderator is True
        assert card.eye == "\u25d5"
        assert card.face == "\u25d5\u203f\u25d5"

    def test_ascii_mode_card(self):
        card = create_actor_card(
            "test", "Test", mood="speaking", ascii_mode=True
        )
        assert card.face == "o_o"

    def test_ascii_mode_with_eye_fallback(self):
        card = create_actor_card(
            "test",
            "Test",
            mood="reviewing",
            eye_fallback="O",
            ascii_mode=True,
        )
        assert card.face == "O.O"
        assert card.eye == "O"
