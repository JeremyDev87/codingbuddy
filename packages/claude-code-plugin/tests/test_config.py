"""Tests for hooks/lib/config.py — config loader with mtime cache."""
import json
import os
import sys
import time
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "hooks", "lib"))

from config import load_config, get_config, _config_cache, DEFAULT_CONFIG


class TestLoadConfig:
    """Tests for load_config — find and read codingbuddy.config.json."""

    def test_loads_config_from_cwd(self, tmp_path):
        """Should load config from the given directory."""
        config = {"language": "ko", "qualityGates": {"enabled": True}}
        (tmp_path / "codingbuddy.config.json").write_text(json.dumps(config))

        result = load_config(str(tmp_path))
        assert result["language"] == "ko"
        assert result["qualityGates"]["enabled"] is True

    def test_walks_up_to_find_config(self, tmp_path):
        """Should search parent directories for config."""
        config = {"language": "en"}
        (tmp_path / "codingbuddy.config.json").write_text(json.dumps(config))

        child = tmp_path / "a" / "b" / "c"
        child.mkdir(parents=True)

        result = load_config(str(child))
        assert result["language"] == "en"

    def test_returns_default_when_not_found(self, tmp_path):
        """Should return default config when no config file exists."""
        result = load_config(str(tmp_path))
        assert result == DEFAULT_CONFIG

    def test_returns_default_on_invalid_json(self, tmp_path):
        """Should return default config when file has invalid JSON."""
        (tmp_path / "codingbuddy.config.json").write_text("not json{")
        result = load_config(str(tmp_path))
        assert result == DEFAULT_CONFIG


class TestGetConfig:
    """Tests for get_config — mtime-based cached config loading."""

    def setup_method(self):
        """Clear the cache before each test."""
        _config_cache.clear()

    def test_returns_config(self, tmp_path):
        """get_config should return config dict."""
        config = {"language": "ja"}
        (tmp_path / "codingbuddy.config.json").write_text(json.dumps(config))

        result = get_config(str(tmp_path))
        assert result["language"] == "ja"

    def test_caches_by_mtime(self, tmp_path):
        """Should return cached result if file mtime hasn't changed."""
        config_file = tmp_path / "codingbuddy.config.json"
        config_file.write_text(json.dumps({"language": "en"}))

        result1 = get_config(str(tmp_path))
        # Overwrite file content but keep same mtime
        result2 = get_config(str(tmp_path))

        assert result1 is result2  # Same object reference = cached

    def test_reloads_when_mtime_changes(self, tmp_path):
        """Should reload config when file modification time changes."""
        config_file = tmp_path / "codingbuddy.config.json"
        config_file.write_text(json.dumps({"language": "en"}))

        result1 = get_config(str(tmp_path))
        assert result1["language"] == "en"

        # Change file — force different mtime
        time.sleep(0.05)
        config_file.write_text(json.dumps({"language": "ko"}))
        # Touch to ensure mtime changes
        os.utime(str(config_file), None)

        result2 = get_config(str(tmp_path))
        assert result2["language"] == "ko"
        assert result1 is not result2

    def test_cache_returns_default_when_file_removed(self, tmp_path):
        """Should return default config when cached file is removed."""
        config_file = tmp_path / "codingbuddy.config.json"
        config_file.write_text(json.dumps({"language": "en"}))

        get_config(str(tmp_path))
        config_file.unlink()

        result = get_config(str(tmp_path))
        assert result == DEFAULT_CONFIG
