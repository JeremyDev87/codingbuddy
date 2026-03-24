#!/usr/bin/env python3
"""CodingBuddy PreToolUse Hook.

Intercepts Bash tool calls to enforce quality gates on git commit commands.
Detects .ai-rules/config changes via FileWatcher (#823).
Uses safe_main decorator to ensure Claude Code is never blocked.
"""
import json
import os
import re
import sys
from typing import Optional

# Resolve hooks/lib and add to path
_hooks_dir = os.path.dirname(os.path.abspath(__file__))
_lib_dir = os.path.join(_hooks_dir, "lib")
if _lib_dir not in sys.path:
    sys.path.insert(0, _lib_dir)

from safe_main import safe_main
from config import get_config

# Pattern to detect git commit in a command string
_GIT_COMMIT_RE = re.compile(r"\bgit\s+commit\b")

QUALITY_GATE_CONTEXT = (
    "[CodingBuddy Quality Gate] Before committing, ensure:\n"
    "- All tests pass\n"
    "- Code follows project conventions\n"
    "- Changes are reviewed (self-review at minimum)\n"
    "- Commit message follows project convention"
)

FILE_WATCHER_CONTEXT = (
    "CodingBuddy: Rules/config changed since last check. Consider reloading."
)

# Snapshot persistence directory
_SNAPSHOT_DIR = os.path.join(
    os.environ.get("CLAUDE_PLUGIN_DATA",
                   os.path.join(os.path.expanduser("~"), ".codingbuddy")),
    "snapshots",
)


def _get_hook_config() -> dict:
    """Load config from cwd."""
    cwd = os.environ.get("CLAUDE_CWD", os.getcwd())
    return get_config(cwd)


def _get_project_root(data: dict) -> str:
    """Get project root from hook input data or environment."""
    return data.get("cwd", os.environ.get("CLAUDE_CWD", os.getcwd()))


def _snapshot_path(project_root: str) -> str:
    """Return the path to the snapshot file for a given project root."""
    # Use a hash of project root to avoid path separator issues
    safe_name = project_root.replace(os.sep, "_").strip("_")
    return os.path.join(_SNAPSHOT_DIR, f"{safe_name}.json")


def _load_snapshot(path: str) -> dict:
    """Load a saved snapshot from disk."""
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (OSError, json.JSONDecodeError, ValueError):
        return {}


def _save_snapshot(path: str, snapshot: dict) -> None:
    """Persist a snapshot to disk."""
    try:
        os.makedirs(os.path.dirname(path), mode=0o700, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(snapshot, f)
    except OSError:
        pass


def _check_file_changes(data: dict) -> Optional[str]:
    """Check for .ai-rules/config changes via FileWatcher.

    Returns additionalContext string if changes detected, else None.
    """
    try:
        from file_watcher import FileWatcher

        project_root = _get_project_root(data)
        config = _get_hook_config()
        fw_config = config.get("fileWatcher", {})

        if not fw_config.get("enabled", True):
            return None

        watcher = FileWatcher(project_root)
        snap_path = _snapshot_path(project_root)
        old_snapshot = _load_snapshot(snap_path)

        if old_snapshot:
            # Restore previous snapshot for comparison
            watcher._last_snapshot = old_snapshot
            changes = watcher.detect_changes()
            # Take new snapshot for next invocation
            new_snapshot = watcher.snapshot()
            _save_snapshot(snap_path, new_snapshot)
            if changes:
                return FILE_WATCHER_CONTEXT
        else:
            # First invocation — just take initial snapshot
            new_snapshot = watcher.snapshot()
            _save_snapshot(snap_path, new_snapshot)

        return None
    except Exception:
        return None


def _is_git_commit(command: str) -> bool:
    """Check if a bash command contains a git commit invocation."""
    return bool(_GIT_COMMIT_RE.search(command))


def _handle(data: dict) -> Optional[dict]:
    """Core PreToolUse logic.

    Args:
        data: Hook input with tool_name and tool_input.

    Returns:
        Hook output dict or None for no intervention.
    """
    tool_name = data.get("tool_name", "")

    # Only process Bash tool
    if tool_name != "Bash":
        return None

    contexts = []

    # Check for file changes (#823)
    file_change_msg = _check_file_changes(data)
    if file_change_msg:
        contexts.append(file_change_msg)

    command = data.get("tool_input", {}).get("command", "")

    # Check git commit quality gates
    if _is_git_commit(command):
        config = _get_hook_config()
        quality_gates = config.get("qualityGates", {})
        if quality_gates.get("enabled", False):
            contexts.append(QUALITY_GATE_CONTEXT)

    if not contexts:
        return None

    return {
        "hookSpecificOutput": {
            "additionalContext": "\n\n".join(contexts),
        }
    }


@safe_main
def handle_pre_tool_use(data: dict) -> Optional[dict]:
    """Entry point for PreToolUse hook."""
    return _handle(data)


if __name__ == "__main__":
    handle_pre_tool_use()
