#!/usr/bin/env python3
"""CodingBuddy Stop Hook — finalize operational stats (#825).

Outputs a systemMessage with the session summary on Stop event.
"""
import json
import os
import sys

# Resolve hooks/lib and add to path
_hooks_dir = os.path.dirname(os.path.abspath(__file__))
_lib_dir = os.path.join(_hooks_dir, "lib")
if _lib_dir not in sys.path:
    sys.path.insert(0, _lib_dir)

from safe_main import safe_main


@safe_main
def handle_stop(data: dict):
    """Entry point for Stop hook.

    Finalizes session stats and returns a systemMessage summary.
    """
    try:
        from stats import SessionStats

        session_id = os.environ.get("CLAUDE_SESSION_ID", "unknown")
        stats = SessionStats(session_id=session_id)
        summary = stats.format_summary()
        stats.finalize()

        # End session in history database (#823)
        try:
            from history_db import HistoryDB

            db = HistoryDB()
            db.end_session(session_id, outcome="completed")
            db.close()
        except Exception:
            pass  # Never block session stop

        if summary:
            return {
                "systemMessage": summary,
            }
    except Exception:
        pass  # Never block session stop

    return None


if __name__ == "__main__":
    handle_stop()
