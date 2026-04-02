"""SessionAnalyzer — git diff analysis and untested file detection (#1128).

Provides structured change analysis for the Intelligence Report:
- ``analyze_changes()`` parses ``git diff --stat``
- ``detect_untested_files()`` finds source files without tests
- ``generate_summary()`` produces a human-readable change summary
"""

import logging
import os
import re
import subprocess
from collections import defaultdict
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

GIT_TIMEOUT = 10  # seconds

# File extensions considered source code (testable)
SOURCE_EXTENSIONS = {".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".java", ".rs"}

# Directories / prefixes to skip when looking for untested files
SKIP_DIRS = {"node_modules", "dist", "build", ".next", "__pycache__", ".git"}

# Config file patterns to skip
CONFIG_PATTERNS = re.compile(
    r"(^\..*rc|tsconfig|jest\.config|package\.json|package-lock|yarn\.lock"
    r"|\.eslintrc|prettier|babel\.config|webpack|vite\.config|next\.config"
    r"|Makefile|Dockerfile|\.env|\.gitignore|\.editorconfig)",
    re.IGNORECASE,
)

# Patterns that identify a file as a test
TEST_PATTERNS = re.compile(
    r"(\.spec\.|\.test\.|test_|_test\.|__tests__)",
    re.IGNORECASE,
)


class SessionAnalyzer:
    """Analyzes git changes for session intelligence reports."""

    def __init__(self, base_ref: Optional[str] = None):
        """Initialize with an optional base commit ref.

        Args:
            base_ref: Git ref to diff against. Defaults to HEAD~1.
        """
        self._base_ref = base_ref or "HEAD~1"

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def analyze_changes(self) -> List[Dict]:
        """Run ``git diff --stat`` and return structured change data.

        Returns:
            List of dicts with keys: file, insertions, deletions, status.
            Returns empty list on any error.
        """
        try:
            proc = subprocess.run(
                ["git", "diff", "--stat", self._base_ref],
                capture_output=True,
                text=True,
                timeout=GIT_TIMEOUT,
            )
        except subprocess.TimeoutExpired:
            logger.warning("git diff timed out after %ds", GIT_TIMEOUT)
            return []

        if proc.returncode != 0:
            logger.warning("git diff failed (rc=%d): %s", proc.returncode, proc.stderr)
            return []

        return self._parse_diff_stat(proc.stdout)

    def detect_untested_files(self) -> List[str]:
        """Find changed source files that have no corresponding test file.

        Returns:
            List of source file paths missing tests.
        """
        changes = self.analyze_changes()
        untested: List[str] = []

        for change in changes:
            filepath = change["file"]
            status = change.get("status", "modified")

            # Skip deleted files — no need for tests
            if status == "deleted":
                continue

            # Skip non-source files
            if not self._is_source_file(filepath):
                continue

            # Skip test files themselves
            if TEST_PATTERNS.search(filepath):
                continue

            # Check if a corresponding test file exists
            if not self._has_test_file(filepath):
                untested.append(filepath)

        return untested

    def generate_summary(self) -> str:
        """Generate a human-readable summary of changes.

        Returns:
            Formatted summary string.
        """
        changes = self.analyze_changes()
        if not changes:
            return "No changes detected."

        total_ins = sum(c["insertions"] for c in changes)
        total_del = sum(c["deletions"] for c in changes)
        num_files = len(changes)

        # Group by top-level directory
        groups: Dict[str, int] = defaultdict(int)
        for c in changes:
            parts = c["file"].split("/")
            directory = "/".join(parts[:-1]) if len(parts) > 1 else "."
            groups[directory] += 1

        group_parts = [f"{count} in {d}" for d, count in sorted(groups.items())]
        group_str = ", ".join(group_parts)

        return f"Modified {num_files} files: {group_str} (+{total_ins}, -{total_del})"

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _parse_diff_stat(output: str) -> List[Dict]:
        """Parse ``git diff --stat`` output into structured dicts."""
        results: List[Dict] = []
        for line in output.strip().splitlines():
            line = line.strip()
            # Skip the summary line (e.g. "2 files changed, 7 insertions(+)")
            if "file" in line and "changed" in line:
                continue
            if not line or "|" not in line:
                continue

            file_part, stat_part = line.split("|", 1)
            file_part = file_part.strip()
            stat_part = stat_part.strip()

            # Detect status
            status = "modified"
            if "(new)" in file_part:
                file_part = file_part.replace("(new)", "").strip()
                status = "new"
            elif "(gone)" in file_part:
                file_part = file_part.replace("(gone)", "").strip()
                status = "deleted"
            elif "=>" in file_part:
                status = "renamed"

            # Handle binary files
            if stat_part.startswith("Bin"):
                results.append(
                    {
                        "file": file_part,
                        "insertions": 0,
                        "deletions": 0,
                        "status": "binary",
                    }
                )
                continue

            # Count + and - in the visual bar
            insertions = stat_part.count("+")
            deletions = stat_part.count("-")

            results.append(
                {
                    "file": file_part,
                    "insertions": insertions,
                    "deletions": deletions,
                    "status": status,
                }
            )

        return results

    @staticmethod
    def _is_source_file(filepath: str) -> bool:
        """Check if the file is a testable source file."""
        # Skip directories in SKIP_DIRS
        parts = filepath.split("/")
        if any(p in SKIP_DIRS for p in parts):
            return False

        basename = os.path.basename(filepath)

        # Skip config files
        if CONFIG_PATTERNS.search(basename):
            return False

        _, ext = os.path.splitext(filepath)
        return ext.lower() in SOURCE_EXTENSIONS

    @staticmethod
    def _has_test_file(filepath: str) -> bool:
        """Check if a corresponding test file exists for the given source file."""
        directory = os.path.dirname(filepath)
        basename = os.path.basename(filepath)
        name, ext = os.path.splitext(basename)

        # TypeScript / JavaScript test patterns
        if ext in (".ts", ".tsx", ".js", ".jsx"):
            candidates = [
                os.path.join(directory, f"{name}.spec{ext}"),
                os.path.join(directory, f"{name}.test{ext}"),
                os.path.join(directory, "__tests__", f"{name}{ext}"),
                os.path.join(directory, "__tests__", f"{name}.test{ext}"),
            ]
        # Python test patterns
        elif ext == ".py":
            candidates = [
                os.path.join(directory, f"test_{basename}"),
                os.path.join(directory, f"{name}_test.py"),
                # Also check tests/ sibling directory
                os.path.join(os.path.dirname(directory), "tests", f"test_{basename}"),
            ]
        else:
            # Generic pattern
            candidates = [
                os.path.join(directory, f"{name}.test{ext}"),
                os.path.join(directory, f"test_{basename}"),
            ]

        return any(os.path.exists(c) for c in candidates)
