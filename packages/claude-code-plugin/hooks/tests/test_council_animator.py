"""Tests for council_animator module (#1441)."""
import io
import os
import sys

import pytest

# Add lib to path
_hooks_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_lib_dir = os.path.join(_hooks_dir, "lib")
if _lib_dir not in sys.path:
    sys.path.insert(0, _lib_dir)

from council_animator import (
    animate_council_assembly,
    _build_lines,
    _should_animate,
    _animate_to_stderr,
    ANIMATION_ENV,
    MAX_TOTAL_TIME,
)


@pytest.fixture(autouse=True)
def cleanup_animation_env():
    """Save and restore ANIMATION_ENV for all tests."""
    original = os.environ.get(ANIMATION_ENV)
    yield
    if original is not None:
        os.environ[ANIMATION_ENV] = original
    elif ANIMATION_ENV in os.environ:
        del os.environ[ANIMATION_ENV]


class TestBuildLines:
    def test_includes_buddy_face(self):
        lines = _build_lines("planner", ["security"], "Let's go.")
        assert any("\u25d5\u203f\u25d5" in line for line in lines)

    def test_includes_primary_agent(self):
        lines = _build_lines("technical-planner", ["security"], "Go.")
        assert any("technical-planner" in line and "[primary]" in line for line in lines)

    def test_includes_specialists(self):
        lines = _build_lines("planner", ["security-specialist", "performance-specialist"], "Go.")
        specialist_lines = [l for l in lines if "[specialist]" in l]
        assert len(specialist_lines) == 2
        assert any("security-specialist" in l for l in specialist_lines)
        assert any("performance-specialist" in l for l in specialist_lines)

    def test_ends_with_assembled_line(self):
        lines = _build_lines("planner", ["security"], "Go.")
        assert "Council assembled" in lines[-1]

    def test_moderator_copy_in_first_line(self):
        lines = _build_lines("planner", [], "Time for a checkup.")
        assert "Time for a checkup." in lines[0]

    def test_empty_specialists(self):
        lines = _build_lines("planner", [], "Go.")
        assert len(lines) == 3  # buddy, primary, assembled


class TestShouldAnimate:
    def test_disabled_with_env_0(self):
        os.environ[ANIMATION_ENV] = "0"
        assert _should_animate() is False

    def test_disabled_with_env_false(self):
        os.environ[ANIMATION_ENV] = "false"
        assert _should_animate() is False

    def test_disabled_with_env_off(self):
        os.environ[ANIMATION_ENV] = "off"
        assert _should_animate() is False

    def test_enabled_with_env_1(self):
        os.environ[ANIMATION_ENV] = "1"
        assert _should_animate() is True

    def test_enabled_with_env_true(self):
        os.environ[ANIMATION_ENV] = "true"
        assert _should_animate() is True

    def test_enabled_with_env_on(self):
        os.environ[ANIMATION_ENV] = "on"
        assert _should_animate() is True

    def test_default_depends_on_tty(self):
        if ANIMATION_ENV in os.environ:
            del os.environ[ANIMATION_ENV]
        result = _should_animate()
        expected = hasattr(sys.stderr, "isatty") and sys.stderr.isatty()
        assert result == expected


class TestAnimateToStderr:
    def test_writes_all_characters(self):
        """Animated path writes each character to stderr."""
        buf = io.StringIO()
        original = sys.stderr
        sys.stderr = buf
        try:
            _animate_to_stderr(["hello", "world"], agent_delay=0, char_speed=0)
        finally:
            sys.stderr = original
        output = buf.getvalue()
        assert "hello" in output
        assert "world" in output

    def test_includes_newlines(self):
        buf = io.StringIO()
        original = sys.stderr
        sys.stderr = buf
        try:
            _animate_to_stderr(["line1", "line2"], agent_delay=0, char_speed=0)
        finally:
            sys.stderr = original
        assert buf.getvalue().count("\n") == 2

    def test_single_line(self):
        buf = io.StringIO()
        original = sys.stderr
        sys.stderr = buf
        try:
            _animate_to_stderr(["only line"], agent_delay=0, char_speed=0)
        finally:
            sys.stderr = original
        assert "only line" in buf.getvalue()


class TestAnimateCouncilAssembly:
    def test_returns_full_text(self):
        os.environ[ANIMATION_ENV] = "0"
        result = animate_council_assembly(
            "technical-planner",
            ["security-specialist", "performance-specialist"],
            "Let's map it out.",
            agent_delay=0,
            char_speed=0,
        )
        assert "technical-planner" in result
        assert "security-specialist" in result
        assert "performance-specialist" in result
        assert "Let's map it out." in result
        assert "Council assembled" in result

    def test_static_mode_writes_to_stderr(self, capsys):
        os.environ[ANIMATION_ENV] = "0"
        animate_council_assembly(
            "planner", ["security"], "Go.",
            agent_delay=0, char_speed=0,
        )
        captured = capsys.readouterr()
        assert captured.out == ""  # Nothing to stdout

    def test_animated_mode_writes_to_stderr(self):
        os.environ[ANIMATION_ENV] = "1"
        buf = io.StringIO()
        original = sys.stderr
        sys.stderr = buf
        try:
            result = animate_council_assembly(
                "planner", ["security"], "Go.",
                agent_delay=0, char_speed=0,
            )
        finally:
            sys.stderr = original
        output = buf.getvalue()
        assert "planner" in output
        assert "security" in output
        assert "planner" in result

    def test_handles_empty_specialists(self):
        os.environ[ANIMATION_ENV] = "0"
        result = animate_council_assembly("planner", [], "Go.", agent_delay=0, char_speed=0)
        assert "planner" in result
        assert "Council assembled" in result

    def test_time_cap_reduces_speed(self):
        """When estimated time exceeds MAX_TOTAL_TIME, speeds are reduced."""
        os.environ[ANIMATION_ENV] = "1"
        # 10 specialists with high delays would exceed cap
        specialists = [f"specialist-{i}" for i in range(10)]
        buf = io.StringIO()
        original = sys.stderr
        sys.stderr = buf
        try:
            # Use high delays that would normally take >10s
            result = animate_council_assembly(
                "planner", specialists, "Go.",
                agent_delay=1.0, char_speed=0.1,
            )
        finally:
            sys.stderr = original
        # Should still produce full output (time cap just reduces speed)
        assert "planner" in result
        for i in range(10):
            assert f"specialist-{i}" in result
