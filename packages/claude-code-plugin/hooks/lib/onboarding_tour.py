"""First-run onboarding tour for CodingBuddy.

Detects first-run via ~/.codingbuddy/onboarded flag file and renders
an interactive 3-step tour introducing core features.
"""
import os
from pathlib import Path
from typing import Any, Dict, Optional

from buddy_renderer import (
    ANSI_COLORS,
    BUDDY_FACE,
    DEFAULT_BUDDY_CONFIG,
    get_buddy_config,
)

# Flag file location
ONBOARDED_DIR = os.path.join(os.path.expanduser("~"), ".codingbuddy")
ONBOARDED_FLAG = os.path.join(ONBOARDED_DIR, "onboarded")

# Environment variable to skip tour
SKIP_ENV_VAR = "CODINGBUDDY_SKIP_TOUR"


def is_first_run() -> bool:
    """Check if this is the user's first run.

    Returns:
        True if onboarded flag does not exist and skip env var is not set.
    """
    if os.environ.get(SKIP_ENV_VAR):
        return False
    return not os.path.isfile(ONBOARDED_FLAG)


def mark_onboarded() -> None:
    """Create the onboarded flag file to prevent future tours."""
    os.makedirs(ONBOARDED_DIR, exist_ok=True)
    Path(ONBOARDED_FLAG).touch()


# ── i18n Tour Content ──────────────────────────────────────────────

TOUR_WELCOME: Dict[str, str] = {
    "en": "Welcome to CodingBuddy! Here's a quick tour...",
    "ko": "CodingBuddy에 오신 걸 환영해요! 간단히 소개할게요...",
    "ja": "CodingBuddyへようこそ！簡単にご紹介します...",
    "zh": "欢迎使用CodingBuddy！快速介绍一下...",
    "es": "Bienvenido a CodingBuddy! Un tour rapido...",
}

TOUR_STEPS: Dict[int, Dict[str, Dict[str, str]]] = {
    1: {
        "en": {
            "title": "PLAN/ACT/EVAL Workflow",
            "body": "Type PLAN to design, ACT to implement, EVAL to review — or AUTO for the full cycle.",
            "example": 'PLAN add user authentication',
        },
        "ko": {
            "title": "PLAN/ACT/EVAL 워크플로우",
            "body": "PLAN으로 설계, ACT로 구현, EVAL로 검토 — 또는 AUTO로 전체 사이클을 실행하세요.",
            "example": 'PLAN 사용자 인증 추가',
        },
        "ja": {
            "title": "PLAN/ACT/EVAL ワークフロー",
            "body": "PLANで設計、ACTで実装、EVALでレビュー — またはAUTOで全サイクル実行。",
            "example": 'PLAN ユーザー認証を追加',
        },
        "zh": {
            "title": "PLAN/ACT/EVAL 工作流",
            "body": "用PLAN设计、ACT实现、EVAL审查 — 或AUTO执行完整周期。",
            "example": 'PLAN 添加用户认证',
        },
        "es": {
            "title": "Flujo PLAN/ACT/EVAL",
            "body": "PLAN para disenar, ACT para implementar, EVAL para revisar — o AUTO para el ciclo completo.",
            "example": 'PLAN agregar autenticacion',
        },
    },
    2: {
        "en": {
            "title": "38 Specialist Agents",
            "body": "Security, accessibility, performance... experts ready to analyze your code.",
            "example": 'AUTO implement login page',
        },
        "ko": {
            "title": "38명의 전문가 에이전트",
            "body": "보안, 접근성, 성능... 전문가들이 코드 분석을 도와줍니다.",
            "example": 'AUTO 로그인 페이지 구현',
        },
        "ja": {
            "title": "38人の専門エージェント",
            "body": "セキュリティ、アクセシビリティ、パフォーマンス...専門家がコード分析をサポート。",
            "example": 'AUTO ログインページを実装',
        },
        "zh": {
            "title": "38位专家代理",
            "body": "安全、无障碍、性能...专家随时准备分析您的代码。",
            "example": 'AUTO 实现登录页面',
        },
        "es": {
            "title": "38 Agentes Especialistas",
            "body": "Seguridad, accesibilidad, rendimiento... expertos listos para analizar tu codigo.",
            "example": 'AUTO implementar pagina de login',
        },
    },
    3: {
        "en": {
            "title": "Checklists & Skills",
            "body": "Auto-generated quality checklists and specialized skills for every task.",
            "example": 'EVAL review my changes',
        },
        "ko": {
            "title": "체크리스트 & 스킬",
            "body": "자동 생성되는 품질 체크리스트와 모든 작업을 위한 전문 스킬.",
            "example": 'EVAL 변경사항 검토',
        },
        "ja": {
            "title": "チェックリスト & スキル",
            "body": "自動生成の品質チェックリストと各タスク向けの専門スキル。",
            "example": 'EVAL 変更をレビュー',
        },
        "zh": {
            "title": "清单 & 技能",
            "body": "自动生成质量清单和每个任务的专业技能。",
            "example": 'EVAL 审查我的更改',
        },
        "es": {
            "title": "Listas & Habilidades",
            "body": "Listas de calidad auto-generadas y habilidades especializadas para cada tarea.",
            "example": 'EVAL revisar mis cambios',
        },
    },
}

TOUR_SKIP: Dict[str, str] = {
    "en": "Skip future tours: touch ~/.codingbuddy/onboarded",
    "ko": "투어 건너뛰기: touch ~/.codingbuddy/onboarded",
    "ja": "ツアーをスキップ: touch ~/.codingbuddy/onboarded",
    "zh": "跳过教程: touch ~/.codingbuddy/onboarded",
    "es": "Saltar tour: touch ~/.codingbuddy/onboarded",
}

TOUR_HEADER: Dict[str, str] = {
    "en": "Quick Tour",
    "ko": "퀵 투어",
    "ja": "クイックツアー",
    "zh": "快速导览",
    "es": "Tour Rapido",
}

# Step number circled digits
_STEP_NUMBERS = {1: "\u2460", 2: "\u2461", 3: "\u2462"}


def _get_text(mapping: Dict[str, str], language: str) -> str:
    """Get localized text with English fallback."""
    return mapping.get(language, mapping.get("en", ""))


def _get_step(step_num: int, language: str) -> Dict[str, str]:
    """Get localized step content with English fallback."""
    step = TOUR_STEPS.get(step_num, {})
    return step.get(language, step.get("en", {}))


def render_onboarding_tour(
    language: str = "en",
    buddy_config: Optional[Dict[str, str]] = None,
) -> str:
    """Render the complete onboarding tour output.

    Args:
        language: Language code (en, ko, ja, zh, es).
        buddy_config: Optional buddy customization from get_buddy_config().

    Returns:
        Formatted onboarding tour string.
    """
    bc = buddy_config or DEFAULT_BUDDY_CONFIG
    face = bc.get("face", BUDDY_FACE)
    welcome = _get_text(TOUR_WELCOME, language)

    cyan = ANSI_COLORS["cyan"]
    yellow = ANSI_COLORS["yellow"]
    green = ANSI_COLORS["green"]
    magenta = ANSI_COLORS["magenta"]
    reset = ANSI_COLORS["reset"]

    lines = [
        f"\u256d\u2501\u2501\u2501\u256e",
        f"\u2503 {face} \u2503 {cyan}{welcome}{reset}",
        f"\u2570\u2501\u2501\u2501\u256f",
        "",
        f"\u2501\u2501 {_get_text(TOUR_HEADER, language)} \u2501\u2501\u2501\u2501\u2501\u2501",
    ]

    for step_num in (1, 2, 3):
        step = _get_step(step_num, language)
        if not step:
            continue
        circled = _STEP_NUMBERS.get(step_num, str(step_num))
        title = step.get("title", "")
        body = step.get("body", "")
        example = step.get("example", "")

        lines.append(f"")
        lines.append(f"  {yellow}{circled}{reset} {green}{title}{reset}")
        lines.append(f"     {body}")
        if example:
            lines.append(f"     {magenta}\U0001f4a1 {example}{reset}")

    lines.append("")
    lines.append(f"\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501")
    lines.append(f"\U0001f4ac {_get_text(TOUR_SKIP, language)}")

    return "\n".join(lines)
