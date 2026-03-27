"""E2E tests for the full hook lifecycle.

Simulates a complete Claude Code session:
SessionStart → UserPromptSubmit → PreToolUse → PostToolUse → Stop

Verifies the hooks work together without interference.
"""
import pytest

from cli_mock import LifecycleRunner, MockEnvironment


class TestFullLifecycle:
    """Complete session lifecycle tests."""

    def test_basic_session_lifecycle(self, lifecycle):
        """All hooks execute successfully in sequence."""
        lifecycle.session_start()
        lifecycle.user_prompt_submit("PLAN design a feature")
        lifecycle.pre_tool_use("Bash", {"command": "ls -la"})
        lifecycle.post_tool_use("Bash", {"command": "ls -la"}, "file1\nfile2")
        lifecycle.stop()

        assert lifecycle.all_succeeded, (
            f"Failed hooks: {[(i, r.exit_code, r.stderr) for i, r in enumerate(lifecycle.results) if not r.succeeded]}"
        )

    def test_auto_mode_lifecycle(self, lifecycle):
        """AUTO mode lifecycle with multiple tool uses."""
        lifecycle.session_start()
        lifecycle.user_prompt_submit("AUTO implement user dashboard")

        # Simulate multiple tool calls in AUTO mode
        for _ in range(3):
            lifecycle.pre_tool_use("Bash", {"command": "yarn test"})
            lifecycle.post_tool_use("Bash", {"command": "yarn test"}, "Tests passed")

        lifecycle.pre_tool_use("Edit", {"file_path": "src/app.ts"})
        lifecycle.post_tool_use("Edit", {"file_path": "src/app.ts"})
        lifecycle.stop()

        assert lifecycle.all_succeeded

    def test_git_commit_in_lifecycle(self, lifecycle):
        """Git commit during lifecycle triggers quality gate check."""
        lifecycle.session_start()
        lifecycle.user_prompt_submit("ACT implement changes")

        # Normal tool use
        lifecycle.pre_tool_use("Read", {"file_path": "src/main.ts"})
        lifecycle.post_tool_use("Read", {"file_path": "src/main.ts"})

        # Git commit — may trigger quality gate
        commit_result = lifecycle.pre_tool_use(
            "Bash", {"command": "git commit -m 'feat: add feature'"}
        )
        assert commit_result.succeeded

        lifecycle.stop()
        assert lifecycle.all_succeeded

    def test_session_with_no_tool_calls(self, lifecycle):
        """Session that starts and stops without tool calls."""
        lifecycle.session_start()
        lifecycle.stop()

        assert lifecycle.all_succeeded
        assert len(lifecycle.results) == 2

    def test_multiple_prompts_in_session(self, lifecycle):
        """Multiple user prompts within a single session."""
        lifecycle.session_start()

        lifecycle.user_prompt_submit("PLAN design auth")
        lifecycle.pre_tool_use("Bash", {"command": "ls src/"})
        lifecycle.post_tool_use("Bash", {"command": "ls src/"})

        lifecycle.user_prompt_submit("ACT implement auth")
        lifecycle.pre_tool_use("Write", {"file_path": "src/auth.ts"})
        lifecycle.post_tool_use("Write", {"file_path": "src/auth.ts"})

        lifecycle.user_prompt_submit("EVAL review auth")
        lifecycle.pre_tool_use("Read", {"file_path": "src/auth.ts"})
        lifecycle.post_tool_use("Read", {"file_path": "src/auth.ts"})

        lifecycle.stop()
        assert lifecycle.all_succeeded


class TestLifecycleIsolation:
    """Verify hooks don't interfere with each other."""

    def test_session_start_does_not_affect_pre_tool_use(self, lifecycle):
        """SessionStart output doesn't leak into PreToolUse."""
        start_result = lifecycle.session_start()
        pre_result = lifecycle.pre_tool_use("Bash", {"command": "echo hello"})

        assert start_result.succeeded
        assert pre_result.succeeded

    def test_stop_after_error_in_pre_tool_use(self, mock_env):
        """Stop works even after PreToolUse processes unusual input."""
        lifecycle = LifecycleRunner(env=mock_env)
        lifecycle.session_start()

        # Send unusual input to PreToolUse
        lifecycle.pre_tool_use("UnknownTool", {"weird": "data"})

        # Stop should still work
        stop_result = lifecycle.stop()
        assert stop_result.succeeded
        assert lifecycle.all_succeeded
