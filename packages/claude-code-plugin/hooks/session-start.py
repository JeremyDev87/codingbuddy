#!/usr/bin/env python3
"""
CodingBuddy Session Start Hook

Automatically installs the UserPromptSubmit hook for mode detection
when a Claude Code session starts.

This hook:
1. Checks if the mode detection hook is already installed
2. If not, copies it to ~/.claude/hooks/
3. Registers it in ~/.claude/settings.json
"""

import json
import os
import re
import shutil
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# File locking (Unix only, optional on Windows)
try:
    import fcntl
    HAS_FCNTL = True
except ImportError:
    HAS_FCNTL = False


# Constants
HOOK_FILENAME = "codingbuddy-mode-detect.py"
SOURCE_FILENAME = "user-prompt-submit.py"
HOOK_COMMAND = f"python3 ~/.claude/hooks/{HOOK_FILENAME}"

# i18n Messages
MESSAGES: Dict[str, Dict[str, str]] = {
    "en": {
        "installed": "CodingBuddy mode detection hook installed",
        "patterns": "   PLAN:/ACT:/EVAL:/AUTO: patterns will be auto-detected",
        "source_not_found": "CodingBuddy: Could not find hook source file. Please reinstall the plugin or check the installation.",
        "permission_error": "CodingBuddy: Permission error - {error}",
        "permission_hint": "Try running: chmod +x ~/.claude/hooks/codingbuddy-mode-detect.py",
        "setup_error": "CodingBuddy hook setup error: {error}",
        "backup_corrupted": "Backed up corrupted settings to {path}",
    },
    "ko": {
        "installed": "CodingBuddy 모드 감지 훅이 설치되었습니다",
        "patterns": "   PLAN:/ACT:/EVAL:/AUTO: 패턴이 자동 감지됩니다",
        "source_not_found": "CodingBuddy: 훅 소스 파일을 찾을 수 없습니다. 플러그인을 재설치하거나 설치를 확인하세요.",
        "permission_error": "CodingBuddy: 권한 오류 - {error}",
        "permission_hint": "실행: chmod +x ~/.claude/hooks/codingbuddy-mode-detect.py",
        "setup_error": "CodingBuddy 훅 설정 오류: {error}",
        "backup_corrupted": "손상된 설정을 {path}에 백업했습니다",
    },
    "ja": {
        "installed": "CodingBuddyモード検出フックがインストールされました",
        "patterns": "   PLAN:/ACT:/EVAL:/AUTO: パターンが自動検出されます",
        "source_not_found": "CodingBuddy: フックソースファイルが見つかりません。プラグインを再インストールするか、インストールを確認してください。",
        "permission_error": "CodingBuddy: 権限エラー - {error}",
        "permission_hint": "実行: chmod +x ~/.claude/hooks/codingbuddy-mode-detect.py",
        "setup_error": "CodingBuddyフック設定エラー: {error}",
        "backup_corrupted": "破損した設定を{path}にバックアップしました",
    },
    "zh": {
        "installed": "CodingBuddy模式检测钩子已安装",
        "patterns": "   PLAN:/ACT:/EVAL:/AUTO: 模式将被自动检测",
        "source_not_found": "CodingBuddy: 找不到钩子源文件。请重新安装插件或检查安装。",
        "permission_error": "CodingBuddy: 权限错误 - {error}",
        "permission_hint": "执行: chmod +x ~/.claude/hooks/codingbuddy-mode-detect.py",
        "setup_error": "CodingBuddy钩子设置错误: {error}",
        "backup_corrupted": "已将损坏的设置备份到{path}",
    },
    "es": {
        "installed": "Hook de detección de modo CodingBuddy instalado",
        "patterns": "   PLAN:/ACT:/EVAL:/AUTO: los patrones serán detectados automáticamente",
        "source_not_found": "CodingBuddy: No se pudo encontrar el archivo fuente del hook. Por favor reinstale el plugin o verifique la instalación.",
        "permission_error": "CodingBuddy: Error de permisos - {error}",
        "permission_hint": "Ejecute: chmod +x ~/.claude/hooks/codingbuddy-mode-detect.py",
        "setup_error": "Error de configuración del hook CodingBuddy: {error}",
        "backup_corrupted": "Se respaldó la configuración corrupta en {path}",
    },
}


# Language cache (module-level singleton)
_cached_language: Optional[str] = None


def get_system_language() -> str:
    """Get the system language code (en, ko, ja, zh, es)."""
    try:
        # Try environment variables first (most reliable, cross-version)
        for env_var in ("LANG", "LC_ALL", "LC_MESSAGES", "LANGUAGE"):
            lang = os.environ.get(env_var)
            if lang:
                lang_code = lang.split("_")[0].split(".")[0].lower()
                if lang_code in MESSAGES:
                    return lang_code
        return "en"
    except Exception:
        return "en"


def _get_cached_language() -> str:
    """Get cached language, computing once on first call."""
    global _cached_language
    if _cached_language is None:
        _cached_language = get_system_language()
    return _cached_language


def msg(key: str, **kwargs) -> str:
    """Get a localized message by key."""
    lang = _get_cached_language()
    lang_messages = MESSAGES.get(lang, MESSAGES["en"])
    template = lang_messages.get(key) or MESSAGES["en"].get(key, key)
    return template.format(**kwargs) if kwargs else template


def parse_version(version_str: str) -> Tuple[int, ...]:
    """
    Parse a version string into a tuple of integers for comparison.

    Handles formats like: "3.0.0", "3.1.0-beta", "v2.0.0"

    Args:
        version_str: Version string to parse

    Returns:
        Tuple of integers for comparison (e.g., (3, 1, 0))
    """
    # Remove leading 'v' if present
    version_str = version_str.lstrip('v')

    # Extract numeric parts
    match = re.match(r'^(\d+)(?:\.(\d+))?(?:\.(\d+))?', version_str)
    if match:
        parts = [int(p) if p else 0 for p in match.groups()]
        return tuple(parts)

    # Fallback: return (0, 0, 0) for unparseable versions
    return (0, 0, 0)


def sort_version_dirs(dirs: List[Path]) -> List[Path]:
    """
    Sort directory paths by semantic version (descending).

    Args:
        dirs: List of directory paths with version names

    Returns:
        Sorted list with highest version first
    """
    return sorted(dirs, key=lambda d: parse_version(d.name), reverse=True)


def _find_source_from_env() -> Optional[Path]:
    """Check CLAUDE_PLUGIN_DIR environment variable for source.

    Security: Validates that the path resolves to a real location
    and the source file exists before returning.
    """
    plugin_dir = os.environ.get("CLAUDE_PLUGIN_DIR")
    if plugin_dir:
        try:
            # Resolve symlinks and normalize path for security
            resolved_dir = Path(plugin_dir).resolve()
            source = resolved_dir / "hooks" / SOURCE_FILENAME
            # Verify file exists and is a regular file (not symlink to unexpected location)
            if source.exists() and source.is_file():
                return source.resolve()
        except (OSError, ValueError):
            # Invalid path - skip silently
            pass
    return None


def _find_source_from_cache(home: Path) -> Optional[Path]:
    """Check known plugin cache paths for source.

    Security: Uses Path.resolve() to prevent symlink traversal attacks.
    """
    cache_paths = [
        home / ".claude/plugins/cache/jeremydev87/codingbuddy",
        home / ".claude/plugins/cache/codingbuddy",
        home / ".claude/plugins/codingbuddy",
    ]

    for base_path in cache_paths:
        try:
            resolved_base = base_path.resolve()
            if resolved_base.exists() and resolved_base.is_dir():
                all_dirs = [d for d in resolved_base.iterdir() if d.is_dir()]
                for version_dir in sort_version_dirs(all_dirs):
                    source = version_dir / "hooks" / SOURCE_FILENAME
                    resolved_source = source.resolve()
                    if resolved_source.exists() and resolved_source.is_file():
                        return resolved_source
        except (OSError, ValueError):
            # Invalid path - skip silently
            continue
    return None


def _find_source_from_dev(home: Path) -> Optional[Path]:
    """Check common development directory patterns for source.

    Security: Uses Path.resolve() to prevent symlink traversal attacks.
    """
    dev_patterns = [
        "workspace/codingbuddy/packages/claude-code-plugin/hooks",
        "dev/codingbuddy/packages/claude-code-plugin/hooks",
        "projects/codingbuddy/packages/claude-code-plugin/hooks",
        "code/codingbuddy/packages/claude-code-plugin/hooks",
    ]

    for pattern in dev_patterns:
        try:
            source = home / pattern / SOURCE_FILENAME
            resolved_source = source.resolve()
            if resolved_source.exists() and resolved_source.is_file():
                return resolved_source
        except (OSError, ValueError):
            # Invalid path - skip silently
            continue
    return None


def find_plugin_source() -> Optional[Path]:
    """
    Find the source hook file from plugin installation.

    Search order:
    1. CLAUDE_PLUGIN_DIR environment variable
    2. Known plugin cache paths (fallback)
    3. Local development path

    Returns:
        Path to source file or None if not found
    """
    # Try each source in priority order
    source = _find_source_from_env()
    if source:
        return source

    home = Path.home()

    source = _find_source_from_cache(home)
    if source:
        return source

    return _find_source_from_dev(home)


def is_hook_registered(settings_file: Path) -> bool:
    """Check if the hook is already registered in settings.json."""
    if not settings_file.exists():
        return False

    try:
        with open(settings_file, "r", encoding="utf-8") as f:
            settings = json.load(f)
        return _is_hook_in_settings(settings)
    except (json.JSONDecodeError, KeyError):
        return False


def _is_hook_in_settings(settings: dict) -> bool:
    """Check if our hook is already registered in settings dict."""
    user_prompt_hooks = settings.get("hooks", {}).get("UserPromptSubmit", [])
    for hook_group in user_prompt_hooks:
        for hook in hook_group.get("hooks", []):
            if hook.get("command") == HOOK_COMMAND:
                return True
    return False


def _create_hook_entry() -> dict:
    """Create the hook entry structure for UserPromptSubmit."""
    return {
        "hooks": [{
            "type": "command",
            "command": HOOK_COMMAND
        }]
    }


def _add_hook_to_settings(settings: dict) -> dict:
    """Add our hook to settings dict, return modified settings."""
    hooks = settings.setdefault("hooks", {})
    user_prompt_hooks = hooks.setdefault("UserPromptSubmit", [])
    user_prompt_hooks.append(_create_hook_entry())
    return settings


def _write_settings_file(settings_file: Path, settings: dict) -> None:
    """Write settings to file with optional file locking."""
    with open(settings_file, "w", encoding="utf-8") as f:
        if HAS_FCNTL:
            fcntl.flock(f.fileno(), fcntl.LOCK_EX)
        json.dump(settings, f, indent=2, ensure_ascii=False)


def _read_settings_file(settings_file: Path) -> dict:
    """Read settings from file, backup if corrupted."""
    try:
        with open(settings_file, "r", encoding="utf-8") as f:
            if HAS_FCNTL:
                fcntl.flock(f.fileno(), fcntl.LOCK_SH)
            return json.load(f)
    except json.JSONDecodeError:
        backup_path = settings_file.with_suffix(".json.bak")
        shutil.copy(settings_file, backup_path)
        print(msg("backup_corrupted", path=backup_path), file=sys.stderr)
        return {}


def register_hook_in_settings(settings_file: Path) -> bool:
    """
    Register the UserPromptSubmit hook in settings.json.

    Uses file locking on Unix systems to prevent concurrent write issues.

    Args:
        settings_file: Path to ~/.claude/settings.json

    Returns:
        True if registered successfully, False if already exists
    """
    settings_file.parent.mkdir(parents=True, exist_ok=True)

    # Read existing settings or start fresh
    settings = _read_settings_file(settings_file) if settings_file.exists() else {}

    # Check if already registered
    if _is_hook_in_settings(settings):
        return False

    # Add hook and write
    settings = _add_hook_to_settings(settings)
    _write_settings_file(settings_file, settings)
    return True


def main():
    """Main entry point for the session start hook."""
    try:
        home = Path.home()
        hooks_dir = home / ".claude" / "hooks"
        target_file = hooks_dir / HOOK_FILENAME
        settings_file = home / ".claude" / "settings.json"

        installed_hook = False
        registered_settings = False

        # Step 1: Install hook file if not exists
        if not target_file.exists():
            source_file = find_plugin_source()

            if source_file:
                hooks_dir.mkdir(parents=True, exist_ok=True)
                shutil.copy(source_file, target_file)
                target_file.chmod(0o755)
                installed_hook = True
            else:
                # Source not found - provide manual installation guide
                print(msg("source_not_found"), file=sys.stderr)

        # Step 2: Register in settings.json if not registered
        if target_file.exists() and not is_hook_registered(settings_file):
            registered_settings = register_hook_in_settings(settings_file)

        # Output status message
        if installed_hook or registered_settings:
            print(msg("installed"))
            print(msg("patterns"))

        # Step 3: System prompt injection (#828)
        # SessionStart uses plain stdout for context injection (NOT JSON)
        try:
            # Add hooks/lib to path for imports
            _hooks_dir = os.path.dirname(os.path.abspath(__file__))
            _lib_dir = os.path.join(_hooks_dir, "lib")
            if _lib_dir not in sys.path:
                sys.path.insert(0, _lib_dir)

            from prompt_injection import PromptInjector
            from config import get_config

            cwd = os.environ.get("CLAUDE_PROJECT_DIR", str(Path.cwd()))
            cfg = get_config(cwd)
            injector = PromptInjector()
            system_msg = injector.build_system_prompt(cfg, cwd)
            if system_msg:
                print(system_msg)
        except Exception:
            pass  # Never block session start

        # Step 4: Initialize operational stats (#825)
        try:
            _hooks_dir = os.path.dirname(os.path.abspath(__file__))
            _lib_dir = os.path.join(_hooks_dir, "lib")
            if _lib_dir not in sys.path:
                sys.path.insert(0, _lib_dir)

            from stats import SessionStats

            session_id = os.environ.get("CLAUDE_SESSION_ID", "unknown")
            SessionStats(session_id=session_id)
            SessionStats.cleanup_stale(
                os.environ.get("CLAUDE_PLUGIN_DATA",
                               os.path.join(str(home), ".codingbuddy"))
            )
        except Exception:
            pass  # Never block session start

        # Step 5: Record session in history database (#823)
        try:
            _hooks_dir = os.path.dirname(os.path.abspath(__file__))
            _lib_dir = os.path.join(_hooks_dir, "lib")
            if _lib_dir not in sys.path:
                sys.path.insert(0, _lib_dir)

            from history_db import HistoryDB

            session_id = os.environ.get("CLAUDE_SESSION_ID", "unknown")
            cwd = os.environ.get("CLAUDE_PROJECT_DIR", str(Path.cwd()))
            model = os.environ.get("CLAUDE_MODEL", "unknown")
            db = HistoryDB()
            db.start_session(session_id, cwd, model)
            db.close()
        except Exception:
            pass  # Never block session start

        sys.exit(0)

    except PermissionError as e:
        print(msg("permission_error", error=e), file=sys.stderr)
        print(msg("permission_hint"), file=sys.stderr)
        sys.exit(0)
    except Exception as e:
        print(msg("setup_error", error=e), file=sys.stderr)
        sys.exit(0)


if __name__ == "__main__":
    main()
