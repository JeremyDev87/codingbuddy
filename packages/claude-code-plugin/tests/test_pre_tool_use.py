"""Tests for hooks/pre-tool-use.py — PreToolUse hook."""
import importlib
import importlib.util
import json
import os
import sys
import io
import pytest

# Add hooks/lib to path for safe_main/config imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "hooks", "lib"))

_HOOK_PATH = os.path.join(
    os.path.dirname(__file__), "..", "hooks", "pre-tool-use.py"
)


def _load_module():
    """Load the hyphenated pre-tool-use.py as a module."""
    # Clear any previously loaded version
    for mod_name in list(sys.modules.keys()):
        if "pre_tool_use" in mod_name:
            del sys.modules[mod_name]

    spec = importlib.util.spec_from_file_location("pre_tool_use", _HOOK_PATH)
    mod = importlib.util.module_from_spec(spec)
    sys.modules["pre_tool_use"] = mod
    spec.loader.exec_module(mod)
    return mod


def _run_hook(input_data, monkeypatch, capsys, config=None, config_dir=None):
    """Helper to run pre-tool-use hook with given input and capture output.

    Returns parsed JSON output or None if no output.
    """
    monkeypatch.setattr("sys.stdin", io.StringIO(json.dumps(input_data)))

    if config_dir:
        monkeypatch.setenv("CODINGBUDDY_CONFIG_DIR", config_dir)

    ptu = _load_module()

    # Patch config if provided
    if config is not None:
        monkeypatch.setattr(ptu, "_get_hook_config", lambda: config)

    with pytest.raises(SystemExit) as exc_info:
        ptu.handle_pre_tool_use()
    assert exc_info.value.code == 0

    out = capsys.readouterr().out
    return json.loads(out) if out.strip() else None


class TestPreToolUseEarlyReturn:
    """Tests for early-return logic on non-Bash tools."""

    def test_ignores_non_bash_tools(self, monkeypatch, capsys):
        """Should return no output for non-Bash tools like Read, Write, etc."""
        result = _run_hook(
            {"tool_name": "Read", "tool_input": {"file_path": "/foo"}},
            monkeypatch, capsys,
        )
        assert result is None

    def test_ignores_edit_tool(self, monkeypatch, capsys):
        """Should return no output for Edit tool."""
        result = _run_hook(
            {"tool_name": "Edit", "tool_input": {}},
            monkeypatch, capsys,
        )
        assert result is None


class TestPreToolUseBashNonGitCommit:
    """Tests for Bash commands that are NOT git commit."""

    def test_ignores_non_git_commands(self, monkeypatch, capsys):
        """Should return no output for non-git bash commands."""
        result = _run_hook(
            {"tool_name": "Bash", "tool_input": {"command": "ls -la"}},
            monkeypatch, capsys,
        )
        assert result is None

    def test_ignores_git_non_commit(self, monkeypatch, capsys):
        """Should return no output for git commands that aren't commit."""
        result = _run_hook(
            {"tool_name": "Bash", "tool_input": {"command": "git status"}},
            monkeypatch, capsys,
        )
        assert result is None

    def test_ignores_git_push(self, monkeypatch, capsys):
        """Should return no output for git push."""
        result = _run_hook(
            {"tool_name": "Bash", "tool_input": {"command": "git push origin main"}},
            monkeypatch, capsys,
        )
        assert result is None


class TestPreToolUseGitCommitQualityGates:
    """Tests for quality gate logic on git commit commands."""

    def test_git_commit_with_gates_disabled(self, monkeypatch, capsys):
        """When qualityGates.enabled is False, should allow commit."""
        config = {"qualityGates": {"enabled": False}}
        result = _run_hook(
            {"tool_name": "Bash", "tool_input": {"command": "git commit -m 'test'"}},
            monkeypatch, capsys, config=config,
        )
        assert result is None

    def test_git_commit_with_gates_enabled_returns_context(self, monkeypatch, capsys):
        """When qualityGates.enabled is True, should return additionalContext."""
        config = {"qualityGates": {"enabled": True}}
        result = _run_hook(
            {"tool_name": "Bash", "tool_input": {"command": "git commit -m 'feat: test'"}},
            monkeypatch, capsys, config=config,
        )
        assert result is not None
        assert "hookSpecificOutput" in result
        hook_output = result["hookSpecificOutput"]
        # Should have additionalContext with quality gate reminder
        assert "additionalContext" in hook_output

    def test_git_commit_amend_with_gates(self, monkeypatch, capsys):
        """git commit --amend should also trigger quality gates."""
        config = {"qualityGates": {"enabled": True}}
        result = _run_hook(
            {"tool_name": "Bash", "tool_input": {"command": "git commit --amend"}},
            monkeypatch, capsys, config=config,
        )
        assert result is not None
        assert "hookSpecificOutput" in result

    def test_git_commit_chained_command(self, monkeypatch, capsys):
        """git add && git commit should trigger quality gates."""
        config = {"qualityGates": {"enabled": True}}
        result = _run_hook(
            {"tool_name": "Bash", "tool_input": {"command": "git add . && git commit -m 'test'"}},
            monkeypatch, capsys, config=config,
        )
        assert result is not None
        assert "hookSpecificOutput" in result

    def test_default_config_gates_disabled(self, monkeypatch, capsys):
        """Default config should have quality gates disabled — allow commit."""
        config = {"qualityGates": {"enabled": False}}
        result = _run_hook(
            {"tool_name": "Bash", "tool_input": {"command": "git commit -m 'test'"}},
            monkeypatch, capsys, config=config,
        )
        assert result is None


class TestPreToolUseSmartTestRunner:
    """Tests for SmartTestRunner integration in pre-tool-use hook."""

    def test_git_commit_injects_test_suggestion(self, monkeypatch, capsys, tmp_path):
        """git commit should inject related test suggestion into additionalContext."""
        # Create a fake staged file list
        monkeypatch.setattr(
            "subprocess.check_output",
            lambda *a, **kw: b"src/foo.ts\n",
        )
        config = {"qualityGates": {"enabled": False}}
        result = _run_hook(
            {"tool_name": "Bash", "tool_input": {"command": "git commit -m 'feat: add foo'"}},
            monkeypatch, capsys, config=config,
        )
        assert result is not None
        ctx = result["hookSpecificOutput"]["additionalContext"]
        assert "Consider running" in ctx
        assert "foo.spec.ts" in ctx

    def test_git_commit_no_staged_files_no_suggestion(self, monkeypatch, capsys):
        """git commit with no staged files should not inject suggestion."""
        monkeypatch.setattr(
            "subprocess.check_output",
            lambda *a, **kw: b"",
        )
        config = {"qualityGates": {"enabled": False}}
        result = _run_hook(
            {"tool_name": "Bash", "tool_input": {"command": "git commit -m 'test'"}},
            monkeypatch, capsys, config=config,
        )
        assert result is None

    def test_git_commit_config_files_only_no_suggestion(self, monkeypatch, capsys):
        """git commit with only config files should not inject suggestion."""
        monkeypatch.setattr(
            "subprocess.check_output",
            lambda *a, **kw: b"package.json\n.gitignore\n",
        )
        config = {"qualityGates": {"enabled": False}}
        result = _run_hook(
            {"tool_name": "Bash", "tool_input": {"command": "git commit -m 'chore: config'"}},
            monkeypatch, capsys, config=config,
        )
        assert result is None

    def test_git_commit_combines_quality_gate_and_test_suggestion(self, monkeypatch, capsys):
        """When both quality gates and test suggestion active, both in context."""
        monkeypatch.setattr(
            "subprocess.check_output",
            lambda *a, **kw: b"src/bar.ts\n",
        )
        config = {"qualityGates": {"enabled": True}}
        result = _run_hook(
            {"tool_name": "Bash", "tool_input": {"command": "git commit -m 'feat: bar'"}},
            monkeypatch, capsys, config=config,
        )
        assert result is not None
        ctx = result["hookSpecificOutput"]["additionalContext"]
        assert "Consider running" in ctx
        assert "Quality Gate" in ctx

    def test_non_git_commit_no_test_suggestion(self, monkeypatch, capsys):
        """Non-commit commands should not trigger test suggestion."""
        result = _run_hook(
            {"tool_name": "Bash", "tool_input": {"command": "git push origin main"}},
            monkeypatch, capsys,
        )
        assert result is None

    def test_subprocess_failure_graceful(self, monkeypatch, capsys):
        """If subprocess fails, hook should not crash — graceful degradation."""
        import subprocess
        def _raise(*a, **kw):
            raise subprocess.CalledProcessError(1, "git")
        monkeypatch.setattr("subprocess.check_output", _raise)
        config = {"qualityGates": {"enabled": False}}
        result = _run_hook(
            {"tool_name": "Bash", "tool_input": {"command": "git commit -m 'test'"}},
            monkeypatch, capsys, config=config,
        )
        # Should not crash — returns None (no suggestion)
        assert result is None
