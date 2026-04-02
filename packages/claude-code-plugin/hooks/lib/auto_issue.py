"""Auto-create GitHub issues for untested files (#1132).

Creates issues via ``gh issue create`` for files that lack tests.
Opt-in via ``autoCreateIssues`` in codingbuddy.config.json, rate-limited
to 3 issues per session.
"""

import logging
import os
import re
import subprocess
import sys
from typing import Dict, List, Optional, Set

# Ensure hooks/lib is on sys.path so sibling imports work reliably
_lib_dir = os.path.dirname(os.path.abspath(__file__))
if _lib_dir not in sys.path:
    sys.path.insert(0, _lib_dir)

from config import load_config

logger = logging.getLogger(__name__)

MAX_ISSUES_PER_SESSION = 3
GH_TIMEOUT = 15  # seconds

# Paths starting with these prefixes are considered "source" (higher priority)
SOURCE_PREFIXES = ("src/", "lib/", "app/", "packages/")

_ISSUE_URL_RE = re.compile(r"https://github\.com/.+/issues/(\d+)")


def _is_source_file(path: str) -> bool:
    """Return True if the file lives in a source directory."""
    return any(path.startswith(p) for p in SOURCE_PREFIXES)


def _prioritize(
    files: List[str], new_files: Optional[Set[str]] = None
) -> List[str]:
    """Sort files by priority: new source > new other > old source > old other."""
    is_new = new_files or set()

    def sort_key(f: str) -> tuple:
        return (
            0 if f in is_new else 1,
            0 if _is_source_file(f) else 1,
            f,
        )

    return sorted(files, key=sort_key)


def _build_issue_body(file_path: str) -> str:
    """Build the issue body markdown for an untested file."""
    ext = os.path.splitext(file_path)[1]
    suggestion = "unit tests"
    if ext in (".ts", ".tsx", ".js", ".jsx"):
        suggestion = "Jest or Vitest unit tests"
    elif ext == ".py":
        suggestion = "pytest unit tests"
    elif ext == ".go":
        suggestion = "Go table-driven tests"
    elif ext == ".rs":
        suggestion = "Rust #[test] module tests"

    return (
        f"## Untested File\n\n"
        f"`{file_path}`\n\n"
        f"## Why\n\n"
        f"This file was modified/added without corresponding tests.\n\n"
        f"## Suggested Approach\n\n"
        f"Add {suggestion} covering the public API of this module."
    )


def create_test_gap_issues(
    untested_files: List[str],
    project_dir: str = ".",
    new_files: Optional[Set[str]] = None,
) -> List[Dict]:
    """Create GitHub issues for untested files via ``gh issue create``.

    Args:
        untested_files: File paths without corresponding tests.
        project_dir: Directory to find codingbuddy.config.json.
        new_files: Optional set of file paths that are newly added
                   (prioritized over modified files).

    Returns:
        List of dicts ``{file, issue_number, issue_url}`` for created issues.
    """
    if not untested_files:
        return []

    config = load_config(project_dir)
    if not config.get("autoCreateIssues", False):
        return []

    prioritized = _prioritize(untested_files, new_files)
    candidates = prioritized[:MAX_ISSUES_PER_SESSION]

    results: List[Dict] = []
    for file_path in candidates:
        filename = os.path.basename(file_path)
        title = f"test: add tests for {filename}"
        labels = "test,auto-generated"
        body = _build_issue_body(file_path)

        try:
            proc = subprocess.run(
                [
                    "gh",
                    "issue",
                    "create",
                    "--title",
                    title,
                    "--label",
                    labels,
                    "--body",
                    body,
                ],
                capture_output=True,
                text=True,
                timeout=GH_TIMEOUT,
            )
        except (FileNotFoundError, subprocess.TimeoutExpired) as exc:
            logger.warning("gh issue create failed for %s: %s", file_path, exc)
            # Early return: FileNotFoundError means gh binary is not installed,
            # so all subsequent attempts would fail too. TimeoutExpired suggests
            # a systemic connectivity issue. In both cases, skip remaining files.
            return results

        if proc.returncode != 0:
            logger.warning(
                "gh issue create returned %d for %s: %s",
                proc.returncode,
                file_path,
                proc.stderr,
            )
            continue

        url = proc.stdout.strip()
        match = _ISSUE_URL_RE.search(url)
        if not match:
            logger.warning("Could not parse issue URL from gh output: %s", url)
            continue

        results.append(
            {
                "file": file_path,
                "issue_number": int(match.group(1)),
                "issue_url": url,
            }
        )

    return results
