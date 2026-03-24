#!/usr/bin/env python3
"""
Unit tests for FileWatcher (lazy mtime-based file change detection).

Run with: python3 -m pytest tests/test_file_watcher.py -v
"""

import os
import tempfile
import time
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "hooks"))

from lib.file_watcher import FileWatcher


class TestSnapshot:
    """Tests for FileWatcher.snapshot()."""

    def test_snapshot_captures_mtimes(self):
        """Creates temp files, verifies mtimes are recorded."""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create test files
            file1 = Path(tmpdir) / "file1.md"
            file2 = Path(tmpdir) / "file2.md"
            file1.write_text("content1")
            file2.write_text("content2")

            watcher = FileWatcher(tmpdir)
            result = watcher.snapshot(patterns=["*.md"])

            assert isinstance(result, dict)
            assert len(result) == 2
            # Check that mtimes are floats
            for path, mtime in result.items():
                assert isinstance(mtime, float)
                assert os.path.isabs(path) or path.startswith(tmpdir)


class TestDetectChanges:
    """Tests for FileWatcher.detect_changes()."""

    def test_detect_changes_finds_modified_files(self):
        """Modify a file after snapshot, verify it's detected."""
        with tempfile.TemporaryDirectory() as tmpdir:
            file1 = Path(tmpdir) / "file1.md"
            file1.write_text("original")

            watcher = FileWatcher(tmpdir)
            watcher.snapshot(patterns=["*.md"])

            # Ensure mtime changes (some filesystems have 1s resolution)
            time.sleep(0.05)
            file1.write_text("modified")
            # Force mtime change for filesystems with coarse resolution
            new_mtime = os.stat(file1).st_mtime + 1
            os.utime(file1, (new_mtime, new_mtime))

            changes = watcher.detect_changes()
            assert len(changes) >= 1
            assert any("file1.md" in p for p in changes)

    def test_detect_changes_returns_empty_when_unchanged(self):
        """No changes after snapshot, empty list returned."""
        with tempfile.TemporaryDirectory() as tmpdir:
            file1 = Path(tmpdir) / "file1.md"
            file1.write_text("content")

            watcher = FileWatcher(tmpdir)
            watcher.snapshot(patterns=["*.md"])

            changes = watcher.detect_changes()
            assert changes == []

    def test_handles_nonexistent_files_gracefully(self):
        """Deleted file after snapshot is detected as a change."""
        with tempfile.TemporaryDirectory() as tmpdir:
            file1 = Path(tmpdir) / "file1.md"
            file1.write_text("content")

            watcher = FileWatcher(tmpdir)
            watcher.snapshot(patterns=["*.md"])

            # Delete the file
            file1.unlink()

            changes = watcher.detect_changes()
            assert len(changes) == 1
            assert any("file1.md" in p for p in changes)


class TestDefaultPatterns:
    """Tests for default pattern behavior."""

    def test_default_patterns_include_ai_rules_and_config(self):
        """Verify default patterns cover .ai-rules and config."""
        with tempfile.TemporaryDirectory() as tmpdir:
            watcher = FileWatcher(tmpdir)
            patterns = watcher._resolve_patterns(None)

            # Default patterns should reference these paths
            # Since no files exist, result is empty, but we verify
            # the watcher uses correct default patterns
            assert watcher._default_patterns is not None
            assert any(".ai-rules" in p for p in watcher._default_patterns)
            assert any("codingbuddy.config.json" in p for p in watcher._default_patterns)


class TestGlobExpansion:
    """Tests for glob pattern expansion."""

    def test_glob_expansion_for_patterns(self):
        """Verify **/*.md expands correctly to nested files."""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create nested structure
            subdir = Path(tmpdir) / "sub" / "deep"
            subdir.mkdir(parents=True)
            (Path(tmpdir) / "root.md").write_text("root")
            (subdir / "nested.md").write_text("nested")
            (Path(tmpdir) / "ignore.txt").write_text("not md")

            watcher = FileWatcher(tmpdir)
            files = watcher._resolve_patterns(["**/*.md"])

            assert len(files) == 2
            filenames = [os.path.basename(f) for f in files]
            assert "root.md" in filenames
            assert "nested.md" in filenames
            assert "ignore.txt" not in filenames
