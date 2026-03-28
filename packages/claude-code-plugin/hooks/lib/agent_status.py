"""Agent status message builder for CodingBuddy hooks.

Reads the active agent from CODINGBUDDY_ACTIVE_AGENT env var,
loads visual data (eye, colorAnsi) from the agent JSON file,
and builds a one-line status message for the spinner display.
"""
import json
import os
from typing import Optional

_DEFAULT_STATUS = "CodingBuddy working..."

_COLOR_EMOJI_MAP = {
    "red": "\U0001f534",       # 🔴
    "green": "\U0001f7e2",     # 🟢
    "blue": "\U0001f535",      # 🔵
    "yellow": "\U0001f7e1",    # 🟡
    "cyan": "\U0001f535",      # 🔵
    "magenta": "\U0001f7e3",   # 🟣
    "white": "\u26aa",         # ⚪
    "bright": "\u2728",        # ✨
}

# Cache: agents_dir path (avoids repeated filesystem walks)
_agents_dir_cache: Optional[str] = None
_agents_dir_cache_root: Optional[str] = None

# Cache: agent_name -> visual dict
_visual_cache: dict = {}

# Handoff tracking
_previous_agent: Optional[str] = None
_handoff_message: Optional[str] = None


def _find_agents_dir(project_root: str) -> Optional[str]:
    """Find the .ai-rules/agents directory from the project root."""
    global _agents_dir_cache, _agents_dir_cache_root
    if _agents_dir_cache_root == project_root and _agents_dir_cache is not None:
        return _agents_dir_cache if _agents_dir_cache else None

    candidates = [
        os.path.join(project_root, "packages", "rules", ".ai-rules", "agents"),
        os.path.join(project_root, ".ai-rules", "agents"),
    ]
    for c in candidates:
        if os.path.isdir(c):
            _agents_dir_cache = c
            _agents_dir_cache_root = project_root
            return c

    _agents_dir_cache = ""
    _agents_dir_cache_root = project_root
    return None


def _load_agent_visual(agent_name: str, project_root: str) -> Optional[dict]:
    """Load visual data for a named agent from its JSON file."""
    if agent_name in _visual_cache:
        return _visual_cache[agent_name]

    agents_dir = _find_agents_dir(project_root)
    if not agents_dir:
        return None

    # Fast path: slug-based filename lookup
    slug = agent_name.lower().replace(" ", "-").replace("_", "-")
    path = os.path.join(agents_dir, f"{slug}.json")
    if os.path.isfile(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            visual = data.get("visual")
            _visual_cache[agent_name] = visual
            return visual
        except (OSError, json.JSONDecodeError):
            pass

    # Slow path: scan all JSON files by name field
    try:
        for fn in os.listdir(agents_dir):
            if not fn.endswith(".json"):
                continue
            fp = os.path.join(agents_dir, fn)
            try:
                with open(fp, "r", encoding="utf-8") as f:
                    data = json.load(f)
                if data.get("name", "").lower() == agent_name.lower():
                    visual = data.get("visual")
                    _visual_cache[agent_name] = visual
                    return visual
            except (OSError, json.JSONDecodeError):
                continue
    except OSError:
        pass

    _visual_cache[agent_name] = None
    return None


def _build_face(visual: Optional[dict]) -> str:
    """Build a face string from visual data, or robot emoji fallback."""
    if not visual:
        return "\U0001f916"  # 🤖
    eye = visual.get("eye", "\u25cf")  # ● default
    return f"{eye}\u203f{eye}"  # eye‿eye


def build_status_message(project_root: Optional[str] = None) -> Optional[str]:
    """Build a one-line agent status message for spinner display.

    Also tracks agent changes and generates a handoff message
    retrievable via get_handoff_message().

    Returns:
        Formatted status like '🟡 ★‿★ Frontend Developer' when agent active,
        default 'CodingBuddy working...' when agent name set but visual not found,
        or None when no agent is active.
    """
    global _previous_agent, _handoff_message
    _handoff_message = None  # Reset each call

    agent_name = os.environ.get("CODINGBUDDY_ACTIVE_AGENT", "")
    if not agent_name:
        _previous_agent = None
        return None

    if project_root is None:
        project_root = os.environ.get(
            "CLAUDE_PROJECT_DIR",
            os.environ.get("CLAUDE_CWD", os.getcwd()),
        )

    visual = _load_agent_visual(agent_name, project_root)

    # Handoff detection
    if _previous_agent is not None and _previous_agent != agent_name:
        prev_visual = _visual_cache.get(_previous_agent)
        prev_face = _build_face(prev_visual)
        curr_face = _build_face(visual)
        _handoff_message = (
            f"{prev_face} {_previous_agent} \u2192 {curr_face} {agent_name} \uad50\ub300!"
        )

    _previous_agent = agent_name

    if not visual:
        return f"\U0001f916 {agent_name}"  # 🤖 fallback

    eye = visual.get("eye", "\u25cf")  # ● default
    color = visual.get("colorAnsi", "white")
    emoji = _COLOR_EMOJI_MAP.get(color, "\u26aa")  # ⚪ default

    face = f"{eye}\u203f{eye}"  # eye‿eye
    return f"{emoji} {face} {agent_name}"


def get_handoff_message() -> Optional[str]:
    """Return the handoff message from the last build_status_message call.

    Returns:
        A string like '★‿★ Frontend Developer → ●‿● Backend Developer 교대!'
        when an agent switch was detected, or None otherwise.
    """
    return _handoff_message


def clear_cache() -> None:
    """Clear all caches. Useful for testing."""
    global _agents_dir_cache, _agents_dir_cache_root, _previous_agent, _handoff_message
    _agents_dir_cache = None
    _agents_dir_cache_root = None
    _visual_cache.clear()
    _previous_agent = None
    _handoff_message = None
