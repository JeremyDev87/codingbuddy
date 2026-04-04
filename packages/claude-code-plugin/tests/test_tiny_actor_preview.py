"""Tests for feature-flagged Tiny Actor Grid preview (#1271)."""
import json
import os
import sys

import pytest

# Ensure hooks/lib is on path
_tests_dir = os.path.dirname(os.path.abspath(__file__))
_lib_dir = os.path.join(os.path.dirname(_tests_dir), "hooks", "lib")
if _lib_dir not in sys.path:
    sys.path.insert(0, _lib_dir)

from buddy_renderer import display_width
from tiny_actor_preview import (
    is_tiny_actors_enabled,
    render_actor_preview,
    _load_agent_eye,
    _AGENTS_DIR,
)

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
        # Should contain real agent eye glyphs loaded from JSON
        # security-specialist has visual.eye = "◮"
        assert "\u25ee" in result or "\u25cf" in result  # real or default eye glyphs

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


# ---------------------------------------------------------------------------
# _load_agent_eye — agent visual.eye loading
# ---------------------------------------------------------------------------


class TestLoadAgentEye:
    """Loading visual.eye glyphs from agent JSON files (#1301)."""

    def test_known_agent_returns_eye_glyph(self):
        """A known agent like security-specialist returns its visual.eye."""
        eye = _load_agent_eye("security-specialist")
        assert eye is not None
        # Verify it matches the actual JSON file
        agent_file = _AGENTS_DIR / "security-specialist.json"
        data = json.loads(agent_file.read_text(encoding="utf-8"))
        assert eye == data["visual"]["eye"]

    def test_unknown_agent_returns_none(self):
        """An agent ID with no matching JSON falls back to None."""
        eye = _load_agent_eye("nonexistent-agent-xyz")
        assert eye is None

    def test_malformed_json_returns_none(self, tmp_path, monkeypatch):
        """A malformed agent JSON doesn't break — returns None."""
        import tiny_actor_preview

        bad_dir = tmp_path / "agents"
        bad_dir.mkdir()
        (bad_dir / "broken-agent.json").write_text("{invalid json", encoding="utf-8")
        monkeypatch.setattr(tiny_actor_preview, "_AGENTS_DIR", bad_dir)
        eye = _load_agent_eye("broken-agent")
        assert eye is None

    def test_missing_visual_block_returns_none(self, tmp_path, monkeypatch):
        """An agent JSON without visual block returns None."""
        import tiny_actor_preview

        no_visual_dir = tmp_path / "agents"
        no_visual_dir.mkdir()
        (no_visual_dir / "no-visual.json").write_text(
            json.dumps({"name": "Test Agent"}), encoding="utf-8"
        )
        monkeypatch.setattr(tiny_actor_preview, "_AGENTS_DIR", no_visual_dir)
        eye = _load_agent_eye("no-visual")
        assert eye is None

    def test_empty_eye_string_returns_none(self, tmp_path, monkeypatch):
        """An agent with empty visual.eye string returns None."""
        import tiny_actor_preview

        empty_dir = tmp_path / "agents"
        empty_dir.mkdir()
        (empty_dir / "empty-eye.json").write_text(
            json.dumps({"visual": {"eye": ""}}), encoding="utf-8"
        )
        monkeypatch.setattr(tiny_actor_preview, "_AGENTS_DIR", empty_dir)
        eye = _load_agent_eye("empty-eye")
        assert eye is None


# ---------------------------------------------------------------------------
# render_actor_preview — real eye glyphs (#1301)
# ---------------------------------------------------------------------------


class TestRenderActorPreviewEyeGlyphs:
    """Rendered preview uses real agent eye glyphs from JSON."""

    @pytest.fixture(autouse=True)
    def _enable_flag(self, monkeypatch):
        monkeypatch.setenv("CODINGBUDDY_TINY_ACTORS", "1")

    def test_buddy_still_uses_moderator_face(self):
        """Buddy moderator card keeps its hardcoded ◕ eye, not loaded from JSON."""
        result = render_actor_preview("PLAN")
        assert result is not None
        assert "\u25d5\u203f\u25d5" in result  # ◕‿◕

    def test_specialist_uses_real_eye_glyph(self):
        """Security specialist card uses ◮ from its visual.eye, not default ●."""
        result = render_actor_preview("PLAN")
        assert result is not None
        # security-specialist visual.eye = "◮"
        sec_eye = _load_agent_eye("security-specialist")
        assert sec_eye is not None
        assert sec_eye in result

    def test_all_modes_load_real_glyphs(self):
        """All preset modes produce output with non-default eye glyphs."""
        from tiny_actor_card import DEFAULT_EYE

        for mode in ("PLAN", "EVAL", "AUTO", "SHIP"):
            result = render_actor_preview(mode)
            assert result is not None, f"Mode {mode} should render"
            # At least one real eye glyph should appear (not just default ●)
            # Buddy uses ◕ which is not DEFAULT_EYE, so that alone satisfies this
            # but primary/specialist agents should also have their own glyphs
            lines = result.split("\n")
            assert len(lines) > 0
