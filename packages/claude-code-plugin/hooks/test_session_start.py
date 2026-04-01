#!/usr/bin/env python3
"""
Unit tests for session-start.py

Run with: python3 -m pytest test_session_start.py -v
"""

import json
import os
import sys
import tempfile
from pathlib import Path
from unittest.mock import patch, MagicMock

# Import the module under test
import importlib.util
spec = importlib.util.spec_from_file_location("session_hook", Path(__file__).parent / "session-start.py")
session_hook = importlib.util.module_from_spec(spec)
spec.loader.exec_module(session_hook)


class TestFindPluginSource:
    """Tests for find_plugin_source function."""

    def test_finds_source_from_env_variable(self):
        """Test finding source from CLAUDE_PLUGIN_DIR env variable."""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create mock plugin structure
            hooks_dir = Path(tmpdir) / "hooks"
            hooks_dir.mkdir()
            source_file = hooks_dir / "user-prompt-submit.py"
            source_file.write_text("# mock hook")

            with patch.dict(os.environ, {"CLAUDE_PLUGIN_DIR": tmpdir}):
                result = session_hook.find_plugin_source()
                # Compare resolved paths (implementation now resolves symlinks)
                assert result == source_file.resolve()

    def test_returns_none_when_env_dir_has_no_hook(self):
        """Test returns None when env dir exists but has no hook."""
        with tempfile.TemporaryDirectory() as tmpdir:
            with patch.dict(os.environ, {"CLAUDE_PLUGIN_DIR": tmpdir}):
                result = session_hook.find_plugin_source()
                # Should continue to fallback paths
                # Result depends on whether fallback paths exist

    def test_finds_source_from_versioned_cache(self):
        """Test finding source from versioned plugin cache."""
        with tempfile.TemporaryDirectory() as tmpdir:
            home = Path(tmpdir)

            # Create mock versioned plugin structure
            cache_dir = home / ".claude/plugins/cache/jeremydev87/codingbuddy/3.0.0/hooks"
            cache_dir.mkdir(parents=True)
            source_file = cache_dir / "user-prompt-submit.py"
            source_file.write_text("# mock hook")

            with patch.dict(os.environ, {"CLAUDE_PLUGIN_DIR": ""}, clear=False):
                with patch.object(Path, "home", return_value=home):
                    result = session_hook.find_plugin_source()
                    # Compare resolved paths (implementation now resolves symlinks)
                    assert result == source_file.resolve()

    def test_finds_source_from_dev_workspace(self):
        """Test finding source from dev workspace directory pattern."""
        with tempfile.TemporaryDirectory() as tmpdir:
            home = Path(tmpdir)

            # Create mock dev workspace structure
            dev_dir = home / "workspace/codingbuddy/packages/claude-code-plugin/hooks"
            dev_dir.mkdir(parents=True)
            source_file = dev_dir / "user-prompt-submit.py"
            source_file.write_text("# mock hook")

            with patch.dict(os.environ, {"CLAUDE_PLUGIN_DIR": ""}, clear=False):
                with patch.object(Path, "home", return_value=home):
                    result = session_hook.find_plugin_source()
                    assert result == source_file.resolve()

    def test_returns_none_when_no_source_found(self):
        """Test returns None when no source file found anywhere."""
        with tempfile.TemporaryDirectory() as tmpdir:
            home = Path(tmpdir)

            with patch.dict(os.environ, {"CLAUDE_PLUGIN_DIR": ""}, clear=False):
                with patch.object(Path, "home", return_value=home):
                    result = session_hook.find_plugin_source()
                    assert result is None


class TestIsHookRegistered:
    """Tests for is_hook_registered function."""

    def test_returns_false_when_settings_not_exists(self):
        """Test returns False when settings.json doesn't exist."""
        with tempfile.TemporaryDirectory() as tmpdir:
            settings_file = Path(tmpdir) / "settings.json"
            assert session_hook.is_hook_registered(settings_file) is False

    def test_returns_false_when_hook_not_registered(self):
        """Test returns False when hook is not in settings."""
        with tempfile.TemporaryDirectory() as tmpdir:
            settings_file = Path(tmpdir) / "settings.json"
            settings_file.write_text(json.dumps({
                "hooks": {
                    "UserPromptSubmit": []
                }
            }))
            assert session_hook.is_hook_registered(settings_file) is False

    def test_returns_true_when_hook_is_registered(self):
        """Test returns True when hook is already registered."""
        with tempfile.TemporaryDirectory() as tmpdir:
            settings_file = Path(tmpdir) / "settings.json"
            settings_file.write_text(json.dumps({
                "hooks": {
                    "UserPromptSubmit": [
                        {
                            "hooks": [
                                {
                                    "type": "command",
                                    "command": session_hook.HOOK_COMMAND
                                }
                            ]
                        }
                    ]
                }
            }))
            assert session_hook.is_hook_registered(settings_file) is True

    def test_returns_false_for_invalid_json(self):
        """Test returns False for invalid JSON file."""
        with tempfile.TemporaryDirectory() as tmpdir:
            settings_file = Path(tmpdir) / "settings.json"
            settings_file.write_text("not valid json")
            assert session_hook.is_hook_registered(settings_file) is False


class TestRegisterHookInSettings:
    """Tests for register_hook_in_settings function."""

    def test_creates_new_settings_file(self):
        """Test creates settings.json if it doesn't exist."""
        with tempfile.TemporaryDirectory() as tmpdir:
            settings_file = Path(tmpdir) / "settings.json"

            result = session_hook.register_hook_in_settings(settings_file)

            assert result is True
            assert settings_file.exists()

            settings = json.loads(settings_file.read_text())
            assert "hooks" in settings
            assert "UserPromptSubmit" in settings["hooks"]

    def test_preserves_existing_settings(self):
        """Test preserves existing settings when adding hook."""
        with tempfile.TemporaryDirectory() as tmpdir:
            settings_file = Path(tmpdir) / "settings.json"
            settings_file.write_text(json.dumps({
                "existing_setting": "value",
                "hooks": {
                    "OtherHook": [{"some": "config"}]
                }
            }))

            result = session_hook.register_hook_in_settings(settings_file)

            assert result is True
            settings = json.loads(settings_file.read_text())
            assert settings["existing_setting"] == "value"
            assert "OtherHook" in settings["hooks"]
            assert "UserPromptSubmit" in settings["hooks"]

    def test_returns_false_when_already_registered(self):
        """Test returns False when hook is already registered."""
        with tempfile.TemporaryDirectory() as tmpdir:
            settings_file = Path(tmpdir) / "settings.json"
            settings_file.write_text(json.dumps({
                "hooks": {
                    "UserPromptSubmit": [
                        {
                            "hooks": [
                                {
                                    "type": "command",
                                    "command": session_hook.HOOK_COMMAND
                                }
                            ]
                        }
                    ]
                }
            }))

            result = session_hook.register_hook_in_settings(settings_file)

            assert result is False

    def test_backs_up_corrupted_settings(self):
        """Test backs up corrupted settings file."""
        with tempfile.TemporaryDirectory() as tmpdir:
            settings_file = Path(tmpdir) / "settings.json"
            settings_file.write_text("not valid json {{{")

            result = session_hook.register_hook_in_settings(settings_file)

            assert result is True
            backup_file = settings_file.with_suffix(".json.bak")
            assert backup_file.exists()


class TestVersionSorting:
    """Tests for version directory sorting."""

    def test_sorts_versions_correctly(self):
        """Test that version directories are sorted correctly."""
        with tempfile.TemporaryDirectory() as tmpdir:
            base = Path(tmpdir)

            # Create version directories
            versions = ["1.0.0", "2.0.0", "10.0.0", "3.0.0"]
            for v in versions:
                hooks_dir = base / v / "hooks"
                hooks_dir.mkdir(parents=True)
                (hooks_dir / "user-prompt-submit.py").write_text(f"# version {v}")

            # Use actual sort_version_dirs() for semantic version sorting
            version_dirs = session_hook.sort_version_dirs(
                [d for d in base.iterdir() if d.is_dir()]
            )

            dir_names = [d.name for d in version_dirs]
            assert dir_names == ["10.0.0", "3.0.0", "2.0.0", "1.0.0"]


class TestLoadAgentVisuals:
    """Tests for load_agent_visuals function."""

    def test_loads_agents_with_visual(self):
        """Test loading agent JSONs that have visual fields."""
        with tempfile.TemporaryDirectory() as tmpdir:
            agent = {
                "name": "Frontend Developer",
                "visual": {"eye": "\u2605", "colorAnsi": "yellow"},
            }
            Path(tmpdir, "frontend-developer.json").write_text(json.dumps(agent))
            result = session_hook.load_agent_visuals(tmpdir)
            assert "frontend-developer" in result
            assert result["frontend-developer"]["name"] == "Frontend Developer"
            assert result["frontend-developer"]["visual"]["eye"] == "\u2605"

    def test_skips_agents_without_visual(self):
        """Test that agents without visual field are skipped."""
        with tempfile.TemporaryDirectory() as tmpdir:
            agent = {"name": "Some Agent"}
            Path(tmpdir, "some-agent.json").write_text(json.dumps(agent))
            result = session_hook.load_agent_visuals(tmpdir)
            assert "some-agent" not in result

    def test_handles_missing_dir(self):
        """Test returns empty dict for missing directory."""
        result = session_hook.load_agent_visuals("/nonexistent/path")
        assert result == {}

    def test_handles_invalid_json(self):
        """Test skips files with invalid JSON."""
        with tempfile.TemporaryDirectory() as tmpdir:
            Path(tmpdir, "bad.json").write_text("not json{{{")
            agent = {
                "name": "Good Agent",
                "visual": {"eye": "O", "colorAnsi": "blue"},
            }
            Path(tmpdir, "good.json").write_text(json.dumps(agent))
            result = session_hook.load_agent_visuals(tmpdir)
            assert "good" in result
            assert "bad" not in result

    def test_skips_non_json_files(self):
        """Test skips files that are not .json."""
        with tempfile.TemporaryDirectory() as tmpdir:
            Path(tmpdir, "readme.md").write_text("# Agents")
            result = session_hook.load_agent_visuals(tmpdir)
            assert result == {}


class TestEnsureLibPath:
    """Tests for _ensure_lib_path helper."""

    def test_returns_lib_dir_path(self):
        result = session_hook._ensure_lib_path()
        assert result.endswith("lib")
        assert os.path.isdir(result)

    def test_adds_to_sys_path(self):
        result = session_hook._ensure_lib_path()
        assert result in sys.path


class TestFindAgentsDir:
    """Tests for _find_agents_dir function."""

    def test_finds_agents_from_relative_path(self):
        """Test that agents dir can be found relative to hook file."""
        result = session_hook._find_agents_dir()
        # In dev environment, this should find the agents directory
        if result is not None:
            assert os.path.isdir(result)
            # Should contain at least one .json file
            json_files = [f for f in os.listdir(result) if f.endswith(".json")]
            assert len(json_files) > 0


class TestEnsureMcpJson:
    """Tests for _ensure_mcp_json function (#1100)."""

    def test_creates_mcp_json_when_missing(self):
        """Test creates mcp.json with codingbuddy entry when file doesn't exist."""
        with tempfile.TemporaryDirectory() as tmpdir:
            mcp_path = Path(tmpdir) / ".claude" / "mcp.json"

            session_hook._ensure_mcp_json(mcp_path)

            assert mcp_path.exists()
            data = json.loads(mcp_path.read_text())
            assert "codingbuddy" in data["mcpServers"]
            assert data["mcpServers"]["codingbuddy"]["command"] == "codingbuddy"
            assert data["mcpServers"]["codingbuddy"]["args"] == ["mcp"]

    def test_merges_into_existing_mcp_json(self):
        """Test adds codingbuddy entry while preserving existing servers."""
        with tempfile.TemporaryDirectory() as tmpdir:
            mcp_path = Path(tmpdir) / "mcp.json"
            mcp_path.write_text(json.dumps({
                "mcpServers": {
                    "other-server": {"command": "other", "args": ["--flag"]}
                }
            }))

            session_hook._ensure_mcp_json(mcp_path)

            data = json.loads(mcp_path.read_text())
            assert "codingbuddy" in data["mcpServers"]
            assert "other-server" in data["mcpServers"]

    def test_does_not_overwrite_existing_codingbuddy(self):
        """Test does not overwrite user's custom codingbuddy configuration."""
        with tempfile.TemporaryDirectory() as tmpdir:
            mcp_path = Path(tmpdir) / "mcp.json"
            custom_config = {
                "mcpServers": {
                    "codingbuddy": {"command": "custom-path", "args": ["--custom"]}
                }
            }
            mcp_path.write_text(json.dumps(custom_config))

            session_hook._ensure_mcp_json(mcp_path)

            data = json.loads(mcp_path.read_text())
            assert data["mcpServers"]["codingbuddy"]["command"] == "custom-path"

    def test_handles_corrupted_mcp_json(self):
        """Test handles corrupted JSON gracefully."""
        with tempfile.TemporaryDirectory() as tmpdir:
            mcp_path = Path(tmpdir) / "mcp.json"
            mcp_path.write_text("not valid json{{{")

            session_hook._ensure_mcp_json(mcp_path)

            data = json.loads(mcp_path.read_text())
            assert "codingbuddy" in data["mcpServers"]


class TestHookLibCopy:
    """Tests for lib/ directory copying alongside hook file (#1102)."""

    def test_copies_lib_dir_when_installing_hook(self):
        """Test that lib/ directory is copied alongside the hook file."""
        with tempfile.TemporaryDirectory() as tmpdir:
            home = Path(tmpdir) / "home"
            home.mkdir()

            # Create mock plugin source with lib/
            plugin_dir = Path(tmpdir) / "plugin" / "hooks"
            plugin_dir.mkdir(parents=True)
            source_file = plugin_dir / "user-prompt-submit.py"
            source_file.write_text("# mock hook")

            lib_dir = plugin_dir / "lib"
            lib_dir.mkdir()
            (lib_dir / "hud_state.py").write_text("# mock hud_state")
            (lib_dir / "__init__.py").write_text("")

            hooks_dir = home / ".claude" / "hooks"
            target_file = hooks_dir / session_hook.HOOK_FILENAME

            # Simulate main() behavior: find source and install
            with patch.object(session_hook, "find_plugin_source", return_value=source_file):
                with patch.object(Path, "home", return_value=home):
                    session_hook._install_hook_with_lib(source_file, hooks_dir, target_file)

            # Verify hook file was copied
            assert target_file.exists()

            # Verify lib/ was copied
            target_lib = hooks_dir / "lib"
            assert target_lib.is_dir()
            assert (target_lib / "hud_state.py").exists()
            assert (target_lib / "__init__.py").exists()

    def test_updates_lib_dir_when_already_exists(self):
        """Test that lib/ directory is updated when it already exists."""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create source with new file
            plugin_dir = Path(tmpdir) / "plugin" / "hooks"
            plugin_dir.mkdir(parents=True)
            source_file = plugin_dir / "user-prompt-submit.py"
            source_file.write_text("# mock hook")
            source_lib = plugin_dir / "lib"
            source_lib.mkdir()
            (source_lib / "hud_state.py").write_text("# updated version")
            (source_lib / "new_module.py").write_text("# new")

            # Create existing target with old lib
            hooks_dir = Path(tmpdir) / "target_hooks"
            hooks_dir.mkdir(parents=True)
            target_file = hooks_dir / session_hook.HOOK_FILENAME
            target_lib = hooks_dir / "lib"
            target_lib.mkdir()
            (target_lib / "hud_state.py").write_text("# old version")

            session_hook._install_hook_with_lib(source_file, hooks_dir, target_file)

            # Verify updated
            assert (target_lib / "hud_state.py").read_text() == "# updated version"
            assert (target_lib / "new_module.py").exists()

    def test_works_when_source_has_no_lib(self):
        """Test graceful handling when source has no lib/ directory."""
        with tempfile.TemporaryDirectory() as tmpdir:
            plugin_dir = Path(tmpdir) / "plugin" / "hooks"
            plugin_dir.mkdir(parents=True)
            source_file = plugin_dir / "user-prompt-submit.py"
            source_file.write_text("# mock hook")
            # No lib/ directory

            hooks_dir = Path(tmpdir) / "target_hooks"
            hooks_dir.mkdir(parents=True)
            target_file = hooks_dir / session_hook.HOOK_FILENAME

            # Should not raise
            session_hook._install_hook_with_lib(source_file, hooks_dir, target_file)

            assert target_file.exists()
            assert not (hooks_dir / "lib").exists()


if __name__ == "__main__":
    import pytest
    pytest.main([__file__, "-v"])
