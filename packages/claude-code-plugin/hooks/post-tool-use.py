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

        from session_utils import get_session_id
        session_id = get_session_id()
        stats = SessionStats(session_id=session_id)
        tool_name = data.get("tool_name", "unknown")
        stats.record_tool_call(tool_name, success=True)
        # PostToolUse runs in a fresh short-lived process per call. The
        # default flush_interval (10) means a single record_tool_call would
        # never reach disk. Flush immediately so subsequent reads (statusline,
        # Stop hook summary) see accurate counts. atexit in SessionStats is a
        # safety net, but explicit flush keeps the disk state observable
        # right after this hook exits.
        stats.flush()
    except Exception:
        pass  # Never block tool execution

    # Record tool call in history database (#823) — singleton reuse (#931)
    try:
        from history_db import HistoryDB

        db = HistoryDB.get_instance()
        tool_name = data.get("tool_name", "unknown")
        input_summary = str(data.get("tool_input", {}))[:200]
        from session_utils import get_session_id as _get_sid_db
        session_id = _get_sid_db()
        db.record_tool_call(session_id, tool_name, input_summary, success=True)
    except Exception:
        pass  # Never block tool execution

    # Notify on PR creation (#829)
    try:
        _maybe_notify_pr_created(data)
    except Exception:
        pass  # Never block tool execution

    # Update HUD state with post-action information (#1324)
    try:
        from hud_helpers import on_tool_end

        on_tool_end(
            data.get("tool_name", ""),
            data.get("tool_input", {}),
            str(data.get("tool_output", "")),
        )
    except Exception:
        pass  # Never block tool execution

    # Micro-achievement: detect parallel agent dispatch (#1436)
    try:
        tool_name = data.get("tool_name", "")
        if tool_name == "Agent" and data.get("tool_input", {}).get("run_in_background"):
            from achievement_tracker import (
                AchievementTracker,
                render_batch_celebration,
            )

            tracker = AchievementTracker()
            tracker.record_multi_agent_dispatch()
            newly_unlocked = tracker.check_achievements()
            if newly_unlocked:
                import sys as _sys

                celebration = render_batch_celebration(newly_unlocked)
                if celebration:
                    print(celebration, file=_sys.stderr)
    except Exception:
        pass  # Never block tool execution

    return None


def _maybe_notify_pr_created(data: dict):
    """Detect PR creation and send notification if configured."""
    tool_name = data.get("tool_name", "")
    tool_input = data.get("tool_input", {})
    tool_output = data.get("tool_output", "")

    # Detect: Bash tool running "gh pr create"
    command = ""
    if tool_name == "Bash":
        command = tool_input.get("command", "")
    if "gh pr create" not in command:
        return

    # Check config before importing notification modules (#931)
    from config import get_config

    config = get_config(os.getcwd())
    notifications_config = config.get("notifications", {})
    if not notifications_config.get("enabled", True):
        return

    # Extract PR URL from output (gh pr create prints the URL)
    pr_url = ""
    if isinstance(tool_output, str):
        for line in tool_output.strip().splitlines():
            line = line.strip()
            if line.startswith("https://github.com/") and "/pull/" in line:
                pr_url = line
                break

    from notifications import NotificationEvent, notify

    event = NotificationEvent(
        event_type="pr_created",
        title="PR Created",
        message=f"New PR created: {pr_url or command}",
        url=pr_url or None,
    )
    notify(event, config)


if __name__ == "__main__":
    handle_post_tool_use()
