"""Tests for hooks/lib/council_badge.py — compact council badge formatter (#1367)."""
import json
import os
import sys

import pytest

# Add hooks/lib to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "hooks", "lib"))

from council_badge import (
    build_council_badge,
    format_council_badge,
    shorten_agent_name,
)


class TestShortenAgentName:
    """Tests for agent name shortening."""

    def test_specialist_suffix_removed(self):
        assert shorten_agent_name("security-specialist") == "secu"

    def test_developer_suffix_removed(self):
        assert shorten_agent_name("frontend-developer") == "fron"

    def test_engineer_suffix_removed(self):
        assert shorten_agent_name("test-engineer") == "test"

    def test_multi_word_takes_first(self):
        assert shorten_agent_name("code-quality-specialist") == "code"

    def test_short_name_unchanged(self):
        assert shorten_agent_name("auto-mode") == "auto"

    def test_single_word(self):
        assert shorten_agent_name("reviewer") == "revi"

    def test_empty_string(self):
        assert shorten_agent_name("") == ""


class TestFormatCouncilBadge:
    """Tests for the pure badge formatter."""

    def test_basic_badge_with_all_fields(self):
        result = format_council_badge(
            agent_eye="\u25ae",  # ◮
            agent_short="secu",
            focus="auth",
            stage="reviewing",
            blocker_count=1,
        )
        assert result == "[\u25ae secu] [\U0001f9ea auth] [\u26a01]"

    def test_badge_no_focus(self):
        result = format_council_badge(
            agent_eye="\u2299",  # ⊙
            agent_short="test",
            blocker_count=0,
        )
        assert result == "[\u2299 test] [\u2713]"

    def test_badge_zero_blockers_shows_check(self):
        result = format_council_badge(
            agent_eye="\u25cf",
            agent_short="qual",
            focus="login.ts",
            stage="consensus",
            blocker_count=0,
        )
        assert "[\u2713]" in result

    def test_badge_multiple_blockers(self):
        result = format_council_badge(
            agent_eye="\u25cf",
            agent_short="arch",
            focus="api",
            blocker_count=3,
        )
        assert "[\u26a03]" in result

    def test_focus_truncated_at_12_chars(self):
        result = format_council_badge(
            agent_eye="\u25cf",
            agent_short="secu",
            focus="a-very-long-focus-label",
            blocker_count=0,
        )
        # Focus should be truncated
        assert "a-very-long-" in result
        assert "a-very-long-focus-label" not in result

    def test_stage_icons(self):
        """Each stage should use a different icon."""
        for stage, expected_icon in [
            ("opening", "\U0001f50d"),    # 🔍
            ("reviewing", "\U0001f9ea"),  # 🧪
            ("consensus", "\U0001f91d"),  # 🤝
            ("done", "\u2705"),           # ✅
        ]:
            result = format_council_badge(
                agent_eye="\u25cf",
                agent_short="test",
                focus="x",
                stage=stage,
                blocker_count=0,
            )
            assert expected_icon in result, f"Stage '{stage}' should use icon {expected_icon}"

    def test_unknown_stage_defaults_to_magnifier(self):
        result = format_council_badge(
            agent_eye="\u25cf",
            agent_short="test",
            focus="x",
            stage="unknown",
            blocker_count=0,
        )
        assert "\U0001f50d" in result  # 🔍

    def test_output_is_single_line(self):
        result = format_council_badge(
            agent_eye="\u25ae",
            agent_short="secu",
            focus="auth-module",
            stage="reviewing",
            blocker_count=2,
        )
        assert "\n" not in result


class TestBuildCouncilBadge:
    """Tests for build_council_badge which reads HUD state."""

    def test_returns_none_when_council_not_active(self, tmp_path):
        state_file = str(tmp_path / "hud.json")
        _write_state(state_file, {
            "councilActive": False,
            "activeAgent": "security-specialist",
        })
        result = build_council_badge(state_file=state_file)
        assert result is None

    def test_returns_none_when_no_active_agent(self, tmp_path):
        state_file = str(tmp_path / "hud.json")
        _write_state(state_file, {
            "councilActive": True,
            "activeAgent": None,
        })
        result = build_council_badge(state_file=state_file)
        assert result is None

    def test_returns_none_when_state_file_missing(self, tmp_path):
        state_file = str(tmp_path / "nonexistent.json")
        result = build_council_badge(state_file=state_file)
        assert result is None

    def test_returns_badge_when_council_active(self, tmp_path, monkeypatch):
        agents_dir = tmp_path / ".ai-rules" / "agents"
        agents_dir.mkdir(parents=True)
        (agents_dir / "security-specialist.json").write_text(json.dumps({
            "name": "Security Specialist",
            "visual": {"eye": "\u25ae", "colorAnsi": "red"},
        }))
        monkeypatch.setenv("CLAUDE_PROJECT_DIR", str(tmp_path))

        # Clear agent_status cache
        from agent_status import clear_cache
        clear_cache()

        state_file = str(tmp_path / "hud.json")
        _write_state(state_file, {
            "councilActive": True,
            "activeAgent": "security-specialist",
            "councilStage": "reviewing",
            "focus": "auth",
            "blockerCount": 1,
        })
        result = build_council_badge(state_file=state_file)
        assert result is not None
        assert "\u25ae" in result   # eye char
        assert "secu" in result     # short name
        assert "auth" in result     # focus
        assert "\u26a01" in result  # ⚠1

    def test_badge_with_no_focus(self, tmp_path, monkeypatch):
        agents_dir = tmp_path / ".ai-rules" / "agents"
        agents_dir.mkdir(parents=True)
        (agents_dir / "test-engineer.json").write_text(json.dumps({
            "name": "Test Engineer",
            "visual": {"eye": "\u2299", "colorAnsi": "green"},
        }))
        monkeypatch.setenv("CLAUDE_PROJECT_DIR", str(tmp_path))

        from agent_status import clear_cache
        clear_cache()

        state_file = str(tmp_path / "hud.json")
        _write_state(state_file, {
            "councilActive": True,
            "activeAgent": "test-engineer",
            "councilStage": "opening",
            "focus": None,
            "blockerCount": 0,
        })
        result = build_council_badge(state_file=state_file)
        assert result is not None
        assert "test" in result
        assert "[\u2713]" in result  # ✓ for zero blockers

    def test_fallback_eye_when_agent_json_missing(self, tmp_path, monkeypatch):
        monkeypatch.setenv("CLAUDE_PROJECT_DIR", str(tmp_path))

        from agent_status import clear_cache
        clear_cache()

        state_file = str(tmp_path / "hud.json")
        _write_state(state_file, {
            "councilActive": True,
            "activeAgent": "unknown-agent",
            "councilStage": "",
            "focus": "api",
            "blockerCount": 0,
        })
        result = build_council_badge(state_file=state_file)
        assert result is not None
        # Should use fallback eye character
        assert "\u25c6" in result  # ◆ fallback


def _write_state(path: str, data: dict) -> None:
    """Helper to write a HUD state file."""
    os.makedirs(os.path.dirname(path), mode=0o700, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f)
