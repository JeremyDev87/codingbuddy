"""Tests for one-line session summary feature (#1036).

Tests generate_one_line_summary() and its integration in render_session_summary().
"""
import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "hooks", "lib"))

from buddy_renderer import generate_one_line_summary, render_session_summary


class TestGenerateOneLineSummary:
    """Tests for generate_one_line_summary() function."""

    def test_files_and_commands(self):
        """Should generate summary with files modified and commands run."""
        tool_names = {"Edit": 5, "Write": 2, "Bash": 10, "Read": 20}
        result = generate_one_line_summary(tool_names, "", "en")
        assert "7 files modified" in result
        assert "10 commands" in result

    def test_files_only(self):
        """Should generate summary with only file modifications."""
        tool_names = {"Edit": 3, "Read": 10}
        result = generate_one_line_summary(tool_names, "", "en")
        assert "3 files modified" in result
        assert "command" not in result

    def test_commands_only(self):
        """Should generate summary with only commands run."""
        tool_names = {"Bash": 8, "Read": 5}
        result = generate_one_line_summary(tool_names, "", "en")
        assert "8 commands" in result
        assert "file" not in result.lower() or "modified" not in result

    def test_exploration_only(self):
        """Should generate exploration summary when only reads/greps."""
        tool_names = {"Read": 15, "Grep": 8, "Glob": 3}
        result = generate_one_line_summary(tool_names, "", "en")
        assert result  # Should produce something, not empty

    def test_empty_tool_names(self):
        """Should handle empty tool_names gracefully."""
        result = generate_one_line_summary({}, "", "en")
        assert result  # Should still return something

    def test_with_agent_name(self):
        """Should include agent name in summary."""
        tool_names = {"Edit": 4, "Bash": 6}
        result = generate_one_line_summary(tool_names, "Frontend Developer", "en")
        assert "Frontend Developer" in result

    def test_korean_language(self):
        """Should generate Korean summary."""
        tool_names = {"Edit": 3, "Write": 1, "Bash": 5}
        result = generate_one_line_summary(tool_names, "", "ko")
        assert "수정" in result or "파일" in result

    def test_japanese_language(self):
        """Should generate Japanese summary."""
        tool_names = {"Edit": 2, "Bash": 3}
        result = generate_one_line_summary(tool_names, "", "ja")
        assert result
        # Should not be English fallback tokens only
        assert any(ord(c) > 127 for c in result)

    def test_chinese_language(self):
        """Should generate Chinese summary."""
        tool_names = {"Edit": 2, "Bash": 3}
        result = generate_one_line_summary(tool_names, "", "zh")
        assert result
        assert any(ord(c) > 127 for c in result)

    def test_spanish_language(self):
        """Should generate Spanish summary."""
        tool_names = {"Edit": 2, "Bash": 3}
        result = generate_one_line_summary(tool_names, "", "es")
        assert result

    def test_unknown_language_falls_back_to_english(self):
        """Should fall back to English for unknown language codes."""
        tool_names = {"Edit": 5, "Bash": 3}
        result = generate_one_line_summary(tool_names, "", "xx")
        en_result = generate_one_line_summary(tool_names, "", "en")
        assert result == en_result

    def test_single_file_singular(self):
        """Should use singular form for 1 file."""
        tool_names = {"Edit": 1}
        result = generate_one_line_summary(tool_names, "", "en")
        assert "1 file modified" in result
        assert "files" not in result

    def test_agent_with_korean(self):
        """Should include agent name with Korean summary."""
        tool_names = {"Edit": 3, "Bash": 5}
        result = generate_one_line_summary(tool_names, "Backend Developer", "ko")
        assert "Backend Developer" in result
        assert ("수정" in result or "파일" in result)


class TestRenderSessionSummaryWithOneLine:
    """Tests for one-line summary integration in render_session_summary()."""

    def test_includes_one_line_summary(self):
        """Should include one-line summary in rendered output."""
        stats = {"duration_minutes": 10, "tool_count": 20, "files_changed": 5}
        tool_names = {"Edit": 3, "Write": 2, "Bash": 10}
        agents = []
        result = render_session_summary(
            stats, agents, "casual", "en", tool_names=tool_names,
        )
        assert "5 files modified" in result or "files modified" in result

    def test_no_summary_without_tool_names(self):
        """Should still work without tool_names (backward compatible)."""
        stats = {"duration_minutes": 5, "tool_count": 10, "files_changed": 3}
        agents = []
        result = render_session_summary(stats, agents, "casual", "en")
        # Should render without error, just no one-line summary
        assert "Session Summary" in result or "세션 요약" in result or result

    def test_summary_with_agent_in_output(self):
        """Should include agent context in one-line summary."""
        stats = {"duration_minutes": 10, "tool_count": 15, "files_changed": 4}
        tool_names = {"Edit": 4, "Bash": 8}
        agents = [{"name": "Test Engineer", "eye": "●", "colorAnsi": "green"}]
        result = render_session_summary(
            stats, agents, "casual", "en", tool_names=tool_names,
        )
        # The one-line summary should be present
        assert "files modified" in result or "commands" in result

    def test_korean_session_summary(self):
        """Should render Korean one-line summary."""
        stats = {"duration_minutes": 5, "tool_count": 8, "files_changed": 2}
        tool_names = {"Edit": 2, "Bash": 4}
        agents = []
        result = render_session_summary(
            stats, agents, "casual", "ko", tool_names=tool_names,
        )
        assert ("수정" in result or "파일" in result)
