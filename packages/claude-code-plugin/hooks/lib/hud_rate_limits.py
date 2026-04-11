"""Rate-limit formatting for CodingBuddy statusLine (#1326).

Extracted verbatim from codingbuddy-hud.py as part of the Wave 0 refactor.
Behavior-preserving — see tests/test_hud.py for the contract.
"""
from __future__ import annotations

from typing import Any, Dict


def format_rate_limits(stdin_data: Dict[str, Any]) -> str:
    """Format Claude Code rate-limit badge.

    Returns an empty string when no rate-limit data is supplied so the
    badge can be dropped from the status line silently.
    """
    rl = stdin_data.get("rate_limits")
    if not rl:
        return ""
    parts = []
    five = rl.get("five_hour")
    if five:
        pct = five.get("used_percentage", 0)
        parts.append(f"5h:{pct:.0f}%")
    seven = rl.get("seven_day")
    if seven:
        pct = seven.get("used_percentage", 0)
        parts.append(f"7d:{pct:.0f}%")
    if not parts:
        return ""
    return "RL:" + ",".join(parts)
