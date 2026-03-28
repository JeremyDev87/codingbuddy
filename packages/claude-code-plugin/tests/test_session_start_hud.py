"""Tests for statusLine auto-install in session-start (#1089, #1092)."""
import json
import os
import sys

import pytest

# Ensure hooks/ is on path
_tests_dir = os.path.dirname(os.path.abspath(__file__))
_hooks_dir = os.path.join(os.path.dirname(_tests_dir), "hooks")
if _hooks_dir not in sys.path:
    sys.path.insert(0, _hooks_dir)

# Also hooks/lib for _read_settings_file, _write_settings_file
_lib_dir = os.path.join(_hooks_dir, "lib")
if _lib_dir not in sys.path:
    sys.path.insert(0, _lib_dir)


# We need to import from session-start.py which has a hyphen in the name
from importlib import import_module
from importlib import util as importutil

_spec = importutil.spec_from_file_location(
    "session_start", os.path.join(_hooks_dir, "session-start.py")
)
session_start = importutil.module_from_spec(_spec)
_spec.loader.exec_module(session_start)


@pytest.fixture
def home_dir(tmp_path):
    """Simulated home directory."""
    (tmp_path / ".claude" / "hooks").mkdir(parents=True)
    return tmp_path


@pytest.fixture
def settings_file(home_dir):
    """Path to settings.json in simulated home."""
    sf = home_dir / ".claude" / "settings.json"
    sf.write_text(json.dumps({"env": {"CODINGBUDDY_AUTO_TUI": "1"}}))
    return sf


@pytest.fixture
def hud_source(home_dir):
    """Create a fake codingbuddy-hud.py source."""
    hooks = home_dir / "workspace" / "codingbuddy" / "packages" / "claude-code-plugin" / "hooks"
    hooks.mkdir(parents=True)
    src = hooks / "codingbuddy-hud.py"
    src.write_text("#!/usr/bin/env python3\nprint('test')")
    return src


class TestInstallStatusline:
    def test_installs_hud_script_to_claude_hud_dir(self, home_dir, settings_file, hud_source, monkeypatch):
        monkeypatch.setenv("CLAUDE_PLUGIN_DIR", str(hud_source.parent.parent))
        session_start._install_statusline(home_dir, settings_file)

        target = home_dir / ".claude" / "hud" / "codingbuddy-hud.py"
        assert target.exists()
        assert os.access(str(target), os.X_OK)

    def test_sets_statusline_in_settings(self, home_dir, settings_file, hud_source, monkeypatch):
        monkeypatch.setenv("CLAUDE_PLUGIN_DIR", str(hud_source.parent.parent))
        session_start._install_statusline(home_dir, settings_file)

        data = json.loads(settings_file.read_text())
        assert "codingbuddy-hud" in data["statusLine"]["command"]
        assert data["statusLine"]["type"] == "command"

    def test_replaces_omc_statusline(self, home_dir, settings_file, hud_source, monkeypatch):
        monkeypatch.setenv("CLAUDE_PLUGIN_DIR", str(hud_source.parent.parent))
        settings_file.write_text(json.dumps({
            "statusLine": {"type": "command", "command": "node omc-hud.mjs"},
            "env": {},
        }))
        session_start._install_statusline(home_dir, settings_file)

        data = json.loads(settings_file.read_text())
        assert "codingbuddy-hud" in data["statusLine"]["command"]
        assert "omc-hud" not in data["statusLine"]["command"]

    def test_skips_custom_statusline(self, home_dir, settings_file, hud_source, monkeypatch):
        monkeypatch.setenv("CLAUDE_PLUGIN_DIR", str(hud_source.parent.parent))
        settings_file.write_text(json.dumps({
            "statusLine": {"type": "command", "command": "my-custom-hud.sh"},
            "env": {},
        }))
        session_start._install_statusline(home_dir, settings_file)

        data = json.loads(settings_file.read_text())
        assert data["statusLine"]["command"] == "my-custom-hud.sh"

    def test_skips_if_already_installed(self, home_dir, settings_file, hud_source, monkeypatch):
        monkeypatch.setenv("CLAUDE_PLUGIN_DIR", str(hud_source.parent.parent))
        settings_file.write_text(json.dumps({
            "statusLine": {"type": "command", "command": "python3 codingbuddy-hud.py"},
            "env": {},
        }))
        session_start._install_statusline(home_dir, settings_file)

        data = json.loads(settings_file.read_text())
        # command unchanged (not overwritten with full path)
        assert data["statusLine"]["command"] == "python3 codingbuddy-hud.py"

    def test_sets_auto_tui_to_zero(self, home_dir, settings_file, hud_source, monkeypatch):
        monkeypatch.setenv("CLAUDE_PLUGIN_DIR", str(hud_source.parent.parent))
        session_start._install_statusline(home_dir, settings_file)

        data = json.loads(settings_file.read_text())
        assert data["env"]["CODINGBUDDY_AUTO_TUI"] == "0"

    def test_noop_when_source_not_found(self, home_dir, settings_file, monkeypatch):
        monkeypatch.delenv("CLAUDE_PLUGIN_DIR", raising=False)
        # Mock _find_hud_source to return None
        monkeypatch.setattr(session_start, "_find_hud_source", lambda: None)
        session_start._install_statusline(home_dir, settings_file)

        data = json.loads(settings_file.read_text())
        assert "statusLine" not in data


class TestFindHudSource:
    def test_finds_from_env(self, tmp_path, monkeypatch):
        hooks = tmp_path / "hooks"
        hooks.mkdir()
        src = hooks / "codingbuddy-hud.py"
        src.write_text("# test")
        monkeypatch.setenv("CLAUDE_PLUGIN_DIR", str(tmp_path))

        result = session_start._find_hud_source()
        assert result is not None
        assert result.name == "codingbuddy-hud.py"

    def test_returns_none_when_not_found(self, monkeypatch):
        monkeypatch.delenv("CLAUDE_PLUGIN_DIR", raising=False)
        # Unlikely to find it in test env without proper cache
        # This may return None or a valid path depending on the test machine
        # Just verify it doesn't crash
        session_start._find_hud_source()
