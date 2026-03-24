"""Tests for hooks/post-tool-use.py — PostToolUse hook skeleton."""
import importlib
import importlib.util
import json
import os
import sys
import io
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
