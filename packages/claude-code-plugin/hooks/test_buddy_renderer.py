#!/usr/bin/env python3
"""Unit tests for buddy_renderer.py

Run with: python3 -m pytest test_buddy_renderer.py -v
"""
import sys
from pathlib import Path

# Add lib to path
sys.path.insert(0, str(Path(__file__).parent / "lib"))

from buddy_renderer import (
    render_buddy_face,
    render_scan_results,
    render_recommendations,
    render_session_start,
    GREETINGS,
    ANSI_COLORS,
)


class TestRenderBuddyFace:
    """Tests for render_buddy_face function."""

    def test_casual_en_greeting(self):
        result = render_buddy_face("casual", "en")
        assert "Hey!" in result
        assert "\u25d5\u203f\u25d5" in result  # ◕‿◕

    def test_formal_en_greeting(self):
        result = render_buddy_face("formal", "en")
        assert "Scanning" in result
        assert "\u25d5\u203f\u25d5" in result

    def test_casual_ko_greeting(self):
        result = render_buddy_face("casual", "ko")
        assert "\uc548\ub155" in result  # 안녕

    def test_formal_ko_greeting(self):
        result = render_buddy_face("formal", "ko")
        assert "\ud504\ub85c\uc81d\ud2b8" in result or "\uc2a4\uce94" in result  # 프로젝트 or 스캔

    def test_unknown_tone_defaults_casual(self):
        result = render_buddy_face("unknown", "en")
        assert "Hey!" in result

    def test_unknown_language_defaults_en(self):
        result = render_buddy_face("casual", "fr")
        assert "Hey!" in result

    def test_face_contains_box(self):
        result = render_buddy_face("casual", "en")
        assert "\u256d" in result or "\u2501" in result  # ╭ or ━


class TestRenderScanResults:
    """Tests for render_scan_results function."""

    def test_renders_project_name(self):
        scan = {"name": "my-app", "version": "1.0.0"}
        result = render_scan_results(scan)
        assert "my-app" in result

    def test_renders_framework(self):
        scan = {"name": "app", "framework": "Next.js 15"}
        result = render_scan_results(scan)
        assert "Next.js 15" in result

    def test_renders_file_count(self):
        scan = {"name": "app", "file_count": 42}
        result = render_scan_results(scan)
        assert "42" in result

    def test_renders_coverage(self):
        scan = {"name": "app", "coverage": 67}
        result = render_scan_results(scan)
        assert "67%" in result

    def test_renders_api_endpoints(self):
        scan = {"name": "app", "api_endpoints": 3}
        result = render_scan_results(scan)
        assert "3" in result

    def test_omits_missing_fields(self):
        scan = {"name": "app"}
        result = render_scan_results(scan)
        assert "app" in result
        # Should not crash or show None
        assert "None" not in result

    def test_empty_scan(self):
        result = render_scan_results({})
        assert "unknown" in result.lower() or result.strip() != ""

    def test_renders_typescript_indicator(self):
        scan = {"name": "app", "framework": "React + TypeScript"}
        result = render_scan_results(scan)
        assert "TypeScript" in result


class TestRenderRecommendations:
    """Tests for render_recommendations function."""

    def test_renders_agent_name(self):
        recs = [
            {
                "agent": "Frontend Developer",
                "message": "3 Server Component opportunities",
                "eye": "\u2605",
                "colorAnsi": "yellow",
            }
        ]
        result = render_recommendations(recs)
        assert "Frontend" in result

    def test_renders_agent_message(self):
        recs = [
            {
                "agent": "Test Engineer",
                "message": "Coverage 80% possible",
                "eye": "\u25c9",
                "colorAnsi": "green",
            }
        ]
        result = render_recommendations(recs)
        assert "Coverage 80% possible" in result

    def test_renders_agent_eye(self):
        recs = [
            {
                "agent": "Security",
                "message": "1 issue",
                "eye": "\u25ee",
                "colorAnsi": "red",
            }
        ]
        result = render_recommendations(recs)
        assert "\u25ee" in result  # ◮

    def test_renders_multiple_recommendations(self):
        recs = [
            {"agent": "Frontend", "message": "msg1", "eye": "\u2605", "colorAnsi": "yellow"},
            {"agent": "Test Eng.", "message": "msg2", "eye": "\u25c9", "colorAnsi": "green"},
        ]
        result = render_recommendations(recs)
        assert "Frontend" in result
        assert "Test Eng." in result

    def test_empty_recommendations(self):
        result = render_recommendations([])
        assert result == ""

    def test_uses_ansi_color(self):
        recs = [
            {"agent": "Security", "message": "test", "eye": "X", "colorAnsi": "red"}
        ]
        result = render_recommendations(recs)
        assert ANSI_COLORS["red"] in result


class TestRenderSessionStart:
    """Tests for render_session_start - full output assembly."""

    def test_includes_all_sections(self):
        scan = {"name": "my-app", "framework": "Next.js 15", "file_count": 42}
        recs = [
            {"agent": "Frontend", "message": "check RSC", "eye": "\u2605", "colorAnsi": "yellow"}
        ]
        result = render_session_start(scan, recs, "casual", "en")
        assert "my-app" in result
        assert "Next.js 15" in result
        assert "Frontend" in result
        assert "\u25d5\u203f\u25d5" in result

    def test_no_recommendations_still_renders(self):
        scan = {"name": "app"}
        result = render_session_start(scan, [], "casual", "en")
        assert "app" in result
        # No recommendations section
        assert "Buddy Recommendations" not in result or "Recommendations" not in result

    def test_formal_tone(self):
        scan = {"name": "app"}
        recs = [{"agent": "Test", "message": "m", "eye": "O", "colorAnsi": "green"}]
        result = render_session_start(scan, recs, "formal", "en")
        assert "Scanning" in result or "Project" in result


if __name__ == "__main__":
    import pytest
    pytest.main([__file__, "-v"])
