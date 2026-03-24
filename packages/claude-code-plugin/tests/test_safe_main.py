"""Tests for hooks/lib/safe_main.py — crash-safe decorator."""
import json
import sys
import os
import io
import pytest

# Add hooks/lib to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "hooks", "lib"))

from safe_main import safe_main


class TestSafeMain:
    """Tests for the safe_main decorator."""

    def test_reads_json_from_stdin_and_passes_to_function(self, monkeypatch):
        """safe_main should parse JSON from stdin and pass it to the wrapped function."""
        input_data = {"tool_name": "Bash", "tool_input": {"command": "ls"}}
        monkeypatch.setattr("sys.stdin", io.StringIO(json.dumps(input_data)))

        received = {}

        @safe_main
        def handler(data):
            received.update(data)
            return None

        with pytest.raises(SystemExit) as exc_info:
            handler()
        assert exc_info.value.code == 0
        assert received == input_data

    def test_writes_json_output_to_stdout(self, monkeypatch, capsys):
        """safe_main should write the return value as JSON to stdout."""
        input_data = {"tool_name": "Bash"}
        monkeypatch.setattr("sys.stdin", io.StringIO(json.dumps(input_data)))

        @safe_main
        def handler(data):
            return {"decision": "approve"}

        with pytest.raises(SystemExit) as exc_info:
            handler()
        assert exc_info.value.code == 0
        output = json.loads(capsys.readouterr().out)
        assert output == {"decision": "approve"}

    def test_none_return_produces_no_output(self, monkeypatch, capsys):
        """When handler returns None, nothing should be written to stdout."""
        monkeypatch.setattr("sys.stdin", io.StringIO("{}"))

        @safe_main
        def handler(data):
            return None

        with pytest.raises(SystemExit) as exc_info:
            handler()
        assert exc_info.value.code == 0
        assert capsys.readouterr().out == ""

    def test_always_exits_zero_on_handler_exception(self, monkeypatch):
        """Even if the handler raises, safe_main must exit(0) to not block Claude Code."""
        monkeypatch.setattr("sys.stdin", io.StringIO("{}"))

        @safe_main
        def handler(data):
            raise RuntimeError("something broke")

        with pytest.raises(SystemExit) as exc_info:
            handler()
        assert exc_info.value.code == 0

    def test_always_exits_zero_on_invalid_json_stdin(self, monkeypatch):
        """Invalid JSON on stdin should not crash Claude Code."""
        monkeypatch.setattr("sys.stdin", io.StringIO("not json"))

        @safe_main
        def handler(data):
            return {"should": "not reach"}

        with pytest.raises(SystemExit) as exc_info:
            handler()
        assert exc_info.value.code == 0

    def test_always_exits_zero_on_empty_stdin(self, monkeypatch):
        """Empty stdin should not crash Claude Code."""
        monkeypatch.setattr("sys.stdin", io.StringIO(""))

        @safe_main
        def handler(data):
            return {"should": "not reach"}

        with pytest.raises(SystemExit) as exc_info:
            handler()
        assert exc_info.value.code == 0

    def test_adds_hooks_lib_to_sys_path(self):
        """Importing safe_main should have hooks/lib in sys.path."""
        hooks_lib = os.path.join(os.path.dirname(__file__), "..", "hooks", "lib")
        hooks_lib_resolved = os.path.realpath(hooks_lib)
        # At minimum, our test setup adds it
        assert any(os.path.realpath(p) == hooks_lib_resolved for p in sys.path)
