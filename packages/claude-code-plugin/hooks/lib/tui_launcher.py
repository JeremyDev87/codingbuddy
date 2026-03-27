"""TUI launcher for CodingBuddy companion TUI (#970).

Manages tmux-based companion TUI alongside Claude Code:
- Detects tmux environment and terminal width
- Creates split pane with appropriate sizing
- Tracks pane state for cleanup on session stop
"""
import json
import os
import shutil
import subprocess
from pathlib import Path
from typing import Dict, Optional, Tuple

# Width thresholds
MIN_WIDTH = 120
WIDE_WIDTH = 160
WIDE_TUI_PERCENT = 40
NARROW_TUI_PERCENT = 30
DEFAULT_TUI_COMMAND = "codingbuddy-tui"

# i18n messages
MESSAGES: Dict[str, Dict[str, str]] = {
    "en": {
        "tui_disabled": "TUI disabled in config",
        "no_tmux": "Install tmux for CodingBuddy companion TUI: brew install tmux",
        "not_in_tmux": "Start Claude Code inside tmux for companion TUI",
        "too_narrow": "Terminal too narrow for TUI (need {min}+ cols, current: {current})",
        "tui_launched": "Companion TUI launched (pane {pane_id})",
        "tui_cmd_not_found": "CodingBuddy TUI not found. Install: npm install -g codingbuddy-tui",
        "tui_launch_error": "TUI launch failed: {error}",
        "tui_cleaned": "TUI pane closed",
    },
    "ko": {
        "tui_disabled": "설정에서 TUI 비활성화됨",
        "no_tmux": "CodingBuddy 컴패니언 TUI를 위해 tmux를 설치하세요: brew install tmux",
        "not_in_tmux": "컴패니언 TUI를 위해 tmux 안에서 Claude Code를 시작하세요",
        "too_narrow": "TUI를 위한 터미널 너비 부족 ({min}+ 필요, 현재: {current})",
        "tui_launched": "컴패니언 TUI 실행됨 (pane {pane_id})",
        "tui_cmd_not_found": "CodingBuddy TUI를 찾을 수 없습니다. 설치: npm install -g codingbuddy-tui",
        "tui_launch_error": "TUI 실행 실패: {error}",
        "tui_cleaned": "TUI pane이 닫혔습니다",
    },
    "ja": {
        "tui_disabled": "設定でTUIが無効です",
        "no_tmux": "CodingBuddyコンパニオンTUI用にtmuxをインストール: brew install tmux",
        "not_in_tmux": "コンパニオンTUI用にtmux内でClaude Codeを起動してください",
        "too_narrow": "TUIに十分なターミナル幅がありません ({min}+列必要、現在: {current})",
        "tui_launched": "コンパニオンTUI起動 (pane {pane_id})",
        "tui_cmd_not_found": "CodingBuddy TUIが見つかりません。インストール: npm install -g codingbuddy-tui",
        "tui_launch_error": "TUI起動失敗: {error}",
        "tui_cleaned": "TUI paneを閉じました",
    },
    "zh": {
        "tui_disabled": "配置中TUI已禁用",
        "no_tmux": "请安装tmux以使用CodingBuddy伴侣TUI: brew install tmux",
        "not_in_tmux": "请在tmux中启动Claude Code以使用伴侣TUI",
        "too_narrow": "终端宽度不足 (需要{min}+列, 当前: {current})",
        "tui_launched": "伴侣TUI已启动 (pane {pane_id})",
        "tui_cmd_not_found": "未找到CodingBuddy TUI。安装: npm install -g codingbuddy-tui",
        "tui_launch_error": "TUI启动失败: {error}",
        "tui_cleaned": "TUI pane已关闭",
    },
    "es": {
        "tui_disabled": "TUI deshabilitado en configuracion",
        "no_tmux": "Instale tmux para CodingBuddy companion TUI: brew install tmux",
        "not_in_tmux": "Inicie Claude Code dentro de tmux para companion TUI",
        "too_narrow": "Terminal demasiado estrecho para TUI (necesita {min}+ cols, actual: {current})",
        "tui_launched": "Companion TUI iniciado (pane {pane_id})",
        "tui_cmd_not_found": "CodingBuddy TUI no encontrado. Instalar: npm install -g codingbuddy-tui",
        "tui_launch_error": "Fallo al iniciar TUI: {error}",
        "tui_cleaned": "TUI pane cerrado",
    },
}


def _msg(key: str, language: str = "en", **kwargs) -> str:
    """Get localized message."""
    lang_msgs = MESSAGES.get(language, MESSAGES["en"])
    template = lang_msgs.get(key) or MESSAGES["en"].get(key, key)
    return template.format(**kwargs) if kwargs else template


def is_tmux_available() -> bool:
    """Check if tmux is installed on the system."""
    return shutil.which("tmux") is not None


def is_in_tmux() -> bool:
    """Check if currently running inside a tmux session."""
    return bool(os.environ.get("TMUX"))


def get_terminal_width() -> int:
    """Get current terminal width in columns."""
    try:
        return os.get_terminal_size().columns
    except (ValueError, OSError):
        return 0


def get_split_percentage(width: int) -> int:
    """Calculate TUI pane split percentage based on terminal width.

    Returns:
        Split percentage for TUI pane, or 0 if too narrow.
    """
    if width >= WIDE_WIDTH:
        return WIDE_TUI_PERCENT
    if width >= MIN_WIDTH:
        return NARROW_TUI_PERCENT
    return 0


def should_launch(config: dict) -> Tuple[bool, str]:
    """Determine if TUI should be launched based on config and environment.

    Returns:
        (should_launch, reason_message) tuple.
    """
    language = config.get("language", "en")

    if not config.get("tui", True):
        return False, _msg("tui_disabled", language)

    if not is_tmux_available():
        return False, _msg("no_tmux", language)

    if not is_in_tmux():
        return False, _msg("not_in_tmux", language)

    width = get_terminal_width()
    if get_split_percentage(width) == 0:
        return False, _msg("too_narrow", language, min=MIN_WIDTH, current=width)

    return True, ""


def _get_state_dir() -> Path:
    """Get directory for TUI state files."""
    data_dir = os.environ.get(
        "CLAUDE_PLUGIN_DATA",
        os.path.join(str(Path.home()), ".codingbuddy"),
    )
    return Path(data_dir)


def _get_state_path(session_id: str) -> Path:
    """Get state file path for a session's TUI pane."""
    return _get_state_dir() / f"tui-{session_id}.json"


def _save_state(session_id: str, pane_id: str) -> None:
    """Persist TUI pane info for later cleanup."""
    state_dir = _get_state_dir()
    state_dir.mkdir(parents=True, exist_ok=True)
    state = {"pane_id": pane_id, "session_id": session_id}
    with open(_get_state_path(session_id), "w", encoding="utf-8") as f:
        json.dump(state, f)


def _load_state(session_id: str) -> Optional[dict]:
    """Load saved TUI pane state."""
    path = _get_state_path(session_id)
    if not path.exists():
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return None


def _remove_state(session_id: str) -> None:
    """Remove TUI state file."""
    try:
        _get_state_path(session_id).unlink(missing_ok=True)
    except OSError:
        pass


def launch(session_id: str, config: dict) -> Tuple[bool, str]:
    """Launch companion TUI in a tmux split pane.

    Returns:
        (success, message) tuple.
    """
    language = config.get("language", "en")

    ok, reason = should_launch(config)
    if not ok:
        return False, reason

    tui_command = config.get("tui_command", DEFAULT_TUI_COMMAND)
    if not shutil.which(tui_command):
        return False, _msg("tui_cmd_not_found", language)

    width = get_terminal_width()
    pct = get_split_percentage(width)

    try:
        result = subprocess.run(
            [
                "tmux", "split-window", "-h",
                "-d",
                "-p", str(pct),
                "-P", "-F", "#{pane_id}",
                f"{tui_command} --session-id {session_id}",
            ],
            capture_output=True,
            text=True,
            timeout=5,
        )

        if result.returncode != 0:
            return False, _msg(
                "tui_launch_error", language, error=result.stderr.strip()
            )

        pane_id = result.stdout.strip()
        if pane_id:
            _save_state(session_id, pane_id)

        return True, _msg("tui_launched", language, pane_id=pane_id)

    except subprocess.TimeoutExpired:
        return False, _msg("tui_launch_error", language, error="timeout")
    except Exception as e:
        return False, _msg("tui_launch_error", language, error=str(e))


def cleanup(session_id: str) -> bool:
    """Clean up TUI pane for the given session.

    Returns:
        True if cleanup was performed, False if no TUI pane found.
    """
    state = _load_state(session_id)
    if not state:
        return False

    pane_id = state.get("pane_id")
    if not pane_id:
        _remove_state(session_id)
        return False

    try:
        subprocess.run(
            ["tmux", "kill-pane", "-t", pane_id],
            capture_output=True,
            timeout=5,
        )
    except (subprocess.TimeoutExpired, Exception):
        pass

    _remove_state(session_id)
    return True
