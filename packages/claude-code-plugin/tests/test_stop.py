"""Tests for hooks/stop.py — Stop hook with notification wiring (#829)."""
import importlib
import importlib.util
import json
import os
import sys
import io
from unittest.mock import patch, MagicMock
import pytest

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
