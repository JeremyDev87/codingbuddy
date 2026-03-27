"""Buddy character ASCII rendering utilities for session-start and stop hooks.

Renders buddy face greeting, project scan results, agent recommendations,
and session summary with tone/language support and ANSI color output.
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
BUDDY_WRAP_FACE = "\u25d5\u2304\u25d5"  # ◕⌄◕

# Farewell greetings by tone and language (stop hook)
FAREWELL_GREETINGS: Dict[str, Dict[str, str]] = {
    "casual": {
        "en": "Great work today!",
        "ko": "\uc624\ub298 \uc218\uace0\ud588\uc5b4\uc694!",
        "ja": "\u304a\u75b2\u308c\u69d8\uff01",
        "zh": "\u4eca\u5929\u8f9b\u82e6\u4e86\uff01",
        "es": "\u00a1Buen trabajo hoy!",
    },
    "formal": {
        "en": "Session complete.",
        "ko": "\uc138\uc158\uc774 \uc644\ub8cc\ub418\uc5c8\uc2b5\ub2c8\ub2e4.",
        "ja": "\u30bb\u30c3\u30b7\u30e7\u30f3\u5b8c\u4e86\u3002",
        "zh": "\u4f1a\u8bdd\u5b8c\u6210\u3002",
        "es": "Sesi\u00f3n completada.",
    },
}

FAREWELL_MESSAGES: Dict[str, Dict[str, str]] = {
    "casual": {
        "en": "See you next time!",
        "ko": "\ub2e4\uc74c\uc5d0 \ub610 \ub9cc\ub098\uc694!",
        "ja": "\u307e\u305f\u6b21\u56de\uff01",
        "zh": "\u4e0b\u6b21\u518d\u89c1\uff01",
        "es": "\u00a1Hasta la pr\u00f3xima!",
    },
    "formal": {
        "en": "Session ended.",
        "ko": "\uc138\uc158\uc774 \uc885\ub8cc\ub418\uc5c8\uc2b5\ub2c8\ub2e4.",
        "ja": "\u30bb\u30c3\u30b7\u30e7\u30f3\u7d42\u4e86\u3002",
        "zh": "\u4f1a\u8bdd\u5df2\u7ed3\u675f\u3002",
        "es": "Sesi\u00f3n finalizada.",
    },
}

SUMMARY_HEADERS: Dict[str, Dict[str, str]] = {
    "en": {"summary": "Session Summary", "agents": "Active Agents"},
    "ko": {"summary": "\uc138\uc158 \uc694\uc57d", "agents": "\ud65c\uc57d \uc5d0\uc774\uc804\ud2b8"},
    "ja": {"summary": "\u30bb\u30c3\u30b7\u30e7\u30f3\u6982\u8981", "agents": "\u30a2\u30af\u30c6\u30a3\u30d6\u30a8\u30fc\u30b8\u30a7\u30f3\u30c8"},
    "zh": {"summary": "\u4f1a\u8bdd\u6458\u8981", "agents": "\u6d3b\u8dc3\u4ee3\u7406"},
    "es": {"summary": "Resumen de sesi\u00f3n", "agents": "Agentes activos"},
}


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


def _get_farewell_greeting(tone: str, language: str) -> str:
    """Get farewell greeting for given tone and language."""
    tone_greetings = FAREWELL_GREETINGS.get(tone, FAREWELL_GREETINGS["casual"])
    return tone_greetings.get(language, tone_greetings["en"])


def _get_farewell_message(tone: str, language: str) -> str:
    """Get farewell message for given tone and language."""
    tone_messages = FAREWELL_MESSAGES.get(tone, FAREWELL_MESSAGES["casual"])
    return tone_messages.get(language, tone_messages["en"])


def _get_summary_header(key: str, language: str) -> str:
    """Get summary section header for given key and language."""
    lang_headers = SUMMARY_HEADERS.get(language, SUMMARY_HEADERS["en"])
    return lang_headers.get(key, SUMMARY_HEADERS["en"].get(key, key))


def render_session_summary(
    stats: Dict[str, Any],
    agents: List[Dict[str, Any]],
    tone: str,
    language: str,
) -> str:
    """Render session summary with buddy character for stop hook.

    Args:
        stats: Session statistics dict with keys:
            duration_minutes (int), tool_count (int),
            files_changed (int)
        agents: List of active agent dicts with keys:
            name (str), message (str, optional),
            eye (str), colorAnsi (str)
        tone: 'casual' or 'formal'
        language: Language code (en, ko, ja, zh, es)

    Returns:
        Formatted session summary string.
    """
    greeting = _get_farewell_greeting(tone, language)
    farewell = _get_farewell_message(tone, language)

    parts = []

    # Buddy face with farewell greeting
    parts.append("\u256d\u2501\u2501\u2501\u256e")
    parts.append(f"\u2503 {BUDDY_WRAP_FACE} \u2503 {greeting}")
    parts.append("\u2570\u2501\u2501\u2501\u256f")

    # Session stats section (only if data available)
    duration = stats.get("duration_minutes", 0)
    tool_count = stats.get("tool_count", 0)
    files_changed = stats.get("files_changed", 0)

    if duration > 0 or tool_count > 0 or files_changed > 0:
        header = _get_summary_header("summary", language)
        parts.append("")
        parts.append(f"\u2501\u2501 {header} \u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501")

        stat_items = []
        if duration > 0:
            stat_items.append(f"\u23f1  {duration}min")
        if tool_count > 0:
            stat_items.append(f"\U0001f527 {tool_count} tools")
        if files_changed > 0:
            stat_items.append(f"\U0001f4dd {files_changed} files changed")

        parts.append(" \u2502 ".join(stat_items))

    # Active agents section
    if agents:
        header = _get_summary_header("agents", language)
        parts.append("")
        parts.append(f"\u2501\u2501 {header} \u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501")
        for agent in agents:
            name = agent.get("name", "Agent")
            message = agent.get("message", "")
            eye = agent.get("eye", "\u25cf")
            color = agent.get("colorAnsi", "white")
            face = f"{eye}\u2304{eye}"
            colored_face = _colorize(face, color)
            line = f"{colored_face} {name}"
            if message:
                line += f"  {message}"
            parts.append(line)

    # Farewell
    parts.append("")
    parts.append(f"{BUDDY_FACE} {farewell}")

    return "\n".join(parts)


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
