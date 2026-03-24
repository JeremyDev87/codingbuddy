#!/usr/bin/env python3
"""CodingBuddy PostToolUse Hook (skeleton).

Placeholder for future wiring:
- Stats collection (#825)
- History tracking (#827)

Currently returns None (no output) for all tools.
"""
import os
import sys

# Resolve hooks/lib and add to path
_hooks_dir = os.path.dirname(os.path.abspath(__file__))
_lib_dir = os.path.join(_hooks_dir, "lib")
if _lib_dir not in sys.path:
    sys.path.insert(0, _lib_dir)

from safe_main import safe_main


@safe_main
def handle_post_tool_use(data: dict):
    """Entry point for PostToolUse hook.

    Records tool call stats (#825).
    Future: history tracking (#827).
    """
    try:
        from stats import SessionStats

        session_id = os.environ.get("CLAUDE_SESSION_ID", "unknown")
        stats = SessionStats(session_id=session_id)
        tool_name = data.get("tool_name", "unknown")
        stats.record_tool_call(tool_name, success=True)
    except Exception:
        pass  # Never block tool execution

    # Record tool call in history database (#823)
    try:
        from history_db import HistoryDB

        db = HistoryDB()
        tool_name = data.get("tool_name", "unknown")
        input_summary = str(data.get("tool_input", {}))[:200]
        session_id = os.environ.get("CLAUDE_SESSION_ID", "")
        db.record_tool_call(session_id, tool_name, input_summary, success=True)
        db.close()
    except Exception:
        pass  # Never block tool execution

    return None


if __name__ == "__main__":
    handle_post_tool_use()
