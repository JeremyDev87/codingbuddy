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
    render_session_summary,
    render_returning_session,
    get_buddy_config,
    type_text,
    GREETINGS,
    FAREWELL_GREETINGS,
    FAREWELL_MESSAGES,
    ANSI_COLORS,
    BUDDY_FACE,
    BUDDY_WRAP_FACE,
    BUDDY_WINK_FACE,
    DEFAULT_BUDDY_CONFIG,
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


class TestRenderSessionSummary:
    """Tests for render_session_summary — stop hook buddy output (#972)."""

    def test_casual_en_farewell_greeting(self):
        stats = {"duration_minutes": 10, "tool_count": 5, "files_changed": 2}
        result = render_session_summary(stats, [], "casual", "en")
        assert "Great work today!" in result
        assert BUDDY_WRAP_FACE in result

    def test_formal_en_farewell_greeting(self):
        stats = {"duration_minutes": 10, "tool_count": 5, "files_changed": 2}
        result = render_session_summary(stats, [], "formal", "en")
        assert "Session complete." in result

    def test_casual_ko_farewell(self):
        stats = {"duration_minutes": 5, "tool_count": 3, "files_changed": 1}
        result = render_session_summary(stats, [], "casual", "ko")
        assert "\uc218\uace0" in result  # 수고
        assert "\ub9cc\ub098\uc694" in result  # 만나요

    def test_farewell_message_at_end(self):
        stats = {"duration_minutes": 10, "tool_count": 5, "files_changed": 2}
        result = render_session_summary(stats, [], "casual", "en")
        assert "See you next time!" in result
        assert BUDDY_FACE in result

    def test_renders_duration(self):
        stats = {"duration_minutes": 32, "tool_count": 0, "files_changed": 0}
        result = render_session_summary(stats, [], "casual", "en")
        assert "32min" in result

    def test_renders_tool_count(self):
        stats = {"duration_minutes": 0, "tool_count": 47, "files_changed": 0}
        result = render_session_summary(stats, [], "casual", "en")
        assert "47 tools" in result

    def test_renders_files_changed(self):
        stats = {"duration_minutes": 0, "tool_count": 0, "files_changed": 8}
        result = render_session_summary(stats, [], "casual", "en")
        assert "8 files changed" in result

    def test_renders_all_stats(self):
        stats = {"duration_minutes": 32, "tool_count": 47, "files_changed": 8}
        result = render_session_summary(stats, [], "casual", "en")
        assert "32min" in result
        assert "47 tools" in result
        assert "8 files changed" in result
        assert "Session Summary" in result

    def test_no_stats_graceful(self):
        """Should render farewell even with no stats data."""
        result = render_session_summary({}, [], "casual", "en")
        assert "Great work today!" in result
        assert "See you next time!" in result
        # No summary section header when no data
        assert "Session Summary" not in result

    def test_renders_agent(self):
        stats = {"duration_minutes": 10, "tool_count": 5, "files_changed": 2}
        agents = [
            {"name": "Backend Developer", "message": "JWT service", "eye": "\u25d0", "colorAnsi": "yellow"}
        ]
        result = render_session_summary(stats, agents, "casual", "en")
        assert "Backend Developer" in result
        assert "JWT service" in result
        assert "Active Agents" in result

    def test_renders_multiple_agents(self):
        stats = {"duration_minutes": 10, "tool_count": 5, "files_changed": 2}
        agents = [
            {"name": "Backend", "message": "JWT", "eye": "\u25d0", "colorAnsi": "yellow"},
            {"name": "Security", "message": "XSS verified", "eye": "\u25ee", "colorAnsi": "red"},
        ]
        result = render_session_summary(stats, agents, "casual", "en")
        assert "Backend" in result
        assert "Security" in result

    def test_agent_uses_ansi_color(self):
        stats = {}
        agents = [{"name": "Test", "message": "", "eye": "\u25cf", "colorAnsi": "green"}]
        result = render_session_summary(stats, agents, "casual", "en")
        assert ANSI_COLORS["green"] in result

    def test_agent_without_message(self):
        stats = {}
        agents = [{"name": "Agent", "eye": "\u25cf", "colorAnsi": "cyan"}]
        result = render_session_summary(stats, agents, "casual", "en")
        assert "Agent" in result

    def test_unknown_tone_defaults_casual(self):
        stats = {"duration_minutes": 5, "tool_count": 3, "files_changed": 1}
        result = render_session_summary(stats, [], "unknown", "en")
        assert "Great work today!" in result

    def test_unknown_language_defaults_en(self):
        stats = {"duration_minutes": 5, "tool_count": 3, "files_changed": 1}
        result = render_session_summary(stats, [], "casual", "fr")
        assert "Great work today!" in result

    def test_face_contains_box(self):
        result = render_session_summary({}, [], "casual", "en")
        assert "\u256d" in result  # ╭
        assert "\u2570" in result  # ╰

    def test_formal_farewell_message(self):
        result = render_session_summary({}, [], "formal", "en")
        assert "Session ended." in result

    def test_ko_summary_headers(self):
        stats = {"duration_minutes": 5, "tool_count": 3, "files_changed": 1}
        agents = [{"name": "Test", "eye": "\u25cf", "colorAnsi": "green"}]
        result = render_session_summary(stats, agents, "casual", "ko")
        assert "\uc138\uc158 \uc694\uc57d" in result  # 세션 요약
        assert "\ud65c\uc57d \uc5d0\uc774\uc804\ud2b8" in result  # 활약 에이전트


class TestGetBuddyConfig:
    """Tests for get_buddy_config — validation and defaults."""

    def test_returns_defaults_when_no_config(self):
        result = get_buddy_config(None)
        assert result == DEFAULT_BUDDY_CONFIG

    def test_returns_defaults_when_no_buddy_key(self):
        result = get_buddy_config({"language": "en"})
        assert result == DEFAULT_BUDDY_CONFIG

    def test_returns_defaults_when_buddy_not_dict(self):
        result = get_buddy_config({"buddy": "invalid"})
        assert result == DEFAULT_BUDDY_CONFIG

    def test_custom_name(self):
        config = {"buddy": {"name": "CodeBot"}}
        result = get_buddy_config(config)
        assert result["name"] == "CodeBot"
        assert result["face"] == BUDDY_FACE  # default

    def test_custom_face_unicode(self):
        config = {"buddy": {"face": "\u2606\u203f\u2606"}}
        result = get_buddy_config(config)
        assert result["face"] == "\u2606\u203f\u2606"

    def test_rejects_ascii_face(self):
        config = {"buddy": {"face": "abc"}}
        result = get_buddy_config(config)
        assert result["face"] == BUDDY_FACE  # falls back to default

    def test_rejects_empty_face(self):
        config = {"buddy": {"face": ""}}
        result = get_buddy_config(config)
        assert result["face"] == BUDDY_FACE

    def test_rejects_too_long_face(self):
        config = {"buddy": {"face": "\u2606" * 11}}
        result = get_buddy_config(config)
        assert result["face"] == BUDDY_FACE

    def test_custom_greeting(self):
        config = {"buddy": {"greeting": "Let's code!"}}
        result = get_buddy_config(config)
        assert result["greeting"] == "Let's code!"

    def test_custom_farewell(self):
        config = {"buddy": {"farewell": "Great session!"}}
        result = get_buddy_config(config)
        assert result["farewell"] == "Great session!"

    def test_rejects_empty_name(self):
        config = {"buddy": {"name": "   "}}
        result = get_buddy_config(config)
        assert result["name"] == "Buddy"

    def test_rejects_too_long_name(self):
        config = {"buddy": {"name": "x" * 31}}
        result = get_buddy_config(config)
        assert result["name"] == "Buddy"

    def test_rejects_too_long_greeting(self):
        config = {"buddy": {"greeting": "x" * 101}}
        result = get_buddy_config(config)
        assert result["greeting"] == ""

    def test_full_config(self):
        config = {"buddy": {
            "name": "Cody",
            "face": "\u2764\u203f\u2764",
            "greeting": "Hello world!",
            "farewell": "Bye bye!",
        }}
        result = get_buddy_config(config)
        assert result["name"] == "Cody"
        assert result["face"] == "\u2764\u203f\u2764"
        assert result["greeting"] == "Hello world!"
        assert result["farewell"] == "Bye bye!"

    def test_non_string_values_ignored(self):
        config = {"buddy": {"name": 123, "face": True, "greeting": []}}
        result = get_buddy_config(config)
        assert result == DEFAULT_BUDDY_CONFIG


class TestBuddyCustomFace:
    """Tests for custom buddy face in render functions."""

    def test_render_buddy_face_custom(self):
        bc = {"face": "\u2606\u203f\u2606", "greeting": "", "name": "Buddy", "farewell": ""}
        result = render_buddy_face("casual", "en", buddy_config=bc)
        assert "\u2606\u203f\u2606" in result
        assert "Hey!" in result  # default greeting since custom is empty

    def test_render_buddy_face_custom_greeting(self):
        bc = {"face": BUDDY_FACE, "greeting": "Yo!", "name": "B", "farewell": ""}
        result = render_buddy_face("casual", "en", buddy_config=bc)
        assert "Yo!" in result
        assert "Hey!" not in result

    def test_render_session_summary_custom_face(self):
        bc = {"face": "\u2605\u203f\u2605", "greeting": "", "name": "Bot", "farewell": ""}
        stats = {"duration_minutes": 5, "tool_count": 3, "files_changed": 1}
        result = render_session_summary(stats, [], "casual", "en", buddy_config=bc)
        assert "\u2605\u203f\u2605" in result

    def test_render_session_summary_custom_farewell(self):
        bc = {"face": BUDDY_FACE, "greeting": "", "name": "B", "farewell": "Ciao!"}
        stats = {"duration_minutes": 5, "tool_count": 3, "files_changed": 1}
        result = render_session_summary(stats, [], "casual", "en", buddy_config=bc)
        assert "Ciao!" in result
        assert "See you next time!" not in result

    def test_render_session_summary_default_farewell_without_config(self):
        stats = {"duration_minutes": 5, "tool_count": 3, "files_changed": 1}
        result = render_session_summary(stats, [], "casual", "en")
        assert "See you next time!" in result

    def test_render_returning_session_custom_face(self):
        bc = {"face": "\u2665\u203f\u2665", "greeting": "", "name": "B", "farewell": ""}
        prev = {"started_at": 1000, "ended_at": 2000, "tool_call_count": 5, "error_count": 0}
        result = render_returning_session(prev, None, "casual", "en", buddy_config=bc)
        assert "\u2665\u203f\u2665" in result

    def test_render_returning_session_custom_greeting(self):
        bc = {"face": BUDDY_FACE, "greeting": "Welcome back, friend!", "name": "B", "farewell": ""}
        prev = {"started_at": 1000, "ended_at": 2000, "tool_call_count": 5, "error_count": 0}
        result = render_returning_session(prev, None, "casual", "en", buddy_config=bc)
        assert "Welcome back, friend!" in result

    def test_render_session_start_passes_buddy_config(self):
        bc = {"face": "\u2606\u203f\u2606", "greeting": "Custom!", "name": "X", "farewell": ""}
        scan = {"name": "app"}
        result = render_session_start(scan, [], "casual", "en", buddy_config=bc)
        assert "\u2606\u203f\u2606" in result
        assert "Custom!" in result

    def test_render_session_start_returning_passes_buddy_config(self):
        bc = {"face": "\u2665\u203f\u2665", "greeting": "Hi again!", "name": "X", "farewell": ""}
        scan = {"name": "app"}
        prev = {"started_at": 1000, "ended_at": 2000, "tool_call_count": 5, "error_count": 0}
        result = render_session_start(
            scan, [], "casual", "en",
            previous_session=prev, buddy_config=bc,
        )
        assert "\u2665\u203f\u2665" in result
        assert "Hi again!" in result

    def test_no_buddy_config_keeps_defaults(self):
        result = render_buddy_face("casual", "en")
        assert BUDDY_FACE in result


class TestTypeText:
    """Tests for type_text — typing animation (#1033)."""

    def test_writes_all_chars_to_stderr(self, capsys, monkeypatch):
        """type_text writes every character to stderr."""
        monkeypatch.setattr("buddy_renderer.time.sleep", lambda _s: None)
        type_text("hello")
        captured = capsys.readouterr()
        assert captured.err == "hello"
        assert captured.out == ""

    def test_empty_string_writes_nothing(self, capsys, monkeypatch):
        monkeypatch.setattr("buddy_renderer.time.sleep", lambda _s: None)
        type_text("")
        captured = capsys.readouterr()
        assert captured.err == ""

    def test_unicode_text(self, capsys, monkeypatch):
        monkeypatch.setattr("buddy_renderer.time.sleep", lambda _s: None)
        type_text("\uc548\ub155!")
        captured = capsys.readouterr()
        assert captured.err == "\uc548\ub155!"

    def test_calls_sleep_per_char(self, monkeypatch):
        sleep_calls = []
        monkeypatch.setattr("buddy_renderer.time.sleep", lambda s: sleep_calls.append(s))
        type_text("abc", speed=0.05)
        assert len(sleep_calls) == 3
        assert all(s == 0.05 for s in sleep_calls)

    def test_default_speed(self, monkeypatch):
        sleep_calls = []
        monkeypatch.setattr("buddy_renderer.time.sleep", lambda s: sleep_calls.append(s))
        type_text("ab")
        assert all(s == 0.03 for s in sleep_calls)


class TestTypingMode:
    """Tests for render_session_start typing=True (#1033)."""

    def test_typing_returns_empty_string(self, monkeypatch):
        monkeypatch.setattr("buddy_renderer.time.sleep", lambda _s: None)
        scan = {"name": "app"}
        result = render_session_start(scan, [], "casual", "en", typing=True)
        assert result == ""

    def test_typing_false_returns_full_output(self):
        scan = {"name": "app"}
        result = render_session_start(scan, [], "casual", "en", typing=False)
        assert "app" in result
        assert BUDDY_FACE in result

    def test_typing_writes_to_stderr(self, capsys, monkeypatch):
        monkeypatch.setattr("buddy_renderer.time.sleep", lambda _s: None)
        scan = {"name": "app"}
        render_session_start(scan, [], "casual", "en", typing=True)
        captured = capsys.readouterr()
        assert BUDDY_FACE in captured.err
        assert "Hey!" in captured.err
        assert "app" in captured.err

    def test_typing_greeting_appears_in_stderr(self, capsys, monkeypatch):
        monkeypatch.setattr("buddy_renderer.time.sleep", lambda _s: None)
        scan = {"name": "app"}
        render_session_start(scan, [], "formal", "ko", typing=True)
        captured = capsys.readouterr()
        assert "\ud504\ub85c\uc81d\ud2b8" in captured.err

    def test_typing_with_returning_session(self, capsys, monkeypatch):
        monkeypatch.setattr("buddy_renderer.time.sleep", lambda _s: None)
        scan = {"name": "app"}
        prev = {"started_at": 1000, "ended_at": 2000, "tool_call_count": 5, "error_count": 0}
        result = render_session_start(
            scan, [], "casual", "en",
            previous_session=prev, typing=True,
        )
        assert result == ""
        captured = capsys.readouterr()
        assert "back" in captured.err.lower()

    def test_typing_with_custom_greeting(self, capsys, monkeypatch):
        monkeypatch.setattr("buddy_renderer.time.sleep", lambda _s: None)
        bc = {"face": BUDDY_FACE, "greeting": "Custom hello!", "name": "B", "farewell": ""}
        scan = {"name": "app"}
        render_session_start(scan, [], "casual", "en", buddy_config=bc, typing=True)
        captured = capsys.readouterr()
        assert "Custom hello!" in captured.err


if __name__ == "__main__":
    import pytest
    pytest.main([__file__, "-v"])
