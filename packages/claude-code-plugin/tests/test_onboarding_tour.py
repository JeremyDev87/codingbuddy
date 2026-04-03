#!/usr/bin/env python3
"""Unit tests for onboarding_tour.py

Run with: python3 -m pytest test_onboarding_tour.py -v
"""

import os
import sys
import tempfile
from pathlib import Path
from unittest.mock import patch

# Ensure hooks/lib is importable
_hooks_lib = str(Path(__file__).resolve().parent.parent / "hooks" / "lib")
if _hooks_lib not in sys.path:
    sys.path.insert(0, _hooks_lib)

import onboarding_tour  # noqa: E402
from buddy_renderer import display_width  # noqa: E402


class TestIsFirstRun:
    """Tests for is_first_run function."""

    def test_returns_true_when_flag_missing(self):
        """First run when no onboarded flag exists."""
        with tempfile.TemporaryDirectory() as tmpdir:
            flag = os.path.join(tmpdir, "onboarded")
            with patch.object(onboarding_tour, "_onboarded_flag", return_value=flag):
                with patch.dict(os.environ, {}, clear=False):
                    os.environ.pop(onboarding_tour.SKIP_ENV_VAR, None)
                    assert onboarding_tour.is_first_run() is True

    def test_returns_false_when_flag_exists(self):
        """Not first run when onboarded flag exists."""
        with tempfile.TemporaryDirectory() as tmpdir:
            flag = os.path.join(tmpdir, "onboarded")
            Path(flag).touch()
            with patch.object(onboarding_tour, "_onboarded_flag", return_value=flag):
                with patch.dict(os.environ, {}, clear=False):
                    os.environ.pop(onboarding_tour.SKIP_ENV_VAR, None)
                    assert onboarding_tour.is_first_run() is False

    def test_returns_false_when_skip_env_set(self):
        """Skip tour when CODINGBUDDY_SKIP_TOUR env var is set."""
        with tempfile.TemporaryDirectory() as tmpdir:
            flag = os.path.join(tmpdir, "onboarded")
            with patch.object(onboarding_tour, "_onboarded_flag", return_value=flag):
                with patch.dict(os.environ, {onboarding_tour.SKIP_ENV_VAR: "1"}):
                    assert onboarding_tour.is_first_run() is False


class TestMarkOnboarded:
    """Tests for mark_onboarded function."""

    def test_creates_flag_file(self):
        """Flag file is created after marking onboarded."""
        with tempfile.TemporaryDirectory() as tmpdir:
            flag_dir = os.path.join(tmpdir, ".codingbuddy")
            flag = os.path.join(flag_dir, "onboarded")
            with patch.object(onboarding_tour, "_onboarded_dir", return_value=flag_dir):
                with patch.object(onboarding_tour, "_onboarded_flag", return_value=flag):
                    onboarding_tour.mark_onboarded()
                    assert os.path.isfile(flag)

    def test_creates_parent_directory(self):
        """Parent directory is created if it doesn't exist."""
        with tempfile.TemporaryDirectory() as tmpdir:
            flag_dir = os.path.join(tmpdir, "nested", ".codingbuddy")
            flag = os.path.join(flag_dir, "onboarded")
            with patch.object(onboarding_tour, "_onboarded_dir", return_value=flag_dir):
                with patch.object(onboarding_tour, "_onboarded_flag", return_value=flag):
                    onboarding_tour.mark_onboarded()
                    assert os.path.isdir(flag_dir)
                    assert os.path.isfile(flag)

    def test_idempotent(self):
        """Calling mark_onboarded twice doesn't raise."""
        with tempfile.TemporaryDirectory() as tmpdir:
            flag_dir = os.path.join(tmpdir, ".codingbuddy")
            flag = os.path.join(flag_dir, "onboarded")
            with patch.object(onboarding_tour, "_onboarded_dir", return_value=flag_dir):
                with patch.object(onboarding_tour, "_onboarded_flag", return_value=flag):
                    onboarding_tour.mark_onboarded()
                    onboarding_tour.mark_onboarded()  # Should not raise
                    assert os.path.isfile(flag)


class TestRenderOnboardingTour:
    """Tests for render_onboarding_tour function."""

    def test_returns_non_empty_string(self):
        """Tour output is non-empty."""
        result = onboarding_tour.render_onboarding_tour()
        assert isinstance(result, str)
        assert len(result) > 0

    def test_contains_all_three_steps(self):
        """Tour output contains all 3 step circled digits."""
        result = onboarding_tour.render_onboarding_tour()
        assert "\u2460" in result  # ①
        assert "\u2461" in result  # ②
        assert "\u2462" in result  # ③

    def test_contains_buddy_face(self):
        """Tour output contains the default buddy face."""
        result = onboarding_tour.render_onboarding_tour()
        assert onboarding_tour.BUDDY_FACE in result

    def test_contains_skip_message(self):
        """Tour output contains skip instructions."""
        result = onboarding_tour.render_onboarding_tour()
        assert "~/.codingbuddy/onboarded" in result

    def test_english_content(self):
        """English tour contains expected keywords."""
        result = onboarding_tour.render_onboarding_tour(language="en")
        assert "PLAN/ACT/EVAL" in result
        assert "Specialist" in result
        assert "Checklists" in result

    def test_korean_content(self):
        """Korean tour contains expected keywords."""
        result = onboarding_tour.render_onboarding_tour(language="ko")
        assert "워크플로우" in result
        assert "전문가" in result
        assert "체크리스트" in result

    def test_japanese_content(self):
        """Japanese tour contains expected keywords."""
        result = onboarding_tour.render_onboarding_tour(language="ja")
        assert "ワークフロー" in result
        assert "専門エージェント" in result

    def test_unknown_language_falls_back_to_english(self):
        """Unknown language code falls back to English."""
        result = onboarding_tour.render_onboarding_tour(language="xx")
        assert "PLAN/ACT/EVAL" in result
        assert "Welcome" in result

    def test_custom_buddy_face(self):
        """Custom buddy face is used when provided."""
        custom = {"name": "TestBuddy", "face": "\u2605\u203f\u2605", "greeting": "", "farewell": ""}
        result = onboarding_tour.render_onboarding_tour(buddy_config=custom)
        assert "\u2605\u203f\u2605" in result

    def test_custom_face_banner_keeps_top_and_bottom_aligned(self):
        """Longer custom faces expand the top banner cleanly."""
        custom = {"name": "TestBuddy", "face": "\u2605\u25d5\u203f\u25d5\u2605", "greeting": "", "farewell": ""}
        result = onboarding_tour.render_onboarding_tour(buddy_config=custom)
        top, _middle, bottom = result.splitlines()[:3]
        assert display_width(top) == display_width(bottom)

    def test_welcome_message_present(self):
        """Welcome message is in the output."""
        result = onboarding_tour.render_onboarding_tour(language="en")
        assert "Welcome to CodingBuddy" in result

    def test_example_commands_present(self):
        """Example commands are included in tour steps."""
        result = onboarding_tour.render_onboarding_tour(language="en")
        assert "PLAN add user authentication" in result


class TestHelpers:
    """Tests for internal helper functions."""

    def test_get_text_returns_localized(self):
        """_get_text returns localized string."""
        mapping = {"en": "Hello", "ko": "안녕"}
        assert onboarding_tour._get_text(mapping, "ko") == "안녕"

    def test_get_text_falls_back_to_english(self):
        """_get_text falls back to English for unknown language."""
        mapping = {"en": "Hello", "ko": "안녕"}
        assert onboarding_tour._get_text(mapping, "xx") == "Hello"

    def test_get_step_returns_localized(self):
        """_get_step returns step content for given language."""
        step = onboarding_tour._get_step(1, "en")
        assert "title" in step
        assert "body" in step
        assert "example" in step

    def test_get_step_falls_back_to_english(self):
        """_get_step falls back to English for unknown language."""
        step = onboarding_tour._get_step(1, "xx")
        assert step.get("title") == "PLAN/ACT/EVAL Workflow"

    def test_get_step_invalid_number(self):
        """_get_step returns empty dict for invalid step number."""
        step = onboarding_tour._get_step(99, "en")
        assert step == {}


if __name__ == "__main__":
    import pytest
    pytest.main([__file__, "-v"])
