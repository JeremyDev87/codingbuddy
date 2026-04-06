"""Compact council badge formatter for PreToolUse statusMessage (#1367).

Reads HUD state and builds a short, badge-style string that conveys
which agent is acting, current focus, and blocker status.

Examples:
    [◮ secu] [🧪 auth] [⚠1]
    [⊙ test] [🔍 retry] [✓]
"""

import os
from typing import Optional

from hud_state import read_hud_state

# Stage-specific icons for the focus badge.
_STAGE_ICON = {
    "opening": "\U0001f50d",    # 🔍
    "reviewing": "\U0001f9ea",  # 🧪
    "consensus": "\U0001f91d",  # 🤝
    "done": "\u2705",           # ✅
}

_DEFAULT_ICON = "\U0001f50d"  # 🔍

# Common suffixes stripped before shortening.
_STRIP_SUFFIXES = ("-specialist", "-developer", "-engineer", "-agent")

# Fallback eye when agent visual is unavailable.
_FALLBACK_EYE = "\u25c6"  # ◆

# Maximum focus label length in badge.
_MAX_FOCUS_LEN = 12


def shorten_agent_name(name: str) -> str:
    """Shorten an agent name to a compact label (max 4 chars).

    Strips common suffixes and takes the first 4 characters of the
    first hyphen-separated segment.

    Examples:
        "security-specialist" -> "secu"
        "frontend-developer"  -> "fron"
        "auto-mode"           -> "auto"
    """
    if not name:
        return ""
    shortened = name
    for suffix in _STRIP_SUFFIXES:
        shortened = shortened.replace(suffix, "")
    shortened = shortened.strip("-")
    first_segment = shortened.split("-")[0]
    return first_segment[:4]


def format_council_badge(
    *,
    agent_eye: str,
    agent_short: str,
    focus: Optional[str] = None,
    stage: str = "",
    blocker_count: int = 0,
) -> str:
    """Pure formatter: build a compact badge string.

    Args:
        agent_eye: Single eye character from agent visual (e.g. ◮).
        agent_short: Shortened agent name (e.g. "secu").
        focus: Current focus label (truncated to 12 chars).
        stage: Council stage (opening/reviewing/consensus/done).
        blocker_count: Number of outstanding blockers.

    Returns:
        A single-line string like ``[◮ secu] [🧪 auth] [⚠1]``.
    """
    parts = [f"[{agent_eye} {agent_short}]"]

    if focus:
        icon = _STAGE_ICON.get(stage, _DEFAULT_ICON)
        truncated = focus[:_MAX_FOCUS_LEN]
        parts.append(f"[{icon} {truncated}]")

    if blocker_count > 0:
        parts.append(f"[\u26a0{blocker_count}]")
    else:
        parts.append("[\u2713]")

    return " ".join(parts)


def build_council_badge(
    *,
    state_file: Optional[str] = None,
    project_root: Optional[str] = None,
) -> Optional[str]:
    """Read HUD state and build a council badge if the council is active.

    Returns None when the council is inactive, no active agent is set,
    or the state file is unreadable.

    Respects ``CODINGBUDDY_HUD_STATE`` env var as an override for the
    default state file path.
    """
    kwargs = {}
    if state_file:
        kwargs["state_file"] = state_file
    elif os.environ.get("CODINGBUDDY_HUD_STATE"):
        kwargs["state_file"] = os.environ["CODINGBUDDY_HUD_STATE"]

    state = read_hud_state(fill_defaults=True, **kwargs)
    if not state.get("councilActive"):
        return None

    active_agent = state.get("activeAgent") or ""
    if not active_agent:
        return None

    eye = _get_agent_eye(active_agent, project_root)
    short = shorten_agent_name(active_agent)

    return format_council_badge(
        agent_eye=eye,
        agent_short=short,
        focus=state.get("focus"),
        stage=state.get("councilStage", ""),
        blocker_count=state.get("blockerCount", 0),
    )


def _get_agent_eye(agent_name: str, project_root: Optional[str] = None) -> str:
    """Look up the single eye character for an agent.

    Falls back to ◆ if the agent JSON is missing or unreadable.
    """
    try:
        from agent_status import _load_agent_visual

        if project_root is None:
            project_root = os.environ.get(
                "CLAUDE_PROJECT_DIR",
                os.environ.get("CLAUDE_CWD", os.getcwd()),
            )
        visual = _load_agent_visual(agent_name, project_root)
        if visual:
            return visual.get("eye", _FALLBACK_EYE)
        return _FALLBACK_EYE
    except Exception:
        return _FALLBACK_EYE
