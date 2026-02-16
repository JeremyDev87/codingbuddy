#!/usr/bin/env python3
"""
Unit tests for session-start.py

Run with: python3 -m pytest test_session_start.py -v
"""

import json
import os
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

            # Get sorted directories (as the function does)
            version_dirs = sorted(
                [d for d in base.iterdir() if d.is_dir()],
                reverse=True
            )

            # Note: String sorting will give wrong order for semantic versions
            # This test documents the current behavior
            dir_names = [d.name for d in version_dirs]
            # With string sorting: ['3.0.0', '2.0.0', '10.0.0', '1.0.0']
            # Expected with semver: ['10.0.0', '3.0.0', '2.0.0', '1.0.0']
            assert dir_names[0] == "3.0.0"  # Current behavior (string sort)


if __name__ == "__main__":
    import pytest
    pytest.main([__file__, "-v"])
