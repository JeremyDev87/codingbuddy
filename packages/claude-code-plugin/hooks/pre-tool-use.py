#!/usr/bin/env python3
"""CodingBuddy PreToolUse Hook.

Intercepts Bash tool calls to enforce quality gates on git commit commands.
Uses safe_main decorator to ensure Claude Code is never blocked.
"""
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


def _get_hook_config() -> dict:
    """Load config from cwd."""
    cwd = os.environ.get("CLAUDE_CWD", os.getcwd())
    return get_config(cwd)


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

    command = data.get("tool_input", {}).get("command", "")

    # Only check git commit commands
    if not _is_git_commit(command):
        return None

    # Load config and check quality gates
    config = _get_hook_config()
    quality_gates = config.get("qualityGates", {})

    if not quality_gates.get("enabled", False):
        return None

    # Quality gates enabled — return context reminder
    return {
        "hookSpecificOutput": {
            "additionalContext": QUALITY_GATE_CONTEXT,
        }
    }


@safe_main
def handle_pre_tool_use(data: dict) -> Optional[dict]:
    """Entry point for PreToolUse hook."""
    return _handle(data)


if __name__ == "__main__":
    handle_pre_tool_use()
