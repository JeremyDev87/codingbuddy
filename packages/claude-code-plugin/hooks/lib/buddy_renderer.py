"""Buddy character ASCII rendering utilities for session-start and stop hooks.

Renders buddy face greeting, project scan results, agent recommendations,
and session summary with tone/language support and ANSI color output.
"""
import os
import re
import sys
import time
from typing import Any, Dict, List, Optional

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
        "pt": "Oi! Vou escanear seu projeto...",
        "de": "Hallo! Ich scanne dein Projekt...",
        "fr": "Salut\u202f! Je scanne ton projet...",
    },
    "formal": {
        "en": "Scanning project environment...",
        "ko": "\ud504\ub85c\uc81d\ud2b8 \ud658\uacbd\uc744 \uc2a4\uce94\ud558\uace0 \uc788\uc2b5\ub2c8\ub2e4...",
        "ja": "\u30d7\u30ed\u30b8\u30a7\u30af\u30c8\u74b0\u5883\u3092\u30b9\u30ad\u30e3\u30f3\u4e2d...",
        "zh": "\u6b63\u5728\u626b\u63cf\u9879\u76ee\u73af\u5883...",
        "es": "Escaneando el entorno del proyecto...",
        "pt": "Escaneando o ambiente do projeto...",
        "de": "Projektumgebung wird gescannt...",
        "fr": "Analyse de l\u2019environnement du projet...",
    },
}

# Section headers by language
HEADERS: Dict[str, Dict[str, str]] = {
    "en": {"recommendations": "Buddy Recommendations"},
    "ko": {"recommendations": "\ubc84\ub514 \ucd94\ucc9c"},
    "ja": {"recommendations": "\u30d0\u30c7\u30a3\u63a8\u85a6"},
    "zh": {"recommendations": "\u4f19\u4f34\u63a8\u8350"},
    "es": {"recommendations": "Recomendaciones de Buddy"},
    "pt": {"recommendations": "Recomenda\u00e7\u00f5es do Buddy"},
    "de": {"recommendations": "Buddy-Empfehlungen"},
    "fr": {"recommendations": "Recommandations de Buddy"},
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
BUDDY_WINK_FACE = "\u25d5\u2040\u25d5"  # ◕⁀◕

# Unicode → ASCII fallback mapping (#1040)
_UNICODE_TO_ASCII: Dict[str, str] = {
    # Box drawing
    "\u256d": "+", "\u256e": "+", "\u2570": "+", "\u256f": "+",
    "\u2501": "-", "\u2503": "|", "\u2502": "|",
    # Face characters
    "\u25d5": ":", "\u203f": "_", "\u2304": "v", "\u2040": "^",
    # Emoji → text
    "\u26a1": "*",
    "\U0001f9f2": "[cov]",
    "\U0001f4c1": "[file]",
    "\U0001f517": "[api]",
    "\u23f1": "[time]",
    "\U0001f527": "[tool]",
    "\U0001f4dd": "[edit]",
    "\U0001f4ac": "[msg]",
    "\u2705": "[ok]",
    "\u26a0\ufe0f": "[warn]",
    "\u26a0": "[warn]",
    "\U0001f916": "[bot]",
    # Surrogate pair variants (used in some source strings)
    "\ud83e\uddf2": "[cov]",
    "\ud83d\udcc1": "[file]",
    "\ud83d\udd17": "[api]",
    "\U0001f534": "(R)",
    "\U0001f7e2": "(G)",
    "\U0001f535": "(B)",
    "\U0001f7e1": "(Y)",
    "\U0001f7e3": "(P)",
    "\u26aa": "(W)",
    "\u2728": "(*)",
}


def _to_ascii(text: str) -> str:
    """Replace Unicode/emoji characters with ASCII equivalents (#1040)."""
    for uc, asc in _UNICODE_TO_ASCII.items():
        text = text.replace(uc, asc)
    return text


def _detect_unicode_support() -> bool:
    """Check if the terminal likely supports Unicode.

    Returns True if Unicode is likely supported, False otherwise.
    """
    lang = os.environ.get("LANG", "")
    lc_all = os.environ.get("LC_ALL", "")
    term = os.environ.get("TERM", "")

    if "utf" in lang.lower() or "utf" in lc_all.lower():
        return True
    if term == "dumb":
        return False
    # Default: assume Unicode support (most modern terminals)
    return True


# Default buddy character configuration
DEFAULT_BUDDY_CONFIG: Dict[str, Any] = {
    "name": "Buddy",
    "face": BUDDY_FACE,
    "greeting": "",
    "farewell": "",
    "asciiMode": False,
}

# Max length for custom face field (unicode characters)
_MAX_FACE_LENGTH = 10

# Pattern: only printable unicode, no control chars or ASCII letters/digits
_FACE_PATTERN = re.compile(
    r"^[^\x00-\x1f\x7f A-Za-z0-9]{1,%d}$" % _MAX_FACE_LENGTH
)


def type_text(text: str, speed: float = 0.03) -> None:
    """Write text to stderr one character at a time with flush for typing animation.

    Args:
        text: The text to animate.
        speed: Delay in seconds between each character (default 0.03s).
    """
    for char in text:
        sys.stderr.write(char)
        sys.stderr.flush()
        time.sleep(speed)


def get_buddy_config(config: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Extract and validate buddy customization from config dict.

    Args:
        config: Parsed codingbuddy.config.json dict. May contain a 'buddy' key.

    Returns:
        Validated buddy config with defaults for missing/invalid fields.
    """
    result = dict(DEFAULT_BUDDY_CONFIG)

    if not config or not isinstance(config.get("buddy"), dict):
        return result

    buddy = config["buddy"]

    # name: string, non-empty, max 30 chars
    name = buddy.get("name")
    if isinstance(name, str) and 0 < len(name.strip()) <= 30:
        result["name"] = name.strip()

    # face: unicode-only, no ASCII alphanumerics, max _MAX_FACE_LENGTH chars
    face = buddy.get("face")
    if isinstance(face, str) and _FACE_PATTERN.match(face):
        result["face"] = face

    # greeting: string, max 100 chars
    greeting = buddy.get("greeting")
    if isinstance(greeting, str) and 0 < len(greeting.strip()) <= 100:
        result["greeting"] = greeting.strip()

    # farewell: string, max 100 chars
    farewell = buddy.get("farewell")
    if isinstance(farewell, str) and 0 < len(farewell.strip()) <= 100:
        result["farewell"] = farewell.strip()

    # asciiMode: bool or "auto" (#1040)
    ascii_val = buddy.get("asciiMode")
    if ascii_val is True:
        result["asciiMode"] = True
    elif ascii_val == "auto":
        result["asciiMode"] = not _detect_unicode_support()
    else:
        result["asciiMode"] = False

    return result

# Returning session greetings by tone and language
RETURNING_GREETINGS: Dict[str, Dict[str, str]] = {
    "casual": {
        "en": "Hey, you are back! Want to continue from last time?",
        "ko": "\ub3cc\uc544\uc624\uc168\uad70\uc694! \uc9c0\ub09c\ubc88 \uc791\uc5c5 \uc774\uc5b4\uc11c \ud560\uae4c\uc694?",
        "ja": "\u304a\u304b\u3048\u308a\u306a\u3055\u3044\uff01\u524d\u56de\u306e\u7d9a\u304d\u3092\u3057\u307e\u3057\u3087\u3046\u304b\uff1f",
        "zh": "\u4f60\u56de\u6765\u4e86\uff01\u8981\u7ee7\u7eed\u4e0a\u6b21\u7684\u5de5\u4f5c\u5417\uff1f",
        "es": "\u00a1Has vuelto! \u00bfQuieres continuar donde lo dejaste?",
        "pt": "Voc\u00ea voltou! Quer continuar de onde parou?",
        "de": "Du bist zur\u00fcck! Weitermachen wo wir aufgeh\u00f6rt haben?",
        "fr": "Te revoil\u00e0\u202f! On reprend o\u00f9 on s\u2019\u00e9tait arr\u00eat\u00e9\u202f?",
    },
    "formal": {
        "en": "Welcome back. Resuming previous session context.",
        "ko": "\ub2e4\uc2dc \uc624\uc168\uc2b5\ub2c8\ub2e4. \uc774\uc804 \uc138\uc158 \ub9e5\ub77d\uc744 \ubd88\ub7ec\uc635\ub2c8\ub2e4.",
        "ja": "\u304a\u5e30\u308a\u306a\u3055\u3044\u3002\u524d\u56de\u306e\u30bb\u30c3\u30b7\u30e7\u30f3\u3092\u5fa9\u5143\u3057\u307e\u3059\u3002",
        "zh": "\u6b22\u8fce\u56de\u6765\u3002\u6b63\u5728\u6062\u590d\u4e0a\u6b21\u7684\u4f1a\u8bdd\u3002",
        "es": "Bienvenido de vuelta. Restaurando el contexto anterior.",
        "pt": "Bem-vindo de volta. Restaurando o contexto anterior.",
        "de": "Willkommen zur\u00fcck. Vorheriger Sitzungskontext wird wiederhergestellt.",
        "fr": "Bon retour. Restauration du contexte pr\u00e9c\u00e9dent.",
    },
}

# Last session summary header
RETURNING_HEADERS: Dict[str, Dict[str, str]] = {
    "en": {"last_session": "Last Session Summary", "pending": "Pending Work"},
    "ko": {"last_session": "\uc9c0\ub09c \uc138\uc158 \uc694\uc57d", "pending": "\ubbf8\uc644\ub8cc \uc791\uc5c5"},
    "ja": {"last_session": "\u524d\u56de\u306e\u30bb\u30c3\u30b7\u30e7\u30f3", "pending": "\u672a\u5b8c\u4e86\u306e\u4f5c\u696d"},
    "zh": {"last_session": "\u4e0a\u6b21\u4f1a\u8bdd\u6458\u8981", "pending": "\u672a\u5b8c\u6210\u5de5\u4f5c"},
    "es": {"last_session": "Resumen de sesi\u00f3n anterior", "pending": "Trabajo pendiente"},
    "pt": {"last_session": "Resumo da sess\u00e3o anterior", "pending": "Trabalho pendente"},
    "de": {"last_session": "Letzte Sitzungs\u00fcbersicht", "pending": "Ausstehende Arbeit"},
    "fr": {"last_session": "R\u00e9sum\u00e9 de la derni\u00e8re session", "pending": "Travail en attente"},
}

# Farewell greetings by tone and language (stop hook)
FAREWELL_GREETINGS: Dict[str, Dict[str, str]] = {
    "casual": {
        "en": "Great work today!",
        "ko": "\uc624\ub298 \uc218\uace0\ud588\uc5b4\uc694!",
        "ja": "\u304a\u75b2\u308c\u69d8\uff01",
        "zh": "\u4eca\u5929\u8f9b\u82e6\u4e86\uff01",
        "es": "\u00a1Buen trabajo hoy!",
        "pt": "\u00d3timo trabalho hoje!",
        "de": "Gute Arbeit heute!",
        "fr": "Bon travail aujourd\u2019hui\u202f!",
    },
    "formal": {
        "en": "Session complete.",
        "ko": "\uc138\uc158\uc774 \uc644\ub8cc\ub418\uc5c8\uc2b5\ub2c8\ub2e4.",
        "ja": "\u30bb\u30c3\u30b7\u30e7\u30f3\u5b8c\u4e86\u3002",
        "zh": "\u4f1a\u8bdd\u5b8c\u6210\u3002",
        "es": "Sesi\u00f3n completada.",
        "pt": "Sess\u00e3o conclu\u00edda.",
        "de": "Sitzung abgeschlossen.",
        "fr": "Session termin\u00e9e.",
    },
}

FAREWELL_MESSAGES: Dict[str, Dict[str, str]] = {
    "casual": {
        "en": "See you next time!",
        "ko": "\ub2e4\uc74c\uc5d0 \ub610 \ub9cc\ub098\uc694!",
        "ja": "\u307e\u305f\u6b21\u56de\uff01",
        "zh": "\u4e0b\u6b21\u518d\u89c1\uff01",
        "es": "\u00a1Hasta la pr\u00f3xima!",
        "pt": "At\u00e9 a pr\u00f3xima!",
        "de": "Bis zum n\u00e4chsten Mal!",
        "fr": "\u00c0 la prochaine\u202f!",
    },
    "formal": {
        "en": "Session ended.",
        "ko": "\uc138\uc158\uc774 \uc885\ub8cc\ub418\uc5c8\uc2b5\ub2c8\ub2e4.",
        "ja": "\u30bb\u30c3\u30b7\u30e7\u30f3\u7d42\u4e86\u3002",
        "zh": "\u4f1a\u8bdd\u5df2\u7ed3\u675f\u3002",
        "es": "Sesi\u00f3n finalizada.",
        "pt": "Sess\u00e3o encerrada.",
        "de": "Sitzung beendet.",
        "fr": "Session termin\u00e9e.",
    },
}

SUMMARY_HEADERS: Dict[str, Dict[str, str]] = {
    "en": {"summary": "Session Summary", "agents": "Active Agents"},
    "ko": {"summary": "\uc138\uc158 \uc694\uc57d", "agents": "\ud65c\uc57d \uc5d0\uc774\uc804\ud2b8"},
    "ja": {"summary": "\u30bb\u30c3\u30b7\u30e7\u30f3\u6982\u8981", "agents": "\u30a2\u30af\u30c6\u30a3\u30d6\u30a8\u30fc\u30b8\u30a7\u30f3\u30c8"},
    "zh": {"summary": "\u4f1a\u8bdd\u6458\u8981", "agents": "\u6d3b\u8dc3\u4ee3\u7406"},
    "es": {"summary": "Resumen de sesi\u00f3n", "agents": "Agentes activos"},
    "pt": {"summary": "Resumo da sess\u00e3o", "agents": "Agentes ativos"},
    "de": {"summary": "Sitzungs\u00fcbersicht", "agents": "Aktive Agenten"},
    "fr": {"summary": "R\u00e9sum\u00e9 de session", "agents": "Agents actifs"},
}


# One-line session summary templates by language (#1036)
ONE_LINE_TEMPLATES: Dict[str, Dict[str, str]] = {
    "en": {
        "files_and_commands": "{files} {file_word} modified · {commands} commands run",
        "files_only": "{files} {file_word} modified",
        "commands_only": "{commands} commands run",
        "exploration": "Codebase exploration ({reads} files read)",
        "minimal": "{tools} tool calls",
        "agent_prefix": "{agent}: ",
    },
    "ko": {
        "files_and_commands": "파일 {files}개 수정 · 명령어 {commands}개 실행",
        "files_only": "파일 {files}개 수정",
        "commands_only": "명령어 {commands}개 실행",
        "exploration": "코드베이스 탐색 (파일 {reads}개 읽음)",
        "minimal": "도구 {tools}회 호출",
        "agent_prefix": "{agent}: ",
    },
    "ja": {
        "files_and_commands": "ファイル{files}件変更 · コマンド{commands}件実行",
        "files_only": "ファイル{files}件変更",
        "commands_only": "コマンド{commands}件実行",
        "exploration": "コードベース探索 (ファイル{reads}件読取)",
        "minimal": "ツール{tools}回呼出",
        "agent_prefix": "{agent}: ",
    },
    "zh": {
        "files_and_commands": "修改了{files}个文件 · 执行了{commands}个命令",
        "files_only": "修改了{files}个文件",
        "commands_only": "执行了{commands}个命令",
        "exploration": "代码库探索 (读取了{reads}个文件)",
        "minimal": "调用了{tools}次工具",
        "agent_prefix": "{agent}: ",
    },
    "es": {
        "files_and_commands": "{files} {file_word} modificados · {commands} comandos ejecutados",
        "files_only": "{files} {file_word} modificados",
        "commands_only": "{commands} comandos ejecutados",
        "exploration": "Exploración del código ({reads} archivos leídos)",
        "minimal": "{tools} llamadas de herramientas",
        "agent_prefix": "{agent}: ",
    },
    "pt": {
        "files_and_commands": "{files} {file_word} modificados · {commands} comandos executados",
        "files_only": "{files} {file_word} modificados",
        "commands_only": "{commands} comandos executados",
        "exploration": "Exploração do código ({reads} arquivos lidos)",
        "minimal": "{tools} chamadas de ferramentas",
        "agent_prefix": "{agent}: ",
    },
    "de": {
        "files_and_commands": "{files} {file_word} geändert · {commands} Befehle ausgeführt",
        "files_only": "{files} {file_word} geändert",
        "commands_only": "{commands} Befehle ausgeführt",
        "exploration": "Codebase-Erkundung ({reads} Dateien gelesen)",
        "minimal": "{tools} Toolaufrufe",
        "agent_prefix": "{agent}: ",
    },
    "fr": {
        "files_and_commands": "{files} {file_word} modifiés · {commands} commandes exécutées",
        "files_only": "{files} {file_word} modifiés",
        "commands_only": "{commands} commandes exécutées",
        "exploration": "Exploration du code ({reads} fichiers lus)",
        "minimal": "{tools} appels d'outils",
        "agent_prefix": "{agent}: ",
    },
}

# Singular/plural file word by language
_FILE_WORDS: Dict[str, Dict[str, str]] = {
    "en": {"one": "file", "many": "files"},
    "es": {"one": "archivo", "many": "archivos"},
    "pt": {"one": "arquivo", "many": "arquivos"},
    "de": {"one": "Datei", "many": "Dateien"},
    "fr": {"one": "fichier", "many": "fichiers"},
}


def generate_one_line_summary(
    tool_names: Dict[str, int],
    agent_name: str,
    language: str,
) -> str:
    """Generate a one-line session summary from tool usage data.

    Analyzes tool_names to determine activity type and generates a
    human-readable one-line summary with multi-language support.

    Args:
        tool_names: Dict mapping tool name to usage count
            (e.g. {"Edit": 5, "Bash": 10, "Read": 20}).
        agent_name: Active agent name, empty string if none.
        language: Language code (en, ko, ja, zh, es, pt, de, fr).

    Returns:
        One-line summary string.
    """
    templates = ONE_LINE_TEMPLATES.get(language, ONE_LINE_TEMPLATES["en"])

    files_changed = tool_names.get("Edit", 0) + tool_names.get("Write", 0)
    commands_run = tool_names.get("Bash", 0)
    reads = tool_names.get("Read", 0) + tool_names.get("Grep", 0) + tool_names.get("Glob", 0)
    total_tools = sum(tool_names.values())

    # Determine file word (singular/plural) for languages that need it
    file_words = _FILE_WORDS.get(language, _FILE_WORDS.get("en", {"one": "file", "many": "files"}))
    file_word = file_words["one"] if files_changed == 1 else file_words["many"]

    # Select appropriate template
    if files_changed > 0 and commands_run > 0:
        summary = templates["files_and_commands"].format(
            files=files_changed, file_word=file_word, commands=commands_run,
        )
    elif files_changed > 0:
        summary = templates["files_only"].format(
            files=files_changed, file_word=file_word,
        )
    elif commands_run > 0:
        summary = templates["commands_only"].format(commands=commands_run)
    elif reads > 0:
        summary = templates["exploration"].format(reads=reads)
    elif total_tools > 0:
        summary = templates["minimal"].format(tools=total_tools)
    else:
        summary = templates["minimal"].format(tools=0)

    # Prepend agent name if available
    if agent_name:
        prefix = templates["agent_prefix"].format(agent=agent_name)
        summary = prefix + summary

    return summary


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


def render_buddy_face(
    tone: str,
    language: str,
    buddy_config: Optional[Dict[str, Any]] = None,
) -> str:
    """Render the buddy character face with greeting.

    Args:
        tone: 'casual' or 'formal'
        language: Language code (en, ko, ja, zh, es)
        buddy_config: Optional buddy customization from get_buddy_config().

    Returns:
        ASCII art buddy face with greeting message.
    """
    bc = buddy_config or DEFAULT_BUDDY_CONFIG
    face = bc.get("face", BUDDY_FACE)
    custom_greeting = bc.get("greeting", "")
    greeting = custom_greeting if custom_greeting else _get_greeting(tone, language)
    lines = [
        "\u256d\u2501\u2501\u2501\u256e",
        f"\u2503 {face} \u2503 {greeting}",
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
    buddy_config: Optional[Dict[str, Any]] = None,
    tool_names: Optional[Dict[str, int]] = None,
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
        buddy_config: Optional buddy customization from get_buddy_config().
        tool_names: Optional dict of tool name to usage count for
            one-line summary generation (#1036).

    Returns:
        Formatted session summary string.
    """
    bc = buddy_config or DEFAULT_BUDDY_CONFIG
    custom_farewell = bc.get("farewell", "")

    greeting = _get_farewell_greeting(tone, language)
    farewell = custom_farewell if custom_farewell else _get_farewell_message(tone, language)

    # Use custom face for wrap variant: take first char of custom face if set
    face = bc.get("face", BUDDY_FACE)
    if face != BUDDY_FACE:
        wrap_face = face  # custom face used as-is
    else:
        wrap_face = BUDDY_WRAP_FACE

    parts = []

    # Buddy face with farewell greeting
    parts.append("\u256d\u2501\u2501\u2501\u256e")
    parts.append(f"\u2503 {wrap_face} \u2503 {greeting}")
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

    # One-line session summary (#1036)
    if tool_names:
        agent_name = agents[0]["name"] if agents else ""
        one_line = generate_one_line_summary(tool_names, agent_name, language)
        if one_line:
            parts.append(f"\U0001f4ac {one_line}")

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
    parts.append(f"{face} {farewell}")

    result = "\n".join(parts)

    # ASCII fallback mode (#1040)
    if bc.get("asciiMode"):
        result = _to_ascii(result)

    return result


def _get_returning_greeting(tone: str, language: str) -> str:
    """Get returning session greeting for given tone and language."""
    tone_greetings = RETURNING_GREETINGS.get(tone, RETURNING_GREETINGS["casual"])
    return tone_greetings.get(language, tone_greetings["en"])


def _get_returning_header(key: str, language: str) -> str:
    """Get returning session header for given key and language."""
    lang_headers = RETURNING_HEADERS.get(language, RETURNING_HEADERS["en"])
    return lang_headers.get(key, RETURNING_HEADERS["en"].get(key, key))


def _format_duration(started_at: float, ended_at: float) -> str:
    """Format session duration from timestamps."""
    if not ended_at or not started_at:
        return ""
    minutes = int((ended_at - started_at) / 60)
    if minutes < 1:
        return "<1min"
    if minutes < 60:
        return f"{minutes}min"
    hours = minutes // 60
    remaining = minutes % 60
    if remaining:
        return f"{hours}h {remaining}min"
    return f"{hours}h"


def render_returning_session(
    previous_session: Dict[str, Any],
    pending_context: "Dict[str, Any] | None",
    tone: str,
    language: str,
    buddy_config: Optional[Dict[str, Any]] = None,
) -> str:
    """Render returning session welcome-back display.

    Args:
        previous_session: Dict from HistoryDB.get_previous_session with keys:
            session_id, started_at, ended_at, tool_call_count,
            error_count, outcome
        pending_context: Optional dict with keys: mode, task, status
            from docs/codingbuddy/context.md parsing. None if no context.
        tone: 'casual' or 'formal'
        language: Language code (en, ko, ja, zh, es)
        buddy_config: Optional buddy customization from get_buddy_config().

    Returns:
        Formatted returning session greeting string.
    """
    bc = buddy_config or DEFAULT_BUDDY_CONFIG
    face = bc.get("face", BUDDY_FACE)
    custom_greeting = bc.get("greeting", "")
    greeting = custom_greeting if custom_greeting else _get_returning_greeting(tone, language)

    # Wink face variant for continue prompt
    if face != BUDDY_FACE:
        wink_face = face
    else:
        wink_face = BUDDY_WINK_FACE

    parts = []

    # Buddy face with welcome-back greeting
    parts.append("\u256d\u2501\u2501\u2501\u256e")
    parts.append(f"\u2503 {face} \u2503 {greeting}")
    parts.append("\u2570\u2501\u2501\u2501\u256f")

    # Last session summary
    header = _get_returning_header("last_session", language)
    parts.append("")
    parts.append(f"\u2501\u2501 {header} \u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501")

    stat_items = []

    duration = _format_duration(
        previous_session.get("started_at", 0),
        previous_session.get("ended_at", 0),
    )
    if duration:
        stat_items.append(f"\u23f1  {duration}")

    tool_count = previous_session.get("tool_call_count", 0)
    if tool_count > 0:
        stat_items.append(f"\U0001f527 {tool_count} tools")

    error_count = previous_session.get("error_count", 0)
    if error_count > 0:
        stat_items.append(f"\u26a0\ufe0f {error_count} errors")

    if stat_items:
        parts.append(" \u2502 ".join(stat_items))

    # Pending work context
    if pending_context and pending_context.get("task"):
        pending_header = _get_returning_header("pending", language)
        parts.append("")
        parts.append(f"\u2501\u2501 {pending_header} \u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501")

        mode = pending_context.get("mode", "")
        task = pending_context.get("task", "")
        status = pending_context.get("status", "")

        if mode and status == "in_progress":
            parts.append(f"\U0001f4dd {task} ({mode} pending)")
        elif mode:
            parts.append(f"\u2705 {task} ({mode} {status})")

    # Continue prompt
    parts.append("")
    if pending_context and pending_context.get("mode"):
        mode = pending_context["mode"]
        next_mode = "ACT" if mode == "PLAN" else mode
        parts.append(f"{wink_face}  Type \"{next_mode}\" to continue!")
    else:
        parts.append(f"{wink_face}  Ready when you are!")

    return "\n".join(parts)


def render_badges_section(language: str = "en") -> str:
    """Render achievement badges section for session display (#1008).

    Loads unlocked achievements and renders them as a badge area.

    Args:
        language: Language code (en, ko, ja, zh, es).

    Returns:
        Formatted badge section string, empty if no badges or on error.
    """
    try:
        from achievement_tracker import AchievementTracker, render_achievement_badges

        tracker = AchievementTracker()
        unlocked = tracker.get_unlocked()
        if unlocked:
            return render_achievement_badges(unlocked, language)
    except Exception:
        pass
    return ""


def render_session_start(
    scan: Dict[str, Any],
    recommendations: List[Dict[str, Any]],
    tone: str,
    language: str,
    previous_session: "Dict[str, Any] | None" = None,
    pending_context: "Dict[str, Any] | None" = None,
    buddy_config: Optional[Dict[str, Any]] = None,
    typing: bool = False,
) -> str:
    """Render complete session-start output.

    Assembles buddy face, scan results, and recommendations into
    a single formatted output string. If previous_session is provided,
    renders a returning session greeting instead of the default.

    When typing=True, writes the output to stderr with a typing animation
    effect on the greeting text and returns an empty string.

    Args:
        scan: Project scan data dict.
        recommendations: Agent recommendation list.
        tone: 'casual' or 'formal'
        language: Language code.
        previous_session: Optional previous session data for returning users.
        pending_context: Optional pending work context from context.md.
        buddy_config: Optional buddy customization from get_buddy_config().
        typing: If True, output to stderr with typing animation on greeting.

    Returns:
        Complete formatted session-start output, or empty string if typing=True.
    """
    # Returning session path
    if previous_session:
        parts = [
            render_returning_session(
                previous_session, pending_context, tone, language,
                buddy_config=buddy_config,
            ),
            "",
            render_scan_results(scan),
        ]
    else:
        # First visit path (default)
        parts = [
            render_buddy_face(tone, language, buddy_config=buddy_config),
            "",
            render_scan_results(scan),
        ]

    if recommendations:
        header = _get_header("recommendations", language)
        parts.append("")
        parts.append(f"\u2501\u2501 {header} \u2501\u2501\u2501\u2501\u2501\u2501")
        parts.append(render_recommendations(recommendations))

    # Achievement badges section (#1008)
    badges = render_badges_section(language)
    if badges:
        parts.append("")
        parts.append(badges)

    full_output = "\n".join(parts)

    # ASCII fallback mode (#1040)
    bc = buddy_config or DEFAULT_BUDDY_CONFIG
    if bc.get("asciiMode"):
        full_output = _to_ascii(full_output)

    if not typing:
        return full_output

    # Typing mode: animate the greeting text, print rest instantly
    custom_greeting = bc.get("greeting", "")
    if previous_session:
        greeting = custom_greeting if custom_greeting else _get_returning_greeting(tone, language)
    else:
        greeting = custom_greeting if custom_greeting else _get_greeting(tone, language)

    idx = full_output.find(greeting)
    if idx == -1 or not greeting:
        # Fallback: print everything instantly
        sys.stderr.write(full_output + "\n")
        sys.stderr.flush()
        return ""

    before = full_output[:idx]
    after = full_output[idx + len(greeting):]

    sys.stderr.write(before)
    sys.stderr.flush()
    type_text(greeting)
    sys.stderr.write(after + "\n")
    sys.stderr.flush()
    return ""
