"""Tests for hooks/stop.py — Stop hook with notification wiring (#829)."""
import importlib
import importlib.util
import json
import os
import sys
import io
from unittest.mock import patch, MagicMock
import pytest
from buddy_renderer import display_width

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "hooks", "lib"))

_HOOK_PATH = os.path.join(
    os.path.dirname(__file__), "..", "hooks", "stop.py"
)


def _load_module():
    """Load stop.py as a module."""
    for mod_name in list(sys.modules.keys()):
        if "stop_hook" in mod_name:
            del sys.modules[mod_name]

    spec = importlib.util.spec_from_file_location("stop_hook", _HOOK_PATH)
    mod = importlib.util.module_from_spec(spec)
    sys.modules["stop_hook"] = mod
    spec.loader.exec_module(mod)
    return mod


def _run_hook(input_data, monkeypatch, capsys):
    """Run stop hook and return parsed output or None."""
    monkeypatch.setattr("sys.stdin", io.StringIO(json.dumps(input_data)))
    mod = _load_module()

    with pytest.raises(SystemExit) as exc_info:
        mod.handle_stop()
    assert exc_info.value.code == 0

    out = capsys.readouterr().out
    return json.loads(out) if out.strip() else None


class TestStopHook:
    """Tests for the Stop hook basic behavior."""

    def test_exits_zero_always(self, monkeypatch):
        """Should always exit(0) to never block Claude Code."""
        monkeypatch.setattr("sys.stdin", io.StringIO("{}"))
        mod = _load_module()

        with pytest.raises(SystemExit) as exc_info:
            mod.handle_stop()
        assert exc_info.value.code == 0

    def test_exits_zero_on_empty_stdin(self, monkeypatch):
        """Should handle empty stdin gracefully."""
        monkeypatch.setattr("sys.stdin", io.StringIO(""))
        mod = _load_module()

        with pytest.raises(SystemExit) as exc_info:
            mod.handle_stop()
        assert exc_info.value.code == 0


class TestSessionEndNotification:
    """Tests for session end notification wiring (#829)."""

    @patch("notifications.notify")
    @patch("config.get_config")
    @patch("stats.SessionStats")
    def test_notifies_on_session_end(self, mock_stats_cls, mock_config, mock_notify, monkeypatch, capsys):
        """Should send notification with session summary."""
        mock_stats = MagicMock()
        mock_stats.format_summary.return_value = "Session: 5 tools, 2 files"
        mock_stats_cls.return_value = mock_stats
        mock_config.return_value = {
            "notifications": {
                "events": {"session_end": True},
                "platforms": ["slack"],
            }
        }
        mock_notify.return_value = {"slack": True}

        monkeypatch.setenv("CLAUDE_SESSION_ID", "test-session")
        result = _run_hook({"stop_hook_active": True}, monkeypatch, capsys)

        mock_notify.assert_called_once()
        event = mock_notify.call_args[0][0]
        assert event.event_type == "session_end"
        assert "5 tools" in event.message

    @patch("notifications.notify")
    @patch("config.get_config")
    @patch("stats.SessionStats")
    def test_no_notification_when_no_summary(self, mock_stats_cls, mock_config, mock_notify, monkeypatch, capsys):
        """Should not notify when there's no session summary."""
        mock_stats = MagicMock()
        mock_stats.format_summary.return_value = ""
        mock_stats_cls.return_value = mock_stats

        monkeypatch.setenv("CLAUDE_SESSION_ID", "test-session")
        _run_hook({"stop_hook_active": True}, monkeypatch, capsys)

        mock_notify.assert_not_called()


class TestStopFlush:
    """Tests for pending stats flush and DB singleton close at stop (#931)."""

    @patch("history_db.HistoryDB")
    @patch("stats.SessionStats")
    def test_stop_flushes_pending_stats(self, mock_stats_cls, mock_db_cls, monkeypatch, capsys):
        """Stop hook should call flush() on SessionStats before finalize."""
        mock_stats = MagicMock()
        mock_stats.format_summary.return_value = "Session: 5 tools"
        mock_stats_cls.return_value = mock_stats

        monkeypatch.setenv("CLAUDE_SESSION_ID", "test-session")
        _run_hook({"stop_hook_active": True}, monkeypatch, capsys)

        mock_stats.flush.assert_called()

    @patch("history_db.HistoryDB")
    @patch("stats.SessionStats")
    def test_stop_closes_db_singleton(self, mock_stats_cls, mock_db_cls, monkeypatch, capsys):
        """Stop hook should call HistoryDB.close_instance() at the end."""
        mock_stats = MagicMock()
        mock_stats.format_summary.return_value = "Session: 3 tools"
        mock_stats_cls.return_value = mock_stats

        monkeypatch.setenv("CLAUDE_SESSION_ID", "test-session")
        _run_hook({"stop_hook_active": True}, monkeypatch, capsys)

        mock_db_cls.close_instance.assert_called()


class TestAutoLearningSuggestions:
    """Tests for auto-learning pattern detection wiring (#929)."""

    @patch("rule_suggester.RuleSuggester")
    @patch("pattern_detector.PatternDetector")
    @patch("history_db.HistoryDB")
    @patch("stats.SessionStats")
    def test_suggestions_included_in_summary(
        self, mock_stats_cls, mock_db_cls, mock_detector_cls, mock_suggester_cls,
        monkeypatch, capsys,
    ):
        """Should include auto-learning suggestions in systemMessage."""
        mock_stats = MagicMock()
        mock_stats.format_summary.return_value = "Session: 5 tools"
        mock_stats_cls.return_value = mock_stats

        mock_db = MagicMock()
        mock_db_cls.return_value = mock_db

        mock_detector = MagicMock()
        mock_detector.detect_patterns.return_value = [
            {"tool_name": "Bash", "input_summary": "rm -rf", "failure_count": 5, "session_count": 3}
        ]
        mock_detector_cls.return_value = mock_detector

        mock_suggester = MagicMock()
        mock_suggester.suggest_rules.return_value = [
            {"title": "Repeated Bash failure: rm -rf", "description": "Failed 5 times"}
        ]
        mock_suggester_cls.return_value = mock_suggester

        monkeypatch.setenv("CLAUDE_SESSION_ID", "test-session")
        result = _run_hook({"stop_hook_active": True}, monkeypatch, capsys)

        assert result is not None
        msg = result["systemMessage"]
        assert "Auto-Learning Suggestions" in msg
        assert "Repeated Bash failure: rm -rf" in msg
        mock_detector.detect_patterns.assert_called_once()
        mock_suggester.suggest_rules.assert_called_once()

    @patch("rule_suggester.RuleSuggester")
    @patch("pattern_detector.PatternDetector")
    @patch("history_db.HistoryDB")
    @patch("stats.SessionStats")
    def test_no_suggestions_when_no_patterns(
        self, mock_stats_cls, mock_db_cls, mock_detector_cls, mock_suggester_cls,
        monkeypatch, capsys,
    ):
        """Should not add suggestions section when no patterns detected."""
        mock_stats = MagicMock()
        mock_stats.format_summary.return_value = "Session: 3 tools"
        mock_stats_cls.return_value = mock_stats

        mock_db = MagicMock()
        mock_db_cls.return_value = mock_db

        mock_detector = MagicMock()
        mock_detector.detect_patterns.return_value = []
        mock_detector_cls.return_value = mock_detector

        monkeypatch.setenv("CLAUDE_SESSION_ID", "test-session")
        result = _run_hook({"stop_hook_active": True}, monkeypatch, capsys)

        assert result is not None
        assert "Auto-Learning" not in result["systemMessage"]
        mock_suggester_cls.assert_not_called()

    @patch("pattern_detector.PatternDetector")
    @patch("history_db.HistoryDB")
    @patch("stats.SessionStats")
    def test_analysis_failure_does_not_block_stop(
        self, mock_stats_cls, mock_db_cls, mock_detector_cls,
        monkeypatch, capsys,
    ):
        """Should never block session stop even if pattern analysis fails."""
        mock_stats = MagicMock()
        mock_stats.format_summary.return_value = "Session: 2 tools"
        mock_stats_cls.return_value = mock_stats

        mock_db = MagicMock()
        mock_db_cls.return_value = mock_db

        mock_detector_cls.side_effect = RuntimeError("DB corrupted")

        monkeypatch.setenv("CLAUDE_SESSION_ID", "test-session")
        result = _run_hook({"stop_hook_active": True}, monkeypatch, capsys)

        # Hook should still return summary without suggestions
        assert result is not None
        assert "Session: 2 tools" in result["systemMessage"]
        assert "Auto-Learning" not in result["systemMessage"]


class TestSessionSummaryRendering:
    """Tests for buddy session summary rendering in stop hook (#972)."""

    @patch("buddy_renderer.render_session_summary")
    @patch("config.get_config")
    @patch("history_db.HistoryDB")
    @patch("stats.SessionStats")
    def test_renders_session_summary_to_stderr(
        self, mock_stats_cls, mock_db_cls, mock_config, mock_render,
        monkeypatch, capsys,
    ):
        """Should render buddy session summary to stderr."""
        mock_stats = MagicMock()
        mock_stats.format_summary.return_value = "Session: 10 tools"
        mock_stats.finalize.return_value = {
            "duration_seconds": 600,
            "tool_count": 10,
            "tool_names": {"Edit": 3, "Read": 5, "Write": 2},
        }
        mock_stats_cls.return_value = mock_stats
        mock_config.return_value = {"tone": "casual", "language": "en"}
        mock_render.return_value = "BUDDY SUMMARY OUTPUT"

        monkeypatch.setenv("CLAUDE_SESSION_ID", "test-session")
        _run_hook({"stop_hook_active": True}, monkeypatch, capsys)

        mock_render.assert_called_once()
        call_args = mock_render.call_args
        stats_arg = call_args[0][0]
        assert stats_arg["duration_minutes"] == 10
        assert stats_arg["tool_count"] == 10
        assert stats_arg["files_changed"] == 5  # Edit:3 + Write:2
        assert call_args[0][2] == "casual"
        assert call_args[0][3] == "en"


class TestImpactReportRendering:
    """Tests for display-width-safe impact report rendering."""

    def test_impact_report_box_aligns_with_wide_text(self, tmp_path):
        mod = _load_module()
        impact_dir = tmp_path / "docs" / "codingbuddy"
        impact_dir.mkdir(parents=True)

        events = [
            {"sessionId": "session-1", "eventType": "issue_prevented", "data": {"count": 2, "domain": "\ubcf4\uc548"}},
            {"sessionId": "session-1", "eventType": "agent_dispatched", "data": {}},
            {"sessionId": "session-1", "eventType": "checklist_generated", "data": {"domain": "\uc811\uadfc\uc131"}},
            {"sessionId": "session-1", "eventType": "mode_activated", "data": {"mode": "PLAN"}},
            {"sessionId": "session-1", "eventType": "mode_activated", "data": {"mode": "ACT"}},
        ]
        with open(impact_dir / "impact-events.jsonl", "w", encoding="utf-8") as f:
            for event in events:
                f.write(json.dumps(event, ensure_ascii=False) + "\n")

        result = mod._render_impact_report("session-1", str(tmp_path))
        assert result
        widths = {display_width(line) for line in result.splitlines() if line}
        assert len(widths) == 1

    @patch("buddy_renderer.render_session_summary")
    @patch("config.get_config")
    @patch("history_db.HistoryDB")
    @patch("stats.SessionStats")
    def test_passes_active_agent(
        self, mock_stats_cls, mock_db_cls, mock_config, mock_render,
        monkeypatch, capsys,
    ):
        """Should include active agent from env var."""
        mock_stats = MagicMock()
        mock_stats.format_summary.return_value = "Session: 5 tools"
        mock_stats.finalize.return_value = {
            "duration_seconds": 300,
            "tool_count": 5,
            "tool_names": {},
        }
        mock_stats_cls.return_value = mock_stats
        mock_config.return_value = {"tone": "casual", "language": "en"}
        mock_render.return_value = "output"

        monkeypatch.setenv("CLAUDE_SESSION_ID", "test-session")
        monkeypatch.setenv("CODINGBUDDY_ACTIVE_AGENT", "Backend Developer")
        _run_hook({"stop_hook_active": True}, monkeypatch, capsys)

        call_args = mock_render.call_args
        agents_arg = call_args[0][1]
        assert len(agents_arg) == 1
        assert agents_arg[0]["name"] == "Backend Developer"

    @patch("buddy_renderer.render_session_summary")
    @patch("config.get_config")
    @patch("history_db.HistoryDB")
    @patch("stats.SessionStats")
    def test_no_agent_when_env_not_set(
        self, mock_stats_cls, mock_db_cls, mock_config, mock_render,
        monkeypatch, capsys,
    ):
        """Should pass empty agents list when no active agent."""
        mock_stats = MagicMock()
        mock_stats.format_summary.return_value = "Session: 3 tools"
        mock_stats.finalize.return_value = {
            "duration_seconds": 120,
            "tool_count": 3,
            "tool_names": {},
        }
        mock_stats_cls.return_value = mock_stats
        mock_config.return_value = {"tone": "formal", "language": "ko"}
        mock_render.return_value = "output"

        monkeypatch.setenv("CLAUDE_SESSION_ID", "test-session")
        monkeypatch.delenv("CODINGBUDDY_ACTIVE_AGENT", raising=False)
        _run_hook({"stop_hook_active": True}, monkeypatch, capsys)

        call_args = mock_render.call_args
        agents_arg = call_args[0][1]
        assert agents_arg == []
        assert call_args[0][2] == "formal"
        assert call_args[0][3] == "ko"

    @patch("buddy_renderer.render_session_summary", side_effect=RuntimeError("render failed"))
    @patch("config.get_config")
    @patch("history_db.HistoryDB")
    @patch("stats.SessionStats")
    def test_render_failure_does_not_block_stop(
        self, mock_stats_cls, mock_db_cls, mock_config, mock_render,
        monkeypatch, capsys,
    ):
        """Should never block session stop even if rendering fails."""
        mock_stats = MagicMock()
        mock_stats.format_summary.return_value = "Session: 2 tools"
        mock_stats.finalize.return_value = {
            "duration_seconds": 60,
            "tool_count": 2,
            "tool_names": {},
        }
        mock_stats_cls.return_value = mock_stats
        mock_config.return_value = {}

        monkeypatch.setenv("CLAUDE_SESSION_ID", "test-session")
        result = _run_hook({"stop_hook_active": True}, monkeypatch, capsys)

        # systemMessage should still be returned
        assert result is not None
        assert "Session: 2 tools" in result["systemMessage"]
