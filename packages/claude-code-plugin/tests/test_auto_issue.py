"""Tests for auto_issue — auto-create GitHub issues for untested files (#1132)."""
import json
import os
import subprocess
import sys

import pytest

# Ensure hooks/lib is on path
_tests_dir = os.path.dirname(os.path.abspath(__file__))
_lib_dir = os.path.join(os.path.dirname(_tests_dir), "hooks", "lib")
if _lib_dir not in sys.path:
    sys.path.insert(0, _lib_dir)

from auto_issue import create_test_gap_issues


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def config_dir(tmp_path):
    """Create a temp directory with codingbuddy.config.json."""
    config_file = tmp_path / "codingbuddy.config.json"
    config_file.write_text(json.dumps({"autoCreateIssues": True}))
    return tmp_path


@pytest.fixture
def config_dir_disabled(tmp_path):
    """Create a temp directory with autoCreateIssues disabled."""
    config_file = tmp_path / "codingbuddy.config.json"
    config_file.write_text(json.dumps({"autoCreateIssues": False}))
    return tmp_path


@pytest.fixture
def config_dir_missing(tmp_path):
    """Temp directory with no config file (default behavior)."""
    return tmp_path


# ---------------------------------------------------------------------------
# Issue creation via gh CLI
# ---------------------------------------------------------------------------


class TestIssueCreation:
    """Tests for creating issues via gh issue create."""

    def test_creates_issue_for_untested_file(self, config_dir, monkeypatch):
        """Verify gh issue create is called with correct args."""
        calls = []

        def mock_run(cmd, **kwargs):
            calls.append(cmd)
            return subprocess.CompletedProcess(
                args=cmd,
                returncode=0,
                stdout="https://github.com/owner/repo/issues/42\n",
                stderr="",
            )

        monkeypatch.setattr(subprocess, "run", mock_run)
        result = create_test_gap_issues(
            ["src/utils.ts"], project_dir=str(config_dir)
        )

        assert len(result) == 1
        assert result[0]["file"] == "src/utils.ts"
        assert result[0]["issue_url"] == "https://github.com/owner/repo/issues/42"
        assert result[0]["issue_number"] == 42

        # Verify gh issue create was called
        assert len(calls) == 1
        cmd = calls[0]
        assert cmd[0] == "gh"
        assert cmd[1] == "issue"
        assert cmd[2] == "create"
        assert "--title" in cmd
        assert "--label" in cmd

    def test_issue_title_contains_filename(self, config_dir, monkeypatch):
        """Issue title should contain the filename."""
        calls = []

        def mock_run(cmd, **kwargs):
            calls.append(cmd)
            return subprocess.CompletedProcess(
                args=cmd,
                returncode=0,
                stdout="https://github.com/owner/repo/issues/1\n",
                stderr="",
            )

        monkeypatch.setattr(subprocess, "run", mock_run)
        create_test_gap_issues(["src/auth/login.ts"], project_dir=str(config_dir))

        cmd = calls[0]
        title_idx = cmd.index("--title") + 1
        assert "login.ts" in cmd[title_idx]

    def test_issue_labels_include_test_and_auto_generated(self, config_dir, monkeypatch):
        """Issues should have test,auto-generated labels."""
        calls = []

        def mock_run(cmd, **kwargs):
            calls.append(cmd)
            return subprocess.CompletedProcess(
                args=cmd,
                returncode=0,
                stdout="https://github.com/owner/repo/issues/1\n",
                stderr="",
            )

        monkeypatch.setattr(subprocess, "run", mock_run)
        create_test_gap_issues(["src/foo.ts"], project_dir=str(config_dir))

        cmd = calls[0]
        label_idx = cmd.index("--label") + 1
        assert "test" in cmd[label_idx]
        assert "auto-generated" in cmd[label_idx]

    def test_issue_body_contains_file_path(self, config_dir, monkeypatch):
        """Issue body should include the file path."""
        calls = []

        def mock_run(cmd, **kwargs):
            calls.append(cmd)
            return subprocess.CompletedProcess(
                args=cmd,
                returncode=0,
                stdout="https://github.com/owner/repo/issues/1\n",
                stderr="",
            )

        monkeypatch.setattr(subprocess, "run", mock_run)
        create_test_gap_issues(["src/api/handler.py"], project_dir=str(config_dir))

        cmd = calls[0]
        body_idx = cmd.index("--body") + 1
        assert "src/api/handler.py" in cmd[body_idx]


# ---------------------------------------------------------------------------
# Rate limiting — max 3 issues per session
# ---------------------------------------------------------------------------


class TestRateLimiting:
    """Tests for rate limiting to max 3 issues per session."""

    def test_creates_at_most_3_issues(self, config_dir, monkeypatch):
        """Only first 3 files should get issues."""
        calls = []
        issue_num = [0]

        def mock_run(cmd, **kwargs):
            issue_num[0] += 1
            calls.append(cmd)
            return subprocess.CompletedProcess(
                args=cmd,
                returncode=0,
                stdout=f"https://github.com/owner/repo/issues/{issue_num[0]}\n",
                stderr="",
            )

        monkeypatch.setattr(subprocess, "run", mock_run)

        files = [f"src/file{i}.ts" for i in range(5)]
        result = create_test_gap_issues(files, project_dir=str(config_dir))

        assert len(result) == 3
        assert len(calls) == 3

    def test_returns_empty_for_empty_input(self, config_dir, monkeypatch):
        """No files means no issues."""
        result = create_test_gap_issues([], project_dir=str(config_dir))
        assert result == []


# ---------------------------------------------------------------------------
# Opt-in config — autoCreateIssues
# ---------------------------------------------------------------------------


class TestOptInConfig:
    """Tests for autoCreateIssues config setting."""

    def test_skips_when_disabled(self, config_dir_disabled, monkeypatch):
        """When autoCreateIssues is false, no issues should be created."""
        calls = []

        def mock_run(cmd, **kwargs):
            calls.append(cmd)
            return subprocess.CompletedProcess(
                args=cmd, returncode=0, stdout="", stderr=""
            )

        monkeypatch.setattr(subprocess, "run", mock_run)
        result = create_test_gap_issues(
            ["src/foo.ts"], project_dir=str(config_dir_disabled)
        )

        assert result == []
        assert len(calls) == 0

    def test_skips_when_no_config_file(self, config_dir_missing, monkeypatch):
        """Default config has autoCreateIssues=false, so skip."""
        calls = []

        def mock_run(cmd, **kwargs):
            calls.append(cmd)
            return subprocess.CompletedProcess(
                args=cmd, returncode=0, stdout="", stderr=""
            )

        monkeypatch.setattr(subprocess, "run", mock_run)
        result = create_test_gap_issues(
            ["src/foo.ts"], project_dir=str(config_dir_missing)
        )

        assert result == []
        assert len(calls) == 0


# ---------------------------------------------------------------------------
# Error handling
# ---------------------------------------------------------------------------


class TestErrorHandling:
    """Tests for graceful error handling."""

    def test_handles_gh_not_found(self, config_dir, monkeypatch):
        """When gh CLI is not available, return empty list."""

        def mock_run(cmd, **kwargs):
            raise FileNotFoundError("gh not found")

        monkeypatch.setattr(subprocess, "run", mock_run)
        result = create_test_gap_issues(["src/foo.ts"], project_dir=str(config_dir))

        assert result == []

    def test_handles_gh_failure(self, config_dir, monkeypatch):
        """When gh returns non-zero, skip that file and continue."""
        call_count = [0]

        def mock_run(cmd, **kwargs):
            call_count[0] += 1
            if call_count[0] == 1:
                return subprocess.CompletedProcess(
                    args=cmd, returncode=1, stdout="", stderr="error"
                )
            return subprocess.CompletedProcess(
                args=cmd,
                returncode=0,
                stdout="https://github.com/owner/repo/issues/10\n",
                stderr="",
            )

        monkeypatch.setattr(subprocess, "run", mock_run)
        result = create_test_gap_issues(
            ["src/fail.ts", "src/ok.ts"], project_dir=str(config_dir)
        )

        assert len(result) == 1
        assert result[0]["file"] == "src/ok.ts"

    def test_handles_malformed_url(self, config_dir, monkeypatch):
        """When gh output doesn't contain a valid issue URL, skip gracefully."""

        def mock_run(cmd, **kwargs):
            return subprocess.CompletedProcess(
                args=cmd,
                returncode=0,
                stdout="something unexpected\n",
                stderr="",
            )

        monkeypatch.setattr(subprocess, "run", mock_run)
        result = create_test_gap_issues(["src/foo.ts"], project_dir=str(config_dir))

        assert result == []


# ---------------------------------------------------------------------------
# Prioritization — new files before modified
# ---------------------------------------------------------------------------


class TestPrioritization:
    """Tests for file prioritization when exceeding rate limit."""

    def test_prioritizes_new_files_over_modified(self, config_dir, monkeypatch):
        """New files should be prioritized over modified files."""
        calls = []
        issue_num = [0]

        def mock_run(cmd, **kwargs):
            issue_num[0] += 1
            calls.append(cmd)
            return subprocess.CompletedProcess(
                args=cmd,
                returncode=0,
                stdout=f"https://github.com/owner/repo/issues/{issue_num[0]}\n",
                stderr="",
            )

        monkeypatch.setattr(subprocess, "run", mock_run)

        # 2 modified + 4 new = 6 files, only 3 should be created
        # new files should be prioritized
        files = [
            "src/modified1.ts",
            "src/modified2.ts",
            "src/new1.ts",
            "src/new2.ts",
            "src/new3.ts",
            "src/new4.ts",
        ]
        new_files = {"src/new1.ts", "src/new2.ts", "src/new3.ts", "src/new4.ts"}

        result = create_test_gap_issues(
            files, project_dir=str(config_dir), new_files=new_files
        )

        assert len(result) == 3
        # All 3 created issues should be from new files
        created_files = {r["file"] for r in result}
        assert created_files.issubset(new_files)

    def test_prioritizes_source_over_config(self, config_dir, monkeypatch):
        """Source files should be prioritized over config/utility files."""
        calls = []
        issue_num = [0]

        def mock_run(cmd, **kwargs):
            issue_num[0] += 1
            calls.append(cmd)
            return subprocess.CompletedProcess(
                args=cmd,
                returncode=0,
                stdout=f"https://github.com/owner/repo/issues/{issue_num[0]}\n",
                stderr="",
            )

        monkeypatch.setattr(subprocess, "run", mock_run)

        files = [
            "scripts/helper.py",
            "src/core/auth.ts",
            "utils/format.ts",
            "src/api/handler.ts",
            "config/setup.ts",
        ]

        result = create_test_gap_issues(files, project_dir=str(config_dir))

        assert len(result) == 3
        # src/ files should be prioritized
        created_files = [r["file"] for r in result]
        assert "src/core/auth.ts" in created_files
        assert "src/api/handler.ts" in created_files
