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

        # Flush pending in-memory stats before finalize (#931)
        stats.flush()

        summary = stats.format_summary()
        stats.finalize()

        # End session in history database (#823)
        try:
            from history_db import HistoryDB

            db = HistoryDB()
            db.end_session(session_id, outcome="completed")
            # Close singleton connection (#931)
            HistoryDB.close_instance()
            db.close()
        except Exception:
            pass  # Never block session stop

        # Auto-learning: analyze session patterns (#929)
        try:
            from pattern_detector import PatternDetector
            from history_db import HistoryDB

            al_db = HistoryDB()
            detector = PatternDetector(db=al_db)
            patterns = detector.detect_patterns()
            if patterns:
                from rule_suggester import RuleSuggester

                suggester = RuleSuggester()
                suggestions = suggester.suggest_rules(patterns)
                if suggestions:
                    summary += "\n\n--- Auto-Learning Suggestions ---\n"
                    for s in suggestions:
                        summary += f"- {s['title']}\n"
            try:
                al_db.close()
            except Exception:
                pass
        except Exception:
            pass  # Never block session stop

        # Agent memory: record session agent activity (#947)
        try:
            from agent_memory import AgentMemory

            agent_name = os.environ.get("CODINGBUDDY_ACTIVE_AGENT", "")
            if agent_name:
                mem = AgentMemory()
                # Record session summary as a finding
                if summary:
                    mem.add_finding(agent_name, {
                        "session_id": session_id,
                        "summary": summary[:200],
                    })
        except Exception:
            pass  # Never block session stop

        # Notify on session end (#829)
        try:
            _maybe_notify_session_end(summary)
        except Exception:
            pass  # Never block session stop

        if summary:
            return {
                "systemMessage": summary,
            }
    except Exception:
        pass  # Never block session stop

    return None


def _maybe_notify_session_end(summary: str):
    """Send session summary notification if configured."""
    if not summary:
        return

    from config import get_config
    from notifications import NotificationEvent, notify

    config = get_config(os.getcwd())
    event = NotificationEvent(
        event_type="session_end",
        title="Session Complete",
        message=summary[:500],  # Truncate for webhook limits
    )
    notify(event, config)


if __name__ == "__main__":
    handle_stop()
