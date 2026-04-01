"""Tests for marketplace auto-updater (#1101)."""
import json
import os
import subprocess
import tempfile
import time
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest

import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "hooks" / "lib"))
from updater import (
    find_marketplace_clone,
    should_check_update,
    record_update_check,
    auto_update_marketplace,
    THROTTLE_SECONDS,
)


class TestFindMarketplaceClone:
    def test_finds_jeremydev87_marketplace(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            clone_dir = Path(tmpdir) / ".claude" / "plugins" / "marketplaces" / "jeremydev87"
            clone_dir.mkdir(parents=True)
            (clone_dir / ".git").mkdir()

            result = find_marketplace_clone(Path(tmpdir))
            assert result == clone_dir

    def test_returns_none_when_no_marketplace(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            result = find_marketplace_clone(Path(tmpdir))
            assert result is None

    def test_returns_none_when_not_git_repo(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            clone_dir = Path(tmpdir) / ".claude" / "plugins" / "marketplaces" / "jeremydev87"
            clone_dir.mkdir(parents=True)
            # No .git directory

            result = find_marketplace_clone(Path(tmpdir))
            assert result is None


class TestThrottle:
    def test_should_check_when_no_timestamp_file(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            assert should_check_update(Path(tmpdir) / "nonexistent") is True

    def test_should_not_check_within_throttle(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            ts_file = Path(tmpdir) / ".last_update_check"
            ts_file.write_text(str(time.time()))

            assert should_check_update(ts_file) is False

    def test_should_check_after_throttle_expired(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            ts_file = Path(tmpdir) / ".last_update_check"
            ts_file.write_text(str(time.time() - THROTTLE_SECONDS - 1))

            assert should_check_update(ts_file) is True

    def test_record_creates_file(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            ts_file = Path(tmpdir) / "sub" / ".last_update_check"
            record_update_check(ts_file)
            assert ts_file.exists()
            assert abs(float(ts_file.read_text()) - time.time()) < 2


class TestAutoUpdate:
    def test_returns_none_when_no_marketplace(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            result = auto_update_marketplace(home=Path(tmpdir))
            assert result is None

    @patch("updater.subprocess.run")
    def test_returns_none_when_throttled(self, mock_run):
        with tempfile.TemporaryDirectory() as tmpdir:
            home = Path(tmpdir)
            clone_dir = home / ".claude" / "plugins" / "marketplaces" / "jeremydev87"
            clone_dir.mkdir(parents=True)
            (clone_dir / ".git").mkdir()

            # Write recent timestamp
            data_dir = home / ".codingbuddy"
            data_dir.mkdir(parents=True)
            (data_dir / ".last_update_check").write_text(str(time.time()))

            result = auto_update_marketplace(home=home)
            assert result is None
            mock_run.assert_not_called()

    @patch("updater.subprocess.run")
    def test_returns_none_when_up_to_date(self, mock_run):
        with tempfile.TemporaryDirectory() as tmpdir:
            home = Path(tmpdir)
            clone_dir = home / ".claude" / "plugins" / "marketplaces" / "jeremydev87"
            clone_dir.mkdir(parents=True)
            (clone_dir / ".git").mkdir()

            # Mock git commands: fetch succeeds, HEAD == origin/master
            mock_run.side_effect = [
                MagicMock(returncode=0),  # git fetch
                MagicMock(returncode=0, stdout="abc123\n"),  # git rev-parse HEAD
                MagicMock(returncode=0, stdout="abc123\n"),  # git rev-parse origin/master
            ]

            result = auto_update_marketplace(home=home)
            assert result is None

    @patch("updater.subprocess.run")
    def test_returns_version_when_updated(self, mock_run):
        with tempfile.TemporaryDirectory() as tmpdir:
            home = Path(tmpdir)
            clone_dir = home / ".claude" / "plugins" / "marketplaces" / "jeremydev87"
            clone_dir.mkdir(parents=True)
            (clone_dir / ".git").mkdir()

            # Create package.json with version
            pkg = clone_dir / "packages" / "claude-code-plugin" / "package.json"
            pkg.parent.mkdir(parents=True)
            pkg.write_text(json.dumps({"version": "5.2.0"}))

            mock_run.side_effect = [
                MagicMock(returncode=0),  # git fetch
                MagicMock(returncode=0, stdout="abc123\n"),  # git rev-parse HEAD
                MagicMock(returncode=0, stdout="def456\n"),  # git rev-parse origin/master
                MagicMock(returncode=1),  # git fetch --unshallow (fails = already full)
                MagicMock(returncode=0),  # git reset --hard origin/master
            ]

            result = auto_update_marketplace(home=home)
            assert result == "5.2.0"
