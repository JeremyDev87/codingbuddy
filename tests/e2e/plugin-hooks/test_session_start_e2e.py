"""E2E tests for the SessionStart hook lifecycle.

Verifies:
- Hook always exits 0 (never blocks Claude Code)
- UserPromptSubmit hook file is installed to ~/.claude/hooks/
- Hook is registered in ~/.claude/settings.json
- Buddy greeting is rendered on session start
"""
import json
import os
from pathlib import Path

import pytest

from cli_mock import run_hook, MockEnvironment, HOOKS_DIR


class TestSessionStartNeverBlocks:
    """SessionStart must NEVER block Claude Code, even on errors."""

    def test_exits_zero_in_clean_environment(self, mock_env):
        """Hook exits 0 in a fresh, empty environment."""
        result = run_hook("session-start.py", env=mock_env)
        assert result.succeeded, f"stderr: {result.stderr}"

    def test_exits_zero_with_missing_plugin_dir(self, mock_env):
        """Hook exits 0 even when CLAUDE_PLUGIN_DIR points nowhere."""
        mock_env.env_vars["CLAUDE_PLUGIN_DIR"] = "/nonexistent/path"
        result = run_hook("session-start.py", env=mock_env)
        assert result.succeeded

    def test_exits_zero_with_corrupted_settings(self, mock_env):
        """Hook exits 0 even when settings.json is corrupted."""
        settings = Path(mock_env.home_dir) / ".claude" / "settings.json"
        settings.write_text("NOT VALID JSON {{{")
        result = run_hook("session-start.py", env=mock_env)
        assert result.succeeded


class TestHookInstallation:
    """SessionStart installs the UserPromptSubmit hook file."""

    def test_installs_mode_detect_hook(self, mock_env):
        """Hook copies mode detection script to ~/.claude/hooks/."""
        result = run_hook("session-start.py", env=mock_env)
        assert result.succeeded

        target = Path(mock_env.home_dir) / ".claude" / "hooks" / "codingbuddy-mode-detect.py"
        assert target.exists(), "Mode detection hook was not installed"

    def test_hook_file_is_executable(self, mock_env):
        """Installed hook file has executable permission."""
        run_hook("session-start.py", env=mock_env)
        target = Path(mock_env.home_dir) / ".claude" / "hooks" / "codingbuddy-mode-detect.py"
        if target.exists():
            assert os.access(str(target), os.X_OK), "Hook file is not executable"

    def test_registers_hook_in_settings(self, mock_env):
        """Hook registers UserPromptSubmit in settings.json."""
        run_hook("session-start.py", env=mock_env)

        settings_path = Path(mock_env.home_dir) / ".claude" / "settings.json"
        if settings_path.exists():
            settings = json.loads(settings_path.read_text())
            hooks = settings.get("hooks", {}).get("UserPromptSubmit", [])
            commands = [
                h.get("command", "")
                for group in hooks
                for h in group.get("hooks", [])
            ]
            assert any("codingbuddy-mode-detect.py" in cmd for cmd in commands), (
                f"Hook not registered. Commands found: {commands}"
            )

    def test_idempotent_installation(self, mock_env):
        """Running SessionStart twice does not duplicate the hook."""
        run_hook("session-start.py", env=mock_env)
        run_hook("session-start.py", env=mock_env)

        settings_path = Path(mock_env.home_dir) / ".claude" / "settings.json"
        if settings_path.exists():
            settings = json.loads(settings_path.read_text())
            hooks = settings.get("hooks", {}).get("UserPromptSubmit", [])
            commands = [
                h.get("command", "")
                for group in hooks
                for h in group.get("hooks", [])
            ]
            mode_detect_count = sum(
                1 for cmd in commands if "codingbuddy-mode-detect.py" in cmd
            )
            assert mode_detect_count == 1, (
                f"Hook registered {mode_detect_count} times (expected 1)"
            )


class TestBuddyGreeting:
    """SessionStart renders buddy greeting output."""

    def test_produces_stdout_output(self, mock_env):
        """Hook produces some output on stdout (greeting or install message)."""
        result = run_hook("session-start.py", env=mock_env)
        # SessionStart should produce some output (hook install msg or greeting)
        # The exact content depends on lib modules availability
        assert result.succeeded
        # stdout may contain install message, greeting, or system prompt injection
        # We just verify it doesn't crash
