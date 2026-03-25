"""Tests for hooks/post-tool-use.py — PostToolUse hook with notification wiring."""
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
    os.path.dirname(__file__), "..", "hooks", "post-tool-use.py"
)


def _load_module():
    """Load the hyphenated post-tool-use.py as a module."""
    for mod_name in list(sys.modules.keys()):
        if "post_tool_use" in mod_name:
            del sys.modules[mod_name]

    spec = importlib.util.spec_from_file_location("post_tool_use", _HOOK_PATH)
    mod = importlib.util.module_from_spec(spec)
    sys.modules["post_tool_use"] = mod
    spec.loader.exec_module(mod)
    return mod


def _run_hook(input_data, monkeypatch, capsys):
    """Run post-tool-use hook and return parsed output or None."""
    monkeypatch.setattr("sys.stdin", io.StringIO(json.dumps(input_data)))
    ptu = _load_module()

    with pytest.raises(SystemExit) as exc_info:
        ptu.handle_post_tool_use()
    assert exc_info.value.code == 0

    out = capsys.readouterr().out
    return json.loads(out) if out.strip() else None


class TestPostToolUseSkeleton:
    """Tests for the PostToolUse skeleton hook."""

    def test_returns_none_for_any_tool(self, monkeypatch, capsys):
        """Skeleton should return None (no output) for any tool."""
        result = _run_hook(
            {"tool_name": "Bash", "tool_input": {"command": "ls"}},
            monkeypatch, capsys,
        )
        assert result is None

    def test_returns_none_for_read_tool(self, monkeypatch, capsys):
        """Skeleton should return None for Read tool."""
        result = _run_hook(
            {"tool_name": "Read", "tool_input": {"file_path": "/foo"}},
            monkeypatch, capsys,
        )
        assert result is None

    def test_exits_zero_always(self, monkeypatch):
        """Should always exit(0) to never block Claude Code."""
        monkeypatch.setattr("sys.stdin", io.StringIO("{}"))
        ptu = _load_module()

        with pytest.raises(SystemExit) as exc_info:
            ptu.handle_post_tool_use()
        assert exc_info.value.code == 0

    def test_exits_zero_on_empty_stdin(self, monkeypatch):
        """Should handle empty stdin gracefully."""
        monkeypatch.setattr("sys.stdin", io.StringIO(""))
        ptu = _load_module()

        with pytest.raises(SystemExit) as exc_info:
            ptu.handle_post_tool_use()
        assert exc_info.value.code == 0


class TestPrCreatedNotification:
    """Tests for PR creation detection and notification (#829)."""

    @patch("notifications.notify")
    @patch("config.get_config")
    def test_detects_gh_pr_create(self, mock_config, mock_notify, monkeypatch, capsys):
        """Should call notify when gh pr create is detected."""
        mock_config.return_value = {
            "notifications": {
                "events": {"pr_created": True},
                "platforms": ["slack"],
            }
        }
        mock_notify.return_value = {"slack": True}

        result = _run_hook(
            {
                "tool_name": "Bash",
                "tool_input": {"command": 'gh pr create --title "test" --body "body"'},
                "tool_output": "https://github.com/org/repo/pull/42\n",
            },
            monkeypatch, capsys,
        )
        assert result is None
        mock_notify.assert_called_once()
        event = mock_notify.call_args[0][0]
        assert event.event_type == "pr_created"
        assert event.url == "https://github.com/org/repo/pull/42"

    @patch("notifications.notify")
    @patch("config.get_config")
    def test_ignores_non_pr_commands(self, mock_config, mock_notify, monkeypatch, capsys):
        """Should not notify for non-PR Bash commands."""
        result = _run_hook(
            {
                "tool_name": "Bash",
                "tool_input": {"command": "git status"},
            },
            monkeypatch, capsys,
        )
        assert result is None
        mock_notify.assert_not_called()

    @patch("notifications.notify")
    @patch("config.get_config")
    def test_ignores_non_bash_tools(self, mock_config, mock_notify, monkeypatch, capsys):
        """Should not notify for non-Bash tool calls."""
        result = _run_hook(
            {
                "tool_name": "Read",
                "tool_input": {"file_path": "/some/file"},
            },
            monkeypatch, capsys,
        )
        assert result is None
        mock_notify.assert_not_called()


class TestSingletonWiring:
    """Tests for HistoryDB singleton usage in post-tool-use (#931)."""

    @patch("history_db.HistoryDB")
    def test_uses_get_instance_not_constructor(self, mock_db_cls, monkeypatch, capsys):
        """post-tool-use should use HistoryDB.get_instance() instead of HistoryDB()."""
        mock_instance = MagicMock()
        mock_db_cls.get_instance.return_value = mock_instance

        _run_hook(
            {"tool_name": "Bash", "tool_input": {"command": "ls"}},
            monkeypatch, capsys,
        )

        mock_db_cls.get_instance.assert_called()
        # Constructor should NOT be called directly
        mock_db_cls.assert_not_called()

    @patch("history_db.HistoryDB")
    def test_does_not_close_db_after_each_call(self, mock_db_cls, monkeypatch, capsys):
        """post-tool-use should NOT close the DB connection (stop hook does that)."""
        mock_instance = MagicMock()
        mock_db_cls.get_instance.return_value = mock_instance

        _run_hook(
            {"tool_name": "Bash", "tool_input": {"command": "ls"}},
            monkeypatch, capsys,
        )

        mock_instance.close.assert_not_called()


class TestConditionalNotification:
    """Tests for conditional notification skip (#931)."""

    @patch("config.get_config")
    def test_skips_notify_call_when_disabled(self, mock_config, monkeypatch, capsys):
        """_maybe_notify_pr_created should not call notify when notifications disabled."""
        mock_config.return_value = {
            "notifications": {
                "enabled": False,
            }
        }
        ptu = _load_module()
        # Call _maybe_notify_pr_created directly with a PR-creating payload
        data = {
            "tool_name": "Bash",
            "tool_input": {"command": 'gh pr create --title "test"'},
            "tool_output": "https://github.com/org/repo/pull/99\n",
        }
        with patch("notifications.notify") as mock_notify:
            ptu._maybe_notify_pr_created(data)
            mock_notify.assert_not_called()

    @patch("notifications.notify")
    @patch("config.get_config")
    def test_still_notifies_when_enabled(self, mock_config, mock_notify, monkeypatch, capsys):
        """Should still notify when notifications are enabled."""
        mock_config.return_value = {
            "notifications": {
                "enabled": True,
                "events": {"pr_created": True},
                "platforms": ["slack"],
            }
        }
        mock_notify.return_value = {"slack": True}

        result = _run_hook(
            {
                "tool_name": "Bash",
                "tool_input": {"command": 'gh pr create --title "test"'},
                "tool_output": "https://github.com/org/repo/pull/99\n",
            },
            monkeypatch, capsys,
        )
        assert result is None
        mock_notify.assert_called_once()
