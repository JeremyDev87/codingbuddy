"""Tests for tmux sidebar auto-setup (#1091)."""
import io
import os
import sys

import pytest

# Import session-start module
_tests_dir = os.path.dirname(os.path.abspath(__file__))
_hooks_dir = os.path.join(os.path.dirname(_tests_dir), "hooks")
if _hooks_dir not in sys.path:
    sys.path.insert(0, _hooks_dir)

from importlib import util as importutil

_spec = importutil.spec_from_file_location(
    "session_start", os.path.join(_hooks_dir, "session-start.py")
)
session_start = importutil.module_from_spec(_spec)
_spec.loader.exec_module(session_start)


class TestTmuxDetection:
    def test_prints_suggestion_when_not_in_tmux(self, monkeypatch, capsys):
        monkeypatch.delenv("TMUX", raising=False)
        session_start._setup_tmux_sidebar()

        captured = capsys.readouterr()
        assert "tmux" in captured.err.lower()
        assert "claude" in captured.err.lower()

    def test_no_crash_when_not_in_tmux(self, monkeypatch):
        monkeypatch.delenv("TMUX", raising=False)
        # Should not raise
        session_start._setup_tmux_sidebar()


class TestSidebarPaneExists:
    def test_returns_false_when_not_in_tmux(self, monkeypatch):
        monkeypatch.delenv("TMUX", raising=False)
        # tmux list-panes will fail outside tmux
        assert session_start._sidebar_pane_exists() is False


class TestTmuxSuggestionMessages:
    def test_en_message_exists(self):
        assert "en" in session_start.TMUX_SUGGESTION
        assert "tmux" in session_start.TMUX_SUGGESTION["en"].lower()

    def test_ko_message_exists(self):
        assert "ko" in session_start.TMUX_SUGGESTION
        assert "tmux" in session_start.TMUX_SUGGESTION["ko"].lower()

    def test_fallback_to_english(self, monkeypatch, capsys):
        monkeypatch.delenv("TMUX", raising=False)
        # Force unknown language
        monkeypatch.setattr(session_start, "_get_cached_language", lambda: "fr")
        session_start._setup_tmux_sidebar()

        captured = capsys.readouterr()
        # Falls back to English
        assert "CodingBuddy sidebar" in captured.err
