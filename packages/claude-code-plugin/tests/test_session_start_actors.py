"""Tests for Tiny Actor Grid preview integration in session-start (#1302)."""
import os
import sys

import pytest

# Ensure hooks/lib is on path
_tests_dir = os.path.dirname(os.path.abspath(__file__))
_lib_dir = os.path.join(os.path.dirname(_tests_dir), "hooks", "lib")
if _lib_dir not in sys.path:
    sys.path.insert(0, _lib_dir)

from tiny_actor_preview import is_tiny_actors_enabled, render_actor_preview


# ---------------------------------------------------------------------------
# Integration: session-start calls render_actor_preview
# ---------------------------------------------------------------------------


class TestSessionStartActorPreview:
    """Verify that the session-start integration point behaves correctly."""

    def test_preview_off_by_default(self, monkeypatch):
        """When flag is unset, render_actor_preview returns None (no output)."""
        monkeypatch.delenv("CODINGBUDDY_TINY_ACTORS", raising=False)
        assert render_actor_preview("PLAN") is None

    def test_preview_on_when_flag_enabled(self, monkeypatch):
        """When flag is set, render_actor_preview returns non-empty string."""
        monkeypatch.setenv("CODINGBUDDY_TINY_ACTORS", "1")
        result = render_actor_preview("PLAN")
        assert isinstance(result, str)
        assert len(result) > 0

    def test_plan_mode_is_default_session_start_mode(self, monkeypatch):
        """Session start uses PLAN as the default mode for preview."""
        monkeypatch.setenv("CODINGBUDDY_TINY_ACTORS", "1")
        result = render_actor_preview("PLAN")
        assert result is not None
        # Buddy moderator face should appear
        assert "\u25d5\u203f\u25d5" in result  # ◕‿◕

    def test_preview_contains_buddy_and_agents(self, monkeypatch):
        """Preview output includes buddy moderator and specialist labels."""
        monkeypatch.setenv("CODINGBUDDY_TINY_ACTORS", "1")
        result = render_actor_preview("PLAN")
        assert result is not None
        # Buddy face
        assert "\u25d5" in result
        # At least one agent label
        assert "Technical" in result or "Security" in result

    def test_no_exception_when_flag_off_and_render_called(self, monkeypatch):
        """Calling render_actor_preview with flag off never raises."""
        monkeypatch.delenv("CODINGBUDDY_TINY_ACTORS", raising=False)
        # Should return None cleanly, matching the try/except pattern in session-start
        assert render_actor_preview("PLAN") is None

    def test_no_exception_with_invalid_mode(self, monkeypatch):
        """Invalid mode returns None without raising (matches session-start guard)."""
        monkeypatch.setenv("CODINGBUDDY_TINY_ACTORS", "1")
        result = render_actor_preview("NONEXISTENT_MODE")
        assert result is None


class TestSessionStartActorFlagGating:
    """Verify feature flag gating matches session-start try/except pattern."""

    def test_flag_disabled_matches_session_start_noop(self, monkeypatch):
        """When disabled, the entire actor preview block is a no-op."""
        monkeypatch.delenv("CODINGBUDDY_TINY_ACTORS", raising=False)
        assert not is_tiny_actors_enabled()
        assert render_actor_preview("PLAN") is None

    def test_flag_enabled_produces_output(self, monkeypatch):
        """When enabled, preview produces printable output."""
        monkeypatch.setenv("CODINGBUDDY_TINY_ACTORS", "1")
        assert is_tiny_actors_enabled()
        result = render_actor_preview("PLAN")
        assert result is not None
        # Output should be printable (no None/errors)
        assert isinstance(result, str)

    def test_exception_fallback_returns_none(self, monkeypatch):
        """If rendering raises, session-start try/except catches it."""
        monkeypatch.setenv("CODINGBUDDY_TINY_ACTORS", "1")
        import tiny_actor_preview

        def _boom(mode):
            raise RuntimeError("simulated failure")

        monkeypatch.setattr(tiny_actor_preview, "get_cast_preset", _boom)
        # render_actor_preview catches internally, returns None
        assert render_actor_preview("PLAN") is None
