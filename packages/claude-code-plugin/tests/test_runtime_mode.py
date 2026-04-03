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


@pytest.fixture()
def fake_project(tmp_path):
    """Create a fake project directory."""
    project_dir = tmp_path / "my-project"
    project_dir.mkdir()
    return project_dir


def _write_mcp_json(home_path, data):
    mcp_path = os.path.join(str(home_path), ".claude", "mcp.json")
    with open(mcp_path, "w", encoding="utf-8") as f:
        json.dump(data, f)


def _write_settings_json(home_path, data):
    settings_path = os.path.join(str(home_path), ".claude", "settings.json")
    with open(settings_path, "w", encoding="utf-8") as f:
        json.dump(data, f)


def _write_project_mcp_json(project_path, data):
    mcp_path = os.path.join(str(project_path), ".mcp.json")
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


class TestSettingsJsonDetection:
    def test_returns_mcp_from_settings_json(self, fake_home):
        """settings.json with codingbuddy mcpServers → 'mcp'."""
        _write_settings_json(fake_home, {
            "mcpServers": {
                "codingbuddy": {"command": "npx", "args": ["codingbuddy"]}
            }
        })
        assert detect_runtime_mode(str(fake_home)) == "mcp"

    def test_settings_json_case_insensitive(self, fake_home):
        _write_settings_json(fake_home, {
            "mcpServers": {
                "CodingBuddy-MCP": {"command": "node", "args": ["server.js"]}
            }
        })
        assert detect_runtime_mode(str(fake_home)) == "mcp"

    def test_settings_json_without_codingbuddy_returns_standalone(self, fake_home):
        """settings.json without codingbuddy → still checks next, returns standalone."""
        _write_settings_json(fake_home, {
            "mcpServers": {
                "other-tool": {"command": "npx", "args": ["other"]}
            }
        })
        assert detect_runtime_mode(str(fake_home)) == "standalone"

    def test_settings_json_invalid_json(self, fake_home):
        settings_path = os.path.join(str(fake_home), ".claude", "settings.json")
        with open(settings_path, "w", encoding="utf-8") as f:
            f.write("not json!")
        assert detect_runtime_mode(str(fake_home)) == "standalone"

    def test_settings_json_no_mcp_servers_key(self, fake_home):
        _write_settings_json(fake_home, {"permissions": {"allow": []}})
        assert detect_runtime_mode(str(fake_home)) == "standalone"


class TestProjectMcpJsonDetection:
    def test_returns_mcp_from_project_mcp_json(self, fake_home, fake_project):
        """project .mcp.json with codingbuddy → 'mcp'."""
        _write_project_mcp_json(fake_project, {
            "mcpServers": {
                "codingbuddy": {"command": "npx", "args": ["codingbuddy"]}
            }
        })
        assert detect_runtime_mode(str(fake_home), str(fake_project)) == "mcp"

    def test_project_mcp_json_case_insensitive(self, fake_home, fake_project):
        _write_project_mcp_json(fake_project, {
            "mcpServers": {
                "CodingBuddy-Rules": {"command": "npx"}
            }
        })
        assert detect_runtime_mode(str(fake_home), str(fake_project)) == "mcp"

    def test_project_mcp_json_without_codingbuddy(self, fake_home, fake_project):
        _write_project_mcp_json(fake_project, {
            "mcpServers": {
                "some-other-server": {"command": "npx"}
            }
        })
        assert detect_runtime_mode(str(fake_home), str(fake_project)) == "standalone"

    def test_project_dir_none_skips_check(self, fake_home):
        """When project_dir is None, skip project-level check."""
        assert detect_runtime_mode(str(fake_home), None) == "standalone"

    def test_project_mcp_json_missing(self, fake_home, fake_project):
        assert detect_runtime_mode(str(fake_home), str(fake_project)) == "standalone"


class TestPriorityOrder:
    def test_mcp_json_takes_precedence_over_settings(self, fake_home):
        """mcp.json is checked first — settings.json is not needed."""
        _write_mcp_json(fake_home, {
            "mcpServers": {
                "codingbuddy": {"command": "npx"}
            }
        })
        _write_settings_json(fake_home, {
            "mcpServers": {
                "other-server": {"command": "npx"}
            }
        })
        assert detect_runtime_mode(str(fake_home)) == "mcp"

    def test_settings_json_checked_when_mcp_json_absent(self, fake_home):
        """Falls through to settings.json when mcp.json has no match."""
        _write_mcp_json(fake_home, {
            "mcpServers": {
                "other-server": {"command": "npx"}
            }
        })
        _write_settings_json(fake_home, {
            "mcpServers": {
                "codingbuddy": {"command": "npx"}
            }
        })
        assert detect_runtime_mode(str(fake_home)) == "mcp"

    def test_project_mcp_json_checked_last(self, fake_home, fake_project):
        """Falls through to project .mcp.json when home configs have no match."""
        _write_mcp_json(fake_home, {"mcpServers": {"other": {"command": "x"}}})
        _write_settings_json(fake_home, {"mcpServers": {"other2": {"command": "x"}}})
        _write_project_mcp_json(fake_project, {
            "mcpServers": {
                "codingbuddy": {"command": "npx"}
            }
        })
        assert detect_runtime_mode(str(fake_home), str(fake_project)) == "mcp"

    def test_all_three_empty_returns_standalone(self, fake_home, fake_project):
        """All 3 locations empty → 'standalone'."""
        _write_mcp_json(fake_home, {"mcpServers": {}})
        _write_settings_json(fake_home, {"mcpServers": {}})
        _write_project_mcp_json(fake_project, {"mcpServers": {}})
        assert detect_runtime_mode(str(fake_home), str(fake_project)) == "standalone"


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

    def test_returns_true_from_settings_json(self, fake_home):
        _write_settings_json(fake_home, {
            "mcpServers": {
                "codingbuddy": {"command": "npx"}
            }
        })
        assert is_mcp_available(str(fake_home)) is True

    def test_returns_true_from_project_mcp_json(self, fake_home, fake_project):
        _write_project_mcp_json(fake_project, {
            "mcpServers": {
                "codingbuddy": {"command": "npx"}
            }
        })
        assert is_mcp_available(str(fake_home), str(fake_project)) is True
