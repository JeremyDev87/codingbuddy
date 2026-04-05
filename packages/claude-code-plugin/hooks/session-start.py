#!/usr/bin/env python3
"""
CodingBuddy Session Start Hook — Bootstrap for global UserPromptSubmit.

This file is the **source of truth** for how the CodingBuddy plugin
installs its ``UserPromptSubmit`` hook into Claude Code.

Why this file exists
--------------------
CodingBuddy uses two distinct hook layers:

1. **Plugin-local** ``hooks/hooks.json`` — registers ``SessionStart``,
   ``PreToolUse``, ``PostToolUse``, and ``Stop`` hooks that Claude Code
   loads directly from the plugin package at runtime.
2. **Global install** (this script) — at every session start, copies
   ``hooks/user-prompt-submit.py`` into ``~/.claude/hooks/`` and
   registers a ``UserPromptSubmit`` hook in the user's global
   ``~/.claude/settings.json``.

``UserPromptSubmit`` is deliberately **not** in ``hooks/hooks.json``.
The global install is what actually wires up PLAN/ACT/EVAL/AUTO mode
detection today, and contributors reading ``hooks.json`` first have
repeatedly mistaken the missing entry for a bug (see #1380).

For the long-form rationale and migration options, see:
``packages/claude-code-plugin/docs/bootstrap-architecture.md``.

What this hook does on every session start
-------------------------------------------
1. Check whether the mode-detection hook file already exists at
   ``~/.claude/hooks/codingbuddy-mode-detect.py``.
2. If not, copy ``user-prompt-submit.py`` there (alongside its ``lib/``
   dependencies).
3. Ensure ``~/.claude/settings.json`` has a ``UserPromptSubmit`` hook
   entry pointing at that file, creating the settings file if needed
   and using file locking on Unix to avoid concurrent writes.
4. Additionally installs the status line, ``~/.claude/mcp.json`` entry,
   system-prompt injection, and briefing-recovery suggestions.

Invariant: any change that moves ``UserPromptSubmit`` registration into
``hooks/hooks.json`` **must** delete the corresponding install logic
below and update ``docs/bootstrap-architecture.md`` plus
``tests/test_bootstrap_architecture.py`` in the same change.
"""

import json
import os
import re
import shutil
import subprocess
import sys
import time
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
HOOK_COMMAND = f'python3 "$HOME/.claude/hooks/{HOOK_FILENAME}"'

# i18n Messages
MESSAGES: Dict[str, Dict[str, str]] = {
    "en": {
        "installed": "CodingBuddy mode detection hook installed",
        "patterns": "   PLAN:/ACT:/EVAL:/AUTO: patterns will be auto-detected",
        "restart_needed": "   Restart Claude Code to activate PLAN/ACT/EVAL/AUTO mode detection.",
        "source_not_found": "CodingBuddy: Could not find hook source file. Please reinstall the plugin or check the installation.",
        "permission_error": "CodingBuddy: Permission error - {error}",
        "permission_hint": "Try running: chmod +x ~/.claude/hooks/codingbuddy-mode-detect.py",
        "setup_error": "CodingBuddy hook setup error: {error}",
        "backup_corrupted": "Backed up corrupted settings to {path}",
    },
    "ko": {
        "installed": "CodingBuddy 모드 감지 훅이 설치되었습니다",
        "patterns": "   PLAN:/ACT:/EVAL:/AUTO: 패턴이 자동 감지됩니다",
        "restart_needed": "   PLAN/ACT/EVAL/AUTO 모드 감지를 활성화하려면 Claude Code를 재시작하세요.",
        "source_not_found": "CodingBuddy: 훅 소스 파일을 찾을 수 없습니다. 플러그인을 재설치하거나 설치를 확인하세요.",
        "permission_error": "CodingBuddy: 권한 오류 - {error}",
        "permission_hint": "실행: chmod +x ~/.claude/hooks/codingbuddy-mode-detect.py",
        "setup_error": "CodingBuddy 훅 설정 오류: {error}",
        "backup_corrupted": "손상된 설정을 {path}에 백업했습니다",
    },
    "ja": {
        "installed": "CodingBuddyモード検出フックがインストールされました",
        "patterns": "   PLAN:/ACT:/EVAL:/AUTO: パターンが自動検出されます",
        "restart_needed": "   PLAN/ACT/EVAL/AUTOモード検出を有効にするには、Claude Codeを再起動してください。",
        "source_not_found": "CodingBuddy: フックソースファイルが見つかりません。プラグインを再インストールするか、インストールを確認してください。",
        "permission_error": "CodingBuddy: 権限エラー - {error}",
        "permission_hint": "実行: chmod +x ~/.claude/hooks/codingbuddy-mode-detect.py",
        "setup_error": "CodingBuddyフック設定エラー: {error}",
        "backup_corrupted": "破損した設定を{path}にバックアップしました",
    },
    "zh": {
        "installed": "CodingBuddy模式检测钩子已安装",
        "patterns": "   PLAN:/ACT:/EVAL:/AUTO: 模式将被自动检测",
        "restart_needed": "   请重启Claude Code以激活PLAN/ACT/EVAL/AUTO模式检测。",
        "source_not_found": "CodingBuddy: 找不到钩子源文件。请重新安装插件或检查安装。",
        "permission_error": "CodingBuddy: 权限错误 - {error}",
        "permission_hint": "执行: chmod +x ~/.claude/hooks/codingbuddy-mode-detect.py",
        "setup_error": "CodingBuddy钩子设置错误: {error}",
        "backup_corrupted": "已将损坏的设置备份到{path}",
    },
    "es": {
        "installed": "Hook de detección de modo CodingBuddy instalado",
        "patterns": "   PLAN:/ACT:/EVAL:/AUTO: los patrones serán detectados automáticamente",
        "restart_needed": "   Reinicie Claude Code para activar la detección de modos PLAN/ACT/EVAL/AUTO.",
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
            if HOOK_FILENAME in hook.get("command", ""):
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
    Register the UserPromptSubmit hook in the user's global settings.json.

    This is the **bootstrap source of truth** for CodingBuddy's
    UserPromptSubmit registration. The plugin-local ``hooks/hooks.json``
    intentionally does NOT declare UserPromptSubmit; instead, this
    function writes the hook entry into ``~/.claude/settings.json`` so
    it is active for *all* Claude Code sessions, not just sessions
    inside the CodingBuddy project.

    Why global, not plugin-local? PLAN/ACT/EVAL keyword detection is
    meant to work from any working directory once the plugin is
    installed. A plugin-local hook would only fire when
    ``CLAUDE_PLUGIN_ROOT`` resolves to this package, which is too
    narrow. See ``docs/bootstrap-architecture.md`` and #1380.

    Uses file locking on Unix systems to prevent concurrent write
    issues when multiple Claude Code sessions start at the same time.

    Args:
        settings_file: Path to ``~/.claude/settings.json``.

    Returns:
        ``True`` if the hook was newly registered, ``False`` if an
        entry already existed (idempotent).
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


def _install_hook_with_lib(
    source_file: Path, hooks_dir: Path, target_file: Path
) -> None:
    """Copy hook file AND its lib/ dependencies to the target hooks directory.

    Copies the hook script and, if present, the sibling lib/ directory
    so that runtime imports (e.g. hud_state) work from ~/.claude/hooks/.

    Args:
        source_file: Path to the source hook script.
        hooks_dir: Target directory (e.g. ~/.claude/hooks/).
        target_file: Full target path for the hook script.
    """
    hooks_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy(source_file, target_file)
    target_file.chmod(0o755)

    # Copy lib/ directory alongside the hook (#1102)
    source_lib = source_file.parent / "lib"
    if source_lib.is_dir():
        target_lib = hooks_dir / "lib"
        shutil.copytree(
            source_lib,
            target_lib,
            dirs_exist_ok=True,
            ignore=shutil.ignore_patterns("__pycache__", "*.pyc"),
        )


CODINGBUDDY_MCP_ENTRY = {
    "command": "codingbuddy",
    "args": ["mcp"],
}


def _ensure_mcp_json(mcp_json_path: Path) -> None:
    """Ensure ~/.claude/mcp.json contains the codingbuddy MCP server entry (#1100).

    Creates the file if missing, or merges the codingbuddy entry into an
    existing file while preserving other MCP server configurations.
    """
    mcp_json_path.parent.mkdir(parents=True, exist_ok=True)

    if mcp_json_path.exists():
        try:
            with open(mcp_json_path, "r", encoding="utf-8") as f:
                if HAS_FCNTL:
                    fcntl.flock(f.fileno(), fcntl.LOCK_SH)
                existing = json.load(f)
        except (json.JSONDecodeError, OSError):
            existing = {}
    else:
        existing = {}

    servers = existing.setdefault("mcpServers", {})
    if "codingbuddy" in servers:
        return  # Already configured — don't overwrite user customizations

    servers["codingbuddy"] = CODINGBUDDY_MCP_ENTRY

    with open(mcp_json_path, "w", encoding="utf-8") as f:
        if HAS_FCNTL:
            fcntl.flock(f.fileno(), fcntl.LOCK_EX)
        json.dump(existing, f, indent=2, ensure_ascii=False)


HUD_FILENAME = "codingbuddy-hud.py"


def _get_plugin_version() -> str:
    """Read plugin version from .claude-plugin/plugin.json.

    Falls back to '0.0.0' if not found.
    """
    try:
        this_dir = os.path.dirname(os.path.abspath(__file__))
        plugin_json = os.path.join(this_dir, "..", ".claude-plugin", "plugin.json")
        if os.path.isfile(plugin_json):
            with open(plugin_json, "r", encoding="utf-8") as f:
                return json.load(f).get("version", "0.0.0")
    except Exception:
        pass

    # Try CLAUDE_PLUGIN_DIR
    plugin_dir = os.environ.get("CLAUDE_PLUGIN_DIR")
    if plugin_dir:
        try:
            pj = os.path.join(plugin_dir, ".claude-plugin", "plugin.json")
            if os.path.isfile(pj):
                with open(pj, "r", encoding="utf-8") as f:
                    return json.load(f).get("version", "0.0.0")
        except Exception:
            pass

    return "0.0.0"


def _find_hud_source() -> Optional[Path]:
    """Find the codingbuddy-hud.py source file.

    Same 3-tier search as find_plugin_source() but for the HUD script.
    """
    # 1. CLAUDE_PLUGIN_DIR env
    plugin_dir = os.environ.get("CLAUDE_PLUGIN_DIR")
    if plugin_dir:
        try:
            source = Path(plugin_dir).resolve() / "hooks" / HUD_FILENAME
            if source.exists() and source.is_file():
                return source.resolve()
        except (OSError, ValueError):
            pass

    home = Path.home()

    # 2. Plugin cache paths
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
                    source = version_dir / "hooks" / HUD_FILENAME
                    if source.resolve().exists():
                        return source.resolve()
        except (OSError, ValueError):
            continue

    # 3. Dev paths
    dev_patterns = [
        "workspace/codingbuddy/packages/claude-code-plugin/hooks",
        "dev/codingbuddy/packages/claude-code-plugin/hooks",
        "projects/codingbuddy/packages/claude-code-plugin/hooks",
        "code/codingbuddy/packages/claude-code-plugin/hooks",
    ]
    for pattern in dev_patterns:
        try:
            source = home / pattern / HUD_FILENAME
            if source.resolve().exists():
                return source.resolve()
        except (OSError, ValueError):
            continue

    return None


def _install_statusline(home: Path, settings_file: Path) -> None:
    """Install codingbuddy statusLine (#1089)."""
    # 1. Find and copy HUD script
    source = _find_hud_source()
    if not source:
        return

    hud_dir = home / ".claude" / "hud"
    hud_dir.mkdir(parents=True, exist_ok=True)
    target = hud_dir / HUD_FILENAME
    shutil.copy(source, target)
    target.chmod(0o755)

    # 2. Update settings.json
    settings = _read_settings_file(settings_file) if settings_file.exists() else {}

    current_sl = settings.get("statusLine", {}).get("command", "")
    if "codingbuddy-hud" in current_sl:
        pass  # already installed
    elif "omc-hud" in current_sl or not current_sl:
        settings["statusLine"] = {
            "type": "command",
            "command": f'python3 "{home}/.claude/hud/{HUD_FILENAME}"',
        }
    # else: custom statusLine — preserve

    _write_settings_file(settings_file, settings)



def _ensure_lib_path():
    """Ensure hooks/lib is on sys.path (idempotent)."""
    _hooks_dir = os.path.dirname(os.path.abspath(__file__))
    _lib_dir = os.path.join(_hooks_dir, "lib")
    if _lib_dir not in sys.path:
        sys.path.insert(0, _lib_dir)
    return _lib_dir


def load_agent_visuals(agents_dir: str) -> Dict[str, dict]:
    """Load agent definitions with visual fields from JSON files.

    Args:
        agents_dir: Path to agents directory containing *.json files.

    Returns:
        Dict mapping agent-id to {name, visual} data.
    """
    agents: Dict[str, dict] = {}
    if not os.path.isdir(agents_dir):
        return agents

    try:
        for fname in os.listdir(agents_dir):
            if not fname.endswith(".json"):
                continue
            agent_id = fname[:-5]  # strip .json
            fpath = os.path.join(agents_dir, fname)
            try:
                with open(fpath, "r", encoding="utf-8") as f:
                    data = json.load(f)
                if "visual" in data:
                    agents[agent_id] = {
                        "name": data.get("name", agent_id),
                        "visual": data["visual"],
                    }
            except (json.JSONDecodeError, OSError):
                continue
    except OSError:
        pass

    return agents


def _find_agents_dir() -> Optional[str]:
    """Find the .ai-rules/agents directory relative to plugin source."""
    # Try CLAUDE_PLUGIN_DIR first
    plugin_dir = os.environ.get("CLAUDE_PLUGIN_DIR", "")
    if plugin_dir:
        candidate = os.path.join(plugin_dir, "..", "rules", ".ai-rules", "agents")
        resolved = os.path.realpath(candidate)
        if os.path.isdir(resolved):
            return resolved

    # Try relative to this file (dev mode)
    this_dir = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        os.path.join(this_dir, "..", "..", "rules", ".ai-rules", "agents"),
        os.path.join(this_dir, "..", "..", "..", "packages", "rules", ".ai-rules", "agents"),
    ]
    for candidate in candidates:
        resolved = os.path.realpath(candidate)
        if os.path.isdir(resolved):
            return resolved

    return None


def _read_pending_context(cwd: str) -> Optional[Dict[str, str]]:
    """Read pending work context from docs/codingbuddy/context.md.

    Parses the YAML-like frontmatter and last section to extract
    the most recent mode, task, and status.

    Args:
        cwd: Project directory to search for context.md.

    Returns:
        Dict with mode, task, status keys or None if not found.
    """
    context_path = os.path.join(cwd, "docs", "codingbuddy", "context.md")
    if not os.path.isfile(context_path):
        return None

    try:
        with open(context_path, "r", encoding="utf-8") as f:
            content = f.read(8192)  # Read first 8KB only
    except OSError:
        return None

    if not content.strip():
        return None

    result: Dict[str, str] = {}

    # Parse frontmatter for currentMode and status
    if content.startswith("---"):
        parts = content.split("---", 2)
        if len(parts) >= 3:
            for line in parts[1].strip().splitlines():
                line = line.strip()
                if line.startswith("currentMode:"):
                    result["mode"] = line.split(":", 1)[1].strip().strip('"')
                elif line.startswith("status:"):
                    result["status"] = line.split(":", 1)[1].strip().strip('"')

    # Find last section's task line
    for line in content.splitlines():
        line = line.strip()
        if line.lower().startswith("task:"):
            result["task"] = line.split(":", 1)[1].strip().strip('"')

    return result if result.get("mode") else None


def _check_briefing_recovery() -> None:
    """Check for recent briefings and suggest recovery.

    Scans docs/codingbuddy/briefings/ for .md files modified within the
    last 24 hours.  If any are found, prints a suggestion to stderr so
    the user knows they can resume previous work.

    This function never raises — all errors are silently swallowed to
    avoid blocking session start.
    """
    try:
        briefings_dir = os.path.join(
            os.environ.get("CLAUDE_PROJECT_DIR", os.getcwd()),
            "docs", "codingbuddy", "briefings",
        )
        if not os.path.isdir(briefings_dir):
            return

        now = time.time()
        recent: List[str] = []
        for f in sorted(os.listdir(briefings_dir), reverse=True):
            if f.endswith(".md"):
                age = now - os.path.getmtime(os.path.join(briefings_dir, f))
                if age < 86400:  # 24 hours
                    recent.append(f)
                if len(recent) >= 3:
                    break

        if recent:
            print(
                f"\U0001f4cb Found {len(recent)} recent briefing(s). "
                f"Use `resume_session` to continue previous work.",
                file=sys.stderr,
            )
    except Exception:
        pass  # Never block session start


def main():
    """Main entry point for the session start hook."""
    try:
        home = Path.home()
        hooks_dir = home / ".claude" / "hooks"
        target_file = hooks_dir / HOOK_FILENAME
        settings_file = home / ".claude" / "settings.json"

        installed_hook = False
        registered_settings = False
        new_version = None

        # Step 0.5: Auto-update marketplace clone (#1101)
        try:
            _ensure_lib_path()
            from updater import auto_update_marketplace
            new_version = auto_update_marketplace(home=home)
        except Exception:
            pass  # Never block session start

        # Step 1: Install hook file if not exists
        if not target_file.exists():
            source_file = find_plugin_source()

            if source_file:
                _install_hook_with_lib(source_file, hooks_dir, target_file)
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
            if installed_hook:
                print(msg("restart_needed"))

        # Step 2.5: Install codingbuddy statusLine (#1089, #1092)
        try:
            _install_statusline(home, settings_file)
        except Exception:
            pass  # Never block session start

        # Step 2.6: Ensure ~/.claude/mcp.json has codingbuddy entry (#1100)
        try:
            import shutil as _shutil
            if _shutil.which("codingbuddy"):
                _ensure_mcp_json(home / ".claude" / "mcp.json")
        except Exception:
            pass  # Never block session start

        # Step 3: System prompt injection (#828)
        # SessionStart uses plain stdout for context injection (NOT JSON)
        try:
            _ensure_lib_path()

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
            _ensure_lib_path()

            from stats import SessionStats

            from session_utils import get_session_id
            session_id = get_session_id()
            SessionStats(session_id=session_id)
            SessionStats.cleanup_stale(
                os.environ.get("CLAUDE_PLUGIN_DATA",
                               os.path.join(str(home), ".codingbuddy"))
            )
        except Exception:
            pass  # Never block session start

        # Step 4.5: Initialize HUD state for statusLine (#1089)
        _pending_ctx_for_hud = None
        try:
            _ensure_lib_path()

            from hud_state import init_hud_state

            from session_utils import get_session_id as _get_sid_hud
            hud_version = _get_plugin_version()
            init_hud_state(_get_sid_hud(), hud_version)
        except Exception:
            pass  # Never block session start

        # Step 4.5b: Enrich HUD baseline with pending context (#1324)
        try:
            cwd_hud = os.environ.get("CLAUDE_PROJECT_DIR", str(Path.cwd()))
            _pending_ctx_for_hud = _read_pending_context(cwd_hud)
            if _pending_ctx_for_hud:
                from hud_helpers import init_baseline

                init_baseline(_pending_ctx_for_hud)
        except Exception:
            pass  # Never block session start

        # Step 4.6: Detect recent briefings and suggest recovery (#1125)
        try:
            _check_briefing_recovery()
        except Exception:
            pass  # Never block session start

        # Step 5: Record session in history database (#823)
        try:
            _ensure_lib_path()

            from history_db import HistoryDB

            from session_utils import get_session_id as _get_sid_hist
            session_id = _get_sid_hist()
            cwd = os.environ.get("CLAUDE_PROJECT_DIR", str(Path.cwd()))
            model = os.environ.get("CLAUDE_MODEL", "unknown")
            db = HistoryDB()
            db.start_session(session_id, cwd, model)
            db.close()
        except Exception:
            pass  # Never block session start

        # Step 6: Buddy greeting + project scan + agent recommendations (#968)
        # Enhanced with returning session context (#975)
        # Adaptive performance mode (#1002): skip heavy scan in lightweight mode
        try:
            _ensure_lib_path()

            from config import get_config as _get_config
            from buddy_renderer import render_session_start, get_buddy_config
            from adaptive_perf import get_monitor, format_lightweight_notice

            cwd = os.environ.get("CLAUDE_PROJECT_DIR", str(Path.cwd()))
            cfg = _get_config(cwd)
            tone = cfg.get("tone", "casual")
            language = cfg.get("language", "en")

            perf_monitor = get_monitor(cfg)

            scan_data = {}
            recommendations = []

            if not perf_monitor.should_skip("full_project_scan"):
                from project_scanner import scan_project
                perf_monitor.start_timing("project_scan")
                scan_data = scan_project(cwd)
                elapsed = perf_monitor.stop_timing("project_scan")

                if not perf_monitor.should_skip("agent_recommendations"):
                    agents_dir = _find_agents_dir()
                    agents = load_agent_visuals(agents_dir) if agents_dir else {}
                    from project_scanner import get_agent_recommendations
                    recommendations = get_agent_recommendations(scan_data, agents)
            else:
                # Lightweight mode: notify user
                print(format_lightweight_notice(language), file=sys.stderr)

            # Detect returning session (#975)
            previous_session = None
            pending_context = None
            try:
                from history_db import HistoryDB as _HistoryDB

                from session_utils import get_session_id as _get_sid_ret
                session_id = _get_sid_ret()
                _db = _HistoryDB()
                previous_session = _db.get_previous_session(session_id, cwd)
                _db.close()

                # Read pending context from context.md
                if previous_session:
                    pending_context = _read_pending_context(cwd)
            except Exception:
                pass  # Never block for returning session detection

            # Buddy config and typing animation (#1033)
            buddy_cfg = get_buddy_config(cfg)
            buddy_section = cfg.get("buddy") if isinstance(cfg.get("buddy"), dict) else {}
            typing_enabled = buddy_section.get("typingEffect", True) and not os.environ.get("CI")

            # First-run onboarding tour (#1037)
            try:
                from onboarding_tour import is_first_run, render_onboarding_tour, mark_onboarded
                if is_first_run() and not previous_session:
                    tour_output = render_onboarding_tour(
                        language=language, buddy_config=buddy_cfg,
                    )
                    if tour_output:
                        print(tour_output, file=sys.stderr)
                    mark_onboarded()
            except Exception:
                pass  # Never block session start for tour

            # Render and output
            output = render_session_start(
                scan_data, recommendations, tone, language,
                previous_session=previous_session,
                pending_context=pending_context,
                buddy_config=buddy_cfg,
                typing=bool(typing_enabled),
            )
            if output:
                print(output)

            # Tiny Actor Grid preview (#1302)
            try:
                from tiny_actor_preview import render_actor_preview

                actor_preview = render_actor_preview("PLAN")
                if actor_preview:
                    print(actor_preview)
            except Exception:
                pass  # Never block session start

            # Show update notification if marketplace clone was updated (#1101)
            if new_version:
                print(
                    f"\n🔄 CodingBuddy v{new_version} available in marketplace!"
                    f"\n   → Run /plugin to update\n",
                    file=sys.stderr,
                )
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
