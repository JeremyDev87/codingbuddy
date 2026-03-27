"""Tests for hooks/lib/tui_launcher.py — TUI companion launcher (#970)."""
import json
import os
import subprocess
import sys
from unittest.mock import MagicMock, patch

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "hooks", "lib"))

from tui_launcher import (
    MIN_WIDTH,
    NARROW_TUI_PERCENT,
    WIDE_TUI_PERCENT,
    WIDE_WIDTH,
    _load_state,
    _msg,
    _remove_state,
    _save_state,
    cleanup,
    get_split_percentage,
    get_terminal_width,
    is_in_tmux,
    is_tmux_available,
    launch,
    should_launch,
)


class TestMsg:
    """Tests for localized message helper."""

    def test_returns_english_by_default(self):
        assert "disabled" in _msg("tui_disabled")

    def test_returns_korean_message(self):
        assert "비활성화" in _msg("tui_disabled", "ko")

    def test_formats_kwargs(self):
        result = _msg("too_narrow", "en", min=120, current=80)
        assert "120" in result
        assert "80" in result

    def test_falls_back_to_english(self):
        result = _msg("tui_disabled", "xx")
        assert "disabled" in result


class TestIsTmuxAvailable:
    """Tests for tmux installation detection."""

    @patch("shutil.which", return_value="/usr/bin/tmux")
    def test_returns_true_when_installed(self, _):
        assert is_tmux_available() is True

    @patch("shutil.which", return_value=None)
    def test_returns_false_when_not_installed(self, _):
        assert is_tmux_available() is False


class TestIsInTmux:
    """Tests for tmux session detection."""

    def test_true_when_tmux_env_set(self, monkeypatch):
        monkeypatch.setenv("TMUX", "/tmp/tmux-501/default,12345,0")
        assert is_in_tmux() is True

    def test_false_when_tmux_env_unset(self, monkeypatch):
        monkeypatch.delenv("TMUX", raising=False)
        assert is_in_tmux() is False

    def test_false_when_tmux_env_empty(self, monkeypatch):
        monkeypatch.setenv("TMUX", "")
        assert is_in_tmux() is False


class TestGetTerminalWidth:
    """Tests for terminal width detection."""

    @patch("os.get_terminal_size")
    def test_returns_columns(self, mock_size):
        mock_size.return_value = os.terminal_size((200, 50))
        assert get_terminal_width() == 200

    @patch("os.get_terminal_size", side_effect=OSError("not a terminal"))
    def test_returns_zero_on_error(self, _):
        assert get_terminal_width() == 0


class TestGetSplitPercentage:
    """Tests for split percentage calculation by terminal width."""

    def test_wide_terminal_gets_40_percent(self):
        assert get_split_percentage(200) == WIDE_TUI_PERCENT
        assert get_split_percentage(WIDE_WIDTH) == WIDE_TUI_PERCENT

    def test_medium_terminal_gets_30_percent(self):
        assert get_split_percentage(159) == NARROW_TUI_PERCENT
        assert get_split_percentage(MIN_WIDTH) == NARROW_TUI_PERCENT

    def test_narrow_terminal_gets_zero(self):
        assert get_split_percentage(119) == 0
        assert get_split_percentage(80) == 0
        assert get_split_percentage(0) == 0


class TestShouldLaunch:
    """Tests for TUI launch decision logic."""

    @patch("tui_launcher.get_terminal_width", return_value=200)
    @patch("tui_launcher.is_in_tmux", return_value=True)
    @patch("tui_launcher.is_tmux_available", return_value=True)
    def test_should_launch_when_all_conditions_met(self, *_):
        ok, msg = should_launch({"tui": True})
        assert ok is True
        assert msg == ""

    def test_should_not_launch_when_tui_disabled(self):
        ok, msg = should_launch({"tui": False})
        assert ok is False
        assert "disabled" in msg.lower() or "비활성" in msg

    @patch("tui_launcher.is_tmux_available", return_value=False)
    def test_should_not_launch_when_no_tmux(self, _):
        ok, msg = should_launch({"tui": True})
        assert ok is False
        assert "tmux" in msg.lower()

    @patch("tui_launcher.is_in_tmux", return_value=False)
    @patch("tui_launcher.is_tmux_available", return_value=True)
    def test_should_not_launch_when_not_in_tmux(self, *_):
        ok, msg = should_launch({"tui": True})
        assert ok is False
        assert "tmux" in msg.lower()

    @patch("tui_launcher.get_terminal_width", return_value=100)
    @patch("tui_launcher.is_in_tmux", return_value=True)
    @patch("tui_launcher.is_tmux_available", return_value=True)
    def test_should_not_launch_when_too_narrow(self, *_):
        ok, msg = should_launch({"tui": True})
        assert ok is False
        assert "120" in msg

    def test_uses_config_language_for_messages(self):
        ok, msg = should_launch({"tui": False, "language": "ko"})
        assert ok is False
        assert "비활성화" in msg

    def test_tui_defaults_to_true(self):
        """Config without tui key should default to True (then fail on tmux check)."""
        with patch("tui_launcher.is_tmux_available", return_value=False):
            ok, _ = should_launch({})
            assert ok is False  # Fails on tmux, not on tui config


class TestStateManagement:
    """Tests for TUI pane state persistence."""

    def test_save_and_load_state(self, tmp_path):
        with patch("tui_launcher._get_state_dir", return_value=tmp_path):
            _save_state("sess-1", "%42")
            state = _load_state("sess-1")

        assert state is not None
        assert state["pane_id"] == "%42"
        assert state["session_id"] == "sess-1"

    def test_load_returns_none_when_no_state(self, tmp_path):
        with patch("tui_launcher._get_state_dir", return_value=tmp_path):
            assert _load_state("nonexistent") is None

    def test_load_returns_none_on_corrupted_file(self, tmp_path):
        state_file = tmp_path / "tui-bad.json"
        state_file.write_text("not json{{{")
        with patch("tui_launcher._get_state_dir", return_value=tmp_path):
            assert _load_state("bad") is None

    def test_remove_state_deletes_file(self, tmp_path):
        with patch("tui_launcher._get_state_dir", return_value=tmp_path):
            _save_state("sess-1", "%42")
            _remove_state("sess-1")
            assert _load_state("sess-1") is None

    def test_remove_nonexistent_state_is_noop(self, tmp_path):
        with patch("tui_launcher._get_state_dir", return_value=tmp_path):
            _remove_state("nonexistent")  # Should not raise

    def test_save_creates_directory(self, tmp_path):
        nested = tmp_path / "sub" / "dir"
        with patch("tui_launcher._get_state_dir", return_value=nested):
            _save_state("sess-1", "%42")
            assert (nested / "tui-sess-1.json").exists()


class TestLaunch:
    """Tests for TUI launch in tmux split pane."""

    def test_launches_tui_successfully(self):
        with (
            patch("tui_launcher.should_launch", return_value=(True, "")),
            patch("tui_launcher.get_terminal_width", return_value=200),
            patch("shutil.which", return_value="/usr/bin/codingbuddy-tui"),
            patch("subprocess.run") as mock_run,
            patch("tui_launcher._save_state") as mock_save,
        ):
            mock_run.return_value = MagicMock(
                returncode=0, stdout="%42\n", stderr=""
            )

            ok, msg = launch("sess-1", {"tui": True})

            assert ok is True
            assert "%42" in msg
            mock_save.assert_called_once_with("sess-1", "%42")
            cmd = mock_run.call_args[0][0]
            assert "tmux" == cmd[0]
            assert "split-window" == cmd[1]
            assert "-d" in cmd

    def test_skips_when_should_not_launch(self):
        with patch("tui_launcher.should_launch", return_value=(False, "TUI disabled")):
            ok, msg = launch("sess-1", {"tui": False})

        assert ok is False
        assert msg == "TUI disabled"

    def test_skips_when_tui_command_not_found(self):
        with (
            patch("tui_launcher.should_launch", return_value=(True, "")),
            patch("shutil.which", return_value=None),
        ):
            ok, msg = launch("sess-1", {"tui": True})

        assert ok is False
        assert "not found" in msg.lower() or "찾을 수 없" in msg

    def test_uses_custom_tui_command(self):
        with (
            patch("tui_launcher.should_launch", return_value=(True, "")),
            patch("tui_launcher.get_terminal_width", return_value=200),
            patch("shutil.which", return_value="/usr/bin/my-tui"),
            patch("subprocess.run") as mock_run,
            patch("tui_launcher._save_state"),
        ):
            mock_run.return_value = MagicMock(
                returncode=0, stdout="%99\n", stderr=""
            )

            launch("sess-1", {"tui": True, "tui_command": "my-tui"})

            cmd_str = mock_run.call_args[0][0][-1]
            assert "my-tui" in cmd_str

    def test_handles_subprocess_error(self):
        with (
            patch("tui_launcher.should_launch", return_value=(True, "")),
            patch("tui_launcher.get_terminal_width", return_value=200),
            patch("shutil.which", return_value="/usr/bin/codingbuddy-tui"),
            patch("subprocess.run") as mock_run,
        ):
            mock_run.return_value = MagicMock(
                returncode=1, stdout="", stderr="pane error"
            )

            ok, msg = launch("sess-1", {"tui": True})

            assert ok is False
            assert "pane error" in msg

    def test_handles_timeout(self):
        with (
            patch("tui_launcher.should_launch", return_value=(True, "")),
            patch("tui_launcher.get_terminal_width", return_value=200),
            patch("shutil.which", return_value="/usr/bin/codingbuddy-tui"),
            patch(
                "subprocess.run",
                side_effect=subprocess.TimeoutExpired("tmux", 5),
            ),
        ):
            ok, msg = launch("sess-1", {"tui": True})

            assert ok is False
            assert "timeout" in msg.lower()

    def test_handles_unexpected_exception(self):
        with (
            patch("tui_launcher.should_launch", return_value=(True, "")),
            patch("tui_launcher.get_terminal_width", return_value=200),
            patch("shutil.which", return_value="/usr/bin/codingbuddy-tui"),
            patch("subprocess.run", side_effect=OSError("no such file")),
        ):
            ok, msg = launch("sess-1", {"tui": True})

            assert ok is False
            assert "no such file" in msg

    def test_split_percentage_matches_width(self):
        """Wide terminal should use 40% split."""
        with (
            patch("tui_launcher.should_launch", return_value=(True, "")),
            patch("tui_launcher.get_terminal_width", return_value=200),
            patch("shutil.which", return_value="/usr/bin/codingbuddy-tui"),
            patch("subprocess.run") as mock_run,
            patch("tui_launcher._save_state"),
        ):
            mock_run.return_value = MagicMock(
                returncode=0, stdout="%1\n", stderr=""
            )

            launch("sess-1", {"tui": True})

            cmd = mock_run.call_args[0][0]
            p_idx = cmd.index("-p")
            assert cmd[p_idx + 1] == str(WIDE_TUI_PERCENT)

    def test_compact_split_for_medium_width(self):
        """Medium terminal (120-159) should use 30% split."""
        with (
            patch("tui_launcher.should_launch", return_value=(True, "")),
            patch("tui_launcher.get_terminal_width", return_value=140),
            patch("shutil.which", return_value="/usr/bin/codingbuddy-tui"),
            patch("subprocess.run") as mock_run,
            patch("tui_launcher._save_state"),
        ):
            mock_run.return_value = MagicMock(
                returncode=0, stdout="%1\n", stderr=""
            )

            launch("sess-1", {"tui": True})

            cmd = mock_run.call_args[0][0]
            p_idx = cmd.index("-p")
            assert cmd[p_idx + 1] == str(NARROW_TUI_PERCENT)


class TestCleanup:
    """Tests for TUI pane cleanup."""

    def test_kills_tui_pane(self, tmp_path):
        with (
            patch("tui_launcher._get_state_dir", return_value=tmp_path),
            patch("subprocess.run") as mock_run,
        ):
            _save_state("sess-1", "%42")

            result = cleanup("sess-1")

            assert result is True
            mock_run.assert_called_once()
            cmd = mock_run.call_args[0][0]
            assert cmd == ["tmux", "kill-pane", "-t", "%42"]

    def test_removes_state_after_cleanup(self, tmp_path):
        with (
            patch("tui_launcher._get_state_dir", return_value=tmp_path),
            patch("subprocess.run"),
        ):
            _save_state("sess-1", "%42")
            cleanup("sess-1")

            assert _load_state("sess-1") is None

    def test_returns_false_when_no_state(self, tmp_path):
        with patch("tui_launcher._get_state_dir", return_value=tmp_path):
            assert cleanup("nonexistent") is False

    def test_returns_false_when_no_pane_id(self, tmp_path):
        state_file = tmp_path / "tui-bad-state.json"
        state_file.write_text(json.dumps({"session_id": "bad-state"}))
        with patch("tui_launcher._get_state_dir", return_value=tmp_path):
            result = cleanup("bad-state")

        assert result is False

    def test_handles_kill_error_gracefully(self, tmp_path):
        with (
            patch("tui_launcher._get_state_dir", return_value=tmp_path),
            patch("subprocess.run", side_effect=Exception("tmux not running")),
        ):
            _save_state("sess-1", "%42")

            result = cleanup("sess-1")

            assert result is True
            assert _load_state("sess-1") is None

    def test_handles_kill_timeout(self, tmp_path):
        with (
            patch("tui_launcher._get_state_dir", return_value=tmp_path),
            patch(
                "subprocess.run",
                side_effect=subprocess.TimeoutExpired("tmux", 5),
            ),
        ):
            _save_state("sess-1", "%42")

            result = cleanup("sess-1")

            assert result is True
