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

        from session_utils import get_session_id
        session_id = get_session_id()

        stats = SessionStats(session_id=session_id)

        # Flush pending in-memory stats before finalize (#931)
        stats.flush()

        summary = stats.format_summary()
        final_data = stats.finalize()

        # Render buddy session summary to stderr (#972)
        try:
            from buddy_renderer import render_session_summary
            from config import get_config

            cwd = os.environ.get("CLAUDE_PROJECT_DIR", os.getcwd())
            cfg = get_config(cwd)
            tone = cfg.get("tone", "casual")
            language = cfg.get("language", "en")

            tool_names = final_data.get("tool_names", {})
            render_stats = {
                "duration_minutes": int(final_data.get("duration_seconds", 0) // 60),
                "tool_count": final_data.get("tool_count", 0),
                "files_changed": tool_names.get("Edit", 0) + tool_names.get("Write", 0),
            }

            agents = []
            active_agent = os.environ.get("CODINGBUDDY_ACTIVE_AGENT", "")
            if active_agent:
                agents.append({
                    "name": active_agent,
                    "eye": "\u25cf",
                    "colorAnsi": "cyan",
                })

            rendered = render_session_summary(
                render_stats, agents, tone, language,
                tool_names=tool_names,
            )
            if rendered:
                print(rendered, file=sys.stderr)
        except Exception:
            pass  # Never block session stop

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

        # Impact report: render session impact (#1064)
        try:
            duration_secs = final_data.get("duration_seconds", 0)
            if duration_secs >= 30:
                impact_dir = os.environ.get(
                    "CLAUDE_PROJECT_DIR", os.getcwd()
                )
                report = _render_impact_report(session_id, impact_dir)
                if report:
                    summary += "\n\n" + report
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

        # Check achievements on session stop (#1008)
        try:
            from achievement_tracker import (
                AchievementTracker,
                render_batch_celebration,
                render_achievement_badges,
            )

            tracker = AchievementTracker()
            tracker.record_session()

            # Record agent usage if active
            active_agent = os.environ.get("CODINGBUDDY_ACTIVE_AGENT", "")
            if active_agent:
                tracker.record_agent_usage(active_agent)

            newly_unlocked = tracker.check_achievements()
            if newly_unlocked:
                celebration = render_batch_celebration(
                    newly_unlocked, language
                )
                if celebration:
                    print(celebration, file=sys.stderr)

            # Show badge summary if any unlocked
            all_unlocked = tracker.get_unlocked()
            if all_unlocked:
                badges = render_achievement_badges(all_unlocked, language)
                if badges:
                    print(badges, file=sys.stderr)
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


def _render_impact_report(session_id, project_dir):
    """Render impact report from JSONL events for the given session (#1064).

    Reads impact-events.jsonl directly (MCP server may already be stopping).
    Returns empty string if no events found.
    """
    jsonl_path = os.path.join(
        project_dir, "docs", "codingbuddy", "impact-events.jsonl"
    )
    if not os.path.isfile(jsonl_path):
        return ""

    events = []
    with open(jsonl_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                evt = json.loads(line)
                if evt.get("sessionId") == session_id:
                    events.append(evt)
            except (json.JSONDecodeError, KeyError):
                continue

    if not events:
        return ""

    # Aggregate
    issues_prevented = 0
    issues_by_domain = {}
    agents_dispatched = 0
    checklists_generated = 0
    checklist_domains = set()
    mode_transitions = []

    for evt in events:
        et = evt.get("eventType", "")
        data = evt.get("data", {})

        if et in ("issue_found", "issue_prevented"):
            count = data.get("count") or 1
            issues_prevented += count
            domain = data.get("domain")
            if domain:
                issues_by_domain[domain] = (
                    issues_by_domain.get(domain, 0) + count
                )
        elif et == "agent_dispatched":
            agents_dispatched += 1
        elif et == "checklist_generated":
            checklists_generated += 1
            domain = data.get("domain")
            if domain:
                checklist_domains.add(domain)
        elif et == "mode_activated":
            mode = data.get("mode")
            if mode:
                mode_transitions.append(mode)

    # Build content rows
    rows = []
    if issues_prevented > 0:
        rows.append(f"  🛡️  Issues prevented    {issues_prevented}")
        domain_parts = "  ".join(
            f"• {d}: {c}" for d, c in issues_by_domain.items()
        )
        if domain_parts:
            rows.append(f"     {domain_parts}")
    if agents_dispatched > 0:
        rows.append(
            f"  🤖 Agents dispatched   {agents_dispatched} specialists"
        )
    if checklists_generated > 0:
        rows.append(
            f"  📋 Checklists applied  {len(checklist_domains)} domains"
        )
    if mode_transitions:
        rows.append(
            f"  🔄 Mode transitions    {'→'.join(mode_transitions)}"
        )

    if not rows:
        return ""

    # Box rendering
    BOX_W = 41
    hr = "─" * BOX_W

    def _box(text):
        return f"│{text.ljust(BOX_W)}│"

    lines = [f"╭{hr}╮", _box("  📊 Impact Report"), f"├{hr}┤"]
    for row in rows:
        lines.append(_box(row))
    lines.append(f"╰{hr}╯")

    return "\n".join(lines)


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
