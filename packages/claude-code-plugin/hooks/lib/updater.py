"""Marketplace clone auto-updater for CodingBuddy plugin (#1101).

Workaround for Claude Code /plugin update not pulling the marketplace
shallow clone (anthropics/claude-code#40214).
"""
import json
import os
import subprocess
import time
from pathlib import Path
from typing import Optional

THROTTLE_SECONDS = 86400  # 24 hours
GIT_TIMEOUT = 5  # seconds
MARKETPLACE_NAME = "jeremydev87"
PLUGIN_PKG_PATH = "packages/claude-code-plugin/package.json"


def find_marketplace_clone(home: Path) -> Optional[Path]:
    """Find the marketplace clone directory.

    Returns:
        Path to the marketplace clone, or None if not found or not a git repo.
    """
    clone_dir = home / ".claude" / "plugins" / "marketplaces" / MARKETPLACE_NAME
    if clone_dir.is_dir() and (clone_dir / ".git").exists():
        return clone_dir
    return None


def should_check_update(timestamp_file: Path) -> bool:
    """Check if enough time has passed since the last update check."""
    try:
        last_check = float(timestamp_file.read_text().strip())
        return (time.time() - last_check) >= THROTTLE_SECONDS
    except (FileNotFoundError, ValueError, OSError):
        return True


def record_update_check(timestamp_file: Path) -> None:
    """Record the current time as the last update check."""
    timestamp_file.parent.mkdir(parents=True, exist_ok=True)
    timestamp_file.write_text(str(time.time()))


def _git(clone_dir: Path, *args: str) -> subprocess.CompletedProcess:
    """Run a git command with timeout. Returns a failed result on timeout."""
    try:
        return subprocess.run(
            ["git", "-C", str(clone_dir), *args],
            capture_output=True,
            text=True,
            timeout=GIT_TIMEOUT,
        )
    except subprocess.TimeoutExpired:
        return subprocess.CompletedProcess(
            args=["git", *args], returncode=1, stdout="", stderr="timeout"
        )


def auto_update_marketplace(
    home: Optional[Path] = None,
) -> Optional[str]:
    """Auto-update the marketplace clone if a newer version is available.

    Args:
        home: Home directory (default: Path.home()).

    Returns:
        New version string if updated, None otherwise.
    """
    if home is None:
        home = Path.home()

    clone_dir = find_marketplace_clone(home)
    if clone_dir is None:
        return None

    data_dir = home / ".codingbuddy"
    ts_file = data_dir / ".last_update_check"

    if not should_check_update(ts_file):
        return None

    # Fetch latest from remote
    result = _git(clone_dir, "fetch", "origin")
    if result.returncode != 0:
        return None  # Network unavailable — silent fail

    # Compare HEAD with remote
    head = _git(clone_dir, "rev-parse", "HEAD")
    remote = _git(clone_dir, "rev-parse", "origin/master")

    if head.returncode != 0 or remote.returncode != 0:
        return None

    if head.stdout.strip() == remote.stdout.strip():
        record_update_check(ts_file)
        return None  # Already up to date

    # Update: unshallow if needed, then reset
    _git(clone_dir, "fetch", "--unshallow", "origin")  # May fail if already full — OK
    reset = _git(clone_dir, "reset", "--hard", "origin/master")
    if reset.returncode != 0:
        return None

    record_update_check(ts_file)

    # Read new version from package.json
    try:
        pkg_path = clone_dir / PLUGIN_PKG_PATH
        if pkg_path.exists():
            pkg = json.loads(pkg_path.read_text())
            return pkg.get("version")
    except (json.JSONDecodeError, OSError):
        pass

    return "unknown"
