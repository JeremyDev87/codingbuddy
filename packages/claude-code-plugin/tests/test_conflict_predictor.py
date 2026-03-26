"""Tests for hooks/lib/conflict_predictor.py — ConflictPredictor."""
import os
import sys
from unittest.mock import patch

import pytest

# Add hooks/lib to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "hooks", "lib"))

from conflict_predictor import ConflictPredictor


class TestInit:
    """Constructor and default values."""

    def test_default_values(self):
        """Default repo_path='.' and max_commits=200."""
        cp = ConflictPredictor()
        assert cp.repo_path == "."
        assert cp.max_commits == 200

    def test_custom_values(self):
        """Custom repo_path and max_commits."""
        cp = ConflictPredictor(repo_path="/tmp/repo", max_commits=50)
        assert cp.repo_path == "/tmp/repo"
        assert cp.max_commits == 50


class TestGetFileChangeHistory:
    """Parse git log to build commit→files mapping."""

    def test_parses_multiple_commits(self):
        """Multiple commits with files are parsed correctly."""
        git_output = (
            "---COMMIT---\n"
            "src/a.py\n"
            "src/b.py\n"
            "\n"
            "---COMMIT---\n"
            "src/b.py\n"
            "src/c.py\n"
        )
        cp = ConflictPredictor()
        with patch("subprocess.check_output", return_value=git_output):
            history = cp.get_file_change_history()
        assert len(history) == 2
        assert "src/a.py" in history[0]
        assert "src/b.py" in history[0]
        assert "src/b.py" in history[1]
        assert "src/c.py" in history[1]

    def test_empty_repo(self):
        """Empty git log output returns empty list."""
        cp = ConflictPredictor()
        with patch("subprocess.check_output", return_value=""):
            history = cp.get_file_change_history()
        assert history == []

    def test_single_commit(self):
        """Single commit is parsed correctly."""
        git_output = "---COMMIT---\nsrc/main.py\n"
        cp = ConflictPredictor()
        with patch("subprocess.check_output", return_value=git_output):
            history = cp.get_file_change_history()
        assert len(history) == 1
        assert history[0] == ["src/main.py"]

    def test_filters_empty_filenames(self):
        """Blank lines within a commit are filtered out."""
        git_output = "---COMMIT---\nsrc/a.py\n\n\nsrc/b.py\n"
        cp = ConflictPredictor()
        with patch("subprocess.check_output", return_value=git_output):
            history = cp.get_file_change_history()
        assert history[0] == ["src/a.py", "src/b.py"]

    def test_subprocess_timeout_returns_empty(self):
        """When git command times out, return empty list."""
        import subprocess

        cp = ConflictPredictor()
        with patch(
            "subprocess.check_output", side_effect=subprocess.TimeoutExpired("git", 10)
        ):
            history = cp.get_file_change_history()
        assert history == []


class TestBuildCoChangeMatrix:
    """Build file pair co-change frequency matrix."""

    def test_co_change_counted(self):
        """Files in same commit are counted as co-changed."""
        git_output = (
            "---COMMIT---\n"
            "src/a.py\n"
            "src/b.py\n"
            "\n"
            "---COMMIT---\n"
            "src/a.py\n"
            "src/b.py\n"
        )
        cp = ConflictPredictor()
        with patch("subprocess.check_output", return_value=git_output):
            matrix = cp.build_co_change_matrix()
        # a,b appear together in 2 commits
        key = ("src/a.py", "src/b.py")
        assert matrix.get(key, 0) == 2

    def test_no_co_change_for_single_file_commits(self):
        """Single-file commits produce no co-change entries."""
        git_output = "---COMMIT---\nsrc/a.py\n\n---COMMIT---\nsrc/b.py\n"
        cp = ConflictPredictor()
        with patch("subprocess.check_output", return_value=git_output):
            matrix = cp.build_co_change_matrix()
        assert len(matrix) == 0

    def test_matrix_key_ordering(self):
        """Keys are always sorted alphabetically: (a, b) not (b, a)."""
        git_output = "---COMMIT---\nsrc/z.py\nsrc/a.py\n"
        cp = ConflictPredictor()
        with patch("subprocess.check_output", return_value=git_output):
            matrix = cp.build_co_change_matrix()
        assert ("src/a.py", "src/z.py") in matrix
        assert ("src/z.py", "src/a.py") not in matrix


class TestExtractTargetFiles:
    """Extract file paths from issue body text."""

    def test_extracts_file_paths(self):
        """Finds file paths like src/foo.ts in issue body."""
        body = "Fix the bug in src/foo.ts and update tests/test_foo.py"
        cp = ConflictPredictor()
        files = cp.extract_target_files(body)
        assert "src/foo.ts" in files
        assert "tests/test_foo.py" in files

    def test_extracts_from_code_blocks(self):
        """File paths inside markdown code blocks are extracted."""
        body = "Edit `packages/lib/utils.ts` and `hooks/lib/bar.py`"
        cp = ConflictPredictor()
        files = cp.extract_target_files(body)
        assert "packages/lib/utils.ts" in files
        assert "hooks/lib/bar.py" in files

    def test_no_files_returns_empty(self):
        """Body with no file paths returns empty list."""
        body = "Please fix the login bug"
        cp = ConflictPredictor()
        files = cp.extract_target_files(body)
        assert files == []

    def test_deduplicates_files(self):
        """Same file mentioned twice returns single entry."""
        body = "Check src/a.py then revisit src/a.py again"
        cp = ConflictPredictor()
        files = cp.extract_target_files(body)
        assert files.count("src/a.py") == 1


class TestGetRiskLevel:
    """Classify risk: high (>=5), medium (>=2), low (<2)."""

    def test_high_risk(self):
        cp = ConflictPredictor()
        assert cp.get_risk_level(5) == "high"
        assert cp.get_risk_level(10) == "high"

    def test_medium_risk(self):
        cp = ConflictPredictor()
        assert cp.get_risk_level(2) == "medium"
        assert cp.get_risk_level(4) == "medium"

    def test_low_risk(self):
        cp = ConflictPredictor()
        assert cp.get_risk_level(0) == "low"
        assert cp.get_risk_level(1) == "low"


class TestPredictConflicts:
    """Predict conflicts between issue pairs."""

    def test_detects_shared_files(self):
        """Issues targeting the same file produce a conflict prediction."""
        git_output = (
            "---COMMIT---\n"
            "src/shared.py\n"
            "src/other.py\n"
        ) * 5  # 5 commits with these two files
        issues = [
            {"number": 1, "body": "", "files": ["src/shared.py"]},
            {"number": 2, "body": "", "files": ["src/shared.py"]},
        ]
        cp = ConflictPredictor()
        with patch("subprocess.check_output", return_value=git_output):
            results = cp.predict_conflicts(issues)
        assert len(results) == 1
        assert set(results[0]["issue_pair"]) == {1, 2}
        assert "src/shared.py" in results[0]["shared_files"]

    def test_no_overlap_returns_empty(self):
        """Issues with completely different files produce no predictions."""
        git_output = "---COMMIT---\nsrc/a.py\n\n---COMMIT---\nsrc/b.py\n"
        issues = [
            {"number": 1, "body": "", "files": ["src/a.py"]},
            {"number": 2, "body": "", "files": ["src/b.py"]},
        ]
        cp = ConflictPredictor()
        with patch("subprocess.check_output", return_value=git_output):
            results = cp.predict_conflicts(issues)
        assert results == []

    def test_risk_level_in_result(self):
        """Result includes correct risk level based on co-change count."""
        git_output = (
            "---COMMIT---\n"
            "src/x.py\n"
            "src/y.py\n"
        ) * 3  # 3 co-changes → medium
        issues = [
            {"number": 10, "body": "", "files": ["src/x.py"]},
            {"number": 20, "body": "", "files": ["src/y.py"]},
        ]
        cp = ConflictPredictor()
        with patch("subprocess.check_output", return_value=git_output):
            results = cp.predict_conflicts(issues)
        assert len(results) == 1
        assert results[0]["risk"] == "medium"

    def test_multiple_issue_pairs(self):
        """Three issues with pairwise overlap produce multiple predictions."""
        git_output = (
            "---COMMIT---\nsrc/a.py\nsrc/b.py\nsrc/c.py\n"
        ) * 5
        issues = [
            {"number": 1, "body": "", "files": ["src/a.py"]},
            {"number": 2, "body": "", "files": ["src/b.py"]},
            {"number": 3, "body": "", "files": ["src/a.py", "src/c.py"]},
        ]
        cp = ConflictPredictor()
        with patch("subprocess.check_output", return_value=git_output):
            results = cp.predict_conflicts(issues)
        # Issue 1 & 3 share src/a.py, issue pairs with co-changed files
        pairs = [tuple(sorted(r["issue_pair"])) for r in results]
        assert len(results) >= 2

    def test_uses_body_for_file_extraction(self):
        """When files list is empty, extracts from issue body."""
        git_output = (
            "---COMMIT---\nsrc/shared.py\nsrc/other.py\n"
        ) * 5
        issues = [
            {"number": 1, "body": "Fix src/shared.py", "files": []},
            {"number": 2, "body": "Update src/shared.py", "files": []},
        ]
        cp = ConflictPredictor()
        with patch("subprocess.check_output", return_value=git_output):
            results = cp.predict_conflicts(issues)
        assert len(results) == 1
        assert "src/shared.py" in results[0]["shared_files"]
