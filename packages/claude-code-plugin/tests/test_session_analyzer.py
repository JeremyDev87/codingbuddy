"""Tests for SessionAnalyzer — git diff analysis and untested file detection (#1128)."""
import os
import subprocess
import sys

import pytest

# Ensure hooks/lib is on path
_tests_dir = os.path.dirname(os.path.abspath(__file__))
_lib_dir = os.path.join(os.path.dirname(_tests_dir), "hooks", "lib")
if _lib_dir not in sys.path:
    sys.path.insert(0, _lib_dir)

from session_analyzer import SessionAnalyzer


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def analyzer():
    """Create a SessionAnalyzer with default settings."""
    return SessionAnalyzer()


@pytest.fixture
def analyzer_with_ref():
    """Create a SessionAnalyzer with an explicit base ref."""
    return SessionAnalyzer(base_ref="abc123")


# ---------------------------------------------------------------------------
# analyze_changes — git diff parsing
# ---------------------------------------------------------------------------


class TestAnalyzeChanges:
    """Tests for analyze_changes() — parsing git diff --stat output."""

    def test_parses_standard_diff_stat(self, analyzer, monkeypatch):
        stdout = (
            " src/app.ts        | 10 ++++------\n"
            " src/utils.py      |  3 +++\n"
            " 2 files changed, 7 insertions(+), 6 deletions(-)\n"
        )
        monkeypatch.setattr(
            subprocess,
            "run",
            lambda *a, **kw: subprocess.CompletedProcess(
                args=a, returncode=0, stdout=stdout, stderr=""
            ),
        )
        result = analyzer.analyze_changes()
        assert len(result) == 2
        assert result[0]["file"] == "src/app.ts"
        assert result[0]["insertions"] == 4
        assert result[0]["deletions"] == 6
        assert result[1]["file"] == "src/utils.py"
        assert result[1]["insertions"] == 3
        assert result[1]["deletions"] == 0

    def test_handles_new_file(self, analyzer, monkeypatch):
        stdout = (
            " src/new.ts (new)   |  5 +++++\n"
            " 1 file changed, 5 insertions(+)\n"
        )
        monkeypatch.setattr(
            subprocess,
            "run",
            lambda *a, **kw: subprocess.CompletedProcess(
                args=a, returncode=0, stdout=stdout, stderr=""
            ),
        )
        result = analyzer.analyze_changes()
        assert len(result) == 1
        assert result[0]["file"] == "src/new.ts"
        assert result[0]["insertions"] == 5
        assert result[0]["deletions"] == 0
        assert result[0]["status"] == "new"

    def test_handles_deleted_file(self, analyzer, monkeypatch):
        stdout = (
            " src/old.ts (gone)  | 10 ----------\n"
            " 1 file changed, 10 deletions(-)\n"
        )
        monkeypatch.setattr(
            subprocess,
            "run",
            lambda *a, **kw: subprocess.CompletedProcess(
                args=a, returncode=0, stdout=stdout, stderr=""
            ),
        )
        result = analyzer.analyze_changes()
        assert len(result) == 1
        assert result[0]["file"] == "src/old.ts"
        assert result[0]["insertions"] == 0
        assert result[0]["deletions"] == 10
        assert result[0]["status"] == "deleted"

    def test_handles_renamed_file(self, analyzer, monkeypatch):
        stdout = (
            " src/{old.ts => new.ts} |  2 +-\n"
            " 1 file changed, 1 insertion(+), 1 deletion(-)\n"
        )
        monkeypatch.setattr(
            subprocess,
            "run",
            lambda *a, **kw: subprocess.CompletedProcess(
                args=a, returncode=0, stdout=stdout, stderr=""
            ),
        )
        result = analyzer.analyze_changes()
        assert len(result) == 1
        assert result[0]["status"] == "renamed"

    def test_handles_binary_file(self, analyzer, monkeypatch):
        stdout = (
            " image.png | Bin 0 -> 1234 bytes\n"
            " 1 file changed\n"
        )
        monkeypatch.setattr(
            subprocess,
            "run",
            lambda *a, **kw: subprocess.CompletedProcess(
                args=a, returncode=0, stdout=stdout, stderr=""
            ),
        )
        result = analyzer.analyze_changes()
        assert len(result) == 1
        assert result[0]["file"] == "image.png"
        assert result[0]["status"] == "binary"
        assert result[0]["insertions"] == 0
        assert result[0]["deletions"] == 0

    def test_returns_empty_on_no_changes(self, analyzer, monkeypatch):
        monkeypatch.setattr(
            subprocess,
            "run",
            lambda *a, **kw: subprocess.CompletedProcess(
                args=a, returncode=0, stdout="", stderr=""
            ),
        )
        result = analyzer.analyze_changes()
        assert result == []

    def test_returns_empty_on_subprocess_failure(self, analyzer, monkeypatch):
        monkeypatch.setattr(
            subprocess,
            "run",
            lambda *a, **kw: subprocess.CompletedProcess(
                args=a, returncode=128, stdout="", stderr="fatal: error"
            ),
        )
        result = analyzer.analyze_changes()
        assert result == []

    def test_returns_empty_on_timeout(self, analyzer, monkeypatch):
        def raise_timeout(*a, **kw):
            raise subprocess.TimeoutExpired(cmd="git", timeout=10)

        monkeypatch.setattr(subprocess, "run", raise_timeout)
        result = analyzer.analyze_changes()
        assert result == []

    def test_uses_base_ref_when_provided(self, analyzer_with_ref, monkeypatch):
        calls = []

        def capture_run(*a, **kw):
            calls.append(a)
            return subprocess.CompletedProcess(
                args=a, returncode=0, stdout="", stderr=""
            )

        monkeypatch.setattr(subprocess, "run", capture_run)
        analyzer_with_ref.analyze_changes()
        # The git command should include the base_ref
        cmd = calls[0][0]
        assert "abc123" in cmd

    def test_insertions_only(self, analyzer, monkeypatch):
        stdout = (
            " src/foo.py |  7 +++++++\n"
            " 1 file changed, 7 insertions(+)\n"
        )
        monkeypatch.setattr(
            subprocess,
            "run",
            lambda *a, **kw: subprocess.CompletedProcess(
                args=a, returncode=0, stdout=stdout, stderr=""
            ),
        )
        result = analyzer.analyze_changes()
        assert result[0]["insertions"] == 7
        assert result[0]["deletions"] == 0

    def test_deletions_only(self, analyzer, monkeypatch):
        stdout = (
            " src/foo.py |  4 ----\n"
            " 1 file changed, 4 deletions(-)\n"
        )
        monkeypatch.setattr(
            subprocess,
            "run",
            lambda *a, **kw: subprocess.CompletedProcess(
                args=a, returncode=0, stdout=stdout, stderr=""
            ),
        )
        result = analyzer.analyze_changes()
        assert result[0]["insertions"] == 0
        assert result[0]["deletions"] == 4


# ---------------------------------------------------------------------------
# detect_untested_files
# ---------------------------------------------------------------------------


class TestDetectUntestedFiles:
    """Tests for detect_untested_files() — source files missing test files."""

    def test_detects_ts_file_without_test(self, analyzer, monkeypatch, tmp_path):
        changes = [
            {"file": "src/app.ts", "insertions": 5, "deletions": 0, "status": "modified"},
        ]
        monkeypatch.setattr(analyzer, "analyze_changes", lambda: changes)
        # No test file exists
        monkeypatch.setattr(os.path, "exists", lambda p: False)
        result = analyzer.detect_untested_files()
        assert "src/app.ts" in result

    def test_skips_file_with_spec_test(self, analyzer, monkeypatch):
        changes = [
            {"file": "src/app.ts", "insertions": 5, "deletions": 0, "status": "modified"},
        ]
        monkeypatch.setattr(analyzer, "analyze_changes", lambda: changes)
        # app.spec.ts exists
        monkeypatch.setattr(
            os.path,
            "exists",
            lambda p: "app.spec.ts" in p or "app.test.ts" in p,
        )
        result = analyzer.detect_untested_files()
        assert "src/app.ts" not in result

    def test_skips_file_with_test_prefix(self, analyzer, monkeypatch):
        changes = [
            {"file": "src/utils.py", "insertions": 3, "deletions": 1, "status": "modified"},
        ]
        monkeypatch.setattr(analyzer, "analyze_changes", lambda: changes)
        # test_utils.py exists
        monkeypatch.setattr(os.path, "exists", lambda p: "test_utils.py" in p)
        result = analyzer.detect_untested_files()
        assert "src/utils.py" not in result

    def test_skips_test_files_themselves(self, analyzer, monkeypatch):
        changes = [
            {"file": "tests/test_app.py", "insertions": 5, "deletions": 0, "status": "modified"},
            {"file": "src/app.spec.ts", "insertions": 3, "deletions": 0, "status": "modified"},
        ]
        monkeypatch.setattr(analyzer, "analyze_changes", lambda: changes)
        monkeypatch.setattr(os.path, "exists", lambda p: False)
        result = analyzer.detect_untested_files()
        assert result == []

    def test_skips_config_files(self, analyzer, monkeypatch):
        changes = [
            {"file": "tsconfig.json", "insertions": 1, "deletions": 0, "status": "modified"},
            {"file": ".eslintrc.js", "insertions": 2, "deletions": 0, "status": "modified"},
            {"file": "package.json", "insertions": 1, "deletions": 1, "status": "modified"},
        ]
        monkeypatch.setattr(analyzer, "analyze_changes", lambda: changes)
        monkeypatch.setattr(os.path, "exists", lambda p: False)
        result = analyzer.detect_untested_files()
        assert result == []

    def test_skips_node_modules_and_dist(self, analyzer, monkeypatch):
        changes = [
            {"file": "node_modules/pkg/index.js", "insertions": 10, "deletions": 0, "status": "modified"},
            {"file": "dist/bundle.js", "insertions": 100, "deletions": 0, "status": "modified"},
        ]
        monkeypatch.setattr(analyzer, "analyze_changes", lambda: changes)
        monkeypatch.setattr(os.path, "exists", lambda p: False)
        result = analyzer.detect_untested_files()
        assert result == []

    def test_skips_deleted_files(self, analyzer, monkeypatch):
        changes = [
            {"file": "src/old.ts", "insertions": 0, "deletions": 10, "status": "deleted"},
        ]
        monkeypatch.setattr(analyzer, "analyze_changes", lambda: changes)
        monkeypatch.setattr(os.path, "exists", lambda p: False)
        result = analyzer.detect_untested_files()
        assert result == []

    def test_multiple_untested_files(self, analyzer, monkeypatch):
        changes = [
            {"file": "src/a.ts", "insertions": 5, "deletions": 0, "status": "modified"},
            {"file": "src/b.py", "insertions": 3, "deletions": 0, "status": "new"},
            {"file": "src/c.js", "insertions": 2, "deletions": 1, "status": "modified"},
        ]
        monkeypatch.setattr(analyzer, "analyze_changes", lambda: changes)
        monkeypatch.setattr(os.path, "exists", lambda p: False)
        result = analyzer.detect_untested_files()
        assert len(result) == 3


# ---------------------------------------------------------------------------
# generate_summary
# ---------------------------------------------------------------------------


class TestGenerateSummary:
    """Tests for generate_summary() — human-readable change summary."""

    def test_generates_summary_with_changes(self, analyzer, monkeypatch):
        changes = [
            {"file": "src/app.ts", "insertions": 10, "deletions": 3, "status": "modified"},
            {"file": "src/utils.ts", "insertions": 5, "deletions": 0, "status": "modified"},
            {"file": "tests/test_app.py", "insertions": 8, "deletions": 2, "status": "modified"},
        ]
        monkeypatch.setattr(analyzer, "analyze_changes", lambda: changes)
        summary = analyzer.generate_summary()
        assert "3" in summary  # 3 files
        assert "+" in summary  # insertions
        assert "-" in summary  # deletions

    def test_generates_empty_summary_on_no_changes(self, analyzer, monkeypatch):
        monkeypatch.setattr(analyzer, "analyze_changes", lambda: [])
        summary = analyzer.generate_summary()
        assert "no changes" in summary.lower() or summary == ""

    def test_groups_by_directory(self, analyzer, monkeypatch):
        changes = [
            {"file": "hooks/lib/a.py", "insertions": 5, "deletions": 0, "status": "modified"},
            {"file": "hooks/lib/b.py", "insertions": 3, "deletions": 1, "status": "modified"},
            {"file": "tests/test_a.py", "insertions": 8, "deletions": 0, "status": "new"},
        ]
        monkeypatch.setattr(analyzer, "analyze_changes", lambda: changes)
        summary = analyzer.generate_summary()
        assert "hooks/lib" in summary
        assert "tests" in summary

    def test_summary_includes_total_insertions_deletions(self, analyzer, monkeypatch):
        changes = [
            {"file": "src/a.ts", "insertions": 10, "deletions": 5, "status": "modified"},
            {"file": "src/b.ts", "insertions": 20, "deletions": 3, "status": "modified"},
        ]
        monkeypatch.setattr(analyzer, "analyze_changes", lambda: changes)
        summary = analyzer.generate_summary()
        assert "+30" in summary
        assert "-8" in summary
