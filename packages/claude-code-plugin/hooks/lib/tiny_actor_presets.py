"""Mode-specific Tiny Actor cast presets and Buddy moderator copy.

Defines deterministic starter content for the Tiny Actor Grid:
- Cast presets per workflow mode (PLAN, EVAL, AUTO, SHIP)
- Buddy moderator identity and greeting copy
- Agent IDs reference real .ai-rules/agents/*.json definitions
"""
from typing import Dict, List, Optional, TypedDict


class CastPreset(TypedDict):
    primary: str
    specialists: List[str]
    moderator_copy: str


# Buddy moderator identity
BUDDY_FACE: str = "\u25d5\u203f\u25d5"  # ◕‿◕

DEFAULT_MODERATOR_COPY: str = "Let's get to work."

CAST_PRESETS: Dict[str, CastPreset] = {
    "PLAN": {
        "primary": "technical-planner",
        "specialists": [
            "security-specialist",
            "test-strategy-specialist",
            "architecture-specialist",
        ],
        "moderator_copy": "Let's map it out.",
    },
    "EVAL": {
        "primary": "code-reviewer",
        "specialists": [
            "security-specialist",
            "performance-specialist",
            "accessibility-specialist",
        ],
        "moderator_copy": "Time for a checkup.",
    },
    "AUTO": {
        "primary": "auto-mode",
        "specialists": [
            "architecture-specialist",
            "security-specialist",
            "code-quality-specialist",
            "test-strategy-specialist",
        ],
        "moderator_copy": "Running full cycle.",
    },
    "SHIP": {
        "primary": "devops-engineer",
        "specialists": [
            "security-specialist",
            "test-engineer",
            "performance-specialist",
            "integration-specialist",
        ],
        "moderator_copy": "Pre-flight checks...",
    },
}


def get_cast_preset(mode: str) -> Optional[CastPreset]:
    """Return the cast preset for *mode*, or ``None`` for unknown modes."""
    return CAST_PRESETS.get(mode)


def get_moderator_copy(mode: str) -> str:
    """Return Buddy's moderator copy for *mode*, falling back to the default."""
    preset = CAST_PRESETS.get(mode)
    if preset is not None:
        return preset["moderator_copy"]
    return DEFAULT_MODERATOR_COPY
