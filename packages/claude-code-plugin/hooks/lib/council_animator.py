"""Council Assembly Animation — staggered specialist arrival effect (#1441).

Renders council specialists one-by-one with typing animation to stderr,
creating a dramatic "assembling the team" moment. Degrades gracefully
to static output when stderr is not a TTY or animation is disabled.
"""
import os
import sys
import time
from typing import List

# Timing defaults — tuned so total animation stays under 1.5s
# for a typical 4-agent council (~7 lines, ~200 total chars).
DEFAULT_AGENT_DELAY = 0.05
DEFAULT_CHAR_SPEED = 0.005
MAX_TOTAL_TIME = 1.5  # Hard cap in seconds

# Environment variable to disable animation
ANIMATION_ENV = "CODINGBUDDY_COUNCIL_ANIMATION"


def animate_council_assembly(
    primary: str,
    specialists: List[str],
    moderator_copy: str = "Council assembled.",
    agent_delay: float = DEFAULT_AGENT_DELAY,
    char_speed: float = DEFAULT_CHAR_SPEED,
) -> str:
    """Render council assembly with staggered animation to stderr.

    When stderr is a TTY and animation is enabled, agents appear
    one-by-one with a typing effect. Otherwise, falls back to
    static rendering returned as a string.

    Total animation is capped at MAX_TOTAL_TIME to avoid blocking
    the hook for too long.

    Args:
        primary: Primary agent name.
        specialists: List of specialist agent names.
        moderator_copy: Moderator greeting text.
        agent_delay: Delay between agents in seconds.
        char_speed: Delay between characters for typing effect.

    Returns:
        The full rendered council scene as a string (for logging/testing).
    """
    lines = _build_lines(primary, specialists, moderator_copy)
    full_text = "\n".join(lines)

    if _should_animate():
        # Auto-adjust speed to stay within time cap
        total_chars = sum(len(line) for line in lines)
        total_delays = len(lines) - 1
        estimated_time = (total_chars * char_speed) + (total_delays * agent_delay)
        if estimated_time > MAX_TOTAL_TIME and total_chars > 0:
            ratio = MAX_TOTAL_TIME / estimated_time
            char_speed *= ratio
            agent_delay *= ratio
        _animate_to_stderr(lines, agent_delay, char_speed)
    else:
        sys.stderr.write(full_text + "\n")
        sys.stderr.flush()

    return full_text


def _build_lines(
    primary: str,
    specialists: List[str],
    moderator_copy: str,
) -> List[str]:
    """Build the council scene lines."""
    lines = []
    lines.append(f"  \u25d5\u203f\u25d5 {moderator_copy}")  # ◕‿◕ buddy face
    lines.append(f"  \u25b6 {primary} [primary]")
    for spec in specialists:
        lines.append(f"  \u25cb {spec} [specialist]")
    lines.append("  \u2501\u2501 Council assembled \u2501\u2501")
    return lines


def _should_animate() -> bool:
    """Check if animation should be enabled."""
    env_value = os.environ.get(ANIMATION_ENV, "").lower()
    if env_value == "0" or env_value == "false" or env_value == "off":
        return False
    if env_value == "1" or env_value == "true" or env_value == "on":
        return True
    # Default: animate only if stderr is a TTY
    return hasattr(sys.stderr, "isatty") and sys.stderr.isatty()


def _animate_to_stderr(
    lines: List[str],
    agent_delay: float,
    char_speed: float,
) -> None:
    """Write lines to stderr with staggered typing effect."""
    for i, line in enumerate(lines):
        for char in line:
            sys.stderr.write(char)
            sys.stderr.flush()
            time.sleep(char_speed)
        sys.stderr.write("\n")
        sys.stderr.flush()
        if i < len(lines) - 1:
            time.sleep(agent_delay)
