"""Tests for data_dir — centralized plugin data directory resolver (#1225)."""
import os
import sys

import pytest

_tests_dir = os.path.dirname(os.path.abspath(__file__))
_lib_dir = os.path.join(os.path.dirname(_tests_dir), "hooks", "lib")
if _lib_dir not in sys.path:
    sys.path.insert(0, _lib_dir)

from data_dir import DEFAULT_DATA_DIR, resolve_data_dir


class TestResolveDataDir:
    def test_returns_custom_path_when_env_set(self, monkeypatch, tmp_path):
        custom = str(tmp_path / "custom_data")
        monkeypatch.setenv("CLAUDE_PLUGIN_DATA", custom)
        assert resolve_data_dir() == custom

    def test_returns_default_when_env_unset(self, monkeypatch):
        monkeypatch.delenv("CLAUDE_PLUGIN_DATA", raising=False)
        result = resolve_data_dir()
        expected = os.path.join(os.path.expanduser("~"), ".codingbuddy")
        assert result == expected

    def test_default_data_dir_constant(self):
        assert DEFAULT_DATA_DIR == os.path.join(
            os.path.expanduser("~"), ".codingbuddy"
        )


class TestModulesUseResolveDataDir:
    """Verify that modules import and use resolve_data_dir."""

    def test_history_db_uses_resolve(self, monkeypatch, tmp_path):
        custom = str(tmp_path / "hist")
        monkeypatch.setenv("CLAUDE_PLUGIN_DATA", custom)
        from history_db import _default_db_path

        assert _default_db_path() == os.path.join(custom, "history.db")

    def test_event_bridge_uses_resolve(self, monkeypatch, tmp_path):
        custom = str(tmp_path / "evt")
        monkeypatch.setenv("CLAUDE_PLUGIN_DATA", custom)
        from event_bridge import EventBridge

        bridge = EventBridge(session_id="test")
        assert bridge.events_dir == os.path.join(custom, "events")

    def test_agent_memory_uses_resolve(self, monkeypatch, tmp_path):
        custom = str(tmp_path / "mem")
        monkeypatch.setenv("CLAUDE_PLUGIN_DATA", custom)
        from agent_memory import AgentMemory

        am = AgentMemory()
        assert am.memory_dir == os.path.join(custom, "agent_memory")
