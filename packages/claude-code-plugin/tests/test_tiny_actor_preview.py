"""Tests for feature-flagged Tiny Actor Grid preview (#1271)."""
import os
import sys

import pytest

# Ensure hooks/lib is on path
_tests_dir = os.path.dirname(os.path.abspath(__file__))
_lib_dir = os.path.join(os.path.dirname(_tests_dir), "hooks", "lib")
if _lib_dir not in sys.path:
    sys.path.insert(0, _lib_dir)

from buddy_renderer import display_width
from tiny_actor_preview import is_tiny_actors_enabled, render_actor_preview

# ---------------------------------------------------------------------------
# is_tiny_actors_enabled
# ---------------------------------------------------------------------------


class TestIsTinyActorsEnabled:
    """Feature flag respects CODINGBUDDY_TINY_ACTORS env var."""

    def test_disabled_by_default(self, monkeypatch):
        monkeypatch.delenv("CODINGBUDDY_TINY_ACTORS", raising=False)
        assert is_tiny_actors_enabled() is False

    def test_enabled_when_set_to_1(self, monkeypatch):
        monkeypatch.setenv("CODINGBUDDY_TINY_ACTORS", "1")
        assert is_tiny_actors_enabled() is True

    def test_enabled_when_set_to_true(self, monkeypatch):
        monkeypatch.setenv("CODINGBUDDY_TINY_ACTORS", "true")
        assert is_tiny_actors_enabled() is True

    def test_disabled_when_set_to_0(self, monkeypatch):
        monkeypatch.setenv("CODINGBUDDY_TINY_ACTORS", "0")
        assert is_tiny_actors_enabled() is False

    def test_disabled_when_set_to_empty(self, monkeypatch):
        monkeypatch.setenv("CODINGBUDDY_TINY_ACTORS", "")
        assert is_tiny_actors_enabled() is False


# ---------------------------------------------------------------------------
# render_actor_preview — flag disabled
# ---------------------------------------------------------------------------


class TestRenderActorPreviewDisabled:
    """When feature flag is off, render_actor_preview returns None."""

    def test_returns_none_when_disabled(self, monkeypatch):
        monkeypatch.delenv("CODINGBUDDY_TINY_ACTORS", raising=False)
        result = render_actor_preview("PLAN")
        assert result is None


# ---------------------------------------------------------------------------
# render_actor_preview — flag enabled
# ---------------------------------------------------------------------------


class TestRenderActorPreviewEnabled:
    """When feature flag is on, render_actor_preview returns formatted output."""

    @pytest.fixture(autouse=True)
    def _enable_flag(self, monkeypatch):
        monkeypatch.setenv("CODINGBUDDY_TINY_ACTORS", "1")

    def test_valid_mode_returns_string(self):
        result = render_actor_preview("PLAN")
        assert isinstance(result, str)
        assert len(result) > 0

    def test_unknown_mode_returns_none(self):
        result = render_actor_preview("NONEXISTENT")
        assert result is None

    def test_preview_contains_agent_faces(self):
        result = render_actor_preview("PLAN")
        assert result is not None
        # Should contain face-like patterns (eye+mouth+eye)
        assert "\u25cf" in result or "o" in result  # default eye glyphs

    def test_preview_contains_moderator(self):
        result = render_actor_preview("PLAN")
        assert result is not None
        # Buddy moderator face should appear
        assert "\u25d5\u203f\u25d5" in result  # ◕‿◕

    def test_preview_contains_agent_labels(self):
        result = render_actor_preview("PLAN")
        assert result is not None
        # Primary agent label derived from "technical-planner"
        assert "Technical" in result
        # Specialist label derived from "security-specialist"
        assert "Security" in result

    def test_respects_available_width(self):
        result = render_actor_preview("PLAN", available_width=40)
        assert result is not None
        for line in result.split("\n"):
            # Use display_width for correct measurement of Unicode content
            assert display_width(line) <= 40

    def test_all_preset_modes_render(self):
        for mode in ("PLAN", "EVAL", "AUTO", "SHIP"):
            result = render_actor_preview(mode)
            assert result is not None, f"Mode {mode} should render"
            assert len(result) > 0


# ---------------------------------------------------------------------------
# render_actor_preview — error fallback
# ---------------------------------------------------------------------------


class TestRenderActorPreviewFallback:
    """Errors in rendering fall back to None without raising."""

    @pytest.fixture(autouse=True)
    def _enable_flag(self, monkeypatch):
        monkeypatch.setenv("CODINGBUDDY_TINY_ACTORS", "1")

    def test_exception_in_preset_returns_none(self, monkeypatch):
        """If get_cast_preset raises, render_actor_preview returns None."""
        import tiny_actor_preview

        def _boom(mode):
            raise RuntimeError("boom")

        monkeypatch.setattr(tiny_actor_preview, "get_cast_preset", _boom)
        result = render_actor_preview("PLAN")
        assert result is None
