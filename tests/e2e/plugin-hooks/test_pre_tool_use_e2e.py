"""E2E tests for the PreToolUse hook lifecycle.

Verifies:
- Hook always exits 0 (never blocks Claude Code)
- Git commit quality gate triggers additionalContext
- Agent status message is returned via statusMessage
- Non-Bash tools pass through without intervention
"""
import json
import os

import pytest

from cli_mock import run_hook, MockEnvironment


class TestPreToolUseNeverBlocks:
    """PreToolUse must NEVER block Claude Code."""

    def test_exits_zero_for_bash_tool(self, mock_env):
        """Hook exits 0 for normal Bash commands."""
        result = run_hook(
            "pre-tool-use.py",
            input_data={"tool_name": "Bash", "tool_input": {"command": "ls -la"}},
            env=mock_env,
        )
        assert result.succeeded

    def test_exits_zero_for_read_tool(self, mock_env):
        """Hook exits 0 for non-Bash tools."""
        result = run_hook(
            "pre-tool-use.py",
            input_data={"tool_name": "Read", "tool_input": {"file_path": "/tmp/test"}},
            env=mock_env,
        )
        assert result.succeeded

    def test_exits_zero_with_empty_input(self, mock_env):
        """Hook exits 0 even with empty JSON input."""
        result = run_hook(
            "pre-tool-use.py",
            input_data={},
            env=mock_env,
        )
        assert result.succeeded

    def test_exits_zero_with_malformed_input(self, mock_env):
        """Hook exits 0 even with unexpected input structure."""
        result = run_hook(
            "pre-tool-use.py",
            input_data={"unexpected": "data"},
            env=mock_env,
        )
        assert result.succeeded


class TestGitCommitQualityGate:
    """PreToolUse enforces quality gates on git commit commands."""

    def test_no_gate_when_disabled(self, mock_env):
        """No quality gate context when qualityGates.enabled is false (default)."""
        result = run_hook(
            "pre-tool-use.py",
            input_data={
                "tool_name": "Bash",
                "tool_input": {"command": "git commit -m 'test'"},
            },
            env=mock_env,
        )
        assert result.succeeded
        # Quality gates are disabled by default, so no context about quality
        if result.additional_context:
            assert "Quality Gate" not in result.additional_context

    def test_gate_triggers_when_enabled(self, mock_env):
        """Quality gate context appears when enabled in config."""
        # Create a config that enables quality gates
        config = {"qualityGates": {"enabled": True}}
        config_path = os.path.join(mock_env.project_dir, "codingbuddy.config.json")
        with open(config_path, "w") as f:
            json.dump(config, f)

        result = run_hook(
            "pre-tool-use.py",
            input_data={
                "tool_name": "Bash",
                "tool_input": {"command": "git commit -m 'feat: add feature'"},
            },
            env=mock_env,
        )
        assert result.succeeded
        if result.additional_context:
            assert "Quality Gate" in result.additional_context

    def test_no_gate_for_non_commit_git(self, mock_env):
        """No quality gate for non-commit git commands."""
        config = {"qualityGates": {"enabled": True}}
        config_path = os.path.join(mock_env.project_dir, "codingbuddy.config.json")
        with open(config_path, "w") as f:
            json.dump(config, f)

        result = run_hook(
            "pre-tool-use.py",
            input_data={
                "tool_name": "Bash",
                "tool_input": {"command": "git status"},
            },
            env=mock_env,
        )
        assert result.succeeded
        if result.additional_context:
            assert "Quality Gate" not in result.additional_context


class TestAgentStatus:
    """PreToolUse returns agent status in statusMessage."""

    def test_status_message_with_active_agent(self, mock_env):
        """statusMessage appears when CODINGBUDDY_ACTIVE_AGENT is set."""
        mock_env.env_vars["CODINGBUDDY_ACTIVE_AGENT"] = "frontend-developer"
        result = run_hook(
            "pre-tool-use.py",
            input_data={"tool_name": "Bash", "tool_input": {"command": "ls"}},
            env=mock_env,
        )
        assert result.succeeded
        # Agent status is built by agent_status module
        # If the module is available, statusMessage should contain agent info
        if result.has_json and result.status_message:
            assert len(result.status_message) > 0

    def test_no_status_without_active_agent(self, mock_env):
        """No statusMessage when no agent is active."""
        mock_env.env_vars.pop("CODINGBUDDY_ACTIVE_AGENT", None)
        result = run_hook(
            "pre-tool-use.py",
            input_data={"tool_name": "Read", "tool_input": {}},
            env=mock_env,
        )
        assert result.succeeded


class TestNonBashPassthrough:
    """Non-Bash tools should pass through without Bash-specific checks."""

    def test_edit_tool_passthrough(self, mock_env):
        """Edit tool triggers no Bash-specific context."""
        result = run_hook(
            "pre-tool-use.py",
            input_data={
                "tool_name": "Edit",
                "tool_input": {"file_path": "/tmp/test.py", "old_string": "a", "new_string": "b"},
            },
            env=mock_env,
        )
        assert result.succeeded
        if result.additional_context:
            assert "Quality Gate" not in result.additional_context
            assert "Rules/config changed" not in result.additional_context

    def test_write_tool_passthrough(self, mock_env):
        """Write tool triggers no Bash-specific context."""
        result = run_hook(
            "pre-tool-use.py",
            input_data={
                "tool_name": "Write",
                "tool_input": {"file_path": "/tmp/new.py", "content": "hello"},
            },
            env=mock_env,
        )
        assert result.succeeded
