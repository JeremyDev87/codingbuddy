"""Tests for runtime_mode detection utility."""
import json
import os

import pytest

from hooks.lib.runtime_mode import detect_runtime_mode, is_mcp_available


@pytest.fixture()
def fake_home(tmp_path):
    """Create a fake home directory with .claude/ structure."""
    claude_dir = tmp_path / ".claude"
    claude_dir.mkdir()
    return tmp_path


def _write_mcp_json(home_path, data):
    mcp_path = os.path.join(str(home_path), ".claude", "mcp.json")
    with open(mcp_path, "w", encoding="utf-8") as f:
        json.dump(data, f)


class TestDetectRuntimeMode:
    def test_returns_mcp_when_codingbuddy_entry_exists(self, fake_home):
        _write_mcp_json(fake_home, {
            "mcpServers": {
                "codingbuddy": {"command": "npx", "args": ["codingbuddy"]}
            }
        })
        assert detect_runtime_mode(str(fake_home)) == "mcp"

    def test_returns_mcp_for_codingbuddy_rules_entry(self, fake_home):
        """Case-insensitive match on key containing 'codingbuddy'."""
        _write_mcp_json(fake_home, {
            "mcpServers": {
                "CodingBuddy-Rules": {"command": "npx", "args": ["codingbuddy-rules"]}
            }
        })
        assert detect_runtime_mode(str(fake_home)) == "mcp"

    def test_returns_standalone_without_codingbuddy(self, fake_home):
        _write_mcp_json(fake_home, {
            "mcpServers": {
                "other-server": {"command": "npx", "args": ["other"]}
            }
        })
        assert detect_runtime_mode(str(fake_home)) == "standalone"

    def test_returns_standalone_when_mcp_json_missing(self, tmp_path):
        assert detect_runtime_mode(str(tmp_path)) == "standalone"

    def test_returns_standalone_on_parse_error(self, fake_home):
        mcp_path = os.path.join(str(fake_home), ".claude", "mcp.json")
        with open(mcp_path, "w", encoding="utf-8") as f:
            f.write("{invalid json!!!")
        assert detect_runtime_mode(str(fake_home)) == "standalone"

    def test_returns_standalone_when_mcp_servers_missing(self, fake_home):
        _write_mcp_json(fake_home, {"otherKey": "value"})
        assert detect_runtime_mode(str(fake_home)) == "standalone"


class TestIsMcpAvailable:
    def test_returns_true_when_mcp(self, fake_home):
        _write_mcp_json(fake_home, {
            "mcpServers": {
                "codingbuddy": {"command": "npx"}
            }
        })
        assert is_mcp_available(str(fake_home)) is True

    def test_returns_false_when_standalone(self, tmp_path):
        assert is_mcp_available(str(tmp_path)) is False
