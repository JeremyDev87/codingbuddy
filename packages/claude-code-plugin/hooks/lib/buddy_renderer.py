"""Buddy character ASCII rendering utilities for session-start.

Renders buddy face greeting, project scan results, and agent recommendations
with tone/language support and ANSI color output.
"""
from typing import Any, Dict, List

# ANSI color codes for terminal output
ANSI_COLORS: Dict[str, str] = {
    "red": "\033[31m",
    "green": "\033[32m",
    "yellow": "\033[33m",
    "blue": "\033[34m",
    "magenta": "\033[35m",
    "cyan": "\033[36m",
    "white": "\033[37m",
    "reset": "\033[0m",
}

# Greeting messages by tone and language
GREETINGS: Dict[str, Dict[str, str]] = {
    "casual": {
        "en": "Hey! Let me scan your project...",
        "ko": "\uc548\ub155! \ud504\ub85c\uc81d\ud2b8\ub97c \uc2a4\uce94\ud560\uac8c\uc694...",
        "ja": "\u3084\u3042\uff01\u30d7\u30ed\u30b8\u30a7\u30af\u30c8\u3092\u30b9\u30ad\u30e3\u30f3\u3057\u307e\u3059...",
        "zh": "\u55e8\uff01\u8ba9\u6211\u626b\u63cf\u4f60\u7684\u9879\u76ee...",
        "es": "\u00a1Hola! Voy a escanear tu proyecto...",
    },
    "formal": {
        "en": "Scanning project environment...",
        "ko": "\ud504\ub85c\uc81d\ud2b8 \ud658\uacbd\uc744 \uc2a4\uce94\ud558\uace0 \uc788\uc2b5\ub2c8\ub2e4...",
        "ja": "\u30d7\u30ed\u30b8\u30a7\u30af\u30c8\u74b0\u5883\u3092\u30b9\u30ad\u30e3\u30f3\u4e2d...",
        "zh": "\u6b63\u5728\u626b\u63cf\u9879\u76ee\u73af\u5883...",
        "es": "Escaneando el entorno del proyecto...",
    },
}

# Section headers by language
HEADERS: Dict[str, Dict[str, str]] = {
    "en": {"recommendations": "Buddy Recommendations"},
    "ko": {"recommendations": "\ubc84\ub514 \ucd94\ucc9c"},
    "ja": {"recommendations": "\u30d0\u30c7\u30a3\u63a8\u85a6"},
    "zh": {"recommendations": "\u4f19\u4f34\u63a8\u8350"},
    "es": {"recommendations": "Recomendaciones de Buddy"},
}

# Scan result labels by language
SCAN_LABELS: Dict[str, Dict[str, str]] = {
    "en": {
        "framework": "\u26a1",
        "coverage": "\ud83e\uddf2",
        "files": "\ud83d\udcc1",
        "endpoints": "\ud83d\udd17",
    },
    "ko": {
        "framework": "\u26a1",
        "coverage": "\ud83e\uddf2",
        "files": "\ud83d\udcc1",
        "endpoints": "\ud83d\udd17",
    },
}

BUDDY_FACE = "\u25d5\u203f\u25d5"  # ◕‿◕


def _get_greeting(tone: str, language: str) -> str:
    """Get greeting message for given tone and language."""
    tone_greetings = GREETINGS.get(tone, GREETINGS["casual"])
    return tone_greetings.get(language, tone_greetings["en"])


def _get_header(key: str, language: str) -> str:
    """Get section header for given key and language."""
    lang_headers = HEADERS.get(language, HEADERS["en"])
    return lang_headers.get(key, HEADERS["en"].get(key, key))


def _colorize(text: str, color: str) -> str:
    """Wrap text in ANSI color codes."""
    ansi = ANSI_COLORS.get(color, "")
    reset = ANSI_COLORS["reset"] if ansi else ""
    return f"{ansi}{text}{reset}"


def render_buddy_face(tone: str, language: str) -> str:
    """Render the buddy character face with greeting.

    Args:
        tone: 'casual' or 'formal'
        language: Language code (en, ko, ja, zh, es)

    Returns:
        ASCII art buddy face with greeting message.
    """
    greeting = _get_greeting(tone, language)
    lines = [
        "\u256d\u2501\u2501\u2501\u256e",
        f"\u2503 {BUDDY_FACE} \u2503 {greeting}",
        "\u2570\u2501\u2501\u2501\u256f",
    ]
    return "\n".join(lines)


def render_scan_results(scan: Dict[str, Any]) -> str:
    """Render project scan results in a formatted block.

    Args:
        scan: Dict with keys: name, version, framework, file_count,
              coverage, api_endpoints

    Returns:
        Formatted scan results string.
    """
    name = scan.get("name", "unknown")
    lines = [f"\u2501\u2501 {name} \u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501"]

    framework = scan.get("framework")
    if framework:
        lines.append(f"\u26a1 {framework}")

    coverage = scan.get("coverage")
    if coverage is not None:
        lines.append(f"\ud83e\uddf2 Coverage: {coverage}%")

    file_count = scan.get("file_count")
    if file_count is not None:
        lines.append(f"\ud83d\udcc1 {file_count} files")

    api_endpoints = scan.get("api_endpoints")
    if api_endpoints is not None:
        lines.append(f"\ud83d\udd17 {api_endpoints} API endpoints")

    return "\n".join(lines)


def render_recommendations(recommendations: List[Dict[str, Any]]) -> str:
    """Render agent recommendations with visual characters.

    Args:
        recommendations: List of dicts with keys:
            agent, message, eye, colorAnsi

    Returns:
        Formatted recommendations string, empty if no recommendations.
    """
    if not recommendations:
        return ""

    lines = []
    for rec in recommendations:
        agent = rec.get("agent", "Agent")
        message = rec.get("message", "")
        eye = rec.get("eye", "O")
        color = rec.get("colorAnsi", "white")

        face = f"{eye}\u203f{eye}"  # eye‿eye
        colored_face = _colorize(face, color)
        lines.append(f"{colored_face} {agent}  \"{message}\"")

    return "\n".join(lines)


def render_session_start(
    scan: Dict[str, Any],
    recommendations: List[Dict[str, Any]],
    tone: str,
    language: str,
) -> str:
    """Render complete session-start output.

    Assembles buddy face, scan results, and recommendations into
    a single formatted output string.

    Args:
        scan: Project scan data dict.
        recommendations: Agent recommendation list.
        tone: 'casual' or 'formal'
        language: Language code.

    Returns:
        Complete formatted session-start output.
    """
    parts = [
        render_buddy_face(tone, language),
        "",
        render_scan_results(scan),
    ]

    if recommendations:
        header = _get_header("recommendations", language)
        parts.append("")
        parts.append(f"\u2501\u2501 {header} \u2501\u2501\u2501\u2501\u2501\u2501")
        parts.append(render_recommendations(recommendations))

    return "\n".join(parts)
